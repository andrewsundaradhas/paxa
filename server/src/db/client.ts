import {drizzle} from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {env} from '../env';
import * as schema from './schema';

/**
 * Postgres connection (postgres-js) + Drizzle. Supabase requires TLS; the
 * connection string handles that. One pool is shared across the process.
 */
const queryClient = postgres(env.databaseUrl, {
  max: 10,
  ssl: 'require',
  prepare: false, // required when using Supabase's transaction pooler (pgbouncer)
});

export const db = drizzle(queryClient, {schema});
export {schema};
export {queryClient};
