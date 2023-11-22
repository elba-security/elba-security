import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

type PersonType = {
    email : string
}

type UserResponseType = {
    id: string;
    name : string;
    person: PersonType;
}

type UsersResponseType = {
    results: UserResponseType[];
    next_cursor: string;
    has_more: boolean;
}

type UserData = {
    id: string;
    displayName: string;
    email: string;
}

export const runUsersSyncJob = async () => {
    try {
        const job = await prisma.users_Sync_Jobs.findFirst({
            orderBy: [
                { priority: 'asc' }, // Order by priority in ascending order
                { sync_started_at: 'asc' }, // Order by timestamp in ascending order
            ],
        });

        if (!job) {
            return;
        }

        const integration  = await prisma.integration.findFirst({
            where: {
                id: job.integration_id,
            },
        });

        if (!integration) {
            return;
        }

        const pageSize = process.env.USERS_SYNC_JOB_BATCH;
        const notionUsersUrl = `https://api.notion.com/v1/users?page_size=${pageSize}${
            job.pagination_token ? `&start_cursor=${job.pagination_token}` : ''
        }`;

        const response = await fetch(notionUsersUrl, {
            method: 'GET',
            headers: {
                'Notion-Version': '2022-06-28',
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${integration.notionToken}`,
            },
        });

        const data : UsersResponseType = await response.json();
        if ('status' in data) {
            return;
        }

        const users: UserData[] = [];
        for (const user of data.results) {
            const userData: UserData = {
                id: user.id,
                displayName: user.name,
                email: user.person.email,
            }
            users.push(userData);
        }

        const ELBA_API_BASE_URL = process.env.ELBA_API_BASE_URL;
        const sourceId = process.env.ELBA_SOURCE_ID;
        const optionsForUserUpdate = {
            method: 'POST',
            url: `${ELBA_API_BASE_URL}/api/rest/users`,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
            },
            data: { users, organisationId: integration.organization_id , sourceId},
        };
        await axios.request(optionsForUserUpdate);
        
        const nextCursor = data.next_cursor;

        if (nextCursor) {
            await prisma.users_Sync_Jobs.update({
                where: {
                    id: job.id,
                },
                data: {
                    sync_started_at: new Date(),
                    pagination_token: nextCursor ? nextCursor : '',
                },
            });
        } else {            
            await prisma.users_Sync_Jobs.delete({
                where: {
                    id: job.id,
                },
            });

            const options = {
                method: 'DELETE',
                url: `${ELBA_API_BASE_URL}/api/rest/users`,
                headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                },
                data: { users, organisationId: integration.organization_id , sourceId},
            };
            await axios.request(options);
        }
    } catch (error) {
        
    } finally {
        await prisma.$disconnect();
    }
};
