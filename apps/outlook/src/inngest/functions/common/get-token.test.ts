import { expect, test, describe } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken } from './get-token';

const setup = createInngestFunctionMock(getToken, 'outlook/common.get_token.requested');
const TOKEN = 'token';
const ORG_ID = '4ef9c9ad-947b-4ec2-bbc4-cbe3190eee51';
const INVALID_ORG_ID = '1cd92295-c90f-426d-8af5-dab22eb4c073';

describe('get-token', () => {
  test('should return a token, if the there is token in db', async () => {
    await db.insert(organisationsTable).values({
      id: ORG_ID,
      tenantId: 'c647a27f-7060-4e8d-acc9-05a42218235b',
      region: 'eu',
      token: TOKEN,
    });
    const [result] = setup({
      organisationId: ORG_ID,
    });

    await expect(result).resolves.toStrictEqual(TOKEN);
  });

  test('should throw an error when there is no organisation in db ', async () => {
    const [result] = setup({
      organisationId: INVALID_ORG_ID,
    });

    await expect(result).rejects.toStrictEqual(
      new NonRetriableError(`Could not retrieve token for organisation with id=${INVALID_ORG_ID}`)
    );
  });
});
