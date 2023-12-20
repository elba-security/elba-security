import { type NextRequest } from 'next/server';
import { logger } from '@/logger';
import { env } from '@/env';

export const fetchCache = 'default-no-store';

export const GET = async (request: NextRequest) => {
  const err = { error: new Error('test', { cause: new Error('OHO') }) };

  const resp = new Response('test');

  logger.info('[LAMBDA] test', {
    err,
    req: request,
    set: new Set([1, 3]),
    array: ['a', 'b'],
    resp,
    message: 'oops',
  });
  logger.info('[LAMBDA] another log');
  logger.error('[TEST] sentry error log from lambda', new Error('test'));
  throw new Error('[TEST] lambda throw', { cause: new Error('[TEST] THROW') });
};
