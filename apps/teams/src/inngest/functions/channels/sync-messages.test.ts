import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import * as messageConnector from '@/connectors/microsoft/messages/messages';
import { db } from '@/database/client';
import { channelsTable, organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import type { MicrosoftMessage } from '@/connectors/microsoft/types';
import type { MessageMetadata } from '@/connectors/elba/data-protection/metadata';
import { syncMessages } from '@/inngest/functions/channels/sync-messages';
import { convertISOToDate } from '@/connectors/elba/data-protection/object';

const token = 'token';
const startSkipToken = 'start-skip-token';
const nextSkipToken = 'next-skip-token';
const repliesSkipToken = 'MSwwLDE3MTE0NDI3MTE1MTI';
const encryptedToken = await encrypt(token);
const membershipType = Math.random() > 0.5 ? 'standard' : 'shared';

const organisation = {
  id: '973b95c5-5dc2-44e8-8ed6-a4ff91a7cf8d',
  tenantId: 'tenantId',
  region: 'us',
  token: encryptedToken,
};

const setup = createInngestFunctionMock(syncMessages, 'teams/messages.sync.requested');

const data = {
  organisationId: organisation.id,
  teamName: 'team-name',
  skipToken: startSkipToken,
  teamId: 'team-id-123',
  channelId: 'channel-id-234',
  channelName: 'channel-name',
  membershipType,
};

function createValidMessagesArray() {
  const objectsArray: MicrosoftMessage[] = [];

  for (let i = 0; i < 2; i++) {
    const obj: MicrosoftMessage = {
      id: `message-id-${i}`,
      webUrl: `http://wb.uk-${i}.com`,
      etag: `122123213`,
      createdDateTime: `2023-03-28T21:11:12.395Z`,
      lastEditedDateTime: `2024-02-28T21:11:12.395Z`,
      body: {
        content: 'content',
      },
      from: {
        user: {
          id: `user-id-${i}`,
        },
        application: null,
      },
      messageType: 'message',
      type: 'message',
      'replies@odata.nextLink': `https://graph.microsoft-api-test-url.com/v1.0/teams('team-id-${i}')/channels('channel-id-${i}')/messages('message-id-${i}')/replies?$skipToken=${repliesSkipToken}`,
      replies: [
        {
          id: `reply-id-${i}`,
          webUrl: `http://wb.uk-${i}.com`,
          etag: `122123213`,
          createdDateTime: '2023-03-28T21:11:12.395Z',
          lastEditedDateTime: '2024-02-28T21:11:12.395Z',
          messageType: 'message',
          body: {
            content: `content-${i}`,
          },
          from: {
            user: {
              id: `user-id-${i}`,
            },
            application: null,
          },
          type: 'reply',
        },
      ],
    };
    objectsArray.push(obj);
  }

  return objectsArray;
}

const validMessages = createValidMessagesArray();
const invalidMessages = [
  {
    id: `some-id-1`,
    webUrl: `http://wb.uk.com`,
    etag: `293891203`,
    createdDateTime: `2023-03-28T21:11:12.395Z`,
    lastEditedDateTime: `2024-02-28T21:11:12.395Z`,
    messageType: 'chatEvent',
  },
];

const objects = {
  objects: [
    {
      id: `${data.organisationId}:message-id-0`,
      name: `team-name - #channel-name - ${convertISOToDate('2023-03-28T21:11:12.395Z')}`,
      metadata: {
        teamId: data.teamId,
        organisationId: data.organisationId,
        channelId: data.channelId,
        messageId: 'message-id-0',
        replyId: undefined,
        type: 'message',
      } satisfies MessageMetadata,
      updatedAt: '2024-02-28T21:11:12.395Z',
      ownerId: 'user-id-0',
      permissions: [
        membershipType === 'shared'
          ? {
              type: 'anyone',
              id: 'anyone',
            }
          : {
              type: 'domain',
              id: 'domain',
            },
      ],
      url: 'http://wb.uk-0.com',
      //contentHash: '122123213',
    },
    {
      id: `${data.organisationId}:reply-id-0`,
      name: 'team-name - #channel-name - 2023-03-28',
      metadata: {
        teamId: 'team-id-123',
        organisationId: data.organisationId,
        channelId: 'channel-id-234',
        messageId: 'message-id-0',
        type: 'reply',
        replyId: 'reply-id-0',
      },
      updatedAt: '2024-02-28T21:11:12.395Z',
      ownerId: 'user-id-0',
      permissions: [
        membershipType === 'shared'
          ? {
              type: 'anyone',
              id: 'anyone',
            }
          : {
              type: 'domain',
              id: 'domain',
            },
      ],
      url: 'http://wb.uk-0.com',
    },
    {
      id: `${data.organisationId}:message-id-1`,
      name: `team-name - #channel-name - ${convertISOToDate('2023-03-28T21:11:12.395Z')}`,
      metadata: {
        teamId: data.teamId,
        organisationId: data.organisationId,
        channelId: data.channelId,
        messageId: 'message-id-1',
        replyId: undefined,
        type: 'message',
      } satisfies MessageMetadata,
      updatedAt: '2024-02-28T21:11:12.395Z',
      ownerId: 'user-id-1',
      permissions: [
        membershipType === 'shared'
          ? {
              type: 'anyone',
              id: 'anyone',
            }
          : {
              type: 'domain',
              id: 'domain',
            },
      ],
      url: 'http://wb.uk-1.com',
    },

    {
      id: `${data.organisationId}:reply-id-1`,
      name: 'team-name - #channel-name - 2023-03-28',
      metadata: {
        teamId: 'team-id-123',
        organisationId: data.organisationId,
        channelId: 'channel-id-234',
        messageId: 'message-id-1',
        type: 'reply',
        replyId: 'reply-id-1',
      },
      updatedAt: '2024-02-28T21:11:12.395Z',
      ownerId: 'user-id-1',
      permissions: [
        membershipType === 'shared'
          ? {
              type: 'anyone',
              id: 'anyone',
            }
          : {
              type: 'domain',
              id: 'domain',
            },
      ],
      url: 'http://wb.uk-1.com',
    },
  ],
};

const repliesSyncData = [
  {
    data: {
      teamName: 'team-name',
      messageId: 'message-id-0',
      organisationId: organisation.id,
      channelId: data.channelId,
      teamId: data.teamId,
      channelName: data.channelName,
      membershipType,
      skipToken: repliesSkipToken,
    },
    name: 'teams/replies.sync.requested',
  },
  {
    data: {
      teamName: 'team-name',
      messageId: 'message-id-1',
      organisationId: organisation.id,
      channelId: data.channelId,
      teamId: data.teamId,
      channelName: data.channelName,
      membershipType,
      skipToken: repliesSkipToken,
    },
    name: 'teams/replies.sync.requested',
  },
];

describe('sync-messages', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  afterAll(() => {
    vi.resetModules();
  });

  test('should abort the sync when the organisation is not registered', async () => {
    const getMessages = vi.spyOn(messageConnector, 'getMessages').mockResolvedValue({
      nextSkipToken,
      validMessages,
      invalidMessages,
    });
    const [result, { step }] = setup(data);

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(getMessages).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    await db.insert(organisationsTable).values(organisation);
    await db.insert(channelsTable).values({
      id: `${organisation.id}:${data.channelId}`,
      membershipType: 'standard',
      displayName: 'channel',
      organisationId: organisation.id,
      channelId: data.channelId,
    });

    const elba = spyOnElba();

    const getMessages = vi.spyOn(messageConnector, 'getMessages').mockResolvedValue({
      nextSkipToken,
      validMessages,
      invalidMessages,
    });

    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elba).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith(objects);

    expect(getMessages).toBeCalledTimes(1);
    expect(getMessages).toBeCalledWith({
      skipToken: data.skipToken,
      token,
      teamId: data.teamId,
      channelId: data.channelId,
    });

    expect(step.waitForEvent).toBeCalledTimes(2);
    expect(step.waitForEvent).toBeCalledWith('wait-for-replies-complete-message-id-0', {
      event: 'teams/replies.sync.completed',
      if: `async.data.organisationId == '${organisation.id}' && async.data.messageId == 'message-id-0'`,
      timeout: '1d',
    });

    expect(step.waitForEvent).toBeCalledWith('wait-for-replies-complete-message-id-1', {
      event: 'teams/replies.sync.completed',
      if: `async.data.organisationId == '${organisation.id}' && async.data.messageId == 'message-id-1'`,
      timeout: '1d',
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith('start-replies-sync', repliesSyncData);
    expect(step.sendEvent).toBeCalledWith('sync-next-messages-page', {
      name: 'teams/messages.sync.requested',
      data: { ...data, skipToken: nextSkipToken },
    });
  });

  test('should finalize the sync when there is no next page', async () => {
    await db.insert(organisationsTable).values(organisation);
    await db.insert(channelsTable).values({
      id: `${organisation.id}:${data.channelId}`,
      membershipType: 'standard',
      displayName: 'channel',
      organisationId: organisation.id,
      channelId: data.channelId,
    });

    const elba = spyOnElba();
    const getMessages = vi.spyOn(messageConnector, 'getMessages').mockResolvedValue({
      nextSkipToken: null,
      validMessages,
      invalidMessages,
    });

    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith(objects);
    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(getMessages).toBeCalledTimes(1);
    expect(getMessages).toBeCalledWith({
      token,
      skipToken: data.skipToken,
      teamId: data.teamId,
      channelId: data.channelId,
    });

    expect(step.waitForEvent).toBeCalledTimes(2);
    expect(step.waitForEvent).toBeCalledWith('wait-for-replies-complete-message-id-0', {
      event: 'teams/replies.sync.completed',
      if: `async.data.organisationId == '${organisation.id}' && async.data.messageId == 'message-id-0'`,
      timeout: '1d',
    });

    expect(step.waitForEvent).toBeCalledWith('wait-for-replies-complete-message-id-1', {
      event: 'teams/replies.sync.completed',
      if: `async.data.organisationId == '${organisation.id}' && async.data.messageId == 'message-id-1'`,
      timeout: '1d',
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith('start-replies-sync', repliesSyncData);

    expect(step.sendEvent).toBeCalledWith('messages-sync-complete', {
      name: 'teams/messages.sync.completed',
      data: {
        channelId: data.channelId,
        organisationId: data.organisationId,
      },
    });
  });
});
