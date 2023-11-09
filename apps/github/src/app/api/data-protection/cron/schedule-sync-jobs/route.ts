import { NextResponse } from 'next/server';

export async function GET() {
  return new NextResponse(null, { status: 501, statusText: 'Not Implemented' });
}
