import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as microsoftModules from '@/repositories/microsoft/graph-api';
import { db } from '@/lib/db';
import { organizations } from '@/schemas/organization';
import { scanUsersByTenantId } from './users';

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
    vi.spyOn(microsoftModules, 'getPaginatedUsersByTenantId').mockResolvedValue({
      '@odata.context': 'context',
      value: [
        {
          id: 'user-1',
          displayName: 'user 1',
          mail: 'mail@example.com',
          otherMails: ['other-mail1@example.com', 'other-mail2@example.com'],
        },
      ],
    });
    const result = await scanUsersByTenantId({ tenantId, accessToken, pageLink: undefined });
    expect(result).toStrictEqual({
      nextLink: undefined,
      formattedUsers: [
        {
          id: 'user-1',
          displayName: 'user 1',
          email: 'mail@example.com',
          additionalEmails: ['other-mail1@example.com', 'other-mail2@example.com'],
        },
      ],
    });
  });
});
