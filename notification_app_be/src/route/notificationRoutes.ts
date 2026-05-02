import { Router, Request, Response } from 'express';
import { getPriorityInbox } from '../controller/notificationController';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

router.get('/priority-inbox', getPriorityInbox);

export default router;
