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
import type { HerokuError } from './commons/error';
import { type HerokuUser, type HerokuPagination, getHerokuUsers, deleteTeamMember } from './users';

const validToken = 'valid_token';
const validTeamId = 'valid_team_id';
const validMemberId = 'valid_member_id';

const users: HerokuUser[] = [
  {
    role: 'admin',
    user: {
      id: 'user_id_1',
      name: 'User 1',
      email: 'user1@example.com',
    },
  },
];

const pagination: HerokuPagination = {
  nextRange: 'next-range',
};

describe('getHerokuUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`https://api.heroku.com/teams/${validTeamId}/members`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }

        return new Response(JSON.stringify({ users, pagination }), {
          status: 200,
          headers: {
            Accept: 'application/vnd.heroku+json; version=3',
          },
        });
      })
    );
  });

  test('should fetch Heroku users when token and team ID are valid', async () => {
    const result = await getHerokuUsers(validToken, validTeamId);
    expect(result.users).toEqual(users);
    expect(result.pagination).toEqual(pagination);
  });

  test('should throw HerokuError when token is invalid', async () => {
    try {
      await getHerokuUsers('invalid_token', validTeamId);
    } catch (error) {
      expect((error as HerokuError).message).toEqual('Could not retrieve Heroku users');
    }
  });
});

describe('deleteTeamMember', () => {
  beforeEach(() => {
    server.use(
      http.delete(`https://api.heroku.com/teams/${validTeamId}/members/${validMemberId}`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(undefined, { status: 200 });
      })
    );
  });

  test('should delete team member successfully when token, team ID, and member ID are valid', async () => {
    await expect(deleteTeamMember(validToken, validTeamId, validMemberId)).resolves.not.toThrow();
  });

  test('should throw HerokuError when token is invalid', async () => {
    try {
      await deleteTeamMember('invalid_token', validTeamId, validMemberId);
    } catch (error) {
      expect((error as HerokuError).message).toEqual(`Could not delete team member: ${validMemberId}`);
    }
  });
});