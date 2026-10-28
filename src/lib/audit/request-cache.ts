/** Process-local, bounded, short-lived cache. Not a distributed rate limiter. */
export class RequestCache<T> {
  private entries = new Map<string, { expires: number; value: T }>();
  private pending = new Map<string, Promise<T>>();
  constructor(
    private ttlMs = 120_000,
    private capacity = 20,
    private concurrency = 4,
  ) {}
  async get(
    key: string,
    load: () => Promise<T>,
  ): Promise<{ value: T; cached: boolean }> {
    const now = Date.now();
    for (const [id, entry] of this.entries)
      if (entry.expires <= now) this.entries.delete(id);
    const entry = this.entries.get(key);
    if (entry) return { value: entry.value, cached: true };
    const existing = this.pending.get(key);
    if (existing) return { value: await existing, cached: true };
    if (this.pending.size >= this.concurrency) throw new BusyError();
    const promise = Promise.resolve().then(load);
    this.pending.set(key, promise);
    try {
      const value = await promise;
      if (this.entries.size >= this.capacity)
        this.entries.delete(this.entries.keys().next().value!);
      this.entries.set(key, { value, expires: Date.now() + this.ttlMs });
      return { value, cached: false };
    } finally {
      this.pending.delete(key);
    }
  }
}
export class BusyError extends Error {}
