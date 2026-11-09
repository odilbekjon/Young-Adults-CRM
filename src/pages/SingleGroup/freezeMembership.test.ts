import { describe, expect, it, vi } from "vitest";
import { freezeMembership, refusesRecalculateField } from "./freezeMembership";

const rejection = (status: number, error: string | string[]) => ({ status, data: { error } });

const triggerThatAnswers = (...answers: Array<"ok" | unknown>) => {
  const calls: unknown[] = [];
  const trigger = vi.fn((arg: unknown) => {
    calls.push(arg);
    const answer = answers.shift();
    return { unwrap: () => (answer === "ok" ? Promise.resolve({}) : Promise.reject(answer)) };
  });
  return { trigger, calls };
};

describe("refusesRecalculateField", () => {
  it("recognises a validation refusal that names the field", () => {
    expect(refusesRecalculateField(rejection(400, "property recalculateBalance should not exist"))).toBe(true);
    expect(refusesRecalculateField(rejection(422, ["recalculateBalance must be a boolean"]))).toBe(true);
  });

  it("does not treat any other failure as one", () => {
    expect(refusesRecalculateField(rejection(400, "startDate must be a date"))).toBe(false);
    expect(refusesRecalculateField(rejection(500, "recalculateBalance blew up"))).toBe(false);
    expect(refusesRecalculateField({ status: "FETCH_ERROR" })).toBe(false);
    expect(refusesRecalculateField(undefined)).toBe(false);
  });
});

describe("freezeMembership", () => {
  const request = { id: "sg1", startDate: "2026-06-01", recalculateBalance: true };

  it("sends the freeze once, checkbox included, when the backend accepts it", async () => {
    const { trigger, calls } = triggerThatAnswers("ok");

    await expect(freezeMembership(trigger, request)).resolves.toEqual({ recalculateIgnored: false });

    expect(calls).toEqual([request]);
  });

  it("freezes again without the field when the backend refuses it by name", async () => {
    const { trigger, calls } = triggerThatAnswers(rejection(400, "property recalculateBalance should not exist"), "ok");

    await expect(freezeMembership(trigger, request)).resolves.toEqual({ recalculateIgnored: true });

    expect(calls).toEqual([request, { id: "sg1", startDate: "2026-06-01", recalculateBalance: undefined }]);
  });

  it("does not retry another kind of failure", async () => {
    const failure = rejection(409, "Student is already frozen");
    const { trigger } = triggerThatAnswers(failure);

    await expect(freezeMembership(trigger, request)).rejects.toBe(failure);

    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it("does not retry when the checkbox was not ticked", async () => {
    const failure = rejection(400, "property recalculateBalance should not exist");
    const { trigger } = triggerThatAnswers(failure);

    await expect(freezeMembership(trigger, { id: "sg1", startDate: "2026-06-01" })).rejects.toBe(failure);

    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it("reports a second failure of the retried freeze", async () => {
    const second = rejection(409, "Student is already frozen");
    const { trigger } = triggerThatAnswers(rejection(400, "property recalculateBalance should not exist"), second);

    await expect(freezeMembership(trigger, request)).rejects.toBe(second);
  });
});
