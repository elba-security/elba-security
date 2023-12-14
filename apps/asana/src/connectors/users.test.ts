/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '../../vitest/setup-msw-handlers';
import { getUsers } from './users';
import type { GetUsersResponseData } from './users';
import { AsanaError } from './commons/error';

const validAccessToken = 'valid_access_token';
const workspaceId = '1205941523188542';
const offset = 'some_data_offset';

describe('user connector', () => {
  describe('getUsers', () => {

    // Mock response data when there is another page
    const usersDataWithNextPage: GetUsersResponseData = {
      data: [
        {
          gid: 'some_data_gid',
          email: 'some_data_email',
          name: 'some_data_name',
          resource_type: 'some_data_id',
          role: "some_data_role",
          workspaces: [
            {
              gid: "some_data_gid",
              name: "some_data_name",
              resource_type: "some_data_resource_type"
            },
          ]
        }
      ],
      next_page: {
        offset: "some_data_offset",
        path: "some_data_path",
        uri: "some_data_uri"
      },
    };

    // Mock response data when there is no other page (last page)
    const usersDataLastPage: GetUsersResponseData = {
      data: [
        {
          gid: 'some_data_gid',
          email: 'some_data_email',
          name: 'some_data_name',
          resource_type: 'some_data_id',
          role: "some_data_role",
          workspaces: [
            {
              gid: "some_data_gid",
              name: "some_data_name",
              resource_type: "some_data_resource_type"
            },
          ]
        }
      ]
    };
    
    beforeEach(() => {
      server.use(
        http.get(`https://app.asana.com/api/1.0/users`, ({ request }) => {
          const accessToken = request.headers.get('Authorization')?.split(' ')[1];
          // Extracting the 'workspace' query parameter
          const url = new URL(request.url)
          const workspace = url.searchParams.get('workspace');
          const offsetParam = url.searchParams.get('offset');

          if ( accessToken !== validAccessToken || workspace !== workspaceId) {
            return new Response(undefined, { status: 401 });
          }
          if(!offsetParam){
            return Response.json(usersDataLastPage);
          }
          return Response.json(usersDataWithNextPage);
        })
      );
    });

    test('should return users and nextPage when the token is valid and there is another page', async () => {

      await expect(getUsers(validAccessToken, workspaceId, offset)).resolves.toStrictEqual({
        users: usersDataWithNextPage.data,
        offset: usersDataWithNextPage.next_page?.offset,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers(validAccessToken, workspaceId)).resolves.toStrictEqual({
        users: usersDataLastPage.data,
        offset: null, // Assuming the absence of next_page implies no more pages
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers('invalid_access_token', workspaceId)).rejects.toBeInstanceOf(AsanaError);
    });
  });
});
