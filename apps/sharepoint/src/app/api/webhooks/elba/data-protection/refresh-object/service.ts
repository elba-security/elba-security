import { inngest } from '@/inngest/client';
import type { RefreshDataProtectionObjectSchema } from './types';

export const refreshObject = async ({
  id,
  organisationId,
  metadata,
}: RefreshDataProtectionObjectSchema) => {
  await inngest.send({
    name: 'sharepoint/data_protection.refresh_object.requested',
    data: {
      id,
      organisationId,
      metadata,
    },
  });
};
