import { NextResponse } from 'next/server';
import { runUsersSyncJobs } from './service';

export const runtime = 'edge';

export async function GET() {
  const result = await runUsersSyncJobs();
  return NextResponse.json(result);
}
