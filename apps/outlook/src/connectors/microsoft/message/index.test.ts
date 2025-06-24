import { http } from 'msw';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { describe, expect, test, beforeEach, vi } from 'vitest';
import { env } from '@/common/env/server';
import {
  type OutlookMessage,
  type OutlookMessageBySchema,
  type ListOutlookMessage,
} from '../types';
import { outlookMessagesList as messages, outlookMessage } from './mock';
import { formatGraphMessagesFilter, getMessage, getMessages } from '.';

const validToken = 'token-1234';
const startSkipStep = 'start-skip-step';
const endSkipStep = 'end-skip-step';
const nextSkipStep = 'next-skip-step';
const userId = 'user-id';
const messageId =
  'AAMkAGE4NmEwMmU2LTViYTctNDhhNi05ZTI3LWI3NzkyZGY5M2Q5NQBGAAAAAAAMB2R4SroqRYvgvUoGmDOtB';
const invalidMessageId = 'invalid-message-id';

vi.mock('@/common/crypto', () => ({
  encryptElbaInngestText: vi.fn((text: string) => `encrypted(${text})`),
}));

const listMessagesWithoutFilter: ListOutlookMessage[] = messages.map((message) => ({
  id: message.id,
}));

const listMessagesWithFilter: ListOutlookMessage[] = messages
  .filter((message) => message.createdDateTime === '2024-11-03T00:00:00Z')
  .map((message) => ({
    id: message.id,
  }));

const encryptedMessage: OutlookMessage = {
  id: outlookMessage.id,
  subject: `encrypted(${outlookMessage.subject})`,
  from: `encrypted(${outlookMessage.from.emailAddress.address})`,
  toRecipients: `encrypted(${outlookMessage.toRecipients
    .map((item) => item.emailAddress.address)
    .join(', ')})`,
  body: `encrypted(${outlookMessage.body.content})`,
};

describe('microsoft-connector', () => {
  describe('get-messages-list', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${env.MICROSOFT_API_URL}/users/:userId/messages`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          const url = new URL(request.url);
          const select = url.searchParams.get('$select');
          const top = url.searchParams.get('$top');
          const skip = url.searchParams.get('$skip');
          const filter = url.searchParams.get('$filter');

          let afterDate: Date | undefined;
          let beforeDate: Date | undefined;
          if (filter) {
            const regex =
              /receivedDateTime\s+ge\s+(?<after>[^\s]+)\s+and\s+receivedDateTime\s+le\s+(?<before>[^\s]+)/;
            const match = regex.exec(filter);

            if (match?.groups?.after) afterDate = new Date(match.groups.after);
            if (match?.groups?.before) beforeDate = new Date(match.groups.before);
          }

          const filteredMessages = messages.filter((message) => {
            const created = new Date(message.createdDateTime);
            return (!afterDate || created >= afterDate) && (!beforeDate || created <= beforeDate);
          });

          const selectedKeys =
            select?.split(',') || ([] as unknown as (keyof ListOutlookMessage)[]);
          const formattedMessages = messages.map((message) =>
            selectedKeys.reduce<Partial<ListOutlookMessage>>(
              (acc, key: keyof ListOutlookMessage) => {
                acc[key] = message[key];
                return acc;
              },
              {}
            )
          );

          const nextPageUrl = new URL(url);
          nextPageUrl.searchParams.set('$skip', nextSkipStep);

          return new Response(
            JSON.stringify({
              '@odata.nextLink':
                skip === endSkipStep ? null : decodeURIComponent(nextPageUrl.toString()),
              value: filter?.length
                ? filteredMessages
                : formattedMessages.slice(0, top ? Number(top) : 0),
            })
          );
        })
      );
    });

    test('should return all list messages when there is not filter by date', async () => {
      await expect(
        getMessages({ filter: '', token: validToken, userId, skipStep: startSkipStep })
      ).resolves.toStrictEqual({
        nextSkip: nextSkipStep,
        messages: listMessagesWithoutFilter,
      });
    });

    test('should return all list messages when there is filter by date', async () => {
      await expect(
        getMessages({
          filter: formatGraphMessagesFilter({
            after: new Date('2024-11-03T00:00:00Z'),
            before: new Date('2024-11-05T23:59:59Z'),
          }),
          token: validToken,
          userId,
          skipStep: startSkipStep,
        })
      ).resolves.toStrictEqual({
        nextSkip: nextSkipStep,
        messages: listMessagesWithFilter,
      });
    });
  });

  describe('get-message', () => {
    beforeEach(() => {
      server.use(
        http.get(
          `${env.MICROSOFT_API_URL}/users/:userId/messages/:messageId`,
          ({ request, params }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }

            if (params.messageId === invalidMessageId) {
              return new Response(
                JSON.stringify({
                  id: invalidMessageId,
                  bodyPreview: 'some-preview',
                })
              );
            }
            const url = new URL(request.url);
            const select = url.searchParams.get('$select');

            const selectedKeys =
              select?.split(',') || ([] as unknown as (keyof OutlookMessageBySchema)[]);

            const formattedMessage = selectedKeys.reduce<Partial<OutlookMessageBySchema>>(
              (acc, key: keyof OutlookMessageBySchema) => {
                if (key in outlookMessage) {
                  //@ts-expect-error this is mock
                  acc[key] = outlookMessage[key];
                }
                return acc;
              },
              {}
            );

            return new Response(JSON.stringify(formattedMessage));
          }
        )
      );
    });

    test('should return encrypted outlook message', async () => {
      await expect(
        getMessage({
          token: validToken,
          userId,
          messageId,
        })
      ).resolves.toStrictEqual(encryptedMessage);
    });

    test('should return null when the messageId is invalid', async () => {
      await expect(
        getMessage({
          token: validToken,
          userId,
          messageId: invalidMessageId,
        })
      ).resolves.toStrictEqual(null);
    });
  });
});
