import { NextResponse } from 'next/server';
import { triggerThirdPartyScan } from './service';

export async function POST(request: Request) {
  const { organisationId } = await request.json();

  const response = await triggerThirdPartyScan(organisationId);

  return NextResponse.json(response, { status: 200 });
}
