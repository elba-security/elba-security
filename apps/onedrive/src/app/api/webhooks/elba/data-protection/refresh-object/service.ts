import { objectMetadataSchema } from '@/connectors/elba/data-protection';
import { inngest } from '@/inngest/client';

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
    name: 'onedrive/data_protection.refresh_object.requested',
    data: {
      id,
      organisationId,
      metadata: objectMetadataSchema.parse(metadata),
    },
  });
};
