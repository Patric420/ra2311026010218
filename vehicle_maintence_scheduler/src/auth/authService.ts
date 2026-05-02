import axios from 'axios';
import { setAuthToken } from 'logging-middleware';
import { Log } from 'logging-middleware';
import { config } from '../config/config';

let currentToken: string = '';

export async function initAuth(): Promise<string> {
  await Log('backend', 'info', 'auth', 'getting auth token');

  const response = await axios.post(`${config.baseUrl}/auth`, {
    email: config.email,
    name: config.name,
    rollNo: config.rollNo,
    accessCode: config.accessCode,
    clientID: config.clientID,
    clientSecret: config.clientSecret,
  });

  currentToken = response.data.access_token;
  setAuthToken(currentToken);

  await Log('backend', 'info', 'auth', 'token ready');
  return currentToken;
}

export function getToken(): string {
  return currentToken;
}

export function scheduleTokenRefresh(): void {
  const intervalMs = 13 * 60 * 1000;
  setInterval(async () => {
    try {
      await initAuth();
    } catch (err) {
      await Log('backend', 'error', 'auth', `token refresh failed: ${(err as Error).message}`);
    }
  }, intervalMs);
}
