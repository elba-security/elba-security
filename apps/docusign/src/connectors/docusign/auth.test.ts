import { http } from 'msw';
import { describe, expect, test, beforeEach, vi } from 'vitest';
import { server } from '@elba-security/test-utils';
import * as userConnector from '@/connectors/docusign/users';
import { env } from '@/common/env/server';
import { getAuthUser } from './auth';

const accessToken = 'access-token-1234';

describe('auth connector', () => {
  describe('getAuthUser', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.DOCUSIGN_APP_INSTALL_URL}/oauth/userinfo`, () => {
          return Response.json({
            sub: '00000000-0000-0000-0000-000000000001',
            accounts: [
              {
                account_id: '00000000-0000-0000-0000-000000000010',
                base_uri: 'https://api.docusign.net',
                is_default: true,
                account_name: 'Account Name',
              },
            ],
          });
        })
      );
    });

    test('should return current authenticated user info', async () => {
      const getUser = vi.spyOn(userConnector, 'getUser').mockResolvedValue({
        isAdmin: 'True',
      });

      await expect(getAuthUser(accessToken)).resolves.toStrictEqual({
        accountId: '00000000-0000-0000-0000-000000000010',
        authUserId: '00000000-0000-0000-0000-000000000001',
        apiBaseUri: 'https://api.docusign.net',
      });

      expect(getUser).toBeCalledTimes(1);
      expect(getUser).toBeCalledWith({
        accessToken,
        accountId: '00000000-0000-0000-0000-000000000010',
        apiBaseUri: 'https://api.docusign.net',
        userId: '00000000-0000-0000-0000-000000000001',
      });
    });
  });
});
