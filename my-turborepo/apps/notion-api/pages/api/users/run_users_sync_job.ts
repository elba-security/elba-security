import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

type Data = {
  message: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    const job = await prisma.users_Sync_Jobs.findFirst({
      orderBy: [
        { priority: 'asc' }, // Order by priority in ascending order
        { sync_started_at: 'asc' }, // Order by timestamp in ascending order
      ],
    });

    if (!job) {
      return res.status(200).json({ message: 'Cron job completed.' });
    }

    const integration = await prisma.integration.findFirst({
      where: {
        organization_id: job.organization_id,
      },
    });

    let options = {
      headers: {
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${integration?.notionToken}`,
      },
    };

    const page_size = process.env.USERS_SYNC_JOB_BATCH;

    const notionUsersUrl = `https://api.notion.com/v1/users?page_size=${page_size}${
      job.pagination_token ? `&start_cursor=${job.pagination_token}` : ''
    }`;

    const response = await axios.get(notionUsersUrl, options);
    if ('status' in response.data) {
      return res.status(200).json({ message: response.data.message });
    }

    const noptions = {
      method: 'POST',
      url: 'http://localhost:3000/api/users/update_source_users',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      data: { users: response.data.results },
    };
    await axios.request(noptions);
    
    if (response.data.next_cursor) {
      await prisma.users_Sync_Jobs.update({
        where: {
          id: job.id,
        },
        data: {
          sync_started_at: new Date(),
          pagination_token: response.data.next_cursor ? response.data.next_cursor : '',
        },
      });
    } else {
      await prisma.users_Sync_Jobs.delete({
        where: {
          id: job.id,
        },
      });
      const options = {
        method: 'POST',
        url: 'http://localhost:3000/api/users/delete_source_users',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        data: { last_synced_before: job.sync_started_at },
      };
      await axios.request(options);
    }
  } catch (error) {
    return res.status(500).json({ message: String(error) });
  } finally {
    await prisma.$disconnect();
  }
  return res.status(200).json({ message: 'Cron job completed.' });
}
