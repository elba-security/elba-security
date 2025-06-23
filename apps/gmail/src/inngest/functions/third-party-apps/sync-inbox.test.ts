import { createInngestFunctionMock } from '@elba-security/test-utils';
import { describe, expect, test, vi } from 'vitest';
import { spyOnGoogleServiceAccountClient } from '@/connectors/google/__mocks__/clients';
import * as googleGmail from '@/connectors/google/gmail';
import { syncInbox, type SyncInboxRequested } from './sync-inbox';

const organisationId = '4f9b95b1-07ec-4356-971c-5a9d328e911c';

const eventData: SyncInboxRequested['gmail/third_party_apps.inbox.sync.requested']['data'] = {
  organisationId,
  region: 'eu',
  userId: 'user-id',
  email: 'user@foo.com',
  syncTo: '2025-06-01T00:00:00.000Z',
  syncFrom: '2025-06-02T00:00:00.000Z',
  pageToken: null,
};

const defaultMessages = [{ id: 'message-id-1' }, { id: 'message-id-2' }];

const mockFunction = createInngestFunctionMock(
  syncInbox,
  'gmail/third_party_apps.inbox.sync.requested'
);

const setup = ({
  data,
  nextPageToken = 'next-page-token',
  messages = defaultMessages,
}: {
  data: Parameters<typeof mockFunction>[0];
  nextPageToken?: string | null;
  messages?: typeof defaultMessages;
}) => {
  spyOnGoogleServiceAccountClient();
  vi.spyOn(googleGmail, 'listMessages').mockResolvedValue({
    messages,
    nextPageToken,
  });

  return mockFunction(data);
};

describe('sync-inbox', () => {
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

    expect(googleGmail.listMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        q: `-is:chat -is:draft -is:scheduled -in:trash -in:spam -in:sent after:${(
          start.getTime() / 1000
        ).toFixed(0)} before:${(end.getTime() / 1000).toFixed(0)}`,
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

    expect(googleGmail.listMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        q: `-is:chat -is:draft -is:scheduled -in:trash -in:spam -in:sent before:${(
          end.getTime() / 1000
        ).toFixed(0)}`,
      })
    );
  });

  test('should request messages sync when the page contains messages', async () => {
    const [result, { step }] = setup({
      data: eventData,
    });

    await result;

    expect(step.sendEvent).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(
        defaultMessages.map((message) => ({
          name: 'gmail/third_party_apps.email.sync.requested',
          data: {
            organisationId,
            region: eventData.region,
            userId: eventData.userId,
            email: eventData.email,
            messageId: message.id,
          },
        }))
      )
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
          name: 'gmail/third_party_apps.email.sync.requested',
        }),
      ])
    );
  });

  test('should request sync of next page when there is a next page', async () => {
    const [result, { step }] = setup({
      data: eventData,
      nextPageToken: 'next-page-token',
    });

    await result;

    expect(step.sendEvent).toHaveBeenCalledWith(expect.any(String), {
      name: 'gmail/third_party_apps.inbox.sync.requested',
      data: {
        ...eventData,
        pageToken: 'next-page-token',
      },
    });
  });

  test('should not request sync of next page when there no next page', async () => {
    const [result, { step }] = setup({
      data: eventData,
      nextPageToken: null,
    });

    await result;

    expect(step.sendEvent).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        name: 'gmail/third_party_apps.inbox.sync.requested',
      })
    );
  });

  test('it should return status "completed" when their is no next page', async () => {
    const [result] = setup({
      data: eventData,
      nextPageToken: null,
    });

    await expect(result).resolves.toMatchObject({ status: 'completed' });
  });

  test('it should return status "ongoing" when their is a next page', async () => {
    const [result] = setup({
      data: eventData,
      nextPageToken: 'page-token',
    });

    await expect(result).resolves.toMatchObject({ status: 'ongoing' });
  });
});
