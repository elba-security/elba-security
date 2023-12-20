import { expect, test, describe, vi } from 'vitest';
import * as microsoftModules from '@/repositories/microsoft/graph-api';
import * as utilsModules from '@/common/utils';
import * as inngestClient from '@/app/api/inngest/client';
import { db } from '@/lib/db';
import { organizations } from '@/schemas/organization';
import { handleMicrosoftAuthCallback } from './auth';

const tenantId = 'tenantId';
const elbaOrganizationId = 'elbaOrganizationId';

vi.mock('@/app/api/inngest/client', () => {
  return {
    inngest: {
      send: vi.fn(),
    },
  };
});

const setup = (...params: Parameters<typeof handleMicrosoftAuthCallback>) => {
  const send = vi.spyOn(inngestClient.inngest, 'send').mockResolvedValue({ ids: [] });
  return [
    handleMicrosoftAuthCallback(...params),
    {
      inngest: {
        send,
      },
    },
  ] as const;
};

describe('auth.ts', () => {
  describe('handleMicrosoftAuthCallback', () => {
    test('should return error if admin consent is not given', async () => {
      vi.spyOn(microsoftModules, 'getTokenByTenantId').mockResolvedValue({
        accessToken: 'accessToken',
        scopes: [],
      });
      const [result, mocks] = setup({
        tenantId,
        elbaOrganizationId,
        isAdminConsentGiven: false,
      });
      await expect(result).rejects.toThrow('You must give admin consent to continue');
      expect(mocks.inngest.send).toBeCalledTimes(0);
    });

    test('should return error if tenant is null', async () => {
      vi.spyOn(microsoftModules, 'getTokenByTenantId').mockResolvedValue({
        accessToken: 'accessToken',
        scopes: [],
      });
      const [result, mocks] = setup({
        tenantId: null,
        elbaOrganizationId,
        isAdminConsentGiven: false,
      });
      await expect(result).rejects.toThrow('You must give admin consent to continue');
      expect(mocks.inngest.send).toBeCalledTimes(0);
    });

    test('should throw error if scopes are missing', async () => {
      vi.spyOn(utilsModules, 'timeout').mockResolvedValue({});
      vi.spyOn(microsoftModules, 'getTokenByTenantId').mockResolvedValue({
        accessToken: 'accessToken',
        scopes: [],
      });
      const [result, mocks] = setup({ tenantId, elbaOrganizationId, isAdminConsentGiven: true });
      await expect(result).rejects.toThrow("Couldn't retrieve required scopes");
      expect(mocks.inngest.send).toBeCalledTimes(0);
    });

    test('should return success message if admin consent is given for the first time', async () => {
      vi.spyOn(utilsModules, 'timeout').mockResolvedValue({});
      vi.spyOn(microsoftModules, 'getTokenByTenantId').mockResolvedValue({
        accessToken: 'accessToken',
        scopes: [
          'DelegatedPermissionGrant.ReadWrite.All',
          'Application.ReadWrite.All',
          'User.Read.All',
        ],
      });
      const [result, mocks] = setup({ tenantId, elbaOrganizationId, isAdminConsentGiven: true });
      await expect(result).resolves.toEqual(
        'You have successfully given admin consent. You may close this window now.'
      );
      expect(mocks.inngest.send).toBeCalledTimes(1);
      expect(mocks.inngest.send).toBeCalledWith({
        data: { tenantId, isFirstScan: true },
        name: 'users/start',
      });
    });

    test('should return success message if admin consent is already given', async () => {
      await db.insert(organizations).values({ elbaOrganizationId, tenantId });
      vi.spyOn(utilsModules, 'timeout').mockResolvedValue({});
      vi.spyOn(microsoftModules, 'getTokenByTenantId').mockResolvedValue({
        accessToken: 'accessToken',
        scopes: [
          'DelegatedPermissionGrant.ReadWrite.All',
          'Application.ReadWrite.All',
          'User.Read.All',
        ],
      });
      const [result, mocks] = setup({ tenantId, elbaOrganizationId, isAdminConsentGiven: true });
      await expect(result).resolves.toEqual(
        'You have successfully given admin consent. You may close this window now.'
      );
      expect(mocks.inngest.send).toBeCalledTimes(1);
      expect(mocks.inngest.send).toBeCalledWith({
        data: { tenantId, isFirstScan: true },
        name: 'users/start',
      });
    });
  });
});
