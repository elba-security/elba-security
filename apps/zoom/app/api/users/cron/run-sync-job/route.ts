import { NextResponse } from 'next/server';
import { runUsersSyncJob } from './service';

export const runtime = 'edge';

export async function GET() {
  await runUsersSyncJob();
  return new NextResponse();
}
