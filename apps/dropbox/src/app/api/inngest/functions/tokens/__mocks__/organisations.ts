export const organisationWithExpiredToken = [
  {
    organisationId: 'b0771747-caf0-487d-a885-5bc3f1e9f770',
    expiresAt: '2023-03-13T16:19:20.818Z',
  },
  {
    organisationId: '97db2aef-7d09-412e-90d4-204829df6c9f',
    expiresAt: '2023-03-13T16:19:20.818Z',
  },
  {
    organisationId: '3a3a4485-fd9f-4687-919b-869faae93e58',
    expiresAt: '2023-03-13T16:19:20.818Z',
  },
  {
    organisationId: 'e3090d62-8701-45cf-85ad-c7c7496a2e85',
    expiresAt: '2023-03-13T16:19:20.818Z',
    isUnauthorized: false,
  },
  {
    organisationId: '61dd3cac-203f-4856-ba90-3b4ca0ce7348',
    expiresAt: '2023-03-13T16:19:20.818Z',
    refreshAfter: '2023-03-13T20:00:20.818Z', // Try after current data
  },
  {
    organisationId: '1aca1413-79b3-454b-968f-d94e215b9ec9',
    expiresAt: '2023-03-13T16:19:20.818Z',
    isUnauthorized: true,
  },
];

export const selectedOrganisationToRefreshToken = [
  {
    organisationId: 'b0771747-caf0-487d-a885-5bc3f1e9f770',
    refreshToken: 'test-refresh-token-0',
  },
  {
    organisationId: '3a3a4485-fd9f-4687-919b-869faae93e58',
    refreshToken: 'test-refresh-token-2',
  },
  {
    organisationId: '97db2aef-7d09-412e-90d4-204829df6c9f',
    refreshToken: 'test-refresh-token-1',
  },
  {
    organisationId: '61dd3cac-203f-4856-ba90-3b4ca0ce7348',
    refreshToken: 'test-refresh-token-4',
  },
  {
    organisationId: 'e3090d62-8701-45cf-85ad-c7c7496a2e85',
    refreshToken: 'test-refresh-token-3',
  },
];
