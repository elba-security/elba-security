import { encrypt } from '@/common/crypto';

export const accessToken = 'access-token';

export const organisation = {
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c90`,
  region: 'us',
  instanceId: '1234',
  instanceUrl: 'http://foo.bar',
  accessToken: await encrypt(accessToken),
  refreshToken: 'encrypted-refresh-token',
};

export const organisationUsers = Array.from({ length: 10 }, (_, i) => ({
  id: `account-${i}`,
  displayName: `display-name-${i}`,
  publicName: `public-name-${i}`,
  organisationId: organisation.id,
  lastSyncAt: new Date(),
}));
