import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '../../vitest/setup-msw-handlers';
import { HarvestError } from './commons/error';
import { getHarvestId } from './accounts';
import { type HarvestAccount } from './types';
import { env } from '@/env';

const harvestAccounts: HarvestAccount[] = [
  {
    id: 12345,
    name: 'harvest-account-name',
    product: 'harvest-product',
  },
];

const validToken = 'valid-token';

describe('getHarvestId', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.HARVEST_AUTH_BASE_URL}/accounts`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(JSON.stringify({ accounts: harvestAccounts }), { status: 200 });
      })
    );
  });

  test('should throw an error when token is invalid', async () => {
    await expect(getHarvestId('invalid-token')).rejects.toBeInstanceOf(HarvestError);
  });
});
