import { inngest } from '@/inngest/client';
import { itemMetadataSchema } from '@/inngest/functions/data-protection/common/helpers';

export const refreshObject = async ({
  id,
  organisationId,
  metadata,
}: {
  id: string;
  organisationId: string;
  metadata?: unknown;
}) => {
  await inngest.send({
    name: 'sharepoint/data_protection.refresh_object.requested',
    data: {
      id,
      organisationId,
      metadata: itemMetadataSchema.parse(metadata),
    },
  });
};
