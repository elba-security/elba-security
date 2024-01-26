import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as authConnector from '@/connectors/jira/auth';
import { setupOrganisation } from './service';

const accessCode = 'mock-access-code';
const expiresIn = 60;

const organisation = {
  id: '11111111-1111-1111-1111-111111111111',
  refreshToken: 'refresh-token-123',
  region: 'us-test-1',
  accessToken: 'access-token-123',
  cloudId: '00000000-0000-0000-0000-000000000000',
};

describe('setupOrganisation', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should setup organisation when the accessCode is valid and the organisation is not registered', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValueOnce({ ids: [] });
    const getAccessToken = vi.spyOn(authConnector, 'getAccessToken').mockResolvedValue({
      refreshToken: organisation.refreshToken,
      expiresIn,
      accessToken: organisation.accessToken,
    });
    const getCloudId = vi
      .spyOn(authConnector, 'getCloudId')
      .mockResolvedValue({ cloudId: organisation.cloudId });

    await setupOrganisation({
      organisationId: organisation.id,
      region: organisation.region,
      accessCode,
    });

    await expect(db.select().from(organisationsTable)).resolves.toMatchObject([organisation]);

    expect(getAccessToken).toBeCalledTimes(1);
    expect(getAccessToken).toBeCalledWith(accessCode);
    expect(getCloudId).toBeCalledTimes(1);
    expect(getCloudId).toBeCalledWith(organisation.accessToken);
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'jira/jira.elba_app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
      {
        name: 'jira/token.refresh.triggered',
        data: {
          organisationId: organisation.id,
        },
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we are testing the mock
        ts: vi.getMockedSystemTime()!.getTime() + expiresIn * 1000 - 5 * 60 * 1000,
      },
    ]);
  });

  it('should setup organisation when the accessCode is valid and the organisation is already registered', async () => {
    const newAccessToken = 'new-access-token-123';
    const newRefreshToken = 'new-refresh-token-123';

    const send = vi.spyOn(inngest, 'send').mockResolvedValueOnce({ ids: [] });
    const getAccessToken = vi.spyOn(authConnector, 'getAccessToken').mockResolvedValue({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn,
    });
    const getCloudId = vi
      .spyOn(authConnector, 'getCloudId')
      .mockResolvedValue({ cloudId: organisation.cloudId });

    await db.insert(organisationsTable).values(organisation);

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        region: organisation.region,
        accessCode,
      })
    ).resolves.toBeUndefined();

    expect(getAccessToken).toBeCalledTimes(1);
    expect(getAccessToken).toBeCalledWith(accessCode);
    expect(getCloudId).toBeCalledTimes(1);

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toMatchObject([
      {
        id: organisation.id,
        cloudId: organisation.cloudId,
        region: organisation.region,
        refreshToken: newRefreshToken,
        token: newAccessToken,
      },
    ]);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'jira/jira.elba_app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
      {
        name: 'jira/token.refresh.triggered',
        data: {
          organisationId: organisation.id,
        },
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we are testing the mock
        ts: vi.getMockedSystemTime()!.getTime() + expiresIn * 1000 - 5 * 60 * 1000,
      },
    ]);
  });
});
