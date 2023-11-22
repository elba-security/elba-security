// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getNotionInfo } from '@/lib/auth';

const prisma = new PrismaClient();

interface SuccessData {
    organization_id: string;
    workspace_id: string;
    workspace_name: string;
    notionToken: string;
};

interface ErrorData {
    error: string;
}

export async function POST (req: NextRequest, res: NextResponse) {

    const body = await req.json();
    const { access_code, organization_id } = body;

    const encoded = Buffer.from(`${getNotionInfo().notionClientID}:${getNotionInfo().notionClientSecret}`).toString("base64");

    const response = await fetch("https://api.notion.com/v1/oauth/token", {
        method: "POST",
        headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${encoded}`,
    },
        body: JSON.stringify({
        grant_type: "authorization_code",
        code: access_code,
        redirect_uri: getNotionInfo().notionRedirectUrl
        }),
    });

    let data = await response.json();

    if (response.status == 200) {
        try {
        const {workspace_id, workspace_name, access_token} = data
        
        const integration = await prisma.integration.create({
            data: {
            organization_id,
            workspace_id: workspace_id,
            workspace_name: workspace_name,
            notionToken: access_token,
            },
        });

        await prisma.users_Sync_Jobs.create({
            data: {
            priority: 1,
            organization_id: organization_id,
            pagination_token: '',
            sync_started_at: new Date(),
            integration_id: integration.id
            },
        });

        return NextResponse.json({
            organization_id,
            workspace_id: workspace_id,
            workspace_name: workspace_name,
            notionToken: access_token,
        }, {
            status: 200
        });
        } catch (error) {
            return new NextResponse(null, { status: 500, statusText: 'Internal Server Error' });
        } finally {
            await prisma.$disconnect();
        }
    } else {
        return new NextResponse(null, { status: 500, statusText: 'Internal Server Error' });
    }
}