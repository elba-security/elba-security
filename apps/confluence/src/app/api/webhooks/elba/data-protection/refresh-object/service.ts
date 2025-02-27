import { dataProtectionObjectMetadataSchema } from '@/connectors/elba/data-protection/metadata';
import { inngest } from '@/inngest/client';

type RefreshDataProtectionObject = {
  organisationId: string;
  id: string;
  metadata: unknown;
  nangoConnectionId: string;
  region: string;
};

export const refreshDataProtectionObject = async ({
  organisationId,
  id,
  metadata,
  nangoConnectionId,
  region,
}: RefreshDataProtectionObject) => {
  await inngest.send({
    name: 'confluence/data_protection.refresh_object.requested',
    data: {
      nangoConnectionId,
      region,
      organisationId,
      objectId: id,
      metadata: dataProtectionObjectMetadataSchema.parse(metadata),
    },
  });
};
