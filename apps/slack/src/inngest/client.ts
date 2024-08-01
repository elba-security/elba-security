import type { GetEvents, GetFunctionInput } from 'inngest';
import { EventSchemas, Inngest } from 'inngest';
import { encryptionMiddleware } from '@elba-security/inngest';
import { env } from '@/common/env';
import type { InngestEvents } from './functions';
import { slackRateLimitMiddleware } from './middlewares/slack-rate-limit';

export const inngest = new Inngest({
  id: 'slack',
  schemas: new EventSchemas().fromRecord<InngestEvents>(),
  middleware: [encryptionMiddleware({ key: env.ENCRYPTION_KEY }), slackRateLimitMiddleware],
});

type InngestClient = typeof inngest;

export type GetInngestFunctionInput<T extends keyof GetEvents<InngestClient>> = GetFunctionInput<
  InngestClient,
  T
>;
