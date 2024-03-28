import { JWT } from 'google-auth-library';
import { vi } from 'vitest';
import { env } from '@/common/env/server';
import { GOOGLE_SCOPES } from '../constants';
import * as googleClients from '../clients';

export const spyOnGoogleServiceAccountClient = () => {
  return (
    vi
      .spyOn(googleClients, 'getGoogleServiceAccountClient')
      // eslint-disable-next-line @typescript-eslint/require-await -- this is a mock
      .mockImplementation(async (managerEmail: string, _isAdmin = false) => {
        const client = new JWT({
          key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
          email: env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
          scopes: GOOGLE_SCOPES,
          subject: managerEmail,
        });

        vi.spyOn(client, 'authorize');

        return client;
      })
  );
};
