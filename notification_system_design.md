# Notification System Design

---

## Stage 1

### Core Actions

The notification platform needs to support the following actions:
- Create a notification and deliver it to a student
- Fetch all notifications for a logged-in student (paginated)
- Fetch a single notification by ID
- Mark a notification as read
- Mark all notifications as read
- Delete a notification
- Get unread notification count
- Receive real-time notifications via WebSocket

---

### REST Endpoints

#### Create Notification

```
POST /api/notifications
```

**Headers**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**
```json
{
  "studentId": "ra2311026010218",
  "type": "Placement",
  "message": "TCS is hiring – apply before May 10"
}
```

**Response 201**
```json
{
  "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
  "studentId": "ra2311026010218",
  "type": "Placement",
  "message": "TCS is hiring – apply before May 10",
  "isRead": false,
  "createdAt": "2026-05-02T05:00:00Z"
}
```

---

#### Get Notifications (paginated)

```
GET /api/notifications?page=1&limit=20&type=Placement
```

**Headers**
```
Authorization: Bearer <token>
```

**Response 200**
```json
{
  "total": 142,
  "page": 1,
  "limit": 20,
  "notifications": [
    {
      "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
      "type": "Placement",
      "message": "TCS is hiring",
      "isRead": false,
      "createdAt": "2026-05-02T05:00:00Z"
    }
  ]
}
```

---

#### Get Single Notification

```
GET /api/notifications/:id
```

**Response 200**
```json
{
  "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
  "type": "Result",
  "message": "mid-sem",
  "isRead": false,
  "createdAt": "2026-04-22T17:51:30Z"
}
```

---

#### Mark Notification as Read

```
PATCH /api/notifications/:id/read
```

**Response 200**
```json
{
  "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
  "isRead": true
}
```

---

#### Mark All as Read

```
PATCH /api/notifications/read-all
```

**Response 200**
```json
{
  "updated": 14
}
```

---

#### Delete Notification

```
DELETE /api/notifications/:id
```

**Response 204** — no body

---

#### Unread Count

```
GET /api/notifications/unread/count
```

**Response 200**
```json
{
  "unread": 7
}
```

---

### Real-Time Notifications

Polling doesn't make sense here — WebSocket is the better fit. Once a student logs in, they hold a persistent connection. When something gets posted to `/api/notifications`, the backend checks if that student has an active socket and pushes the event immediately. If they're offline it just sits in the DB and they'll see it when they open the app next.

**Connection**
```
WS ws://api.campus.in/ws?token=<bearer_token>
```

**Server → Client on new notification**
```json
{
  "event": "new_notification",
  "data": {
    "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
    "type": "Placement",
    "message": "TCS is hiring",
    "createdAt": "2026-05-02T05:00:00Z"
  }
}
```

---

## Stage 2

### Database Choice: PostgreSQL

PostgreSQL is the right call here. The data is relational — a student has many notifications, notifications have a fixed set of types, and we'll be doing filtered reads and aggregations like unread counts. A document store would work but gives up the query power we actually need. PostgreSQL handles both transactional writes and analytical reads well within this scale.

---

### Schema

```sql
CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE students (
  id           SERIAL PRIMARY KEY,
  student_id   VARCHAR(50)  UNIQUE NOT NULL,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(100) UNIQUE NOT NULL,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE notifications (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   VARCHAR(50)   NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  type         notification_type NOT NULL,
  message      TEXT          NOT NULL,
  is_read      BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_student_unread ON notifications (student_id, is_read, created_at DESC);
CREATE INDEX idx_notif_type_created   ON notifications (type, created_at DESC);
```

---

### Problems at Scale (50k students, 5M notifications)

**Table size**: 5 million rows is manageable for Postgres on decent hardware, but reads will slow down as the table grows, especially without proper indexes.

**Write bottlenecks**: Bulk inserts during events like "Notify All" will spike write throughput. A single synchronous loop writing 50k rows will lock up the DB.

**Index bloat**: Every write updates all indexes on the table. Too many indexes = slower inserts.

**Connection exhaustion**: If each request opens its own connection, 50k concurrent students would exhaust the DB connection pool.

---

### Solutions

- **Partitioning**: Partition the `notifications` table by `created_at` (monthly partitions). Older partitions can be archived or dropped.
- **Connection pooling**: Use PgBouncer in front of Postgres to multiplex connections.
- **Async writes**: Bulk inserts go through a queue (covered in Stage 5), not directly to Postgres.
- **Read replicas**: Route all `GET /notifications` reads to a replica, keeping writes isolated on the primary.

---

### Queries

**Unread notifications for a student**
```sql
SELECT id, type, message, created_at
FROM notifications
WHERE student_id = 'ra2311026010218'
  AND is_read = false
ORDER BY created_at DESC
LIMIT 20;
```

**All students who received a Placement notification in the last 7 days**
```sql
SELECT DISTINCT student_id
FROM notifications
WHERE type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days';
```

---

## Stage 3

### Is the Query Accurate?

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

The query is functionally correct, but has a few problems:

**Why it's slow**
- `SELECT *` fetches every column, including `message` (TEXT), pulling more data from disk than needed.
- There is no composite index on `(student_id, is_read, created_at)`. Postgres will do a sequential scan on the full table for each request.
- At 5 million rows and 50k students making requests simultaneously, sequential scans will pile up and the DB will buckle.

**Fix**

```sql
SELECT id, type, message, created_at
FROM notifications
WHERE student_id = 1042
  AND is_read = false
ORDER BY created_at DESC;
```

And add this index (already in the schema above):

```sql
CREATE INDEX idx_notif_student_unread ON notifications (student_id, is_read, created_at DESC);
```

With this index, Postgres uses an index scan instead of a seq scan. It goes directly to the rows for student 1042 with `is_read = false`, already sorted by `created_at DESC`. The query cost drops from O(n) to O(log n + k) where k is the result size.

---

### Should We Index Every Column?

No. That advice is wrong and would make things worse.

Each index is a separate B-tree that Postgres must update on every `INSERT`, `UPDATE`, or `DELETE`. With 50k bulk inserts from a "Notify All", every extra index multiplies the write cost. Indexes also consume significant disk space.

You only index columns that appear in `WHERE`, `ORDER BY`, or `JOIN` clauses on hot query paths. A composite index on `(student_id, is_read, created_at DESC)` covers the main read pattern exactly. Adding separate indexes on `message`, `id`, etc., would hurt write performance for no read benefit.

---

### Placement Notifications in Last 7 Days

```sql
SELECT DISTINCT student_id
FROM notifications
WHERE type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days';
```

Supported by `idx_notif_type_created` on `(type, created_at DESC)`.

---

## Stage 4

### Problem

With 50k students, fetching notifications on every page load is a direct hit on Postgres each time. During peak hours — 9am, post-exam results, placement announcements — you'd have tens of thousands of concurrent DB reads all at once. That's not going to hold up.

---

### What helps

**Redis cache for the unread list**

Cache each student's notifications in Redis with a 60-second TTL. On read, check Redis first. Only go to Postgres on a miss. On new notification, invalidate the key.

```
key:   notif:unread:<student_id>
value: JSON array
ttl:   60s
```

The tradeoff is a student might be looking at a list that's up to a minute old. That's fine for this kind of notification.

**Pagination**

Load the first 20 on page load, more on scroll. The API supports `?page=1&limit=20` already. This one mostly needs the frontend to cooperate but it makes a big difference — you're never pulling hundreds of rows per request.

**Read replica**

All the GET requests go to a read replica, writes to the primary. Doubles effective read throughput, barely any code change. Slight replication lag but nothing that matters here.

**Unread count as a cached integer**

The notification badge (the little number) gets checked constantly. Store it separately in Redis:

```
key:   notif:count:<student_id>
value: 7
```

Increment on insert, decrement on read. Zero DB queries for the badge.

---

## Stage 5

### Problems with the current approach

```
function notify_all(student_ids: array, message: string):
  for student_id in student_ids:
    send_email(student_id, message)    # calls Email API
    save_to_db(student_id, message)    # DB insert
    push_to_app(student_id, message)   # real-time push
```

The main problem is that this is a blocking loop. For 50k students it's going to run for several minutes, and if the email call fails at student 200 and throws, everything after that never runs. No retries, no error isolation, nothing.

The other issue is that the email and DB write are happening together, which means if the email fails, the DB record never gets written either. So the student won't even see it in the app. That's not great — the DB save and the email are two separate concerns and shouldn't depend on each other.

---

### Redesign — use a queue

Save to DB first (always), then enqueue delivery jobs per student. Workers handle email and push concurrently with retry logic.

```
function notify_all(student_ids: array, message: string):
  for student_id in student_ids:
    enqueue("notification_jobs", { student_id, message, attempt: 0 })
  log("backend", "info", "service", `queued ${student_ids.length} notification jobs`)


function process_job(job):
  { student_id, message } = job.data

  notification_id = save_to_db(student_id, message)
  # DB first — this is the record, email is just delivery

  try_with_retry(
    fn      = () => send_email(student_id, message),
    times   = 3,
    backoff = exponential
  )
  # on 3 consecutive failures, move to DLQ for later review

  push_to_app(student_id, notification_id)
```

**For the 200 failed emails specifically** — those jobs land in a dead letter queue after 3 retries. The in-app notification is already there so the student can see it regardless. When the email service recovers you can replay the DLQ. An alert should fire on DLQ growth so someone's aware.

50k jobs can be enqueued in a second or two. Workers run in parallel so actual delivery is fast. One failure doesn't touch anything else.

---

## Stage 6

### Approach

Priority is determined by two factors: notification type weight and recency.

Type weights:
- Placement = 3
- Result = 2
- Event = 1

Score formula:
```
score = type_weight × 10¹³ + timestamp_ms
```

The large multiplier ensures type always dominates. Within the same type, a newer notification scores higher. This avoids arbitrary weighting coefficients and produces a clear, deterministic ranking.

---

### Maintaining Top N Efficiently as New Notifications Arrive

A min-heap of fixed size N handles this in O(log N) per incoming notification.

Algorithm:
1. For each incoming notification, compute its score.
2. If the heap has fewer than N items, push it.
3. If the heap already has N items and the new score is greater than the heap minimum, pop the minimum and push the new item.
4. Otherwise, discard the new item.

This runs in O(M log N) time for M total notifications, which is optimal. The heap always holds the current top N.

---

### Code

The implementation is in `notification_app_be/`. Run it and call:

```
GET /api/priority-inbox?n=10
```

The response is sorted highest-score first.

See `src/utils/priorityQueue.ts` for the MinHeap implementation and `src/service/notificationService.ts` for the scoring and top-N logic.
