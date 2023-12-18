import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as authConnector from '@/connectors/auth';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { tokenRefresh } from './refresh-token';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  name: 'some_data_name',
  email: 'some_data_email',
  accessToken: 'some_data_access_token',
  refreshToken: 'some_data_refresh_token',
  expiresAt: new Date(Date.now()),
  asanaId: 'some_data_asana_id',
  gid: 'some_data_gid',
  webhookSecret: 'some_data_webhook_secret',
};

const setup = createInngestFunctionMock(tokenRefresh, 'token/refresh');

describe('refresh-token', () => {
  test('should update the organisation with the new access token and expiry', async () => {
    // setup the test with an organisation
    await db.insert(Organisation).values(organisation);
    vi.spyOn(authConnector, 'refreshToken').mockResolvedValue({
      access_token: 'd',
      expires_in: 3600,
    });
    // setup the test without organisation entries in the database, the function cannot retrieve a token
    const [result, { step }] = setup({
      organisationId: organisation.id,
      refreshTokenInfo: 'abc123',
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    // check that the function is not sending other event
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
