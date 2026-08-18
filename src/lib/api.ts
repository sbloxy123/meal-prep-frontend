// Data API calls go to /backend/* on the same origin,
// which next.config.ts proxies through to the Railway API.
const API_URL = "/backend";

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    throw new Error("UNAUTHORISED");
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed: ${res.status}`);
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
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    throw new Error("UNAUTHORISED");
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed: ${res.status}`);
  }
}
