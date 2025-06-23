import { type ConcurrencyOption } from 'inngest/types';
import { env } from '@/common/env/server';

export const concurrencyOption: ConcurrencyOption = {
  limit: env.EMAIL_SCANNING_GLOBAL_INNGEST_CONCURRENCY_LIMIT,
  key: '"email-scanning-integration"',
  scope: 'account',
};
