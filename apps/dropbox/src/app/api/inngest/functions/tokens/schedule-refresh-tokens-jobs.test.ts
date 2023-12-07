import { expect, test, describe } from 'vitest';
import { scheduleRefreshTokensJobs } from './schedule-refresh-tokens-jobs';
import { mockInngestFunction } from '@/common/__mocks__/inngest';
import { insertOrganisations, insertTestAccessToken } from '@/common/__mocks__/token';
import {
  organisationWithExpiredToken,
  selectedOrganisationToRefreshToken,
} from './__mocks__/organisations';

describe('schedule-users-sync-jobs', () => {
  test('should not schedule any jobs when there are no organisations to refresh', async () => {
    const { result, step } = mockInngestFunction(scheduleRefreshTokensJobs);
    await expect(result).resolves.toStrictEqual({ organisations: [] });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test.only('should schedule refresh tokens jobs when there are organisations', async () => {
    await Promise.all(
      organisationWithExpiredToken.map(
        ({ organisationId, expiresAt, isUnauthorized, refreshAfter }, index) => {
          return insertTestAccessToken({
            organisationId,
            accessToken: `test-access-token-${index}`,
            refreshToken: `test-refresh-token-${index}`,
            adminTeamMemberId: `test-team-member-id-${index}`,
            rootNamespaceId: `root-name-space-id-${index}`,
            teamName: 'test-team-name',
            expiresAt: new Date(expiresAt),
            unauthorizedAt: isUnauthorized ? new Date(Date.now()) : null,
            refreshAfter: refreshAfter ? new Date(refreshAfter) : null,
          });
        }
      )
    );

    const { result, step } = mockInngestFunction(scheduleRefreshTokensJobs);

    await expect(result).resolves.toStrictEqual({
      organisations: expect.arrayContaining(selectedOrganisationToRefreshToken),
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'run-refresh-tokens',
      expect.arrayContaining(
        selectedOrganisationToRefreshToken.map((organisation) => ({
          name: 'tokens/run-refresh-tokens',
          data: { ...organisation, isFirstScan: false },
        }))
      )
    );
  });
});
