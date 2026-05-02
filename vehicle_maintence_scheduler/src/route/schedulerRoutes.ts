import { Router, Request, Response } from 'express';
import { getSchedule } from '../controller/schedulerController';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

router.get('/schedule', getSchedule);

export default router;
