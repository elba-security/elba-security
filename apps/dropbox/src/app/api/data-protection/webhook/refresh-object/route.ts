import { NextResponse } from 'next/server';
import { refreshDataProtectionObject } from './service';

export async function POST(request: Request) {
  const { id, organisationId, metadata } = await request.json();

  const response = await refreshDataProtectionObject({
    id,
    organisationId,
    metadata,
  });

  return NextResponse.json(response, { status: 200 });
}
