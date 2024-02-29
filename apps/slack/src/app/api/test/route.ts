import { NextResponse } from 'next/server';
import { db } from '@/database/client';

export const runtime = 'edge';
export const preferredRegion = 'fra1';
export const dynamic = 'force-dynamic';

export const GET = async () => {
  const teams = await db.query.teamsTable.findMany({
    columns: {
      id: true,
    },
  });
  return NextResponse.json(teams);
};
