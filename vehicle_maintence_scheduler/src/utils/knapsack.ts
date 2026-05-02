export interface Vehicle {
  TaskID: string;
  Duration: number;
  Impact: number;
}

export interface KnapsackResult {
  selectedTasks: Vehicle[];
  totalImpact: number;
  totalDuration: number;
  unusedHours: number;
}

export function solveKnapsack(vehicles: Vehicle[], capacity: number): KnapsackResult {
  const n = vehicles.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const { Duration, Impact } = vehicles[i - 1];
    for (let w = 0; w <= capacity; w++) {
      dp[i][w] = dp[i - 1][w];
      if (Duration <= w) {
        const withItem = dp[i - 1][w - Duration] + Impact;
        if (withItem > dp[i][w]) {
          dp[i][w] = withItem;
        }
      }
    }
  }

  const selectedTasks: Vehicle[] = [];
  let remaining = capacity;
  for (let i = n; i >= 1; i--) {
    if (dp[i][remaining] !== dp[i - 1][remaining]) {
      selectedTasks.push(vehicles[i - 1]);
      remaining -= vehicles[i - 1].Duration;
    }
  }

  const totalDuration = capacity - remaining;

  return {
    selectedTasks,
    totalImpact: dp[n][capacity],
    totalDuration,
    unusedHours: remaining,
  };
}
