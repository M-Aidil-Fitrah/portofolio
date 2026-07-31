import { apiUrl } from "@/lib/env";

export class ApiError<T = unknown> extends Error {
  readonly status: number;
  readonly data: T;

  constructor(status: number, data: T) {
    super(readErrorMessage(data, status));
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function readErrorMessage(data: unknown, status: number) {
  if (
    data &&
    typeof data === "object" &&
    "message" in data &&
    typeof data.message === "string"
  ) {
    return data.message;
  }

  return `API request failed with status ${status}.`;
}

export function resolveApiUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${apiUrl()}${url.startsWith("/") ? url : `/${url}`}`;
}

/**
 * Admin asset bytes are streamed by the API and need the session cookie.
 * Public asset URLs redirect to object storage instead, and a browser refuses
 * to carry credentials across a cross-origin redirect — so those must stay
 * anonymous or they fail before a response ever arrives.
 */
export function assetNeedsCredentials(source: string) {
  if (!source) return false;
  try {
    return new URL(source, apiUrl()).pathname.startsWith("/api/v1/admin/");
  } catch {
    return false;
  }
}

async function readResponse(response: Response) {
  if (response.status === 204 || response.status === 205 || !response.body) {
    return undefined;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return response.json();
  return response.text();
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(resolveApiUrl(url), {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
  });
  const data = await readResponse(response);

  if (!response.ok) {
    throw new ApiError(response.status, data);
  }

  return data as T;
}

export type ErrorType<Error> = ApiError<Error>;
export type BodyType<BodyData> = BodyData;
