import axios from 'axios';
import { sql } from '@vercel/postgres';
import { CodeExchangeData } from '@/types';
const Asana = require('asana');

export const handleTokenExchange = async (
  code: string,
  organisationId: string
): Promise<string> => {
  const tokenResponse = await axios.post<CodeExchangeData>(
    'https://app.asana.com/-/oauth_token',
    {
      grant_type: 'authorization_code',
      client_id: process.env.NEXT_PUBLIC_ASANA_CLIENT_ID,
      client_secret: process.env.NEXT_PUBLIC_ASANA_CLIENT_SECRET,
      redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI,
      code,
    },
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const { access_token, expires_in, data, refresh_token } = tokenResponse.data;
  const { id, gid, name, email } = data;
  const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
  const expirationTime = currentTime + expires_in; // Expiration time in seconds

  await sql`
        INSERT INTO asana_credentials (id, gid, name, email, access_token, expires_in, refresh_token, organisation_id)
        VALUES (${id}, ${gid}, ${name}, ${email}, ${access_token}, ${expirationTime}, ${refresh_token}, ${organisationId}) ON CONFLICT (organisation_id) DO UPDATE
        SET
          id = EXCLUDED.id,
          gid = EXCLUDED.gid,
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          access_token = EXCLUDED.access_token,
          expires_in = EXCLUDED.expires_in,
          refresh_token = EXCLUDED.refresh_token;
      `;

  // Insert a sync job for the organization with priority 1
  await sql`
        INSERT INTO users_sync_jobs (organisation_id, priority, sync_started_at)
        VALUES (${organisationId}, 1, NOW()) ON CONFLICT (organisation_id) DO UPDATE
        SET
          priority = EXCLUDED.priority,
          sync_started_at = EXCLUDED.sync_started_at;
      `;

  return access_token;
};

export async function createWebhookForOrganisation(accessToken: string, organisationId: string) {
  const client = Asana.ApiClient.instance;
  const token = client.authentications['token'];
  token.accessToken = accessToken;

  const webhooksApiInstance = new Asana.WebhooksApi();
  const body = {
    data: {
      resource: organisationId,
      target: process.env.NEXT_PUBLIC_WEBHOOK_URI,
      filters: [
        { resource_type: 'project', action: 'changed' },
        { resource_type: 'project', action: 'added' },
        { resource_type: 'project', action: 'removed' },
        { resource_type: 'project', action: 'deleted' },
        { resource_type: 'project', action: 'undeleted' },
      ],
    },
  };
  const opts = {
    opt_fields:
      'active,created_at,filters,filters.action,filters.fields,filters.resource_subtype,last_failure_at,last_failure_content,last_success_at,resource,resource.name,target',
  };

  try {
    const webhook = await webhooksApiInstance.createWebhook(body, opts);
  } catch (error) {
    throw new Error('Webhook error', { cause: error });
  }
}
