import { NextResponse } from 'next/server';
import { scheduleUsersSyncJobs } from './service';

export const runtime = 'edge';

export async function GET() {
  const response = await scheduleUsersSyncJobs();
  if(response.success) {
    return NextResponse.json("Created a new sync job");
  } else {
    return NextResponse.json(response.error || "Something went wrong", {status: 500})
  }
}