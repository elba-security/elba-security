// eslint-disable-next-line @typescript-eslint/no-empty-function -- this is a placeholder
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

export const  runUsersSyncJob = async () => {
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

        const integration = await prisma.integration.findFirst({
          where: {
            id: job.integration_id,
          },
        });

        if (!integration) {
            return;
        }

        const page_size = process.env.USERS_SYNC_JOB_BATCH;
        const notionUsersUrl = `https://api.notion.com/v1/users?page_size=${page_size}${
          job.pagination_token ? `&start_cursor=${job.pagination_token}` : ''
        }`;

        const response = await fetch(notionUsersUrl, {
            method: "GET",
            headers: {
                'Notion-Version': '2022-06-28',
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${integration.notionToken}`,
            }
        });

        let data = await response.json();
        if ('status' in data) {
            return;
        }
        
        const ELBA_API_BASE_URL = process.env.ELBA_API_BASE_URL;
        const optionsForUserUpdate = {
            method: 'POST',
            url: `${ELBA_API_BASE_URL}/api/rest/users`,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
            },
            data: { users: data.results, organization_id:  integration.organization_id},
        };
        await axios.request(optionsForUserUpdate);
        
        if (data.next_cursor) {

            await prisma.users_Sync_Jobs.update({
                where: {
                    id: job.id,
                },
                data: {
                    sync_started_at: new Date(),
                    pagination_token: data.next_cursor ? data.next_cursor : '',
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
                data: { last_synced_before: job.sync_started_at },
            };
            await axios.request(options);
        }
    } catch (error) {
        
    } finally {
        await prisma.$disconnect();
    }
    return ;
};

