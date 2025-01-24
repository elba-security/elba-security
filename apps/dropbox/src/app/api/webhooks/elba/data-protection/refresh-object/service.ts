import { fileMetadataSchema } from '@/connectors/elba/data-protection/files';
import { inngest } from '@/inngest/client';

export const refreshDataProtectionObject = async ({
  id,
  organisationId,
  metadata,
  region,
  nangoConnectionId,
}: {
  id: string;
  organisationId: string;
  metadata: unknown;
  region: string;
  nangoConnectionId: string;
}) => {
  const result = fileMetadataSchema.safeParse(metadata);

  if (!result.success) {
    throw new Error('Invalid Dropbox refresh object arguments provided');
  }

  await inngest.send({
    name: 'dropbox/data_protection.refresh_object.requested',
    data: {
      id,
      organisationId,
      metadata: result.data,
      region,
      nangoConnectionId,
    },
  });
};
