export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type ApiEnvelope<T> = { success?: boolean; data?: T; error?: string };

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    const headers = new Headers(init?.headers);
    if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    response = await fetch(`/api${path}`, {
      ...init,
      credentials: "same-origin",
      headers,
    });
  } catch {
    throw new ApiError(503, "Cannot reach the backend. Check that the backend is running.");
  }

  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !body?.success) {
    throw new ApiError(response.status, body?.error ?? `Request failed (${response.status})`);
  }
  return body.data as T;
}
