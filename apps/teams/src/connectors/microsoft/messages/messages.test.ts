/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */

import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import { deleteMessage, getMessage, getMessages } from '@/connectors/microsoft/messages/messages';
import type { MicrosoftMessage } from '@/connectors/microsoft/types';
import { server } from '../../../../vitest/setup-msw-handlers';
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

const message: MicrosoftMessage = {
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
  'replies@odata.nextLink': `https://graph.microsoft-api-test-url.com/v1.0/teams('team-id')/channels('channel-id')/messages('message-id')/replies?$skipToken=${repliesSkipToken}`,
  replies: [
    {
      id: `reply-id`,
      webUrl: `http://wb.uk.com`,
      etag: `122123213`,
      createdDateTime: '2023-03-28T21:11:12.395Z',
      lastEditedDateTime: '2024-02-28T21:11:12.395Z',
      messageType: 'message',
      body: {
        content: `content`,
      },
      from: {
        user: {
          id: `user-id`,
        },
        application: null,
      },
      type: 'reply',
    },
  ],
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

            return Response.json({
              '@odata.nextLink':
                skipToken === endSkipToken ? null : decodeURIComponent(nextPageUrl.toString()),
              value: messages.slice(0, top ? Number(top) : 0),
            });
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
              return Response.json(null);
            }
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

            return Response.json(message);
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

    test('should throw when the token is invalid, and the messageId is invalid', async () => {
      await expect(
        getMessage({
          teamId,
          channelId,
          messageId: 'invalid-message-id',
          token: validToken,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throw when the token and the messageId are invalid and the teamId or channelId are invalid', async () => {
      await expect(
        getMessage({
          teamId: 'invalid-team-id',
          channelId: 'invalid-channel-id',
          messageId,
          token: validToken,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });

  describe('deleteMessage', () => {
    beforeEach(() => {
      server.use(
        http.post(
          `${env.MICROSOFT_API_URL}/teams/:teamId/channels/:channelId/messages/:messageId/softDelete`,
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

            return Response.json({ message: 'message was deleted' });
          }
        )
      );
    });

    test('should delete the message when the token is valid, teamId, channelId and messageId are valid ', async () => {
      await expect(
        deleteMessage({
          teamId,
          channelId,
          messageId,
          token: validToken,
        })
      ).resolves.toStrictEqual({ message: 'message was deleted' });
    });

    test('should delete the message when the token is valid, teamId, channelId and messageId are invalid ', async () => {
      await expect(
        deleteMessage({
          teamId: 'invalid-team-id',
          channelId: 'invalid-channel-id',
          messageId: 'invalid-message-id',
          token: validToken,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throw when the token is invalid', async () => {
      await expect(
        deleteMessage({
          teamId,
          channelId,
          messageId,
          token: invalidDataToken,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });
});
