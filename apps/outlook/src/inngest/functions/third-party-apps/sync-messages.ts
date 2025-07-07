import { shouldAnalyzeEmail } from '@elba-security/utils';
import { inngest } from '@/inngest/client';
import { formatGraphMessagesFilter } from '@/connectors/microsoft/message';
import { env } from '@/common/env/server';
import { concurrencyOption } from '@/inngest/functions/common/concurrency-option';
import { type OutlookMessage } from '@/connectors/microsoft/types';
import { decryptElbaInngestText } from '@/common/crypto';
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
      syncedEmailsCount?: number;
      tenantId: string;
      mail: string | null;
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
    const {
      skipStep,
      organisationId,
      userId,
      syncFrom,
      syncTo,
      region,
      syncStartedAt,
      syncedEmailsCount = 0,
      tenantId,
      mail,
    } = event.data;

    const { nextSkip, messages } = await step.invoke('list-messages', {
      function: listOutlookMessages,
      data: {
        tenantId,
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

    const messagesToAnalyze: OutlookMessage[] = [];
    for (const message of messages) {
      const sender = await decryptElbaInngestText(message.from);
      if (!mail || shouldAnalyzeEmail({ sender, receiver: mail })) {
        messagesToAnalyze.push(message);
      }
    }

    if (messagesToAnalyze.length > 0) {
      await step.sendEvent(
        'analyze-email',
        messagesToAnalyze.map((message) => ({
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

    const nextSyncedEmailsCount = syncedEmailsCount + messagesToAnalyze.length;
    const isLimitPerUserReached = env.SYNCED_EMAILS_COUNT_PER_USER_LIMIT
      ? nextSyncedEmailsCount >= env.SYNCED_EMAILS_COUNT_PER_USER_LIMIT
      : false;

    if (!isLimitPerUserReached && nextSkip) {
      await step.sendEvent('sync-next-page', {
        name: 'outlook/third_party_apps.messages.sync.requested',
        data: {
          ...event.data,
          syncedEmailsCount: nextSyncedEmailsCount,
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
