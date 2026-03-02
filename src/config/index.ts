import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),

  // Infrastructure provider flags
  USE_MEMORY_DB: z
    .string()
    .transform(v => v === 'true')
    .default('true'),
  USE_MEMORY_CACHE: z
    .string()
    .transform(v => v === 'true')
    .default('true'),
  USE_MEMORY_QUEUE: z
    .string()
    .transform(v => v === 'true')
    .default('true'),

  // PostgreSQL
  DATABASE_URL: z.string().optional(),
  TIMESCALE_URL: z.string().optional(),

  // Redis
  REDIS_URL: z.string().optional(),

  // Kafka
  KAFKA_BROKERS: z.string().optional(),
  KAFKA_CLIENT_ID: z.string().default('adpulse'),

  // Secrets
  TRACKING_SECRET: z.string().min(16).default('dev-tracking-secret-change-me-in-prod'),
  WEBHOOK_SECRET: z.string().min(16).default('dev-webhook-secret-change-me-in-prod'),

  // Rate limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

  // Logging
  LOG_LEVEL: z.string().default('info'),
});

export type AppConfig = z.infer<typeof configSchema>;

let _config: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (_config) return _config;

  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid configuration:');
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  _config = result.data;
  return _config;
}

export function getConfig(): AppConfig {
  if (!_config) return loadConfig();
  return _config;
}
