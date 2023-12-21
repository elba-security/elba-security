import { type NextRequest } from 'next/server';
import { logger } from '@elba-security/logger';
import { env } from '@/env';

export const runtime = 'edge';
export const preferredRegion = env.VERCEL_PREFERRED_REGION;
export const dynamic = 'force-dynamic';

export const GET = (request: NextRequest) => {
  const err = { error: new Error('test', { cause: new Error('OHO') }) };

  const resp = new Response('test');

  logger.info('[EDGE] test', {
    err,
    req: request,
    set: new Set([1, 3]),
    array: ['a', 'b'],
    resp,
    message: 'oops',
  });
  logger.info('[EDGE] another log');
  logger.error('[TEST] sentry error log from edge', new Error('test'));
  throw new Error('[TEST] edge throw', { cause: new Error('[TEST] THROW') });
};
