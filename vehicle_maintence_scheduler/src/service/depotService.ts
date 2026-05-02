import axios from 'axios';
import { Log } from 'logging-middleware';
import { config } from '../config/config';
import { getToken } from '../auth/authService';

export interface Depot {
  ID: number;
  MechanicHours: number;
}

export async function fetchDepots(): Promise<Depot[]> {
  await Log('backend', 'info', 'service', 'fetching depots');

  const response = await axios.get(`${config.baseUrl}/depots`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  const depots: Depot[] = response.data.depots;
  await Log('backend', 'info', 'service', `got ${depots.length} depots`);
  return depots;
}
