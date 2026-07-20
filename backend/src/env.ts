import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z
    .string()
    .default("4000")
    .transform((value) => Number.parseInt(value, 10))
    .pipe(z.number().int().min(1000).max(65535)),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("warn"),
});

export const env = envSchema.parse(process.env);
