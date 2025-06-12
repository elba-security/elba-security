import { createInngestFunctionMock } from '@elba-security/test-utils';
import { describe, expect, test, vi } from 'vitest';
import * as microsoftConnector from '@/connectors/microsoft/message';
import { type OutlookMessage } from '@/connectors/microsoft/message';
import { formattedMessages as defaultMessages } from '../microsoft/list-messages.test';
import { syncMessages, type SyncMessagesRequested } from './sync-messages';

const mockFunction = createInngestFunctionMock(
  syncMessages,
  'outlook/third_party_apps.messages.sync.requested'
);

const organisationId = '4f9b95b1-07ec-4356-971c-5a9d328e911c';
const token = 'token';

const eventData: SyncMessagesRequested['outlook/third_party_apps.messages.sync.requested']['data'] =
  {
    organisationId,
    region: 'eu',
    userId: 'user-id',
    syncTo: '2025-06-01T00:00:00.000Z',
    syncFrom: '2025-06-02T00:00:00.000Z',
    skipStep: 'skip-step',
    token,
  };

const setup = ({
  data,
  nextSkipStep = 'next-skip-step',
  messages = defaultMessages,
}: {
  data: Parameters<typeof mockFunction>[0];
  nextSkipStep?: string | null;
  messages?: OutlookMessage[];
}) => {
  vi.spyOn(microsoftConnector, 'getMessages').mockResolvedValue({
    messages,
    nextSkip: nextSkipStep,
  });

  return mockFunction(data);
};

describe('sync-messages', () => {
  test("should retrieve messages within the right range when it's syncing from a date", async () => {
    const start = new Date('2025-06-01T00:00:00.000Z');
    const end = new Date('2025-06-02T00:00:00.000Z');
    const [result] = setup({
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
    const [result] = setup({
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
    const [result, { step }] = setup({
      data: eventData,
    });

    await result;

    expect(step.sendEvent).toHaveBeenCalledWith(
      'sync-emails',
      defaultMessages.map((message) => ({
        name: 'outlook/third_party_apps.email.analyze.requested',
        data: {
          organisationId,
          region: eventData.region,
          userId: eventData.userId,
          message,
        },
      }))
    );
  });

  test('should not request messages sync when the page does not contains messages', async () => {
    const [result, { step }] = setup({
      data: eventData,
      messages: [],
    });

    await result;

    expect(step.sendEvent).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({
          name: 'outlook/third_party_apps.email.analyze.requested',
        }),
      ])
    );
  });

  test('should request sync of next page when there is a next page', async () => {
    const [result, { step }] = setup({
      data: eventData,
      nextSkipStep: 'next-skip-step',
    });

    await result;

    expect(step.sendEvent).toHaveBeenCalledTimes(2);

    expect(step.sendEvent).toHaveBeenNthCalledWith(
      1,
      'sync-emails',
      defaultMessages.map((message) => ({
        name: 'outlook/third_party_apps.email.analyze.requested',
        data: {
          organisationId,
          region: eventData.region,
          userId: eventData.userId,
          message,
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
    const [result, { step }] = setup({
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

  test('it should return status "completed" when their is no next page', async () => {
    const [result] = setup({
      data: eventData,
      nextSkipStep: null,
    });

    await expect(result).resolves.toMatchObject({ status: 'completed' });
  });

  test('it should return status "ongoing" when their is a next page', async () => {
    const [result] = setup({
      data: eventData,
      nextSkipStep: 'page-token',
    });

    await expect(result).resolves.toMatchObject({ status: 'ongoing' });
  });
});
