import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/env';
import { getReplies, getReply } from '@/connectors/microsoft/replies/replies';
import type { MicrosoftReply } from '@/connectors/microsoft/types';
import { MicrosoftError } from '../commons/error';

const teamId = 'some-team-id';
const channelId = 'some-channel-id';
const messageId = 'some-message-id';
const replyId = 'some-reply-id';

const validToken = 'token-1234';
const invalidDataToken = 'invali-data-token';
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

const reply: MicrosoftReply = {
  id: 'some-id',
  webUrl: 'http://wb.uk.com',
  etag: `122123213`,
  createdDateTime: '2023-03-28T21:11:12.395Z',
  lastEditedDateTime: '2024-02-28T21:11:12.395Z',
  from: {
    user: {
      id: 'user-id',
    },
    application: null,
  },
  messageType: 'message',
  type: 'reply',
  body: {
    content: 'content',
  },
};

function createValidArray() {
  const objectsArray: MicrosoftReply[] = [];

  for (let i = 0; i < Number(env.REPLIES_SYNC_BATCH_SIZE) - invalidReplies.length; i++) {
    const obj: MicrosoftReply = {
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
        application: null,
      },
      type: 'reply',
    };
    objectsArray.push(obj);
  }

  return objectsArray;
}

const validReplies = createValidArray();

const replies = [...validReplies, ...invalidReplies];

describe('replies connector', () => {
  describe('getReplies', () => {
    beforeEach(() => {
      server.use(
        http.get(
          `${env.MICROSOFT_API_URL}/teams/:teamId/channels/:channelId/messages/:messageId/replies`,
          ({ request, params }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }
            if (
              params.teamId !== teamId ||
              params.channelId !== channelId ||
              params.messageId !== messageId
            ) {
              return new Response(undefined, { status: 400 });
            }

            const url = new URL(request.url);
            const top = url.searchParams.get('$top');
            const skipToken = url.searchParams.get('$skiptoken');

            const nextPageUrl = new URL(url);
            nextPageUrl.searchParams.set('$skiptoken', nextSkipToken);

            return new Response(
              JSON.stringify({
                '@odata.nextLink':
                  skipToken === endSkipToken ? null : decodeURIComponent(nextPageUrl.toString()),
                value: replies.slice(0, top ? Number(top) : 0),
              })
            );
          }
        )
      );
    });

    test('should return replies and nextSkipToken when the token, teamId, messageId and channelId are valid and there is another page', async () => {
      await expect(
        getReplies({ teamId, channelId, messageId, token: validToken, skipToken: startSkipToken })
      ).resolves.toStrictEqual({
        nextSkipToken,
        validReplies,
        invalidReplies,
      });
    });

    test('should return replies and no nextSkipToken when the token, teamId, messageId and channelId are valid and there is no other page', async () => {
      await expect(
        getReplies({ teamId, channelId, messageId, token: validToken, skipToken: endSkipToken })
      ).resolves.toStrictEqual({
        validReplies,
        invalidReplies,
        nextSkipToken: null,
      });
    });

    test('should throw when the token is invalid', async () => {
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

    test('should throw when the teamId is invalid and there is another page', async () => {
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

    test('should throw when the channelId is invalid and there is another page', async () => {
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

    test('should throw when the messageId is invalid and there is another page', async () => {
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

  describe('getReply', () => {
    beforeEach(() => {
      server.use(
        http.get(
          `${env.MICROSOFT_API_URL}/teams/:teamId/channels/:channelId/messages/:messageId/replies/:replyId`,
          ({ request, params }) => {
            if (request.headers.get('Authorization') === `Bearer ${invalidDataToken}`) {
              return new Response(JSON.stringify(null));
            }

            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }

            if (
              params.teamId !== teamId ||
              params.channelId !== channelId ||
              params.messageId !== messageId ||
              params.replyId !== replyId
            ) {
              return new Response(undefined, { status: 404 });
            }

            return new Response(JSON.stringify(reply));
          }
        )
      );
    });

    test('should return the reply when the token is valid, teamId, channelId, messageId and replyId are valid ', async () => {
      await expect(
        getReply({ teamId, channelId, messageId, replyId, token: validToken })
      ).resolves.toStrictEqual(reply);
    });

    test('should exit if the data of the reply is invalid', async () => {
      await expect(
        getReply({ teamId, channelId, messageId, replyId, token: invalidDataToken })
      ).resolves.toBeNull();
    });

    test('should throw when the token is invalid', async () => {
      await expect(
        getReply({
          teamId,
          channelId,
          messageId,
          replyId,
          token: 'invalid-token',
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test("should return null when the token is invalid, and reply doesn't exists", async () => {
      await expect(
        getReply({
          teamId,
          channelId,
          messageId,
          replyId: 'invalid-reply-id',
          token: validToken,
        })
      ).resolves.toBeNull();
    });
  });
});
