export type LogMeta = Record<string, unknown>;


export function logErr(label: string, err: unknown, meta: LogMeta = {}): void {
  let e: any = err;
  // Keep logs structured and redaction-friendly
  // Avoid logging secrets in meta; pass only high-level context.
  // eslint-disable-next-line no-console
  if (!(e instanceof Error)) {
    // preserve supabase fields if present
    const msg = typeof e?.message === "string" ? e.message : JSON.stringify(e);
    e = new Error(msg);
  }
  console.error(JSON.stringify({
    level: "error",
    label,
    name: e.name,
    message: e.message,
    stack: e.stack,
    // include known supabase fields when present
    code: (err as any)?.code,
    details: (err as any)?.details,
    hint: (err as any)?.hint,
    meta,
    ts: new Date().toISOString(),
    env: process.env.NODE_ENV ?? "development",
  }));
}