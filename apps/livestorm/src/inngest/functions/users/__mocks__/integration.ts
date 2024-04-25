export const organisations = Array.from({ length: 5 }, (_, i) => ({
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${i}`,
  token: `token-${i}`,
  region: 'us',
}));
export const users = Array.from({ length: 10 }, (_, i) => ({
  id: `user-${i}`,
  attributes: {
    role: `member-${i}`,
    first_name: `User${i}FirstName`,
    last_name: `User${i}LastName`,
    email: `user${i}@example.com`,
  },
}));

export const elbaUsers = Array.from({ length: 10 }, (_, i) => ({
  id: `user-${i}`,
  additionalEmails: [],
  authMethod: undefined,
  displayName: `User${i}FirstName`,
  email: `user${i}@example.com`,
  role: `member-${i}`,
}));
