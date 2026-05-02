import { Request, Response } from 'express';
import { Log } from 'logging-middleware';
import { computeSchedule } from '../service/schedulerService';

export async function getSchedule(req: Request, res: Response): Promise<void> {
  await Log('backend', 'info', 'controller', 'GET /api/schedule called');

  try {
    const schedules = await computeSchedule();

    await Log('backend', 'info', 'controller', `sending back ${schedules.length} depot schedules`);

    res.status(200).json({
      success: true,
      totalDepots: schedules.length,
      schedules,
    });
  } catch (err) {
    const message = (err as Error).message;
    await Log('backend', 'error', 'controller', `schedule failed: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
}
