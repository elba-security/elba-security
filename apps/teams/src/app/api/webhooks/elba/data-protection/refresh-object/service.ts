import { inngest } from '@/inngest/client';
import { messageMetadataSchema } from '@/connectors/elba/data-protection/metadata';

export const refreshDataProtectionObject = async ({
  organisationId,
  metadata,
}: {
  organisationId: string;
  metadata: unknown;
}) => {
  const messageMetadataResult = messageMetadataSchema.safeParse(metadata);

  if (!messageMetadataResult.success) {
    throw new Error('Invalid message metadata');
  }

  await inngest.send({
    name: 'teams/data_protection.refresh_object.requested',
    data: {
      organisationId,
      metadata: messageMetadataResult.data,
    },
  });
};
