// Data API calls go to /backend/* on the same origin,
// which next.config.ts proxies through to the Railway API.
const API_URL = "/backend";

// Carries the HTTP status so callers can branch (e.g. 400 validation body,
// 404 not-found) and the write queue can tell a transient failure (5xx/401)
// from a permanent one (4xx). A dropped connection still surfaces as a
// TypeError from fetch(), which never reaches here.
export class ApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(body || `Request failed: ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

import { clientHintHeaders } from "./client-hint";

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...clientHintHeaders(), // installed app or browser tab — see client-hint.ts
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, res.status === 401 ? "UNAUTHORISED" : await res.text());
  }

  return res.json() as Promise<T>;
}

// For endpoints that mutate and return an empty body (e.g. sendStatus(200/204)),
// where apiFetch's res.json() would throw on the empty response.
export async function apiSend(
  path: string,
  options?: RequestInit,
): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...clientHintHeaders(), // installed app or browser tab — see client-hint.ts
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, res.status === 401 ? "UNAUTHORISED" : await res.text());
  }
}
