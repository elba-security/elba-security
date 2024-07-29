import { inngest } from '@/inngest/client';

export const startDataProtectionSync = async (organisationId: string) => {
  await inngest.send({
    name: 'dropbox/data_protection.shared_links.start.sync.requested',
    data: {
      organisationId,
      isFirstSync: true,
      syncStartedAt: Date.now(),
      cursor: null,
    },
  });
};
