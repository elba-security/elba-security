import { createInngestFunctionMock } from '@elba-security/test-utils';
import { describe, expect, test, vi } from 'vitest';
import * as microsoftConnector from '@/connectors/microsoft/message';
import { type OutlookMessage } from '@/connectors/microsoft/types';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import { outlookMessage } from '@/connectors/microsoft/message/mock';
import { syncEmail, type SyncEmailRequested } from './sync-mail';

const mockFunction = createInngestFunctionMock(
  syncEmail,
  'outlook/third_party_apps.email.sync.requested'
);

const token = 'token';

vi.mock('@/common/crypto', () => ({
  decrypt: vi.fn(() => token),
}));

const organisationId = '4f9b95b1-07ec-4356-971c-5a9d328e911c';
const messageId = 'message-id';

const message = {
  id: outlookMessage.id,
  subject: `encrypted(${outlookMessage.subject})`,
  from: `encrypted(${outlookMessage.from.emailAddress.address})`,
  toRecipients: outlookMessage.toRecipients.map(
    (item) => `encrypted(${item.emailAddress.address})`
  ),
  body: `encrypted(${outlookMessage.body.content})`,
};

const eventData: SyncEmailRequested['outlook/third_party_apps.email.sync.requested']['data'] = {
  region: 'eu',
  userId: 'user-id',
  organisationId,
  messageId,
};

const setup = async ({
  data,
  messageData = message,
}: {
  data: Parameters<typeof mockFunction>[0];
  messageData?: OutlookMessage | null;
}) => {
  vi.spyOn(microsoftConnector, 'getMessage').mockResolvedValue(messageData);

  await db.insert(organisationsTable).values({
    id: organisationId,
    tenantId: 'c647a27f-7060-4e8d-acc9-05a42218235b',
    token,
    region: 'eu',
  });

  const [result, { step }] = mockFunction(data);
  return { result, step };
};

describe('sync-messages', () => {
  test('should received the message properly and start analyze', async () => {
    const { result, step } = await setup({
      data: eventData,
    });

    await expect(result).resolves.toBeUndefined();

    expect(step.sendEvent).toHaveBeenCalledWith('analyze-email', {
      name: 'outlook/third_party_apps.email.analyze.requested',
      data: {
        organisationId,
        region: eventData.region,
        userId: eventData.userId,
        message,
      },
    });
  });

  test('should return if there is not message', async () => {
    const { result, step } = await setup({
      data: eventData,
      messageData: null,
    });

    await expect(result).resolves.toBeUndefined();

    expect(step.sendEvent).not.toBeCalled();
  });
});
