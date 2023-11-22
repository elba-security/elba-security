// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getNotionInfo } from '@/lib/auth';

const prisma = new PrismaClient();

type RequestBody = {
    accessCode : string;
    organizationId : string;
}

type AccessTokenResponse = {
    workspace_id : string;
    workspace_name : string; 
    access_token : string;
}

export async function POST (req: NextRequest) {
        
    const body : RequestBody = await req.json();
    const { accessCode, organizationId } = body;

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
        code: accessCode,
        redirect_uri: getNotionInfo().notionRedirectUrl
        }),
    });

    const data : AccessTokenResponse = await response.json();

    if (response.status === 200) {
        try {
            const {workspace_id: workspaceID, workspace_name: workspaceName, access_token: accessToken} = data
            
            const integration = await prisma.integration.create({
                data: {
                organization_id : organizationId,
                workspace_id: workspaceID,
                workspace_name: workspaceName,
                notionToken: accessToken,
                },
            });

            await prisma.users_Sync_Jobs.create({
                data: {
                    priority: 1,
                    pagination_token: '',
                    sync_started_at: new Date(),
                    integration_id: integration.id
                },
            });

            return NextResponse.json({
                organization_id: organizationId,
                workspace_id: workspaceID,
                workspace_name: workspaceName,
                notionToken: accessToken,
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