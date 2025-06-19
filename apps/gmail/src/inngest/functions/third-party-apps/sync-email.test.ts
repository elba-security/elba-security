import { createInngestFunctionMock } from '@elba-security/test-utils';
import { describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { spyOnGoogleServiceAccountClient } from '@/connectors/google/__mocks__/clients';
import * as googleGmail from '@/connectors/google/gmail';
import { encryptElbaInngestText } from '@/common/crypto';
import { syncEmail, type SyncEmailRequested } from './sync-email';

const organisationId = '4f9b95b1-07ec-4356-971c-5a9d328e911c';

const eventData: SyncEmailRequested['gmail/third_party_apps.email.sync.requested']['data'] = {
  organisationId,
  region: 'eu',
  userId: 'user-id',
  email: 'user@foo.com',
  messageId: 'message-id',
};

const message = {
  id: eventData.messageId,
  subject: 'message subject',
  from: 'John Doe <john.doe@gmail.com>',
  to: 'Alice bob <alice.bob@gmail.com>',
  body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
};

const mockFunction = createInngestFunctionMock(
  syncEmail,
  'gmail/third_party_apps.email.sync.requested'
);

const setup = ({
  data = eventData,
  isMessageValid = true,
}: {
  data?: Parameters<typeof mockFunction>[0];
  isMessageValid?: boolean;
} = {}) => {
  spyOnGoogleServiceAccountClient();
  vi.spyOn(googleGmail, 'getMessage').mockImplementation(({ userId, id }) => {
    if (userId !== eventData.email || id !== eventData.messageId) {
      return Promise.resolve({ error: new Error('Could not find message'), message: null });
    }
    if (!isMessageValid) {
      return Promise.resolve({
        error: new Error('Invalid message'),
        message: null,
      });
    }
    return Promise.resolve({ message, error: undefined });
  });

  return mockFunction(data);
};

describe('sync-email', () => {
  test('should abort when the retrieved message is invalid', async () => {
    const [result] = setup({ isMessageValid: false });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
  });

  test('should abort when the message does not exists', async () => {
    const [result] = setup({ data: { ...eventData, messageId: 'wrong-message-id' } });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
  });

  test('should abort when the user does not exists', async () => {
    const [result] = setup({ data: { ...eventData, email: 'wrong-user@email.com' } });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
  });

  test('it should request email analyze when a valid email has been retrieved', async () => {
    const [result, { step }] = setup();

    await result;

    expect(step.sendEvent).toHaveBeenCalledWith(expect.any(String), {
      name: 'gmail/third_party_apps.email.analyze.requested',
      data: {
        organisationId,
        region: eventData.region,
        userId: eventData.userId,
        email: eventData.email,
        message: {
          id: eventData.messageId,
          from: await encryptElbaInngestText(message.from),
          to: await encryptElbaInngestText(message.to),
          subject: await encryptElbaInngestText(message.subject),
          body: await encryptElbaInngestText(message.body),
        },
      },
    });
  });
});
