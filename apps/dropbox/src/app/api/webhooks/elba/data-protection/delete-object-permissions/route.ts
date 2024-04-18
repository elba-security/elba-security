import { NextResponse } from 'next/server';
import { deleteObjectPermissions } from './service';

export async function POST(request: Request) {
  const data = await request.json();
  await deleteObjectPermissions(data);

  return new NextResponse();
}
