import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '../../vitest/setup-msw-handlers';
import { getUsers, deleteUser } from './users';
import type { HarvestError } from './commons/error';
import { users } from './__mocks__/fetch-users';

const validToken = 'valid-access-token';
const harvestId = 22222;
const userId = 12345;
const lastPage = 2; //mock value
const nextPage = 1;
const firstPage = 0;

describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`https://api.harvestapp.com/v2/users`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '0');

        return new Response(
          JSON.stringify({
            users,
            next_page: page === lastPage ? null : nextPage,
          }),
          { status: 200 }
        );
      })
    );
  });

  test('should fetch users when token is valid', async () => {
    const result = await getUsers(validToken, harvestId, null);
    expect(result.users).toEqual(users);
  });

  test('should throw HarvestError when token is invalid', async () => {
    try {
      await getUsers('invalidToken', harvestId, null);
    } catch (error) {
      expect((error as HarvestError).message).toEqual('Could not retrieve harvest users');
    }
  });

  test('should return next page as null when end of list is reached', async () => {
    const result = await getUsers(validToken, harvestId, lastPage);
    expect(result.next_page).toBeNull();
  });

  test('should return next page when there is next page', async () => {
    const result = await getUsers(validToken, harvestId, firstPage);
    expect(result.next_page).toEqual(nextPage);
  });
});

describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete<{ userId: string }>(
        `https://api.harvestapp.com/v2/users/:userId`,
        ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return new Response(undefined, { status: 200 });
        }
      )
    );
  });

  test('should delete user successfully when token is valid', async () => {
    await expect(deleteUser(validToken, harvestId, userId)).resolves.not.toThrow();
  });

  test('should throw HarvestError when token is invalid', async () => {
    try {
      await deleteUser('invalidToken', harvestId, userId);
    } catch (error) {
      expect((error as HarvestError).message).toEqual(`Could not delete user with Id: ${userId}`);
    }
  });
});
