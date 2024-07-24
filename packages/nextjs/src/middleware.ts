import { NextResponse } from 'next/server';
import type { NextMiddleware } from 'next/server';
import { validateWebhookRequestSignature } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';

export type CreateElbaMiddlewareOptions = {
  webhookSecret: string;
};

export const createElbaMiddleware =
  ({ webhookSecret }: CreateElbaMiddlewareOptions): NextMiddleware =>
  async (request) => {
    try {
      await validateWebhookRequestSignature(request, webhookSecret);
    } catch (error) {
      logger.error('Could not validate webhook request signature', { error, request });
      return new NextResponse(null, { status: 401, statusText: 'unauthorized' });
    }
  };
