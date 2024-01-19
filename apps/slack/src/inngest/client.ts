import type { GetEvents, GetFunctionInput } from 'inngest';
import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import type { InngestEvents } from './functions';
import { slackRateLimitMiddleware } from './middlewares/slack-rate-limit';

export const inngest = new Inngest({
  id: 'slack',
  schemas: new EventSchemas().fromRecord<InngestEvents>(),
  middleware: [slackRateLimitMiddleware, sentryMiddleware],
});

type InngestClient = typeof inngest;

export type GetInngestFunctionInput<T extends keyof GetEvents<InngestClient>> = GetFunctionInput<
  InngestClient,
  T
>;
