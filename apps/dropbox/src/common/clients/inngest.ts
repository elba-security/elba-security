import { EventSchemas, Inngest } from 'inngest';
import { zodEventSchemas } from './types';
import { unauthorizedMiddleware } from '@/app/api/inngest/middlewares/unauthorized-middleware';
import { rateLimitMiddleware } from '@/app/api/inngest/middlewares/rate-limit-middleware';

export type FunctionHandler = Parameters<typeof inngest.createFunction>[2];

export const inngest = new Inngest({
  id: 'dropbox',
  schemas: new EventSchemas().fromZod(zodEventSchemas),
  middleware: [unauthorizedMiddleware, rateLimitMiddleware],
});
