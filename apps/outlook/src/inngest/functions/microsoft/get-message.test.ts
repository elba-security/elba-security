import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as microsoftConnector from '@/connectors/microsoft/message';
import { MicrosoftError } from '@/connectors/microsoft/common/error';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { outlookMessage } from '@/connectors/microsoft/message/mock';
import { getOutlookMessage } from './get-message';

const setup = createInngestFunctionMock(getOutlookMessage, 'outlook/outlook.message.requested');

const organisationId = '4ef9c9ad-947b-4ec2-bbc4-cbe3190eee51';
const token = 'token';
const userId = 'user-id';

vi.mock('@/common/crypto', () => ({
  decrypt: vi.fn(() => token),
}));

const message = {
  id: outlookMessage.id,
  subject: `encrypted(${outlookMessage.subject})`,
  from: `encrypted(${outlookMessage.from.emailAddress.address})`,
  toRecipients: `encrypted(${outlookMessage.toRecipients
    .map((item) => item.emailAddress.address)
    .join(', ')})`,
  body: `encrypted(${outlookMessage.body.content})`,
};

describe('outlook-message', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values({
      id: organisationId,
      tenantId: 'c647a27f-7060-4e8d-acc9-05a42218235b',
      region: 'eu',
      token,
    });
  });

  afterEach(async () => {
    await db.delete(organisationsTable).execute();
  });

  test('should return outlook message', async () => {
    const getMessage = vi.spyOn(microsoftConnector, 'getMessage').mockResolvedValue(message);
    const [result] = setup({ organisationId, userId, messageId: outlookMessage.id });

    await expect(result).resolves.toStrictEqual(message);
    expect(getMessage).toBeCalledTimes(1);
    expect(getMessage).toBeCalledWith({
      userId,
      token,
      messageId: outlookMessage.id,
    });
  });

  test('should return null when Microsoft throws an error', async () => {
    const error = new MicrosoftError('Could not retrieve message');
    const getMessage = vi.spyOn(microsoftConnector, 'getMessage').mockRejectedValue(error);

    const [result] = setup({
      organisationId,
      userId: 'invalid-user-id',
      messageId: 'invalid-message',
    });

    await expect(result).resolves.toBeNull();
    expect(getMessage).toBeCalledTimes(1);
    expect(getMessage).toBeCalledWith({
      userId: 'invalid-user-id',
      token,
      messageId: 'invalid-message',
    });
  });
});
