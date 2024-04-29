export const organisations = Array.from({ length: 5 }, (_, i) => ({
  id: `00000000-0000-0000-0000-00000000000${i}`,
  token: `token-${i}`,
  region: `region-${i}`,
}));

export const users = Array.from({ length: 10 }, (_, i) => ({
  id: `user-${i}`,
  attributes: {
    role: `member-${i}`,
    first_name: `user-first-name-${i}`,
    last_name: `user-last-name-${i}`,
    email: `user-${i}@example.com`,
    pending_invite: false,
  },
}));

export const elbaUsers = Array.from({ length: 10 }, (_, i) => ({
  id: `user-${i}`,
  additionalEmails: [],
  authMethod: undefined,
  displayName: `user-first-name-${i} user-last-name-${i}`,
  email: `user-${i}@example.com`,
  role: `member-${i}`,
}));
