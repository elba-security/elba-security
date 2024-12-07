import { logger } from '@elba-security/logger';
import { ElbaError, parseWebhookEventData, type WebhookEvent } from '@elba-security/sdk';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export type WebhookRouteHandler<T extends WebhookEvent> = (
  data: ReturnType<typeof parseWebhookEventData<T>>
) => Promise<void>;

export const createWebhookRoute =
  <T extends WebhookEvent>(event: T, handler: WebhookRouteHandler<T>) =>
  async (request: Request) => {
    try {
      const data: unknown = await request.json();

      const eventData = parseWebhookEventData(event, data);

      await handler(eventData);

      return new NextResponse();
    } catch (error) {
      logger.error('Could not handle webhook event', { error });
      if (error instanceof ElbaError && error.cause instanceof ZodError) {
        return new NextResponse(error.message, { status: 400 });
      }
      throw error;
    }
  };
