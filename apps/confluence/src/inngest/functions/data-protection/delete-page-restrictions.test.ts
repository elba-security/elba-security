import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as pageRestrictionsConnector from '@/connectors/confluence/page-restrictions';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { accessToken, organisation } from '../__mocks__/organisations';
import { deletePageRestrictions } from './delete-page-restrictions';

const pageId = 'page-id';
const userIds = Array.from({ length: 10 }, (_, i) => `user-${i}`);

const setup = createInngestFunctionMock(
  deletePageRestrictions,
  'confluence/data_protection.delete_page_restrictions.requested'
);

describe('delete-page-restrictions', () => {
  test('should abort when organisation is not registered', async () => {
    vi.spyOn(pageRestrictionsConnector, 'deletePageUserRestrictions').mockResolvedValue();
    const [result] = setup({
      organisationId: organisation.id,
      pageId,
      userIds,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(pageRestrictionsConnector.deletePageUserRestrictions).toBeCalledTimes(0);
  });

  test('should delete page restrictions', async () => {
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(pageRestrictionsConnector, 'deletePageUserRestrictions').mockResolvedValue();
    const [result] = setup({
      organisationId: organisation.id,
      pageId,
      userIds,
    });

    await expect(result).resolves.toBeUndefined();
    expect(pageRestrictionsConnector.deletePageUserRestrictions).toBeCalledTimes(userIds.length);
    for (let i = 0; i < userIds.length; i++) {
      expect(pageRestrictionsConnector.deletePageUserRestrictions).toHaveBeenNthCalledWith(i + 1, {
        accessToken,
        instanceId: organisation.instanceId,
        pageId,
        userId: `user-${i}`,
      });
    }
  });
});
