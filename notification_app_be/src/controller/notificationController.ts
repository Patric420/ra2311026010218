import { Request, Response } from 'express';
import { Log } from 'logging-middleware';
import { getTopN } from '../service/notificationService';

export async function getPriorityInbox(req: Request, res: Response): Promise<void> {
  const n = parseInt((req.query.n as string) || '10', 10);

  await Log('backend', 'info', 'controller', `GET /api/priority-inbox called, n=${n}`);

  if (isNaN(n) || n < 1) {
    await Log('backend', 'warn', 'controller', 'invalid n param');
    res.status(400).json({ success: false, error: 'n must be a positive integer' });
    return;
  }

  try {
    const notifications = await getTopN(n);

    await Log('backend', 'info', 'controller', `returning ${notifications.length} notifications`);

    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (err) {
    const message = (err as Error).message;
    await Log('backend', 'error', 'controller', `priority inbox failed: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
}
