/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */

import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import { getReplies } from '@/connectors/microsoft/replies/replies';
import type { MicrosoftMessage } from '@/connectors/microsoft/types';
import { server } from '../../../../vitest/setup-msw-handlers';
import { MicrosoftError } from '../commons/error';

const teamId = 'some-team-id';
const channelId = 'some-channel-id';
const messageId = 'some-message-id';

const validToken = 'token-1234';
const startSkipToken = 'start-skip-token';
const endSkipToken = 'end-skip-token';
const nextSkipToken = 'next-skip-token';

const invalidReplies = [
  {
    etag: `122123213`,
    createdDateTime: `2023-03-28T21:11:12.395Z`,
    lastEditedDateTime: `2024-02-28T21:11:12.395Z`,
    type: 'reply',
  },
  {
    etag: `122123213`,
    createdDateTime: `2023-03-28T21:11:12.395Z`,
    lastEditedDateTime: `2024-02-28T21:11:12.395Z`,
    type: 'reply',
  },
];

function createValidArray() {
  const objectsArray: MicrosoftMessage[] = [];

  for (let i = 0; i < Number(env.REPLIES_SYNC_BATCH_SIZE) - invalidReplies.length; i++) {
    const obj: MicrosoftMessage = {
      id: `some-id-${i}`,
      webUrl: `http://wb.uk-${i}`,
      etag: `122123213`,
      createdDateTime: `2023-03-28T21:11:12.395Z`,
      lastEditedDateTime: `2024-02-28T21:11:12.395Z`,
      messageType: 'message',
      body: {
        content: `content-${i}`,
      },
      from: {
        user: {
          id: `user-id-${i}`,
        },
      },
      type: 'reply',
    };
    objectsArray.push(obj);
  }

  return objectsArray;
}

const validReplies = createValidArray();

const replies = [...validReplies, ...invalidReplies];

describe('getReplies', () => {
  beforeEach(() => {
    server.use(
      http.get(
        `${env.MICROSOFT_API_URL}/teams/:teamId/channels/:channelId/messages/:messageId/replies`,
        ({ request, params }) => {
          if (
            request.headers.get('Authorization') !== `Bearer ${validToken}` ||
            params.teamId !== teamId ||
            params.channelId !== channelId ||
            params.messageId !== messageId
          ) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const top = url.searchParams.get('$top');
          const skipToken = url.searchParams.get('$skiptoken');

          const nextPageUrl = new URL(url);
          nextPageUrl.searchParams.set('$skiptoken', nextSkipToken);

          return Response.json({
            '@odata.nextLink':
              skipToken === endSkipToken ? null : decodeURIComponent(nextPageUrl.toString()),
            value: replies.slice(0, top ? Number(top) : 0),
          });
        }
      )
    );
  });

  test('should return replies and nextSkipToken when the token, teamId, messageId and channelId is valid and their is another page', async () => {
    await expect(
      getReplies({ teamId, channelId, messageId, token: validToken, skipToken: startSkipToken })
    ).resolves.toStrictEqual({
      nextSkipToken,
      validReplies,
      invalidReplies,
    });
  });

  test('should return replies and no nextSkipToken when the token, teamId, messageId and channelId is valid and their is no other page', async () => {
    await expect(
      getReplies({ teamId, channelId, messageId, token: validToken, skipToken: endSkipToken })
    ).resolves.toStrictEqual({
      validReplies,
      invalidReplies,
      nextSkipToken: null,
    });
  });

  test('should throws when the token is invalid', async () => {
    await expect(
      getReplies({
        teamId,
        channelId,
        messageId,
        token: 'invalid-token',
        skipToken: startSkipToken,
      })
    ).rejects.toBeInstanceOf(MicrosoftError);
  });

  test('should throws when the teamId is invalid and their is another page', async () => {
    await expect(
      getReplies({
        teamId: 'invalid-team-id',
        channelId,
        messageId,
        token: validToken,
        skipToken: startSkipToken,
      })
    ).rejects.toBeInstanceOf(MicrosoftError);
  });

  test('should throws when the channelId is invalid and their is another page', async () => {
    await expect(
      getReplies({
        channelId: 'invalid-channel-id',
        messageId,
        teamId,
        token: validToken,
        skipToken: startSkipToken,
      })
    ).rejects.toBeInstanceOf(MicrosoftError);
  });

  test('should throws when the messageId is invalid and their is another page', async () => {
    await expect(
      getReplies({
        channelId,
        messageId: 'invalid-message-id',
        teamId,
        token: validToken,
        skipToken: startSkipToken,
      })
    ).rejects.toBeInstanceOf(MicrosoftError);
  });
});
