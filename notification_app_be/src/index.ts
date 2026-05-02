import 'dotenv/config';
import express from 'express';
import { Log } from 'logging-middleware';
import { initAuth, scheduleTokenRefresh } from './auth/authService';
import notificationRoutes from './route/notificationRoutes';
import { config } from './config/config';

const app = express();
app.use(express.json());

app.use('/api', notificationRoutes);

async function bootstrap() {
  await initAuth();
  scheduleTokenRefresh();

  await Log('backend', 'info', 'service', `notification app up on port ${config.port}`);

  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

bootstrap().catch(async (err) => {
  await Log('backend', 'fatal', 'service', `startup failed: ${(err as Error).message}`);
  process.exit(1);
});
