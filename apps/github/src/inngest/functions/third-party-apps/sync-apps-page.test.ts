/* eslint-disable @typescript-eslint/no-non-null-assertion -- test conveniency */
import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import * as githubOrganization from '@/connectors/github/organization';
import * as githubApp from '@/connectors/github/app';
import { db } from '@/database/client';
import { adminsTable, organisationsTable } from '@/database/schema';
import { env } from '@/env';
import { syncAppsPage } from './sync-apps-page';
import { elbaApps } from './__mocks__/snapshots';
import { githubApps, githubInstallations } from './__mocks__/github';
import { admins, organisation } from './__mocks__/integration';

const data = {
  installationId: organisation.installationId,
  organisationId: organisation.id,
  accountLogin: organisation.accountLogin,
  syncStartedAt: Date.now(),
  region: organisation.region,
  isFirstSync: true,
  cursor: null,
};

const setup = createInngestFunctionMock(
  syncAppsPage,
  'github/third_party_apps.page_sync.requested'
);

describe('sync-apps-page', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
    await db.insert(adminsTable).values(admins);
  });

  test('should sync apps when there is another apps page', async () => {
    const elba = spyOnElba();
    const nextCursor = '1234';
    const getPaginatedOrganizationInstallations = vi
      .spyOn(githubOrganization, 'getPaginatedOrganizationInstallations')
      .mockResolvedValue({
        nextCursor,
        validInstallations: githubInstallations,
        invalidInstallations: [],
      });
    const getApp = vi.spyOn(githubApp, 'getApp').mockImplementation((_, appSlug) => {
      const app = githubApps.find((item) => item.app_slug === appSlug);
      return Promise.resolve(app!);
    });

    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(getPaginatedOrganizationInstallations).toBeCalledTimes(1);
    expect(getPaginatedOrganizationInstallations).toBeCalledWith(
      data.installationId,
      data.accountLogin,
      data.cursor
    );

    expect(getApp).toBeCalledTimes(githubInstallations.length);
    for (let i = 0; i < githubInstallations.length; i++) {
      const githubInstallation = githubInstallations[i]!;
      expect(getApp).toHaveBeenNthCalledWith(
        i + 1,
        data.installationId,
        githubInstallation.app_slug
      );
    }

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledWith({
      apps: elbaApps,
    });

    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-apps-page', {
      name: 'github/third_party_apps.page_sync.requested',
      data: {
        ...data,
        cursor: nextCursor,
      },
    });
  });

  test('should scan apps page and finalize scan when there is no other apps page', async () => {
    const elba = spyOnElba();
    const getPaginatedOrganizationInstallations = vi
      .spyOn(githubOrganization, 'getPaginatedOrganizationInstallations')
      .mockResolvedValue({
        nextCursor: null,
        validInstallations: githubInstallations,
        invalidInstallations: [],
      });
    const getApp = vi.spyOn(githubApp, 'getApp').mockImplementation((_, appSlug) => {
      const app = githubApps.find((item) => item.app_slug === appSlug);
      return Promise.resolve(app!);
    });

    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(getPaginatedOrganizationInstallations).toBeCalledTimes(1);
    expect(getPaginatedOrganizationInstallations).toBeCalledWith(
      data.installationId,
      data.accountLogin,
      data.cursor
    );

    expect(getApp).toBeCalledTimes(githubInstallations.length);
    for (let i = 0; i < githubInstallations.length; i++) {
      const githubInstallation = githubInstallations[i]!;
      expect(getApp).toHaveBeenNthCalledWith(
        i + 1,
        data.installationId,
        githubInstallation.app_slug
      );
    }

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledWith({
      apps: elbaApps,
    });

    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledWith({
      syncedBefore: new Date(data.syncStartedAt).toISOString(),
    });

    expect(step.sendEvent).not.toBeCalled();
  });
});
