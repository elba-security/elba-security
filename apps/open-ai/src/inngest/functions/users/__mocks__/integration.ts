export const organisations = Array.from({ length: 5 }, (_, i) => ({
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${i}`,
  token: `token-${i}`,
  sourceOrganizationId: `source-org-${i}`,
  region: 'us',
}));

export const users = Array.from({ length: 10 }, (_, i) => ({
  role: 'admin',
  user: { id: `userId-${i}`, name: `username-${i}`, email: `username-${i}@foo.bar` },
}));
