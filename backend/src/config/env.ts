import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  ALLOWED_DOMAINS: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function validateEnv(config: Record<string, unknown>): AppEnv {
  return envSchema.parse(config);
}

export function getEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;

  cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
}
