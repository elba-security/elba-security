export const organisations = Array.from({ length: 5 }, (_, i) => ({
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${i}`,
  token: `token-${i}`,
  region: 'us',
}));
export const data = Array.from({ length: 10 }, (_, i) => ({
  id: `user-${i}`,
  attributes: {
    role: `host${i}`,
    first_name: `User${i}FirstName`,
    last_name: `User${i}LastName`,
    email: `user${i}@example.com`,
  },
}));
