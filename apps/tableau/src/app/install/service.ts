import { encrypt } from '@/common/crypto';
import { generateToken } from '@/common/jwt';
import { authenticate, getTokenExpirationTimestamp } from '@/connectors/auth';
import { db } from '../../database/client';
import { organisationsTable } from '../../database/schema';
import { inngest } from '../../inngest/client';

type SetupOrganisationParams = {
  organisationId: string;
  clientId: string;
  secretId: string;
  secret: string;
  email: string;
  url: {
    baseUrl: string;
    contentUrl: string;
  };
  region: string;
};
export const registerOrganisation = async ({
  organisationId,
  clientId,
  secretId,
  secret,
  email,
  url: { baseUrl: domain, contentUrl },
  region,
}: SetupOrganisationParams) => {
  const token = await generateToken({ clientId, secretId, secret, email });

  const { credentials } = await authenticate({ token, domain, contentUrl });
  const tokenExpiry = getTokenExpirationTimestamp(); // Tableau token expires in 240 minutes.

  const fullDomain = `https://${domain}`;

  const encryptedToken = await encrypt(credentials.token);
  const encryptedSecret = await encrypt(secret.toString());

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      region,
      secret: encryptedSecret,
      clientId,
      secretId,
      siteId: credentials.site.id,
      email,
      domain: fullDomain,
      token: encryptedToken,
      contentUrl,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        region,
        secret: encryptedSecret,
        clientId,
        secretId,
        siteId: credentials.site.id,
        email,
        domain: fullDomain,
        token: encryptedToken,
        contentUrl,
      },
    });

  await inngest.send([
    {
      name: 'tableau/users.sync.requested',
      data: {
        isFirstSync: true,
        organisationId,
        syncStartedAt: Date.now(),
        page: '1',
      },
    },
    {
      name: 'tableau/app.installed',
      data: {
        organisationId,
      },
    },
    {
      name: 'tableau/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: tokenExpiry,
      },
    },
  ]);
};
