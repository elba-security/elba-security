/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
/**
 * DISCLAIMER:
 * The tests provided in this file are specifically designed for the `auth` connectors function.
 * Theses tests exists because the services & inngest functions using this connector mock it.
 * If you are using an SDK we suggest you to mock it not to implements calls using msw.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import { type GitlabUser, getUsers } from './users';
import { GitlabError } from './commons/error';

const validToken = 'token-1234';
const page = "1";

const users: GitlabUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  username: `username-${i}`,
  name: `name-${i}`,
  email: `user-${i}@foo.bar`,
}));

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${env.GITLAB_API_BASE_URL}api/v4/users`, ({ request }) => {
          // briefly implement API endpoint behaviour
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          const url = new URL(request.url);
          const pageParam = url.searchParams.get('id_after');

          if (!pageParam) {
            return Response.json({ paging: null, data: users });
          }

          return Response.json({ paging: 1, data: users });
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({token:validToken, page: "1"})).resolves.toStrictEqual({data: {
        data: users,
        paging: 1,
      },paging: null});
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({token: validToken, page: null})).resolves.toStrictEqual({data: {
        data: users,
        paging: null,
      }, paging: null});
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({token: 'foo-bar', page})).rejects.toBeInstanceOf(GitlabError);
    });
  });
});
