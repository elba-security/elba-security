import { fail } from 'node:assert';
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '../../vitest/setup-msw-handlers';
import { type HarvestError } from './commons/error';
import { getHarvestId } from './accounts';
import { harvestAccounts } from './__mocks__/fetch-accounts';

const validToken = 'valid-token';
const harvestId = 12345;

describe('getHarvestId', () => {
  beforeEach(() => {
    server.use(
      http.get('https://id.getharvest.com/api/v2/accounts', ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(JSON.stringify({ accounts: harvestAccounts }), { status: 200 });
      })
    );
  });

  test('should not throw when token is valid', async () => {
    try {
      const result = await getHarvestId(validToken);
      expect(result).toEqual(harvestId);
    } catch (error) {
      expect(error).toBeNull();
    }
  });

  test('should throw an error when token is invalid', async () => {
    try {
      await getHarvestId('invalid-token');
      fail('Expected an error to be thrown');
    } catch (error) {
      expect((error as HarvestError).message).toBe('Failed to fetch');
    }
  });
});
