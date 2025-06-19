import { createInngestFunctionMock } from '@elba-security/test-utils';
import { describe, expect, test, vi } from 'vitest';
import * as microsoftConnector from '@/connectors/microsoft/message';
import { type ListOutlookMessage } from '@/connectors/microsoft/types';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import { outlookMessagesList } from '@/connectors/microsoft/message/mock';
import { syncMessages, type SyncMessagesRequested } from './sync-messages';

const mockFunction = createInngestFunctionMock(
  syncMessages,
  'outlook/third_party_apps.messages.sync.requested'
);

const token = 'token';

vi.mock('@/common/crypto', () => ({
  decrypt: vi.fn(() => token),
}));

const organisationId = '4f9b95b1-07ec-4356-971c-5a9d328e911c';

const defaultMessages = outlookMessagesList.map((message) => ({ id: message.id }));

const eventData: SyncMessagesRequested['outlook/third_party_apps.messages.sync.requested']['data'] =
  {
    organisationId,
    region: 'eu',
    userId: 'user-id',
    syncTo: '2025-06-01T00:00:00.000Z',
    syncFrom: '2025-06-02T00:00:00.000Z',
    skipStep: 'skip-step',
  };

const setup = async ({
  data,
  nextSkipStep = 'next-skip-step',
  messages = defaultMessages,
}: {
  data: Parameters<typeof mockFunction>[0];
  nextSkipStep?: string | null;
  messages?: ListOutlookMessage[];
}) => {
  vi.spyOn(microsoftConnector, 'getMessages').mockResolvedValue({
    messages,
    nextSkip: nextSkipStep,
  });

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
  test("should retrieve messages within the right range when it's syncing from a date", async () => {
    const start = new Date('2025-06-01T00:00:00.000Z');
    const end = new Date('2025-06-02T00:00:00.000Z');
    const { result } = await setup({
      data: {
        ...eventData,
        syncFrom: start.toISOString(),
        syncTo: end.toISOString(),
      },
    });

    await result;

    expect(microsoftConnector.getMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        filter:
          'receivedDateTime ge 2025-06-01T00:00:00.000Z and receivedDateTime le 2025-06-02T00:00:00.000Z',
      })
    );
  });

  test("should retrieve messages within the right range when it's syncing from start", async () => {
    const end = new Date('2025-06-02T00:00:00.000Z');
    const { result } = await setup({
      data: {
        ...eventData,
        syncFrom: null,
        syncTo: end.toISOString(),
      },
    });

    await result;

    expect(microsoftConnector.getMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: 'receivedDateTime le 2025-06-02T00:00:00.000Z',
      })
    );
  });

  test('should request messages sync when the page contains messages', async () => {
    const { result, step } = await setup({
      data: eventData,
    });

    await result;

    expect(step.sendEvent).toHaveBeenCalledWith(
      'sync-mails',
      defaultMessages.map(({ id: messageId }) => ({
        name: 'outlook/third_party_apps.email.sync.requested',
        data: {
          organisationId,
          region: eventData.region,
          userId: eventData.userId,
          messageId,
        },
      }))
    );
  });

  test('should not request messages sync when the page does not contains messages', async () => {
    const { result, step } = await setup({
      data: eventData,
      messages: [],
    });

    await result;

    expect(step.sendEvent).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({
          name: 'outlook/third_party_apps.email.sync.requested',
        }),
      ])
    );
  });

  test('should request sync of next page when there is a next page', async () => {
    const { result, step } = await setup({
      data: eventData,
      nextSkipStep: 'next-skip-step',
    });

    await result;

    expect(step.sendEvent).toHaveBeenCalledTimes(2);

    expect(step.sendEvent).toHaveBeenNthCalledWith(
      1,
      'sync-mails',
      defaultMessages.map(({ id: messageId }) => ({
        name: 'outlook/third_party_apps.email.sync.requested',
        data: {
          organisationId,
          region: eventData.region,
          userId: eventData.userId,
          messageId,
        },
      }))
    );

    expect(step.sendEvent).toHaveBeenNthCalledWith(2, 'sync-next-page', {
      name: 'outlook/third_party_apps.messages.sync.requested',
      data: {
        ...eventData,
        skipStep: 'next-skip-step',
      },
    });
  });

  test('should not request sync of next page when there no next page', async () => {
    const { result, step } = await setup({
      data: eventData,
      nextSkipStep: null,
    });

    await result;

    expect(step.sendEvent).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        name: 'outlook/third_party_apps.messages.sync.requested',
      })
    );
  });

  test('it should return status "completed" when there is no next page', async () => {
    const { result } = await setup({
      data: eventData,
      nextSkipStep: null,
    });

    await expect(result).resolves.toMatchObject({ status: 'completed' });
  });

  test('it should return status "ongoing" when there is a next page', async () => {
    const { result } = await setup({
      data: eventData,
      nextSkipStep: 'page-token',
    });

    await expect(result).resolves.toMatchObject({ status: 'ongoing' });
  });
});
