import { NextResponse } from 'next/server';
import { deleteThirdPartyAppsObject } from './service';

export async function POST(request: Request) {
  const { organisationId, userId, appId } = await request.json();

  const response = await deleteThirdPartyAppsObject({
    organisationId,
    userId,
    appId,
  });

  return NextResponse.json(response, { status: 200 });
}
