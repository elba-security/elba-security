export const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  installationId: 0,
  accountLogin: 'some-login',
  region: 'us',
};

export const admins = Array.from({ length: 5 }, (_, i) => ({
  organisationId: organisation.id,
  id: `admin-id-${i}`,
  lastSyncAt: new Date(),
}));

export const organisations = Array.from({ length: 5 }, (_, i) => ({
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${i}`,
  installationId: i,
  accountLogin: `login-${i}`,
  region: 'us',
}));
