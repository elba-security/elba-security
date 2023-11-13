import { NextResponse } from 'next/server';

export function POST() {
  return new NextResponse(null, { status: 501, statusText: 'Not Implemented' });
}
