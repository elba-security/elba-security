import { NextResponse } from 'next/server';
import { runUsersSyncJob } from './service';

export async function GET() {
    await runUsersSyncJob();
    return new NextResponse();  
}
