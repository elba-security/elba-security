import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as microsoftConnector from '@/connectors/microsoft/message';
import { MicrosoftError } from '@/connectors/microsoft/common/error';
import { listOutlookMessages } from './list-messages';

const setup = createInngestFunctionMock(
  listOutlookMessages,
  'outlook/outlook.message.list.requested'
);

const organisationId = 'org-id';
const token = 'token';
const userId = 'user-id';

vi.mock('@/common/crypto', () => ({
  decrypt: vi.fn(() => token),
}));

const messages = [
  {
    id: 'message-id-1',
    subject: 'subject-message-1',
    from: {
      emailAddress: {
        name: 'from-name-1',
        address: 'from-email-address-1',
      },
    },
    toRecipients: [
      {
        emailAddress: {
          name: 'to-name-1',
          address: 'to-email-address-1',
        },
      },
    ],
    body: {
      contentType: 'html',
      content: 'html-content: message-text-1',
    },
    isDraft: false,
    createdDateTime: '2024-11-04T00:00:00Z',
    hasAttachments: false,
  },
  {
    id: 'message-id-2',
    subject: 'subject-message-2',
    from: {
      emailAddress: {
        name: 'from-name-2',
        address: 'from-email-address-2',
      },
    },
    toRecipients: [
      {
        emailAddress: {
          name: 'to-name-2',
          address: 'to-email-address-2',
        },
      },
    ],
    body: {
      contentType: 'html',
      content: 'html-content: message-text-2',
    },
    isDraft: false,
    hasAttachments: false,
    createdDateTime: '2024-11-05T00:00:00Z',
  },
  {
    id: 'message-id-3',
    subject: 'subject-message-3',
    from: {
      emailAddress: {
        name: 'from-name-3',
        address: 'from-email-address-3',
      },
    },
    toRecipients: [
      {
        emailAddress: {
          name: 'to-name-3',
          address: 'to-email-address-3',
        },
      },
    ],
    isDraft: true,
    body: {
      contentType: 'html',
      content: 'html-content: message-text-3',
    },
    hasAttachments: true,
    createdDateTime: '2024-11-03T00:00:00Z',
  },
];

const filter = microsoftConnector.formatGraphMessagesFilter({
  after: new Date('2024-11-03T00:00:00Z'),
  before: new Date('2024-11-08T23:59:59Z'),
});

export const formattedMessages: microsoftConnector.OutlookMessage[] = messages.map((message) => ({
  id: message.id,
  subject: `encrypted(${message.subject})`,
  from: `encrypted(${message.from.emailAddress.address})`,
  toRecipients: message.toRecipients.map((item) => `encrypted(${item.emailAddress.address})`),
  body: `encrypted(${message.body.content})`,
}));

describe('list-messages', () => {
  test('should return list of messages', async () => {
    const getMessages = vi.spyOn(microsoftConnector, 'getMessages').mockResolvedValue({
      messages: formattedMessages,
      nextSkip: 'next-skip',
    });
    const [result] = setup({ filter, organisationId, skipStep: null, token, userId });

    await expect(result).resolves.toStrictEqual({
      nextSkip: 'next-skip',
      messages: formattedMessages,
    });
    expect(getMessages).toBeCalledTimes(1);
    expect(getMessages).toBeCalledWith({
      filter,
      userId,
      skipStep: null,
      token,
    });
  });

  test('should throw if there are no messages for user', async () => {
    //@ts-expect-error this is mock
    const error = new MicrosoftError('Could not retrieve messages', { response: { status: 404 } });
    const getMessages = vi.spyOn(microsoftConnector, 'getMessages').mockRejectedValue(error);

    const [result] = setup({
      filter,
      organisationId,
      skipStep: null,
      token,
      userId: 'invalid-user-id',
    });

    await expect(result).resolves.toStrictEqual({
      messages: [],
      nextSkip: null,
      status: 'skip',
    });
    expect(getMessages).toBeCalledTimes(1);
    expect(getMessages).toBeCalledWith({
      filter,
      userId: 'invalid-user-id',
      skipStep: null,
      token,
    });
  });
});
