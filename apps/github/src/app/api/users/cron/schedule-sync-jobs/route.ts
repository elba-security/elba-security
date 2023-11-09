import { NextResponse } from 'next/server';
import { scheduleUsersSyncJobs } from './service';

export async function GET() {
  const result = await scheduleUsersSyncJobs();
  return NextResponse.json(result, { status: 200 });
}
