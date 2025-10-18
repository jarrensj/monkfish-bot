import { z } from 'zod';

const EnvSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(10),
  KOI_API_URL: z.string().url().optional(),         // can be empty while mocked
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse({
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  KOI_API_URL: process.env.KOI_API_URL,
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
});
