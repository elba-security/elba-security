import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { getSharedLinks } from './shared-links';
import { mockSharedLinksFirstPage, mockSharedLinksSecondPage } from './__mocks__/shared-links';

const validToken = 'token-1234';
const teamMemberId = 'team-member-id';
const pathRoot = '10000';

describe('getShardLinks', () => {
  beforeEach(() => {
    server.use(
      http.post(`${env.DROPBOX_API_BASE_URL}/2/sharing/list_shared_links`, async ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }

        let result = mockSharedLinksFirstPage;

        const bodyText = await request.text();

        if (bodyText) {
          // eslint-disable-next-line -- @typescript-eslint/no-unsafe-assignment
          const bodyJson = JSON.parse(bodyText);

          // eslint-disable-next-line -- @typescript-eslint/no-unsafe-assignment
          const cursor = bodyJson.cursor;

          if (cursor) {
            result = mockSharedLinksSecondPage;
          }
        }

        return Response.json(result);
      })
    );
  });

  test('should return the shared links & return the next page cursor', async () => {
    await expect(
      getSharedLinks({
        accessToken: validToken,
        teamMemberId,
        isPersonal: false,
        pathRoot,
        cursor: null,
      })
    ).resolves.toStrictEqual({
      links: [
        {
          id: 'id:shared-file-id-1',
          linkAccessLevel: 'viewer',
          pathLower: 'path-1/share-file-1.yaml',
          url: 'https://foo.com/path-1/share-file-1.yaml',
        },
        {
          id: 'id:share-file-id-2',
          linkAccessLevel: 'viewer',
          pathLower: 'path-2/share-file-2.epub',
          url: 'https://foo.com/path-2/share-file-2.epub',
        },
      ],
      nextCursor: 'has-more-cursor',
    });
  });

  test('should list the next page shared links if the cursor hs value', async () => {
    await expect(
      getSharedLinks({
        accessToken: validToken,
        teamMemberId,
        isPersonal: false,
        pathRoot,
        cursor: 'next-cursor-2',
      })
    ).resolves.toStrictEqual({
      links: [
        {
          id: 'id:shared-file-id-3',
          linkAccessLevel: 'viewer',
          pathLower: 'path-1/share-file-3.yaml',
          url: 'https://foo.com/path-1/share-file-3.yaml',
        },
        {
          id: 'id:share-folder-id-4',
          linkAccessLevel: 'viewer',
          pathLower: 'path-2/share-folder-4',
          url: 'https://foo.com/path-2/share-folder-4',
        },
      ],
      nextCursor: null,
    });
  });
});
