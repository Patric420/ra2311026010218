import { Log } from 'logging-middleware';
import { fetchDepots, Depot } from './depotService';
import { fetchVehicles } from './vehicleService';
import { solveKnapsack, Vehicle, KnapsackResult } from '../utils/knapsack';

export interface DepotSchedule {
  depotId: number;
  mechanicHoursBudget: number;
  result: KnapsackResult;
}

export async function computeSchedule(): Promise<DepotSchedule[]> {
  await Log('backend', 'info', 'service', 'computing schedule for all depots');

  const [depots, vehicles] = await Promise.all([fetchDepots(), fetchVehicles()]);

  await Log('backend', 'debug', 'service', `running knapsack: ${depots.length} depots, ${vehicles.length} vehicles`);

  const schedules: DepotSchedule[] = depots.map((depot: Depot) => {
    const result = solveKnapsack(vehicles, depot.MechanicHours);

    return {
      depotId: depot.ID,
      mechanicHoursBudget: depot.MechanicHours,
      result,
    };
  });

  await Log('backend', 'info', 'service', 'done');
  return schedules;
}
