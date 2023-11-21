import { NextResponse } from 'next/server';
import { scheduleUsersSyncJobs } from './service';

export const runtime = 'edge';

export async function GET() {
  await scheduleUsersSyncJobs();
  return new NextResponse();
}
