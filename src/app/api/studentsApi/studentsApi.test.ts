import { describe, expect, it } from "vitest";
import { API_BASE_URL } from "../baseApi";
import { studentsApi } from "./studentsApi";
import { smsApi } from "../smsApi";
import { createTestStore } from "../../../test/testStore";
import { jsonResponse, stubFetch } from "../../../test/fetchStub";

const path = (url: string) => url.replace(API_BASE_URL, "").split("?")[0];

// A student's profile keeps the student, their comments, their history and their
// SMS list on screen. Adding a note or sending an SMS changes some of those only,
// so the rest must not be requested again.
const mountProfile = async () => {
  const store = createTestStore();
  const { requests } = stubFetch((req) => (req.method === "GET" ? jsonResponse({ data: [] }) : jsonResponse({ success: true })));
  const subscriptions = [
    store.dispatch(studentsApi.endpoints.studentById.initiate("s1")),
    store.dispatch(studentsApi.endpoints.studentComments.initiate("s1")),
    store.dispatch(studentsApi.endpoints.studentHistory.initiate("s1")),
    store.dispatch(studentsApi.endpoints.studentSmsHistory.initiate({ id: "s1", page: 1, limit: 50 })),
  ];
  await Promise.all(subscriptions);
  const reads = (suffix: string) => requests.filter((r) => r.method === "GET" && path(r.url) === `/students/s1${suffix}`).length;
  const settle = () => new Promise((resolve) => setTimeout(resolve, 50));
  return { store, reads, settle, unsubscribe: () => subscriptions.forEach((s) => s.unsubscribe()) };
};

describe("studentsApi.createStudentComment", () => {
  it("reads the comments and the history again, and leaves the student and the SMS list alone", async () => {
    const { store, reads, settle, unsubscribe } = await mountProfile();

    await store.dispatch(studentsApi.endpoints.createStudentComment.initiate({ id: "s1", comment: "Called the parent" }));

    await settle();
    expect(reads("/comments")).toBe(2);
    expect(reads("/history")).toBe(2);
    expect(reads("")).toBe(1);
    expect(reads("/sms-history")).toBe(1);
    unsubscribe();
  });
});

describe("smsApi.sendSmsToStudents", () => {
  it("reads the student's SMS list again, and leaves the student, comments and history alone", async () => {
    const { store, reads, settle, unsubscribe } = await mountProfile();

    await store.dispatch(smsApi.endpoints.sendSmsToStudents.initiate({ studentIds: ["s1"], text: "Hello" }));

    await settle();
    expect(reads("/sms-history")).toBe(2);
    expect(reads("")).toBe(1);
    expect(reads("/comments")).toBe(1);
    expect(reads("/history")).toBe(1);
    unsubscribe();
  });
});

describe("studentsApi: other student changes still refresh everything", () => {
  it("a change to the student itself reads the student, comments, history and SMS list again", async () => {
    const { store, reads, settle, unsubscribe } = await mountProfile();

    await store.dispatch(studentsApi.endpoints.deleteStudent.initiate("s1"));

    await settle();
    expect(reads("")).toBe(2);
    expect(reads("/comments")).toBe(2);
    expect(reads("/history")).toBe(2);
    expect(reads("/sms-history")).toBe(2);
    unsubscribe();
  });
});
