import { logger } from '@elba-security/logger';
import { inngest } from '@/inngest/client';
import type { FileMetadata } from '@/inngest/types';
import { fileMetadataSchema } from '@/inngest/types';

export const refreshObject = async ({
  id,
  organisationId,
  metadata,
}: {
  id: string;
  organisationId: string;
  metadata: unknown;
}) => {
  const result = fileMetadataSchema.safeParse(metadata);

  if (!result.success) {
    logger.error('Invalid file metadata', { id, organisationId, metadata });
    return;
  }

  await inngest.send({
    name: 'dropbox/data_protection.refresh_object.requested',
    data: {
      id,
      organisationId,
      metadata: metadata as FileMetadata,
    },
  });
};
