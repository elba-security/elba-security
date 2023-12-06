import { NextRequest, NextResponse } from 'next/server';
import { handleTokenExchange, createWebhookForOrganisation } from './service';

type ReqData = {
  code: string;
  organisation_id: string;
};

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    const reqData = requestData as ReqData;
    const { code, organisation_id } = reqData;

    const accessToken = await handleTokenExchange(code, organisation_id);
    await createWebhookForOrganisation(accessToken, organisation_id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ name: 'error', message: 'Internal Server Error' }, { status: 500 });
  }
}
