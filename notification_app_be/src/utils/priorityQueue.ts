export interface Notification {
  ID: string;
  Type: 'Placement' | 'Result' | 'Event';
  Message: string;
  Timestamp: string;
}

export interface ScoredNotification extends Notification {
  score: number;
}

const TYPE_WEIGHT: Record<string, number> = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

export function scoreNotification(n: Notification): ScoredNotification {
  const typeWeight = TYPE_WEIGHT[n.Type] ?? 0;
  const timestampMs = new Date(n.Timestamp).getTime();
  const score = typeWeight * 1e13 + timestampMs;
  return { ...n, score };
}

export class MinHeap {
  private heap: ScoredNotification[] = [];

  get size(): number {
    return this.heap.length;
  }

  peek(): ScoredNotification | undefined {
    return this.heap[0];
  }

  push(item: ScoredNotification): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): ScoredNotification | undefined {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0 && last !== undefined) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return top;
  }

  toArray(): ScoredNotification[] {
    return [...this.heap];
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].score <= this.heap[i].score) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  private sinkDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.heap[left].score < this.heap[smallest].score) smallest = left;
      if (right < n && this.heap[right].score < this.heap[smallest].score) smallest = right;
      if (smallest === i) break;
      [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
      i = smallest;
    }
  }
}
