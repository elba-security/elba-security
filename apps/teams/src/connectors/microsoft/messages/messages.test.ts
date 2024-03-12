/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */

import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import type { MicrosoftMessage } from '@/connectors/microsoft/types';
import { getMessages } from '@/connectors/microsoft/messages/messages';
import { server } from '../../../../vitest/setup-msw-handlers';
import { MicrosoftError } from '../commons/error';

const teamId = 'some-team-id';
const channelId = 'some-channel-id';

const validToken = 'token-1234';
const startSkipToken = 'start-skip-token';
const endSkipToken = 'end-skip-token';
const nextSkipToken = 'next-skip-token';

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
      etag: `122123213`,
      createdDateTime: `2023-03-28T21:11:12.395Z`,
      lastEditedDateTime: `2024-02-28T21:11:12.395Z`,
      body: {
        content: 'test',
      },
      from: {
        user: {
          id: `user-id-${i}`,
        },
      },
      messageType: 'message',
      type: 'message',
    };
    objectsArray.push(obj);
  }

  return objectsArray;
}

const validMessages = createValidMessagesArray();

const messages = [...validMessages, ...invalidMessages];
describe('getMessages', () => {
  beforeEach(() => {
    server.use(
      http.get(
        `${env.MICROSOFT_API_URL}/teams/:teamId/channels/:channelId/messages`,
        ({ request, params }) => {
          if (
            request.headers.get('Authorization') !== `Bearer ${validToken}` ||
            params.teamId !== teamId ||
            params.channelId !== channelId
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
            value: messages.slice(0, top ? Number(top) : 0),
          });
        }
      )
    );
  });

  test('should return messages and nextSkipToken when the token, teamId and channelId is valid and their is another page', async () => {
    await expect(
      getMessages({ teamId, channelId, token: validToken, skipToken: startSkipToken })
    ).resolves.toStrictEqual({
      nextSkipToken,
      invalidMessages,
      validMessages,
    });
  });

  test('should return messages and no nextSkipToken when the token,teamId and channelId is valid and their is no other page', async () => {
    await expect(
      getMessages({ teamId, channelId, token: validToken, skipToken: endSkipToken })
    ).resolves.toStrictEqual({
      invalidMessages,
      validMessages,
      nextSkipToken: null,
    });
  });

  test('should throws when the token is invalid', async () => {
    await expect(
      getMessages({ teamId, channelId, token: 'invalid-token', skipToken: startSkipToken })
    ).rejects.toBeInstanceOf(MicrosoftError);
  });

  test('should throws when the teamId is invalid and their is another page', async () => {
    await expect(
      getMessages({
        channelId,
        teamId: 'invalid-tenant-id',
        token: validToken,
        skipToken: startSkipToken,
      })
    ).rejects.toBeInstanceOf(MicrosoftError);
  });

  test('should throws when the channelId is invalid and their is another page', async () => {
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
