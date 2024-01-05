import { NextResponse } from 'next/server';
import { refreshThirdPartyAppsObject } from './service';

export async function POST(request: Request) {
  const { organisationId, userId } = await request.json();

  const response = await refreshThirdPartyAppsObject({
    organisationId,
    userId,
  });

  return NextResponse.json(response, { status: 200 });
}
