import { inngest } from '@/inngest/client';
import { RefreshDataProtectionObjectSchema } from '@/inngest/types';

export const refreshObject = async ({
  id,
  organisationId,
  metadata,
}: RefreshDataProtectionObjectSchema) => {
  await inngest.send({
    name: 'dropbox/data_protection.refresh_object.requested',
    data: {
      id,
      organisationId,
      metadata,
    },
  });
};
