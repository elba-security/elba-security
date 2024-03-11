import type { NextRequest } from 'next/server';
import { deleteUsers } from './service';

type RequestParams= {
  userId: string;
}
export async function POST(request: NextRequest) {
  const data: RequestParams = await request.json() as RequestParams

  const userId  = data.userId;

  await deleteUsers({ userId });
}
