/**
 * ROUTE-02 — Binary Min-Heap (Priority Queue)
 *
 * A typed, minimal-dependency binary min-heap for Dijkstra's algorithm.
 * Supports decrease-key via lazy deletion (simpler and sufficient for sparse graphs).
 *
 * Time complexity:
 *   push: O(log n)
 *   pop:  O(log n)
 *   peek: O(1)
 */

export interface HeapItem {
  nodeId: string;
  dist: number;
}

export class MinHeap {
  private readonly data: HeapItem[] = [];

  get size(): number {
    return this.data.length;
  }

  get isEmpty(): boolean {
    return this.data.length === 0;
  }

  push(item: HeapItem): void {
    this.data.push(item);
    this._bubbleUp(this.data.length - 1);
  }

  pop(): HeapItem | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0]!;
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  peek(): HeapItem | undefined {
    return this.data[0];
  }

  private _bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[parent]!.dist <= this.data[i]!.dist) break;
      [this.data[parent], this.data[i]] = [this.data[i]!, this.data[parent]!];
      i = parent;
    }
  }

  private _sinkDown(i: number): void {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = (i << 1) + 1;
      const r = l + 1;
      if (l < n && this.data[l]!.dist < this.data[smallest]!.dist) smallest = l;
      if (r < n && this.data[r]!.dist < this.data[smallest]!.dist) smallest = r;
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest]!, this.data[i]!];
      i = smallest;
    }
  }
}
