export const organisations = Array.from({ length: 5 }, (_, i) => ({
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${i}`,
  installationId: i,
  accountLogin: `login-${i}`,
  region: 'us',
}));
