import axios from 'axios';
import { Log } from 'logging-middleware';
import { config } from '../config/config';
import { getToken } from '../auth/authService';
import { Vehicle } from '../utils/knapsack';

export async function fetchVehicles(): Promise<Vehicle[]> {
  await Log('backend', 'info', 'service', 'fetching vehicles');

  const response = await axios.get(`${config.baseUrl}/vehicles`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  const vehicles: Vehicle[] = response.data.vehicles;
  await Log('backend', 'info', 'service', `got ${vehicles.length} vehicles`);
  return vehicles;
}
