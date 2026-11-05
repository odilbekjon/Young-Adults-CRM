import { describe, expect, it } from "vitest";
import { authApi } from "./authApi";
import { createTestStore } from "../../../test/testStore";
import { jsonResponse, readFormData, stubFetch, type SentRequest } from "../../../test/fetchStub";

const OK = { success: true, message: "ok", data: { user: { id: "u1", role: "TEACHER" }, token: "tok", refreshToken: "ref" } };
const WRONG = () => jsonResponse({ success: false, error: ["Login yoki parol noto'g'ri"], statusCode: 401 }, { status: 401 });

const sentIdentifiers = async (requests: SentRequest[]) =>
  Promise.all(requests.map(async (r) => (await readFormData(r)).find(([name]) => name === "identifier")?.[1]));

const login = (identifier: string, password = "secret1") => {
  const store = createTestStore();
  return store.dispatch(authApi.endpoints.login.initiate({ identifier, password }));
};

describe("authApi.login", () => {
  it("sends a phone typed with spaces/brackets as +998 and 9 digits, and the password exactly as typed", async () => {
    const { requests } = stubFetch(() => jsonResponse(OK));

    const result = await login("  +998 (90) 123-45-67 ", " pass word ");

    expect(result).toMatchObject({ data: { data: { token: "tok" } } });
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("POST");
    expect(await readFormData(requests[0])).toEqual([
      ["identifier", "+998901234567"],
      ["password", " pass word "],
    ]);
  });

  it("finds a teacher saved as bare digits: retries 9 digits when +998 is not recognized", async () => {
    const { requests } = stubFetch((request) =>
      request.body.includes("+998") ? WRONG() : jsonResponse(OK),
    );

    const result = await login("90 123 45 67");

    expect(result).toMatchObject({ data: { data: { token: "tok" } } });
    expect(await sentIdentifiers(requests)).toEqual(["+998901234567", "901234567"]);
  });

  it("finally tries the number as typed, for a phone saved with spaces before the forms normalized it", async () => {
    const { requests } = stubFetch(async (request) => {
      const identifier = (await readFormData(request)).find(([name]) => name === "identifier")?.[1];
      return identifier === "90 123 45 67" ? jsonResponse(OK) : WRONG();
    });

    const result = await login("90 123 45 67");

    expect(result).toMatchObject({ data: { data: { token: "tok" } } });
    expect(await sentIdentifiers(requests)).toEqual(["+998901234567", "901234567", "90 123 45 67"]);
  });

  it("reports the backend's own wrong-credentials answer once every spelling was refused", async () => {
    const { requests } = stubFetch(() => WRONG());

    const result = await login("90 123 45 67");

    expect(await sentIdentifiers(requests)).toEqual(["+998901234567", "901234567", "90 123 45 67"]);
    expect(result).toMatchObject({
      error: { status: 401, data: { error: ["Login yoki parol noto'g'ri"] } },
    });
  });

  it("does not retry anything but a refusal of the credentials (validation errors, server errors)", async () => {
    for (const status of [400, 403, 500, 503]) {
      const { requests } = stubFetch(() => jsonResponse({ error: "no" }, { status }));
      const result = await login("901234567");
      expect(requests).toHaveLength(1);
      expect(result).toMatchObject({ error: { status } });
    }
  });

  it("tries an email as typed and then lower-cased, and a lower-case one just once", async () => {
    const mixed = stubFetch(() => WRONG());
    await login("Teacher@School.uz");
    expect(await sentIdentifiers(mixed.requests)).toEqual(["Teacher@School.uz", "teacher@school.uz"]);

    const lower = stubFetch(() => WRONG());
    await login(" teacher@school.uz ");
    expect(await sentIdentifiers(lower.requests)).toEqual(["teacher@school.uz"]);
  });

  it("passes a value that is not a phone number on untouched", async () => {
    const { requests } = stubFetch(() => WRONG());
    await login("12345");
    expect(await sentIdentifiers(requests)).toEqual(["12345"]);
  });

  it("does not fail on a network error by retrying other spellings", async () => {
    const { requests } = stubFetch(() => {
      throw new TypeError("Failed to fetch");
    });
    const result = await login("901234567");
    expect(result).toMatchObject({ error: { status: "FETCH_ERROR" } });
    // the transport-level retries of a write are off (baseApi), and so are ours
    expect(await sentIdentifiers(requests)).toEqual(["+998901234567"]);
  });
});
