import { http } from 'msw';
import { describe, expect, test } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { removePermission } from './permissions';

const accessToken = 'token-1234';

describe('removePermission', () => {
  test('should remove shared links', async () => {
    server.use(
      http.post(`${env.DROPBOX_API_BASE_URL}/2/sharing/revoke_shared_link`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${accessToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return Response.json({});
      })
    );

    const result = await removePermission({
      accessToken,
      objectId: 'object-id',
      adminTeamMemberId: 'admin-team-member-id',
      metadata: {
        type: 'file',
        isPersonal: false,
        ownerId: 'team-member-id',
      },
      permission: {
        id: 'https://dropbox.com/link-1::https://dropbox.com/link-2',
        metadata: {
          sharedLinks: ['https://dropbox.com/link-1', 'https://dropbox.com/link-2'],
        },
      },
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  test('should remove the folder permission', async () => {
    server.use(
      http.post(
        `${env.DROPBOX_API_BASE_URL}/2/sharing/remove_folder_member`,
        async ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${accessToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const body = await request.json();
          expect(body).toEqual({
            leave_a_copy: false,
            shared_folder_id: 'folder-id-1',
            member: { '.tag': 'email', email: 'external-user-1@alpha.com' },
          });
          expect(request.headers.get('Dropbox-API-Select-Admin')).toBe('admin-team-member-id');

          return Response.json({
            '.tag': 'async_job_id',
            async_job_id: 'job-id',
          });
        }
      )
    );

    const result = await removePermission({
      accessToken,
      objectId: 'folder-id-1',
      adminTeamMemberId: 'admin-team-member-id',
      metadata: {
        type: 'folder',
        isPersonal: false,
        ownerId: 'team-member-id',
      },
      permission: {
        id: 'external-user-1@alpha.com',
        metadata: null,
      },
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).ok).toBe(true);
    await expect((result as Response).json()).resolves.toEqual({
      '.tag': 'async_job_id',
      async_job_id: 'job-id',
    });
  });

  test('should remove the file permission', async () => {
    server.use(
      http.post(
        `${env.DROPBOX_API_BASE_URL}/2/sharing/remove_file_member_2`,
        async ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${accessToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const body = await request.json();
          expect(body).toEqual({
            file: 'file-id-1',
            member: { '.tag': 'email', email: 'external-user-1@alpha.com' },
          });
          expect(request.headers.get('Dropbox-API-Select-Admin')).toBe('admin-team-member-id');

          return Response.json({});
        }
      )
    );

    const result = await removePermission({
      accessToken,
      objectId: 'file-id-1',
      adminTeamMemberId: 'admin-team-member-id',
      metadata: {
        type: 'file',
        isPersonal: false,
        ownerId: 'team-member-id',
      },
      permission: {
        id: 'external-user-1@alpha.com',
        metadata: null,
      },
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).ok).toBe(true);
    await expect((result as Response).json()).resolves.toEqual({});
  });
});
