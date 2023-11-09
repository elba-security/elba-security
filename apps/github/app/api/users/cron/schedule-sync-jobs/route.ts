import { NextResponse } from 'next/server';
import { scheduleSyncJobs } from './service';

export async function GET() {
  const result = await scheduleSyncJobs('users');
  return NextResponse.json(result, { status: 200 });
}
