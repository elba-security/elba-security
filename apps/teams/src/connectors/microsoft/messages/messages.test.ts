import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/env';
import { getMessage, getMessages } from '@/connectors/microsoft/messages/messages';
import type { MicrosoftMessage } from '@/connectors/microsoft/types';
import { MicrosoftError } from '../commons/error';

const teamId = 'some-team-id';
const channelId = 'some-channel-id';
const messageId = 'some-message-id';

const validToken = 'token-1234';
const invalidDataToken = 'invalid-data-token';
const startSkipToken = 'start-skip-token';
const endSkipToken = 'end-skip-token';
const nextSkipToken = 'next-skip-token';
const repliesSkipToken = 'MSwwLDE3MTE0NDI3MTE1MTI';

const invalidMessages = [
  {
    id: `some-id-1`,
    webUrl: `http://wb.uk.com`,
    etag: `293891203`,
    createdDateTime: `2023-03-28T21:11:12.395Z`,
    lastEditedDateTime: `2024-02-28T21:11:12.395Z`,
    messageType: 'typing',
  },
  {
    id: `some-id-2`,
    webUrl: `http://wb.uk.com`,
    etag: `293891203`,
    createdDateTime: `2023-03-28T21:11:12.395Z`,
    lastEditedDateTime: `2024-02-28T21:11:12.395Z`,
    messageType: 'chatEvent',
  },
];

function createValidMessagesArray() {
  const objectsArray: MicrosoftMessage[] = [];

  for (let i = 0; i < Number(env.MESSAGES_SYNC_BATCH_SIZE) - invalidMessages.length; i++) {
    const obj: MicrosoftMessage = {
      id: `some-id-${i}`,
      webUrl: `http://wb.uk-${i}.com`,
      etag: '122123213',
      createdDateTime: '2023-03-28T21:11:12.395Z',
      lastEditedDateTime: '2024-02-28T21:11:12.395Z',
      from: {
        user: {
          id: `user-id-${i}`,
        },
        application: null,
      },
      messageType: 'message',
      type: 'message',
      body: {
        content: `content-${i}`,
      },
      'replies@odata.nextLink': `https://graph.microsoft-api-test-url.com/v1.0/teams('team-id-${i}')/channels('channel-id-${i}')/messages('message-id-${i}')/replies?$skipToken=${repliesSkipToken}`,
      replies: [
        {
          id: `reply-id-${i}`,
          webUrl: `http://wb.uk-${i}.com`,
          etag: `122123213`,
          createdDateTime: '2023-03-28T21:11:12.395Z',
          lastEditedDateTime: '2024-02-28T21:11:12.395Z',
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
        },
      ],
    };
    objectsArray.push(obj);
  }

  return objectsArray;
}

const validMessages = createValidMessagesArray();

const messages = [...validMessages, ...invalidMessages];

const message: Omit<MicrosoftMessage, 'replies@odata.nextLink' | 'replies'> = {
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
  type: 'message',
  body: {
    content: 'content',
  },
};

describe('messages connector', () => {
  describe('getMessages', () => {
    beforeEach(() => {
      server.use(
        http.get(
          `${env.MICROSOFT_API_URL}/teams/:teamId/channels/:channelId/messages`,
          ({ request, params }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }

            if (params.teamId !== teamId || params.channelId !== channelId) {
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
                value: messages.slice(0, top ? Number(top) : 0),
              })
            );
          }
        )
      );
    });

    test('should return messages and nextSkipToken when the token, teamId and channelId are valid and there is another page', async () => {
      await expect(
        getMessages({ teamId, channelId, token: validToken, skipToken: startSkipToken })
      ).resolves.toStrictEqual({
        nextSkipToken,
        invalidMessages,
        validMessages,
      });
    });

    test('should return messages and no nextSkipToken when the token,teamId and channelId are valid and there is no other page', async () => {
      await expect(
        getMessages({ teamId, channelId, token: validToken, skipToken: endSkipToken })
      ).resolves.toStrictEqual({
        invalidMessages,
        validMessages,
        nextSkipToken: null,
      });
    });

    test('should throw when the token is invalid', async () => {
      await expect(
        getMessages({ teamId, channelId, token: 'invalid-token', skipToken: startSkipToken })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throw when the teamId is invalid and there is another page', async () => {
      await expect(
        getMessages({
          channelId,
          teamId: 'invalid-tenant-id',
          token: validToken,
          skipToken: startSkipToken,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throw when the channelId is invalid and there is another page', async () => {
      await expect(
        getMessages({
          channelId: 'invalid-channel-id',
          teamId,
          token: validToken,
          skipToken: startSkipToken,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });

  describe('getMessage', () => {
    beforeEach(() => {
      server.use(
        http.get(
          `${env.MICROSOFT_API_URL}/teams/:teamId/channels/:channelId/messages/:messageId`,
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
              params.messageId !== messageId
            ) {
              return new Response(undefined, { status: 404 });
            }

            return new Response(JSON.stringify(message));
          }
        )
      );
    });

    test('should return the message when the token is valid, teamId, channelId and messageId are valid ', async () => {
      await expect(
        getMessage({ teamId, channelId, messageId, token: validToken })
      ).resolves.toStrictEqual(message);
    });

    test('should exit if the data of the message is invalid', async () => {
      await expect(
        getMessage({ teamId, channelId, messageId, token: invalidDataToken })
      ).resolves.toBeNull();
    });

    test('should throw when the token is invalid', async () => {
      await expect(
        getMessage({
          teamId,
          channelId,
          messageId,
          token: 'invalid-token',
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test("should return null when the token is invalid, and message doesn't exists", async () => {
      await expect(
        getMessage({
          teamId,
          channelId,
          messageId: 'invalid-message-id',
          token: validToken,
        })
      ).resolves.toBeNull();
    });
  });
});
