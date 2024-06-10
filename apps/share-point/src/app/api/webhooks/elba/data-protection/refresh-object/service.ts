import { inngest } from '@/inngest/client';
import type { RefreshDataProtectionObjectSchema } from './types';

export const refreshObject = async ({
  id,
  organisationId,
  metadata,
}: RefreshDataProtectionObjectSchema) => {
  await inngest.send({
    name: 'share-point/data_protection.refresh_object.requested',
    data: {
      id,
      organisationId,
      metadata,
    },
  });
};
