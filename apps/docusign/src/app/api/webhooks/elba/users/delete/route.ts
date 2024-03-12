import type { NextRequest } from 'next/server';
import { deleteUsers } from './service';

type RequestParams= {
  userId: string;
}
export async function POST(request: NextRequest) {
  const data: unknown = await request.json()
  const { userId } = parseWebhookEventData(
    'users.delete_user_requested,
    data
  );

  const userId  = data.userId;

  await deleteUsers({ userId });
}
