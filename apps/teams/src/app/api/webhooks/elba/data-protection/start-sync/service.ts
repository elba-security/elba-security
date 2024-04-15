import { inngest } from '@/inngest/client';

export const startDataProtectionSync = async (organisationId: string) => {
  await inngest.send([
    {
      name: 'teams/teams.sync.triggered',
      data: {
        organisationId,
        syncStartedAt: new Date().toISOString(),
        skipToken: null,
        isFirstSync: true,
      },
    },
    {
      name: 'teams/channels.subscription.triggered',
      data: {
        organisationId,
      },
    },
  ]);
};
