import { NextResponse } from 'next/server';

export function GET() {
  return new NextResponse(null, { status: 501, statusText: 'Not Implemented' });
}
