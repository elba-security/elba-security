import { inngest } from '@/inngest/client';
import { formatGraphMessagesFilter } from '@/connectors/microsoft/message';
import { concurrencyOption } from '@/inngest/functions/common/concurrency-option';
import { listOutlookMessages } from '../microsoft/list-messages';

export type SyncMessagesRequested = {
  'outlook/third_party_apps.messages.sync.requested': {
    data: {
      organisationId: string;
      region: 'eu' | 'us';
      userId: string;
      skipStep: string | null;
      syncFrom: string | null;
      syncTo: string;
      syncStartedAt: string;
    };
  };
};

export const syncMessages = inngest.createFunction(
  {
    id: 'sync-outlook-messages',
    concurrency: concurrencyOption,
    cancelOn: [
      {
        event: 'outlook/common.organisation.inserted',
        match: 'data.organisationId',
      },
      {
        event: 'outlook/common.remove_organisation.requested',
        match: 'data.organisationId',
      },
    ],
  },
  {
    event: 'outlook/third_party_apps.messages.sync.requested',
  },
  async ({ event, step }) => {
    const { skipStep, organisationId, userId, syncFrom, syncTo, region, syncStartedAt } =
      event.data;

    const { nextSkip, messages } = await step.invoke('list-messages', {
      function: listOutlookMessages,
      data: {
        organisationId,
        userId,
        skipStep,
        filter: formatGraphMessagesFilter({
          after: syncFrom ? new Date(syncFrom) : undefined,
          before: new Date(syncTo),
        }),
      },
      timeout: '3d',
    });

    if (messages.length > 0) {
      await step.sendEvent(
        'analyze-email',
        messages.map((message) => ({
          name: 'outlook/third_party_apps.email.analyze.requested',
          data: {
            organisationId,
            region,
            userId,
            message,
            syncStartedAt,
          },
        }))
      );
    }

    if (nextSkip) {
      await step.sendEvent('sync-next-page', {
        name: 'outlook/third_party_apps.messages.sync.requested',
        data: {
          ...event.data,
          skipStep: nextSkip,
        },
      });
      return {
        status: 'ongoing',
      };
    }

    return {
      status: 'completed',
    };
  }
);
