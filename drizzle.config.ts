import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

export default {
  schema: './schema.ts',
  out: './drizzle',
  driver: 'pg',
  compiler: './tsconfig.server.json',
} satisfies Config;
