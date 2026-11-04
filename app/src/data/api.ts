// The backend's base URL when this build talks to it (VITE_DATA_SOURCE=api and VITE_API_URL set),
// else null and the app uses its bundled files and phone-only accounts. Vite writes the values in
// at build time, so the unused branch drops out of the bundle.
export const API_URL: string | null =
  import.meta.env.VITE_DATA_SOURCE === 'api' && import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/+$/, '')
    : null

// The free server can take about a minute to wake, so account requests wait longer than data reads.
export const ACCOUNT_TIMEOUT_MS = 75_000

export class ApiError extends Error {
  readonly status: number
  readonly body: Record<string, unknown>
  constructor(status: number, body: Record<string, unknown>) {
    super(typeof body.message === 'string' ? body.message : `HTTP ${status}`)
    this.status = status
    this.body = body
  }
  // The field names in a 422 (Laravel's {errors: {field: [...]}}).
  fieldErrors(): Record<string, string[]> {
    const errors = this.body.errors
    return typeof errors === 'object' && errors !== null ? (errors as Record<string, string[]>) : {}
  }
}

// No network, or no answer in time. Pages say "check your connection" instead of a wrong-password message.
export class OfflineError extends Error {}

export interface ApiRequest {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  token?: string | null
  timeoutMs?: number
}

// One JSON request to the API. Resolves the parsed body (null for 204), throws ApiError for an
// HTTP error and OfflineError when the server can't be reached.
export async function apiRequest<T = unknown>(
  base: string,
  path: string,
  { method = 'GET', body, token, timeoutMs = ACCOUNT_TIMEOUT_MS }: ApiRequest = {},
  fetchFn: typeof fetch = fetch,
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetchFn(`${base}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        // A FormData body (a photo) sets its own multipart Content-Type.
        ...(body === undefined || body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    })
  } catch (err) {
    throw new OfflineError(controller.signal.aborted ? 'The server took too long to answer.' : 'No connection.', {
      cause: err,
    })
  } finally {
    clearTimeout(timer)
  }
  const text = await res.text()
  let parsed: unknown
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = null
  }
  if (!res.ok) throw new ApiError(res.status, (parsed as Record<string, unknown> | null) ?? {})
  return parsed as T
}
