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
  metadata: unknown;
}) => {
  const result = fileMetadataSchema.safeParse(metadata);
  if (!result.success) {
    logger.error('Invalid file metadata', { organisationId, objectId, metadata });
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
