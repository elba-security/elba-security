import { inngest } from '@/inngest/client';

export const startSync = async (organisationId: string) => {
  await inngest.send({
    name: 'dropbox/data_protection.shared_link.start.sync_page.requested',
    data: {
      organisationId,
      isFirstSync: true,
      syncStartedAt: Date.now(),
    },
  });
};
