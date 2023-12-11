import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import * as installationRepository from '@/connectors/installation';
import * as client from '@/inngest/client';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { setupOrganisation } from './service';

const installationId = 1;
const organisationId = `45a76301-f1dd-4a77-b12f-9d7d3fca3c90`;
const now = Date.now();

describe('setupOrganisation', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should not setup organisation when github account is not an organization', async () => {
    const send = vi.spyOn(client.inngest, 'send').mockResolvedValue({ ids: [] });
    vi.spyOn(installationRepository, 'getInstallation').mockResolvedValue({
      id: installationId,
      account: {
        type: 'PERSONNAL',
        login: 'some-login',
      },
      suspended_at: null,
    });

    await expect(setupOrganisation(installationId, organisationId)).rejects.toThrow(
      new Error('Cannot install elba github app on an account that is not an organization')
    );
    await expect(db.select().from(Organisation)).resolves.toHaveLength(0);
    expect(send).toBeCalledTimes(0);
  });

  test('should not setup organisation when github account is suspended', async () => {
    const send = vi.spyOn(client.inngest, 'send').mockResolvedValue({ ids: [] });
    vi.spyOn(installationRepository, 'getInstallation').mockResolvedValue({
      id: installationId,
      account: {
        type: 'Organization',
        login: 'some-login',
      },
      suspended_at: new Date().toISOString(),
    });

    await expect(setupOrganisation(installationId, organisationId)).rejects.toThrow(
      new Error('Installation is suspended')
    );
    await expect(db.select().from(Organisation)).resolves.toHaveLength(0);
    expect(send).toBeCalledTimes(0);
  });

  test('should setup organisation when github account is not suspended and is an Organization', async () => {
    const organisation = {
      id: organisationId,
      installationId,
      accountLogin: 'some-login',
    };
    const send = vi.spyOn(client.inngest, 'send').mockResolvedValue({ ids: [] });
    vi.spyOn(installationRepository, 'getInstallation').mockResolvedValue({
      id: organisation.installationId,
      account: {
        type: 'Organization',
        login: organisation.accountLogin,
      },
      suspended_at: null,
    });

    await expect(setupOrganisation(installationId, organisationId)).resolves.toMatchObject(
      organisation
    );
    await expect(db.select().from(Organisation)).resolves.toMatchObject([organisation]);
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'users/page_sync.requested',
      data: {
        organisationId,
        installationId: organisation.installationId,
        accountLogin: organisation.accountLogin,
        syncStartedAt: now,
        isFirstSync: true,
        cursor: null,
      },
    });
  });
});
