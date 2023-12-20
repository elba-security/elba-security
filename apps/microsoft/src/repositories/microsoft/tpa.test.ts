import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as microsoftModules from '@/repositories/microsoft/graph-api';
import { db } from '@/lib/db';
import { organizations } from '@/schemas/organization';
import { scanThirdPartyAppsByTenantId } from './tpa';

vi.mock('@/repositories/integration/permission-grant');
vi.mock('@/common/utils');

beforeEach(() => {
  vi.resetAllMocks();
});

const tenantId = 'tenantId';
const elbaOrganizationId = 'elbaOrganizationId';
const accessToken = 'accessToken';

describe('scanThirdPartyAppsByTenantId', () => {
  it('should scan third-party apps and return formatted objects', async () => {
    await db.insert(organizations).values({ elbaOrganizationId, tenantId });
    vi.spyOn(microsoftModules, 'getTokenByTenantId').mockResolvedValue({
      accessToken: 'accessToken',
      scopes: [],
    });
    vi.spyOn(microsoftModules, 'getPaginatedServicePrincipalsByTenantId').mockResolvedValue({
      '@odata.context': 'context',
      value: [
        {
          id: 'id-1',
          appDisplayName: 'displayName',
          description: 'description',
          homepage: 'homepage',
          info: {
            logoUrl: 'logoUrl',
          },
          verifiedPublisher: {
            displayName: 'verifiedPublisher',
          },
          appRoleAssignedTo: [
            {
              principalId: 'principalId',
              id: 'appRoleId',
            },
          ],
        },
      ],
    });
    const result = await scanThirdPartyAppsByTenantId({
      tenantId,
      accessToken,
      pageLink: undefined,
    });
    expect(result).toStrictEqual({
      pageLink: undefined,
      thirdPartyAppsObjects: {
        apps: [
          {
            description: 'description',
            id: 'id-1',
            name: 'displayName',
            publisherName: 'verifiedPublisher',
            logoUrl: 'logoUrl',
            url: 'homepage',
            users: [
              {
                id: 'principalId',
                metadata: {
                  appRoleId: 'appRoleId',
                },
                scopes: [],
              },
            ],
          },
        ],
      },
    });
  });
});
