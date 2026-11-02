import { describe, expect, it } from "vitest";
import { describeApiError } from "./describeApiError";

describe("describeApiError", () => {
  describe("a backend rejection", () => {
    it("shows the backend's own message with the HTTP status", () => {
      expect(describeApiError({ status: 400, data: { success: false, error: "Only ACTIVE students can be frozen" } })).toBe(
        "Only ACTIVE students can be frozen [HTTP 400]",
      );
    });

    it("joins a list of validation messages", () => {
      expect(describeApiError({ status: 400, data: { error: ["reason should not be empty", "reason must be a string"] } })).toBe(
        "reason should not be empty reason must be a string [HTTP 400]",
      );
    });

    it("also reads the stock {message} body", () => {
      expect(describeApiError({ status: 409, data: { message: "Group still has students" } })).toBe("Group still has students [HTTP 409]");
    });

    it("falls back to a plain-text body, whitespace collapsed and cut to 160 characters", () => {
      const html = `<html>\n  <body>${"x ".repeat(200)}</body>\n</html>`;
      const text = describeApiError({ status: 502, data: html });

      expect(text.endsWith(" [HTTP 502]")).toBe(true);
      expect(text.startsWith("<html> <body>x x")).toBe(true);
      expect(text.replace(" [HTTP 502]", "")).toHaveLength(160);
    });

    it("falls back to an `errors` object, stringified", () => {
      expect(describeApiError({ status: 422, data: { errors: { phone: ["invalid"] } } })).toBe('{"phone":["invalid"]} [HTTP 422]');
    });

    it("gives just the status when the body says nothing", () => {
      expect(describeApiError({ status: 500, data: {} })).toBe("[HTTP 500]");
      expect(describeApiError({ status: 404, data: "   " })).toBe("[HTTP 404]");
    });
  });

  describe("a failure without an HTTP response", () => {
    it("explains a network or CORS failure", () => {
      expect(describeApiError({ status: "FETCH_ERROR", error: "TypeError: Failed to fetch" })).toBe(
        "[no response from the server (network or CORS error)]",
      );
    });

    it("explains a timeout", () => {
      expect(describeApiError({ status: "TIMEOUT_ERROR", error: "TimeoutError" })).toBe("[request timed out]");
    });

    it("explains an unreadable body, with the original HTTP status when known", () => {
      expect(describeApiError({ status: "PARSING_ERROR", originalStatus: 502, data: "<html>", error: "SyntaxError" })).toBe("<html> [HTTP 502]");
      expect(describeApiError({ status: "PARSING_ERROR", data: "", error: "SyntaxError" })).toBe("[unreadable server response]");
    });

    it("uses the message of a thrown Error", () => {
      expect(describeApiError(new Error("Request cancelled"))).toBe("Request cancelled");
    });

    it("returns an empty string when nothing is known", () => {
      expect(describeApiError(undefined)).toBe("");
      expect(describeApiError(null)).toBe("");
      expect(describeApiError({})).toBe("");
    });
  });
});
