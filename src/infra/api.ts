
// helper Wallet HTTP adapter implementing your existing IWalletService
// src/infra/api.ts
const DEFAULT_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS ?? 8000);

export class HttpError extends Error {
  status: number;
  body?: any;
  constructor(msg: string, status: number, body?: any) {
    super(msg);
    this.status = status;
    this.body = body;
  }
}

function assertHttps(url: string) {
  if (!/^https:\/\//i.test(url)) {
    throw new Error(`Insecure base URL: ${url}. HTTPS is required.`);
  }
}

export async function apiRequest<T>(
  baseUrl: string,
  path: string,
  opts: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    query?: Record<string, string | number | boolean | undefined>;
    headers?: Record<string, string>;
    body?: any;
    timeoutMs?: number;
  } = {}
): Promise<T> {
  assertHttps(baseUrl);

  const method = opts.method ?? "GET";
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const qs = opts.query
    ? "?" +
      Object.entries(opts.query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";

  const url = baseUrl.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "") + qs;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(process.env.KOI_API_KEY ? { Authorization: `Bearer ${process.env.KOI_API_KEY}` } : {}),
    ...(opts.headers ?? {}),
  };

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    const json = text ? safeJson(text) : undefined;

    if (!res.ok) {
      throw new HttpError(`HTTP ${res.status} on ${path}`, res.status, json ?? text);
    }
    return (json as T) ?? ({} as T);
  } finally {
    clearTimeout(timeout);
  }
}

function safeJson(s: string) {
  try { return JSON.parse(s); } catch { return undefined; }
}
