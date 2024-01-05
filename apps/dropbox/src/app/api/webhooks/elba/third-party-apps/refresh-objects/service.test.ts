import { expect, test, describe, vi } from 'vitest';
import { inngest } from '@/common/clients/inngest';
import { db, tokens } from '@/database';
import { mockRequestResponse } from '@/test-utils/mock-app-route';
import { POST as handler } from './route';

const organisationId = '00000000-0000-0000-0000-000000000001';
const accessToken = 'access-token-1';
const adminTeamMemberId = 'team-member-id';
const rootNamespaceId = 'root-name-space-id';
const userId = 'team-member-id-1';

describe('triggerDataProtectionScan', () => {
  test('should throws when organisation is not found', async () => {
    const { req } = mockRequestResponse({
      body: {
        organisationId,
        userId,
      },
    });

    try {
      await handler(req);
    } catch (error) {
      expect(error.message).toBe(`Organisation not found with id=${organisationId}`);
    }
  });

  test('should send request to refresh third party objects', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await db
      .insert(tokens)
      .values([
        {
          organisationId,
          accessToken,
          refreshToken: `refresh-token`,
          adminTeamMemberId,
          rootNamespaceId,
          teamName: 'test-team-name',
          expiresAt: new Date('2023-03-13T20:19:20.818Z'),
        },
      ])
      .execute();

    const { req } = await mockRequestResponse({
      body: {
        organisationId,
        userId,
      },
    });

    const result = await handler(req);

    await expect(result.status).toBe(200);
    await expect(result.json()).resolves.toStrictEqual({
      success: true,
    });

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'third-party-apps/refresh-objects',
      data: {
        accessToken,
        organisationId,
        isFirstScan: false,
        teamMemberId: userId,
      },
    });
  });
});
