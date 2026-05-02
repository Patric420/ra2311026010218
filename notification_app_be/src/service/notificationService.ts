import axios from 'axios';
import { Log } from 'logging-middleware';
import { config } from '../config/config';
import { getToken } from '../auth/authService';
import { Notification, ScoredNotification, MinHeap, scoreNotification } from '../utils/priorityQueue';

export async function fetchNotifications(): Promise<Notification[]> {
  await Log('backend', 'info', 'service', 'fetching notifications');

  const response = await axios.get(`${config.baseUrl}/notifications`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  const notifications: Notification[] = response.data.notifications;
  await Log('backend', 'info', 'service', `got ${notifications.length} notifications`);
  return notifications;
}

export async function getTopN(n: number): Promise<ScoredNotification[]> {
  await Log('backend', 'info', 'service', `computing top ${n} by priority`);

  const notifications = await fetchNotifications();
  const heap = new MinHeap();

  for (const notif of notifications) {
    const scored = scoreNotification(notif);
    heap.push(scored);
    if (heap.size > n) {
      heap.pop();
    }
  }

  const results = heap.toArray().sort((a, b) => b.score - a.score);
  await Log('backend', 'info', 'service', `returning top ${results.length} notifications`);
  return results;
}
