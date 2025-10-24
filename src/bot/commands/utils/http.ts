export async function fetchJson<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, { ...init, headers: { accept: "application/json", ...(init?.headers || {}) } });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Non-JSON response: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const errMsg = typeof data?.error === "string" ? data.error : `HTTP ${res.status}`;
    throw new Error(errMsg);
  }
  return data as T;
}
