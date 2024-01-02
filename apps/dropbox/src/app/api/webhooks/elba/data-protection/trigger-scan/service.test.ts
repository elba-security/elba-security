import { expect, test, describe, vi, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { inngest } from '@/common/clients/inngest';
import { db, tokens } from '@/database';
import { mockRequestResponse } from '@/test-utils/mock-app-route';
import { POST as handler } from './route';

const organisationId = '00000000-0000-0000-0000-000000000001';
const accessToken = 'access-token-1';
const adminTeamMemberId = 'team-member-id';
const rootNamespaceId = 'root-name-space-id';

describe('triggerDataProtectionScan', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should throws when organisation is not found', async () => {
    const { req } = mockRequestResponse({
      body: {
        organisationId: '00000000-0000-0000-0000-000000000002',
      },
    });

    try {
      await handler(req);
    } catch (error) {
      expect(error.message).toBe(
        'Organisation not found with id=00000000-0000-0000-0000-000000000002'
      );
    }
  });

  test('should schedule apps sync when the organisation is registered', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });
    vi.setSystemTime('2021-01-01T00:00:00.000Z');

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
        organisationId: '00000000-0000-0000-0000-000000000001',
      },
    });

    const result = await handler(req);

    await expect(result.status).toBe(200);
    await expect(result.json()).resolves.toStrictEqual({
      success: true,
    });

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'data-protection/create-shared-link-sync-jobs',
      data: {
        accessToken,
        adminTeamMemberId,
        organisationId,
        pathRoot: rootNamespaceId,
        isFirstScan: true,
        syncStartedAt: '2021-01-01T00:00:00.000Z',
      },
    });
    await expect(
      db
        .select({
          organisationId: tokens.organisationId,
          accessToken: tokens.accessToken,
          pathRoot: tokens.rootNamespaceId,
          adminTeamMemberId: tokens.adminTeamMemberId,
        })
        .from(tokens)
        .where(eq(tokens.organisationId, organisationId))
    ).resolves.toMatchObject([
      {
        accessToken,
        adminTeamMemberId,
        organisationId,
        pathRoot: rootNamespaceId,
      },
    ]);
  });
});
