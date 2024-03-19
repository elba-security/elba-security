import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/env';

const queryClient = postgres(
  env.VERCEL_ENV && env.VERCEL_ENV !== 'development'
    ? `${env.DATABASE_URL}?sslmode=require`
    : env.DATABASE_URL
);

export const db = drizzle(queryClient);
