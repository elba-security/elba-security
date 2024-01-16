import { createInngestFunctionMock } from '@elba-security/test-utils';
import { expect, test, describe } from 'vitest';
import { insertOrganisations } from '@/common/__mocks__/token';
import { scheduleDataProtectionSyncJobs } from './schedule-sync-jobs';

const setup = createInngestFunctionMock(scheduleDataProtectionSyncJobs);

describe('scheduleDataProtectionSyncJobs', () => {
  test.only('should not schedule any jobs when there are no organisations to refresh', async () => {
    const [result, { step }] = setup();
    await expect(result).resolves.toStrictEqual({ organisations: [] });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule sync jobs for the available organisations', async () => {
    await insertOrganisations({
      size: 3,
      expiresAt: [
        new Date('2023-01-10T20:00:00.000Z'), // Expired token
        new Date('2023-01-14T20:00:00.000Z'),
        new Date('2023-01-14T20:00:00.000Z'),
      ],
    });

    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      organisations: [
        {
          accessToken: 'access-token-2',
          adminTeamMemberId: 'admin-team-member-id-1',
          organisationId: '00000000-0000-0000-0000-000000000002',
          pathRoot: 'root-namespace-id',
        },
        {
          accessToken: 'access-token-3',
          adminTeamMemberId: 'admin-team-member-id-1',
          organisationId: '00000000-0000-0000-0000-000000000003',
          pathRoot: 'root-namespace-id',
        },
      ],
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'send-event-create-shared-link-sync-jobs',
      expect.arrayContaining([
        {
          name: 'data-protection/create-shared-link-sync-jobs',
          data: {
            accessToken: 'access-token-2',
            organisationId: '00000000-0000-0000-0000-000000000002',
            adminTeamMemberId: 'admin-team-member-id-1',
            pathRoot: 'root-namespace-id',
            syncStartedAt: '2023-01-14T20:00:00.000Z',
            isFirstScan: false,
          },
        },
        {
          name: 'data-protection/create-shared-link-sync-jobs',
          data: {
            accessToken: 'access-token-3',
            organisationId: '00000000-0000-0000-0000-000000000003',
            adminTeamMemberId: 'admin-team-member-id-1',
            pathRoot: 'root-namespace-id',
            syncStartedAt: '2023-01-14T20:00:00.000Z',
            isFirstScan: false,
          },
        },
      ])
    );
  });
});
