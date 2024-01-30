export const githubMembers = Array.from({ length: 5 }, (_, i) => ({
  id: `${100 + i}`,
  role: 'MEMBER' as const,
  login: `member-${i}`,
  name: `member ${i}`,
  email: `member-${i}@foo.bar`,
}));

export const githubAdmins = Array.from({ length: 5 }, (_, i) => ({
  id: `${1000 + i}`,
  role: 'ADMIN' as const,
  login: `admin-${i}`,
  name: `admin ${i}`,
  email: `admin-${i}@foo.bar`,
}));

export const githubUsers = [...githubAdmins, ...githubMembers];
