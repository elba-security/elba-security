import { http } from 'msw';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { describe, expect, test, beforeEach, vi } from 'vitest';
import { env } from '@/common/env/server';
import { type OutlookMessage } from '../types';
import { outlookMessages } from './mock';
import { formatGraphMessagesFilter, getMessages } from '.';

const validToken = 'token-1234';
const startSkipStep = 'start-skip-step';
const endSkipStep = 'end-skip-step';
const nextSkipStep = 'next-skip-step';
const userId = 'user-id';

vi.mock('@/common/crypto', () => ({
  encryptElbaInngestText: vi.fn((text: string) => `encrypted(${text})`),
}));

const encryptedMessagesWithoutFilter: OutlookMessage[] = outlookMessages.map((message) => ({
  id: message.id,
  subject: `encrypted(${message.subject})`,
  from: `encrypted(${message.from.emailAddress.address})`,
  toRecipients: message.toRecipients
    .map((item) => `encrypted(${item.emailAddress.address})`)
    .join(', '),
  body: `encrypted(${message.body.content})`,
}));

const encryptedMessagesWithFilter: OutlookMessage[] = outlookMessages
  .filter((message) => message.createdDateTime === '2025-04-08T10:00:00Z')
  .map((message) => ({
    id: message.id,
    subject: `encrypted(${message.subject})`,
    from: `encrypted(${message.from.emailAddress.address})`,
    toRecipients: message.toRecipients
      .map((item) => `encrypted(${item.emailAddress.address})`)
      .join(', '),
    body: `encrypted(${message.body.content})`,
  }));

describe('getMessages', () => {
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

        const filteredMessages = outlookMessages.filter((message) => {
          const created = new Date(message.createdDateTime);
          return (!afterDate || created >= afterDate) && (!beforeDate || created <= beforeDate);
        });

        const selectedKeys = select?.split(',') || ([] as unknown as (keyof OutlookMessage)[]);
        const formattedMessages = outlookMessages.map((message) =>
          selectedKeys.reduce<Partial<OutlookMessage>>((acc, key: keyof OutlookMessage) => {
            //@ts-expect-error this is mock
            acc[key] = message[key];
            return acc;
          }, {})
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
      messages: encryptedMessagesWithoutFilter,
    });
  });

  test('should return all list messages when there is filter by date', async () => {
    await expect(
      getMessages({
        filter: formatGraphMessagesFilter({
          after: new Date('2025-04-07T10:00:00Z'),
          before: new Date('2025-04-12T10:00:00Z'),
        }),
        token: validToken,
        userId,
        skipStep: startSkipStep,
      })
    ).resolves.toStrictEqual({
      nextSkip: nextSkipStep,
      messages: encryptedMessagesWithFilter,
    });
  });
});
