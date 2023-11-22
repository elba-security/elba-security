import { NextResponse, NextRequest } from 'next/server';
import { runUsersSyncJob } from './service';

export async function GET(req: NextRequest, res: NextResponse) {
  await runUsersSyncJob();
  return new NextResponse();  
}
