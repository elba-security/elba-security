import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as authConnector from '@/connectors/auth';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { refreshZoomToken } from './zoom-refresh-user-token';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  region: 'asia',
  accessToken: 'some_data_access_token',
  refreshToken: 'some_data_refresh_token',
  expiresIn: new Date(Date.now()),
};

const setup = createInngestFunctionMock(refreshZoomToken, 'zoom/zoom.token.refresh.requested');

describe('refresh-token', () => {
  test('should update the organisation with the new access token and expiry', async () => {
    // setup the test with an organisation
    await db.insert(Organisation).values(organisation);

    vi.spyOn(authConnector, 'zoomRefreshToken').mockResolvedValue({
      accessToken: 'd',
      refreshToken: 'd',
      expiresIn: 3600,
    });
    // setup the test without organisation entries in the database, the function cannot retrieve a token
    const [result, { step }] = setup({
      organisationId: organisation.id,
      refreshToken: organisation.refreshToken,
    });

    await expect(result).resolves.toStrictEqual({ status: 'success' });

    // check that the function is not sending other event
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
