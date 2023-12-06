import { NextResponse } from 'next/server';
import { processSyncJob } from './service';

export async function GET() {
  try {
    await processSyncJob();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
