export const accessToken = 'access-token';

export const organisationUsers = Array.from({ length: 10 }, (_, i) => ({
  id: `account-${i}`,
  displayName: `display-name-${i}`,
  publicName: `public-name-${i}`,
  organisationId: `10000000-0000-0000-0000-000000000000`,
  lastSyncAt: new Date(),
}));
