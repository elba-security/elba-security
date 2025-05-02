import { elbaInngestClient } from '@/inngest/client';

export const preferredRegion = 'iad1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const { GET, POST, PUT } = elbaInngestClient.serve();
