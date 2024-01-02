import { createInngestFunctionMock } from '@elba-security/test-utils';
import { expect, test, describe } from 'vitest';
import { insertTestAccessToken } from '@/common/__mocks__/token';
import {
  organisationWithExpiredToken,
  selectedOrganisationToRefreshToken,
} from './__mocks__/organisations';
import { scheduleRefreshTokensJobs } from './schedule-refresh-tokens-jobs';

const setup = createInngestFunctionMock(scheduleRefreshTokensJobs);

describe('schedule-users-sync-jobs', () => {
  test('should not schedule any jobs when there are no organisations to refresh', async () => {
    const [result, { step }] = setup();
    await expect(result).resolves.toStrictEqual({ organisations: [] });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test.only('should schedule refresh tokens jobs when there are organisations', async () => {
    await insertTestAccessToken(
      organisationWithExpiredToken.map(
        ({ organisationId, expiresAt, isUnauthorized, refreshAfter }, i) => {
          const idx = i + 1;
          return {
            organisationId,
            accessToken: `test-access-token-${idx}`,
            refreshToken: `test-refresh-token-${idx}`,
            adminTeamMemberId: `test-team-member-id-${idx}`,
            rootNamespaceId: `root-name-space-id-${idx}`,
            teamName: 'test-team-name',
            expiresAt: new Date(expiresAt),
            unauthorizedAt: isUnauthorized ? new Date(Date.now()) : null,
            refreshAfter: refreshAfter ? new Date(refreshAfter) : null,
          };
        }
      )
    );

    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      organisations: expect.arrayContaining(selectedOrganisationToRefreshToken),
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'run-refresh-tokens',
      expect.arrayContaining(
        selectedOrganisationToRefreshToken.map((organisation) => ({
          name: 'tokens/run-refresh-tokens',
          data: { ...organisation },
        }))
      )
    );
  });
});
