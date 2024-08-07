/* eslint-disable camelcase -- test conveniency */

export const githubInstallations = Array.from({ length: 5 }, (_, i) => ({
  id: 1000 + i,
  created_at: '2023-12-06T15:02:11.538Z',
  app_id: 100 + i,
  app_slug: `app-${i}`,
  permissions: {
    foo: 'read' as const,
    baz: 'write' as const,
  },
  suspended_at: null,
}));

export const githubApps = githubInstallations.map(({ app_id: id, app_slug }) => ({
  id,
  name: `app-name-${id}`,
  app_slug,
  description: `app-description-${id}`,
  html_url: `http//foo.bar/${id}`,
  owner: {
    name: `app-owner-${id}`,
  },
}));
