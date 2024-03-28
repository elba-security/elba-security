import { logger } from '@elba-security/logger';
import { fileMetadataSchema } from '@/connectors/elba/data-protection';
import { inngest } from '@/inngest/client';

export const refreshDataProtectionObject = async ({
  organisationId,
  objectId,
  metadata,
}: {
  organisationId: string;
  objectId: string;
  metadata: any; // eslint-disable-line -- metadata type is any
}) => {
  const result = fileMetadataSchema.safeParse(metadata);
  if (!result.success) {
    logger.error('Invalid file metadata', { organisationId, objectId, metadata }); // eslint-disable-line -- metadata type is any
    return;
  }

  await inngest.send({
    name: 'google/data_protection.refresh_object.requested',
    data: {
      organisationId,
      objectId,
      ownerId: result.data.ownerId,
    },
  });
};
