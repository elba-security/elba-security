import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { BamboohrError } from '../common/error';
import { getUsers } from './users';

const userName = 'user-name';
const password = 'password';
const subDomain = 'test-domain';
const validEncodedKey = btoa(`${userName}:${password}`);

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(
          `${env.BAMBOOHR_API_BASE_URL}/api/gateway.php/${subDomain}/v1/meta/users`,
          ({ request }) => {
            if (request.headers.get('Authorization') !== `Basic ${validEncodedKey}`) {
              return new Response(undefined, { status: 401 });
            }

            const responseData = {
              '0001': {
                employeeId: 1,
                firstName: 'firstName-1',
                lastName: 'lastName-1',
                email: 'user-1@foo.bar',
                status: 'enabled',
              },
              '0002': {
                employeeId: 2,
                firstName: 'firstName-2',
                lastName: 'lastName-2',
                email: 'user-2@foo.bar',
                status: 'enabled',
              },
            };
            return Response.json(responseData);
          }
        )
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ userName, password, subDomain })).resolves.toStrictEqual({
        validUsers: [
          {
            employeeId: 1,
            firstName: 'firstName-1',
            lastName: 'lastName-1',
            email: 'user-1@foo.bar',
            status: 'enabled',
          },
          {
            employeeId: 2,
            firstName: 'firstName-2',
            lastName: 'lastName-2',
            email: 'user-2@foo.bar',
            status: 'enabled',
          },
        ],
        invalidUsers: [],
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ userName, password, subDomain })).resolves.toStrictEqual({
        validUsers: [
          {
            employeeId: 1,
            firstName: 'firstName-1',
            lastName: 'lastName-1',
            email: 'user-1@foo.bar',
            status: 'enabled',
          },
          {
            employeeId: 2,
            firstName: 'firstName-2',
            lastName: 'lastName-2',
            email: 'user-2@foo.bar',
            status: 'enabled',
          },
        ],
        invalidUsers: [],
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ userName: 'foo-bar', password, subDomain })).rejects.toBeInstanceOf(
        BamboohrError
      );
    });
  });
});
