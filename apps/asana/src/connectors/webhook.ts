import * as Asana from 'asana';
import { env } from '@/env';
import { AsanaError } from './commons/error';

export const registerWebhook = async (organisationId: string, accessToken: string) => {
  try {
    /* eslint-disable -- no type here */
    // @ts-expect-error -- no type here
    Asana.ApiClient.instance.authentications.token = accessToken;
    // @ts-expect-error -- no type here
    const webhooksApi = new Asana.WebhooksApi();
    const response = await webhooksApi.createWebhook(
      {
        data: {
          resource: organisationId,
          target: `${env.ASANA_WEBHOOK_URI}/${organisationId}`,
          filters: [
            { resource_type: 'project', action: 'changed' },
            { resource_type: 'project', action: 'added' },
            { resource_type: 'project', action: 'removed' },
            { resource_type: 'project', action: 'deleted' },
            { resource_type: 'project', action: 'undeleted' },
          ],
        },
      },
      {
        opt_fields:
          'active,created_at,filters,filters.action,filters.fields,filters.resource_subtype,last_failure_at,last_failure_content,last_success_at,resource,resource.name,target',
      }
    );
    /* eslint-enable -- no type here */
  } catch (error: unknown) {
    throw new AsanaError(`Could not register webhook for organisation with id=${organisationId}`, {
      cause: error,
    });
  }
};
