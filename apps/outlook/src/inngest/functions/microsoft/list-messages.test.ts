import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as microsoftConnector from '@/connectors/microsoft/message';
import { MicrosoftError } from '@/connectors/microsoft/common/error';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { outlookMessages } from '@/connectors/microsoft/message/mock';
import { type OutlookMessage } from '@/connectors/microsoft/types';
import * as authConnector from '@/connectors/microsoft/auth';
import { encryptElbaInngestText } from '@/common/crypto';
import { listOutlookMessages } from './list-messages';

const setup = createInngestFunctionMock(
  listOutlookMessages,
  'outlook/outlook.messages.list.requested'
);

const organisationId = '4ef9c9ad-947b-4ec2-bbc4-cbe3190eee51';
const tenantId = 'tenant-id';
const token = 'token';
const userId = 'user-id';

vi.mock('@/common/crypto', async () => ({
  ...(await vi.importActual('@/common/crypto')),
  decrypt: vi.fn(() => token),
}));

vi.spyOn(authConnector, 'getToken').mockResolvedValue({
  token,
  expiresIn: 3600,
});

const filter = microsoftConnector.formatGraphMessagesFilter({
  after: new Date('2024-11-03T00:00:00Z'),
  before: new Date('2024-11-08T23:59:59Z'),
});

const messages: OutlookMessage[] = outlookMessages.map((message) => ({
  id: message.id,
  subject: message.subject,
  from: message.from.emailAddress.address,
  toRecipients: message.toRecipients.map((item) => item.emailAddress.address).join(', '),
  body: message.body.content,
}));

const encryptedFilteredMessages: OutlookMessage[] = await Promise.all(
  outlookMessages.slice(1, messages.length - 1).map(async (message) => ({
    id: message.id,
    subject: await encryptElbaInngestText(message.subject),
    from: await encryptElbaInngestText(message.from.emailAddress.address),
    toRecipients: await Promise.all(
      message.toRecipients.map((item) => encryptElbaInngestText(item.emailAddress.address))
    ).then((toRecipients) => toRecipients.join(', ')),
    body: await encryptElbaInngestText(message.body.content),
  }))
);

describe('list-messages', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values({
      id: organisationId,
      tenantId: 'c647a27f-7060-4e8d-acc9-05a42218235b',
      region: 'eu',
    });
  });

  afterEach(async () => {
    await db.delete(organisationsTable).execute();
  });

  test('should return list of messages', async () => {
    const getMessages = vi.spyOn(microsoftConnector, 'getMessages').mockResolvedValue({
      messages,
      nextSkip: 'next-skip',
    });
    const [result] = setup({
      filter,
      tenantId,
      organisationId,
      skipStep: null,
      userId,
      mail: 'receiver@foo.com',
    });

    await expect(result).resolves.toStrictEqual({
      nextSkip: 'next-skip',
      messages: encryptedFilteredMessages,
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
      tenantId,
      organisationId,
      skipStep: null,
      userId: 'invalid-user-id',
      mail: 'receiver@foo.com',
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
