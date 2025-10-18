import express from 'express';
import { env } from '../infra/env';

export function startHealthServer() {
  const app = express();
  app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
  app.listen(env.PORT, () => {
    console.log(`[INFO] Health server on :${env.PORT}`);
  });
}
