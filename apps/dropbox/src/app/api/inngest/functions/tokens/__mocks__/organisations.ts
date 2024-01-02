export const organisationWithExpiredToken = [
  {
    organisationId: '00000000-0000-0000-0000-000000000001',
    expiresAt: '2023-03-13T16:19:20.818Z',
  },
  {
    organisationId: '00000000-0000-0000-0000-000000000002',
    expiresAt: '2023-03-13T16:19:20.818Z',
  },
  {
    organisationId: '00000000-0000-0000-0000-000000000003',
    expiresAt: '2023-03-13T16:19:20.818Z',
  },
  {
    organisationId: '00000000-0000-0000-0000-000000000004',
    expiresAt: '2023-03-13T16:19:20.818Z',
    isUnauthorized: false,
  },
  {
    organisationId: '00000000-0000-0000-0000-000000000005',
    expiresAt: '2023-03-13T16:19:20.818Z',
    refreshAfter: '2023-03-13T20:00:20.818Z',
  },
  {
    organisationId: '00000000-0000-0000-0000-000000000006',
    expiresAt: '2023-03-13T16:19:20.818Z',
    isUnauthorized: true,
  },
];

export const selectedOrganisationToRefreshToken = [
  {
    expiresAt: new Date('2023-03-13T16:19:20.000Z'),
    organisationId: '00000000-0000-0000-0000-000000000001',
    refreshToken: 'test-refresh-token-1',
  },
  {
    expiresAt: new Date('2023-03-13T16:19:20.000Z'),
    organisationId: '00000000-0000-0000-0000-000000000002',
    refreshToken: 'test-refresh-token-2',
  },
  {
    expiresAt: new Date('2023-03-13T16:19:20.000Z'),
    organisationId: '00000000-0000-0000-0000-000000000003',
    refreshToken: 'test-refresh-token-3',
  },
  {
    expiresAt: new Date('2023-03-13T16:19:20.000Z'),
    organisationId: '00000000-0000-0000-0000-000000000004',
    refreshToken: 'test-refresh-token-4',
  },
  {
    expiresAt: new Date('2023-03-13T16:19:20.000Z'),
    organisationId: '00000000-0000-0000-0000-000000000005',
    refreshToken: 'test-refresh-token-5',
  },
];
