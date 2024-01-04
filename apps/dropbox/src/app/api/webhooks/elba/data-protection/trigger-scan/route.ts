import { NextResponse } from 'next/server';
import { triggerDataProtectionScan } from './service';

export async function POST(request: Request) {
  const { organisationId } = await request.json();

  const response = await triggerDataProtectionScan(organisationId);

  return NextResponse.json(response, { status: 200 });
}
