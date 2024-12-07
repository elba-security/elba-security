/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
import { server } from '@elba-security/test-utils';
import { http } from 'msw';
import { beforeEach, describe, expect, test } from 'vitest';
import { getAccountId } from './account';
import { ElasticError } from './common/error';

const apiKey = 'test-api-key';
const accountId = 2370721950;
const accounts = [{ id: accountId }];

describe('account connector', () => {
  describe('getAccountId', () => {
    beforeEach(() => {
      server.use(
        http.get(`https://api.elastic-cloud.com/api/v1/organizations`, ({ request }) => {
          if (request.headers.get('Authorization') !== `ApiKey ${apiKey}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({ organizations: accounts });
        })
      );
    });

    test('should return accounts when the apiKey is valid', async () => {
      await expect(getAccountId({ apiKey })).resolves.toStrictEqual({
        accountId: String(accountId),
      });
    });

    test('should throws when the apiKey is invalid', async () => {
      await expect(
        getAccountId({
          apiKey: 'foo-id',
        })
      ).rejects.toBeInstanceOf(ElasticError);
    });
  });
});
