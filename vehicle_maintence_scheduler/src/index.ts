import 'dotenv/config';
import express from 'express';
import { Log } from 'logging-middleware';
import { initAuth, scheduleTokenRefresh } from './auth/authService';
import schedulerRoutes from './route/schedulerRoutes';
import { config } from './config/config';

const app = express();
app.use(express.json());

app.use('/api', schedulerRoutes);

async function bootstrap() {
  await initAuth();
  scheduleTokenRefresh();

  await Log('backend', 'info', 'service', `Vehicle Maintenance Scheduler starting on port ${config.port}`);

  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

bootstrap().catch(async (err) => {
  await Log('backend', 'fatal', 'service', `Server failed to start: ${(err as Error).message}`);
  process.exit(1);
});
