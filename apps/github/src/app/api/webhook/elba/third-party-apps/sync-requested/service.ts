import { inngest } from '@/inngest/client';

export const handleThirdPartyAppsSyncRequested = async (organisationId: string) => {
  await inngest.send({
    name: 'github/third_party_apps.sync.requested',
    data: {
      organisationId,
      syncStartedAt: Date.now(),
      isFirstSync: true,
      cursor: null,
    },
  });
};
