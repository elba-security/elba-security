import { NextResponse } from 'next/server';
import { runUsersSyncJob } from './service';

export const runtime = 'edge';

export async function GET() {
  const response = await runUsersSyncJob();
  if (response.success && response.data) {
    return NextResponse.json(response.data);
  } else {
    return NextResponse.json(response.error || "Something went wrong", {status: 500})
  }
}
