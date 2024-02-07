import { inngest } from '@/inngest/client';
import { appUserMetadataSchema } from '@/connectors/elba/third-party-apps/metadata';

type DeleteThirdPartyAppsObjectParams = {
  organisationId: string;
  appId: string;
  metadata?: unknown;
};

export const deleteThirdPartyAppsObject = async ({
  organisationId,
  appId,
  metadata,
}: DeleteThirdPartyAppsObjectParams) => {
  const { permissionId } = appUserMetadataSchema.parse(metadata);

  await inngest.send({
    name: 'microsoft/third_party_apps.revoke_app_permission.requested',
    data: {
      organisationId,
      appId,
      permissionId,
    },
  });
};
