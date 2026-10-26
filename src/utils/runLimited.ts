// Runs `fn` over `items` with at most `limit` calls in flight. Bulk actions
// (add 30 selected students to a group, bulk archive/restore) used to start
// every call at once, which stalls the browser and floods the backend; this
// keeps the same per-item behaviour with a small, steady concurrency.
export const runLimitedSettled = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> => {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i], i) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};

// Same, but throws the first failure afterwards (Promise.all semantics: every
// item is still attempted) and returns plain values.
export const runLimited = async <T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> => {
  const settled = await runLimitedSettled(items, limit, fn);
  const failed = settled.find((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failed) throw failed.reason;
  return settled.map((r) => (r as PromiseFulfilledResult<R>).value);
};
