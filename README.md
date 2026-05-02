# ra2311026010218

This repository contains two backend microservices and a system design document built with TypeScript and Node.js.

---

## Structure

```
ra2311026010218/
├── logging_middleware/          # Reusable logging package
├── vehicle_maintence_scheduler/ # Vehicle maintenance scheduling service
├── notification_app_be/         # Campus notifications backend
└── notification_system_design.md
```

---

## Logging Middleware

A shared TypeScript package that sends structured log entries to a central log server.

**Signature**
```ts
Log(stack, level, package, message)
```

- `stack`: `backend` | `frontend`
- `level`: `debug` | `info` | `warn` | `error` | `fatal`
- `package`: `service` | `controller` | `route` | `handler` | `db` | `auth` | `utils` | ...

Both microservices depend on this package via `file:../logging_middleware`.

---

## Vehicle Maintenance Scheduler

Determines the optimal set of vehicle maintenance tasks to complete each day per depot, given a fixed mechanic-hour budget.

Uses a 0/1 Knapsack algorithm (bottom-up DP) to maximise total operational impact without exceeding available hours.

**Run**
```bash
cd vehicle_maintence_scheduler
npm install
npm run build
node dist/index.js
```

Runs on port `3001`.

**Endpoint**
```
GET /api/schedule
```

Fetches depots and vehicles from the evaluation server, runs the knapsack per depot, and returns the selected tasks with total impact and hours used.

---

## Notification Backend

Campus notification service with a priority inbox for Stage 6.

Priority scoring:
- Type weight: Placement = 3, Result = 2, Event = 1
- Score = `type_weight × 10¹³ + timestamp_ms`
- Top N maintained using a min-heap (O(M log N))

**Run**
```bash
cd notification_app_be
npm install
npm run build
node dist/index.js
```

Runs on port `3002`.

**Endpoint**
```
GET /api/priority-inbox?n=10
```

Returns the top `n` notifications sorted by priority score descending.

---

## Environment

Each service reads from a `.env` file at its root. Both `.env` files are included in the repository.

Required variables:
```
EMAIL
NAME
ROLL_NO
ACCESS_CODE
CLIENT_ID
CLIENT_SECRET
PORT
BASE_URL
```

Auth tokens are fetched automatically on startup and refreshed every 13 minutes.
