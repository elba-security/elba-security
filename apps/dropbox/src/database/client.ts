import { env } from '@/common/env';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const queryClient = postgres(env.POSTGRES_URL);

export const db = drizzle(queryClient);
