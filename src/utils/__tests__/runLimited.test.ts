import { describe, expect, it } from "vitest";
import { runLimited, runLimitedSettled } from "../runLimited";

// A call the test finishes by hand, so concurrency can be observed exactly.
interface Gate {
  index: number;
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
}

const createGatedRunner = () => {
  const gates: Gate[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const fn = (_item: number, index: number) =>
    new Promise<string>((resolve, reject) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      gates.push({
        index,
        resolve: (value) => { inFlight -= 1; resolve(value); },
        reject: (reason) => { inFlight -= 1; reject(reason); },
      });
    });
  return { gates, fn, stats: () => ({ inFlight, maxInFlight }) };
};

// Lets the workers run until they are all waiting on a gate again.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("runLimited", () => {
  it("returns plain values in input order", async () => {
    const result = await runLimited([1, 2, 3], 2, async (n) => n * 10);
    expect(result).toEqual([10, 20, 30]);
  });

  it("keeps input order even when later items finish first", async () => {
    const runner = createGatedRunner();
    const done = runLimited([0, 1, 2], 3, runner.fn);
    await flush();
    runner.gates[2].resolve("c");
    runner.gates[0].resolve("a");
    runner.gates[1].resolve("b");
    expect(await done).toEqual(["a", "b", "c"]);
  });

  it("never has more than `limit` calls in flight and starts the next one as soon as a slot frees", async () => {
    const runner = createGatedRunner();
    const done = runLimited([0, 1, 2, 3, 4], 2, runner.fn);

    await flush();
    expect(runner.gates.map((g) => g.index)).toEqual([0, 1]);

    runner.gates[0].resolve("r0");
    await flush();
    expect(runner.gates.map((g) => g.index)).toEqual([0, 1, 2]);
    expect(runner.stats().inFlight).toBe(2);

    runner.gates[1].resolve("r1");
    runner.gates[2].resolve("r2");
    await flush();
    expect(runner.gates.map((g) => g.index)).toEqual([0, 1, 2, 3, 4]);

    runner.gates[3].resolve("r3");
    runner.gates[4].resolve("r4");
    expect(await done).toEqual(["r0", "r1", "r2", "r3", "r4"]);
    expect(runner.stats().maxInFlight).toBe(2);
  });

  it("passes the item and its index to the callback", async () => {
    const seen: Array<[string, number]> = [];
    await runLimited(["a", "b", "c"], 1, async (item, index) => { seen.push([item, index]); });
    expect(seen).toEqual([["a", 0], ["b", 1], ["c", 2]]);
  });

  it("handles an empty list and a limit larger than the list", async () => {
    expect(await runLimited([], 3, async () => 1)).toEqual([]);
    expect(await runLimited([1, 2], 50, async (n) => n)).toEqual([1, 2]);
  });

  it("runs one at a time with a limit of 1", async () => {
    const runner = createGatedRunner();
    const done = runLimited([0, 1, 2], 1, runner.fn);
    for (let i = 0; i < 3; i += 1) {
      await flush();
      expect(runner.gates).toHaveLength(i + 1);
      runner.gates[i].resolve(`v${i}`);
    }
    expect(await done).toEqual(["v0", "v1", "v2"]);
    expect(runner.stats().maxInFlight).toBe(1);
  });

  it("still attempts every item, then rejects with the first failure in input order", async () => {
    const attempted: number[] = [];
    const failure = runLimited([0, 1, 2, 3], 2, async (n) => {
      attempted.push(n);
      if (n === 1) throw new Error("first");
      if (n === 3) throw new Error("second");
      return n;
    });
    await expect(failure).rejects.toThrow("first");
    expect(attempted.sort()).toEqual([0, 1, 2, 3]);
  });
});

describe("runLimitedSettled", () => {
  it("reports each item as fulfilled or rejected without throwing", async () => {
    const boom = new Error("nope");
    const settled = await runLimitedSettled([1, 2, 3], 2, async (n) => {
      if (n === 2) throw boom;
      return n * 2;
    });
    expect(settled).toEqual([
      { status: "fulfilled", value: 2 },
      { status: "rejected", reason: boom },
      { status: "fulfilled", value: 6 },
    ]);
  });

  it("keeps going after a failure, within the same concurrency cap", async () => {
    const runner = createGatedRunner();
    const done = runLimitedSettled([0, 1, 2], 1, runner.fn);
    await flush();
    runner.gates[0].reject("bad");
    await flush();
    expect(runner.gates).toHaveLength(2);
    runner.gates[1].resolve("ok1");
    await flush();
    runner.gates[2].resolve("ok2");
    expect(await done).toEqual([
      { status: "rejected", reason: "bad" },
      { status: "fulfilled", value: "ok1" },
      { status: "fulfilled", value: "ok2" },
    ]);
    expect(runner.stats().maxInFlight).toBe(1);
  });

  it("resolves an empty list to an empty result", async () => {
    expect(await runLimitedSettled([], 4, async () => 1)).toEqual([]);
  });
});
