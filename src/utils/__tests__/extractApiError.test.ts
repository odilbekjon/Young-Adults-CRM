import { describe, expect, it } from "vitest";
import { extractApiError } from "../extractApiError";

describe("extractApiError", () => {
  it("reads the backend's {error: string} body", () => {
    expect(extractApiError({ status: 400, data: { success: false, error: "Phone already used", statusCode: 400 } })).toBe("Phone already used");
  });

  it("joins an {error: string[]} list of validation messages", () => {
    expect(extractApiError({ status: 400, data: { error: ["name should not be empty", "phone must be a string"] } })).toBe(
      "name should not be empty phone must be a string",
    );
  });

  it("reads the stock NestJS {message: string} body", () => {
    expect(extractApiError({ status: 409, data: { message: "Group is full" } })).toBe("Group is full");
  });

  it("joins a {message: string[]} list", () => {
    expect(extractApiError({ status: 400, data: { message: ["a", "b", "c"] } })).toBe("a b c");
  });

  it("prefers error over message when both are present", () => {
    expect(extractApiError({ data: { error: "specific", message: "generic" } })).toBe("specific");
  });

  it("falls back to message when error is absent or null", () => {
    expect(extractApiError({ data: { error: null, message: "generic" } })).toBe("generic");
  });

  it("returns null when the failure carries no readable message", () => {
    expect(extractApiError(undefined)).toBeNull();
    expect(extractApiError(null)).toBeNull();
    expect(extractApiError(new Error("boom"))).toBeNull();
    expect(extractApiError({ status: "FETCH_ERROR", error: "TypeError: Failed to fetch" })).toBeNull();
    expect(extractApiError({ status: 500, data: undefined })).toBeNull();
    expect(extractApiError({ status: 500, data: "Internal Server Error" })).toBeNull();
    expect(extractApiError({ status: 500, data: { error: { nested: true } } })).toBeNull();
  });
});
