import { existsSync } from 'node:fs';
import { z } from 'zod';

// .env is optional: defaults below match docker-compose.yml, CI sets real env vars.
if (existsSync('.env')) process.loadEnvFile('.env');

const schema = z.object({
  BASE_URL: z.url().default('http://localhost:4100'),
  API_URL: z.url().default('http://localhost:3000/api'),
  // Password for users created by tests and the seed script. Local app only.
  USER_PASSWORD: z.string().min(8).default('Conduit@123'),
});

// Fail fast with a readable message instead of a confusing error deep inside a test.
export const env = schema.parse(process.env);
