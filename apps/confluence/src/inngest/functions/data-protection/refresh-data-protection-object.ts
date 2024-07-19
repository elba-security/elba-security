import { getPageWithRestrictions } from '@/connectors/confluence/pages';
import { inngest } from '@/inngest/client';
import { formatPageObject, formatSpaceObject } from '@/connectors/elba/data-protection/objects';
import type {
  DataProtectionObjectMetadata,
  PageObjectMetadata,
  SpaceObjectMetadata,
} from '@/connectors/elba/data-protection/metadata';
import { getSpaceWithPermissions } from '@/connectors/confluence/spaces';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';
import { env } from '@/common/env';
import { getOrganisation } from '../../common/organisations';
import { getOrganisationUsers } from '../../common/users';

type GetDataProtectionObjectParams = {
  metadata: DataProtectionObjectMetadata;
  organisationId: string;
  objectId: string;
  accessToken: string;
  instanceId: string;
  instanceUrl: string;
};

const getSpaceObject = async ({
  objectId,
  metadata,
  organisationId,
  accessToken,
  instanceId,
  instanceUrl,
}: Omit<GetDataProtectionObjectParams, 'metadata'> & { metadata: SpaceObjectMetadata }) => {
  const space = await getSpaceWithPermissions({
    instanceId,
    accessToken,
    id: objectId,
    permissionsMaxPage:
      metadata.type === 'personal'
        ? env.DATA_PROTECTION_PERSONAL_SPACE_PERMISSIONS_MAX_PAGE
        : env.DATA_PROTECTION_GLOBAL_SPACE_PERMISSIONS_MAX_PAGE,
  });

  if (!space) {
    return null;
  }

  const users = await getOrganisationUsers(organisationId);

  return formatSpaceObject(space, { users, instanceId, instanceUrl });
};

const getPageObject = async ({
  objectId,
  accessToken,
  instanceId,
  instanceUrl,
}: Omit<GetDataProtectionObjectParams, 'metadata'> & { metadata: PageObjectMetadata }) => {
  const page = await getPageWithRestrictions({
    instanceId,
    accessToken,
    id: objectId,
  });

  if (!page) {
    return null;
  }

  return formatPageObject(page, {
    instanceUrl,
    instanceId,
  });
};

const getDataProtectionObject = async ({ metadata, ...params }: GetDataProtectionObjectParams) => {
  if (metadata.objectType === 'space') {
    return getSpaceObject({ ...params, metadata });
  }
  return getPageObject({ ...params, metadata });
};

export const refreshDataProtectionObject = inngest.createFunction(
  {
    id: 'confluence-refresh-data-protection-object',
    cancelOn: [
      {
        event: 'confluence/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'confluence/app.installed',
        match: 'data.organisationId',
      },
    ],
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.DATA_PROTECTION_REFRESH_OBJECT_ORGANISATION_CONCURRENCY,
    },
    retries: env.DATA_PROTECTION_REFRESH_OBJECT_MAX_RETRY,
  },
  {
    event: 'confluence/data_protection.refresh_object.requested',
  },
  async ({ event, step }) => {
    const { organisationId, objectId, metadata } = event.data;

    const organisation = await step.run('get-organisation', () => getOrganisation(organisationId));

    return step.run('refresh-object', async () => {
      const object = await getDataProtectionObject({
        objectId,
        metadata,
        organisationId,
        instanceId: organisation.instanceId,
        instanceUrl: organisation.instanceUrl,
        accessToken: await decrypt(organisation.accessToken),
      });

      const elba = createElbaClient(organisation.id, organisation.region);

      if (object && object.permissions.length > 0) {
        await elba.dataProtection.updateObjects({ objects: [object] });
        return { result: 'updated' };
      }
      await elba.dataProtection.deleteObjects({ ids: [objectId] });
      return { result: 'deleted' };
    });
  }
);
