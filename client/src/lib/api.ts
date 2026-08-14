import { ApiError, isErrorCode, type ErrorCode, type FieldError } from "./errors";

const BASE_URL = import.meta.env.VITE_API_URL;

export type QueryValue = string | number | boolean | Date | null | undefined;
export type QueryParams = Record<string, QueryValue | QueryValue[]>;

interface RequestOptions {
  params?: QueryParams;
  signal?: AbortSignal;
}

interface ErrorEnvelope {
  success: false;
  error: { code: string; message: string; details?: FieldError[] };
}

interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

type Envelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

const STATUS_CODES: Record<number, ErrorCode> = {
  400: "VALIDATION_ERROR",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "RATE_LIMITED",
  503: "SERVICE_UNAVAILABLE",
};

function buildQuery(params?: QueryParams): string {
  if (!params) return "";

  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item === undefined || item === null || item === "") continue;
      search.append(key, item instanceof Date ? item.toISOString() : String(item));
    }
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const isFormData = body instanceof FormData;

  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}${buildQuery(options.params)}`, {
      method,
      credentials: "include",
      signal: options.signal,
      headers: isFormData || body === undefined
        ? undefined
        : { "Content-Type": "application/json" },
      body: isFormData ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;

    throw new ApiError(
      0,
      "SERVICE_UNAVAILABLE",
      "Cannot reach the server, check your connection",
      path,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let envelope: Envelope<T>;

  try {
    envelope = (await response.json()) as Envelope<T>;
  } catch {
    throw new ApiError(
      response.status,
      STATUS_CODES[response.status] ?? "INTERNAL",
      "The server returned an unreadable response",
      path,
    );
  }

  if (response.ok && envelope.success) {
    return envelope.data;
  }

  const failure = envelope as Partial<ErrorEnvelope>;
  const code = failure.error?.code;

  throw new ApiError(
    response.status,
    isErrorCode(code) ? code : STATUS_CODES[response.status] ?? "INTERNAL",
    failure.error?.message ?? "Something went wrong",
    path,
    failure.error?.details ?? [],
  );
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, undefined, options),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, body, options),

  del: (path: string, options?: RequestOptions) =>
    request<void>("DELETE", path, undefined, options),
};
