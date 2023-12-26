import { NextRequest, NextResponse } from 'next/server';
import { deleteObjectPermissions } from './service';

export async function POST(request: NextRequest) {
  await deleteObjectPermissions(await request.json());
  return NextResponse.json(
    {
      success: true,
    },
    {
      status: 200,
    }
  );
}
