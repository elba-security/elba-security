import { addSeconds } from 'date-fns';
import type { Context, FailureEventPayload } from 'inngest/types';

type FailureRetryParams = {
  backoff: number;
};

export const failureRetry =
  ({ backoff }: FailureRetryParams) =>
  async ({ event, step }: Context) => {
    const { data } = event as FailureEventPayload;
    if (data.error.name === 'NonRetriableError') {
      return {
        status: 'ignored',
      };
    }

    const retryDate = await step.run('get-retry-date', () => addSeconds(new Date(), backoff));

    await step.sleepUntil('wait-before-retry', retryDate);

    await step.sendEvent('retry-event', {
      name: data.event.name,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- convenience
      data: data.event.data,
    });

    return {
      status: 'retried',
    };
  };
