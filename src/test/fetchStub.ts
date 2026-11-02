// A stand-in for the global fetch, so RTK Query (fetchBaseQuery) can run for
// real in a test without a browser or a backend.
import { vi } from "vitest";

export interface SentRequest {
  url: string;
  method: string;
  headers: Headers;
  // The request body as text (JSON string, or the multipart payload).
  body: string;
}

export type FetchHandler = (request: SentRequest) => Response | Promise<Response>;

export const jsonResponse = (body: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });

// Replaces the global fetch. Every request is recorded in `requests` (in the
// order fetch was called) before `handler` answers it. Like the real fetch, a
// request whose signal is aborted (a timeout, a cancelled query) rejects with
// the abort reason instead of waiting for the handler.
export const stubFetch = (handler: FetchHandler) => {
  const requests: SentRequest[] = [];
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    return new Promise<Response>((resolve, reject) => {
      const onAbort = () => reject(request.signal.reason);
      if (request.signal.aborted) return onAbort();
      request.signal.addEventListener("abort", onAbort, { once: true });
      request
        .clone()
        .text()
        .then((body) => {
          const sent: SentRequest = { url: request.url, method: request.method, headers: request.headers, body };
          requests.push(sent);
          return handler(sent);
        })
        .then(resolve, reject);
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { requests, fetchMock };
};

// A request the test answers by hand, to control exactly what is in flight.
export interface HeldRequest {
  request: SentRequest;
  respond: (response?: Response) => void;
}

export const holdRequests = () => {
  const held: HeldRequest[] = [];
  const stub = stubFetch(
    (request) =>
      new Promise<Response>((resolve) => {
        held.push({ request, respond: (response = jsonResponse({ data: [] })) => resolve(response) });
      }),
  );
  return { ...stub, held };
};

// The multipart fields a recorded request carried, as [name, value] pairs in
// the order they were appended.
export const readFormData = async (request: SentRequest): Promise<Array<[string, string]>> => {
  const contentType = request.headers.get("content-type") ?? "";
  const form = await new Response(request.body, { headers: { "content-type": contentType } }).formData();
  return [...form.entries()].map(([name, value]) => [name, String(value)]);
};
