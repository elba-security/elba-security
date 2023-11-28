import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- todo parse env var
const queryClient = postgres(process.env.POSTGRES_URL!);

export const db = drizzle(queryClient);
