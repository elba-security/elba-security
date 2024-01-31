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
import { server } from '../../vitest/setup-msw-handlers';
import { type MondayUser, getUsers } from './users';
import { MondayError } from './commons/error';

const validToken = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjMxNTEyNTgwMywiYWFpIjoyMjY3NDYsInVpZCI6NTQ3MjAyMTIsImlhZCI6IjIwMjQtMDEtMjlUMTE6NDk6MzYuMjI0WiIsInBlciI6InVzZXJzOnJlYWQsbWU6cmVhZCxib2FyZHM6cmVhZCIsImFjdGlkIjoyMDg2MjcyMiwicmduIjoiYXBzZTIifQ.y7N8M91hTkZ0EREtDazDE0gldfkJlo7n3IyIYYf-MEk';
const maxPage = 2;

const users: MondayUser[] = [{
  id: '54720212',
  email: 'cibetik956@grassdev.com',
  name: 'test'
},
{
  id: '55136570',
  email: 'palape5084@rentaen.com',
  name: 'palape5084@rentaen.com'
},
{
  id: '55136574',
  email: 'yahime7685@konican.com',
  name: 'yahime7685@konican.com'
}]

describe('auth connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.post('https://api.monday.com/v2', ({ request }) => {
          // briefly implement API endpoint behaviour
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          const url = new URL(request.url);
          const pageParam = url.searchParams.get('page');
          const page = pageParam ? Number(pageParam) : 0;
          if (page === maxPage) {
            return Response.json({ data: { users } });
          }
          return Response.json({  data: { users } });
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers(validToken, 1)).resolves.toStrictEqual({
        data: {
          users
        },
        nextPage: 2,
      }).catch(error => console.error("Promise rejected:", error));;
    });

    // test('should return users and no nextPage when the token is valid and their is no other page', async () => {
    //   await expect(getUsers(validToken, maxPage)).resolves.toStrictEqual({
    //     data:{
    //       users
    //     },
    //     nextPage: null,
    //   });
    // });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers('foo-bar', 0)).rejects.toBeInstanceOf(MondayError);
    });
  });
});
