import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import * as replyConnector from '@/connectors/microsoft/replies/replies';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { syncReplies } from '@/inngest/functions/channels/sync-replies';
import type { MicrosoftReply } from '@/connectors/microsoft/types';
import type { MessageMetadata } from '@/connectors/elba/data-protection/metadata';
import { convertISOToDate } from '@/connectors/elba/data-protection/object';

const token = 'token';
const startSkipToken = 'start-skip-token';
const nextSkipToken = 'next-skip-token';
const encryptedToken = await encrypt(token);
const membershipType = Math.random() > 0.5 ? 'standard' : 'shared';

const organisation = {
  id: '973b95c5-5dc2-44e8-8ed6-a4ff91a7cf8d',
  tenantId: 'tenantId',
  region: 'us',
  token: encryptedToken,
};

const setup = createInngestFunctionMock(syncReplies, 'teams/replies.sync.requested');

const data = {
  organisationId: organisation.id,
  skipToken: startSkipToken,
  teamId: 'team-id-123',
  channelId: 'channel-id-234',
  messageId: 'message-id-345',
  channelName: 'channel-name',
  membershipType,
};

function createValidRepliesArray() {
  const objectsArray: MicrosoftReply[] = [];

  for (let i = 0; i < 2; i++) {
    const obj: MicrosoftReply = {
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
    };
    objectsArray.push(obj);
  }

  return objectsArray;
}

const validReplies = createValidRepliesArray();

const invalidReplies = [
  {
    id: `some-id-1`,
    webUrl: `http://wb.uk.com`,
    etag: `122123213`,
    createdDateTime: `2023-03-28T21:11:12.395Z`,
    lastEditedDateTime: `2024-02-28T21:11:12.395Z`,
    type: 'reply',
  },
];

const objects = {
  objects: [
    {
      id: `${data.organisationId}:reply-id-0`,
      name: `#channel-name - ${convertISOToDate('2023-03-28T21:11:12.395Z')}`,
      metadata: {
        teamId: data.teamId,
        organisationId: data.organisationId,
        channelId: data.channelId,
        messageId: data.messageId,
        replyId: 'reply-id-0',
        type: 'reply',
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
      id: `${data.organisationId}:reply-id-1`,
      name: `#channel-name - ${convertISOToDate('2023-03-28T21:11:12.395Z')}`,
      metadata: {
        teamId: data.teamId,
        organisationId: data.organisationId,
        channelId: data.channelId,
        messageId: data.messageId,
        replyId: 'reply-id-1',
        type: 'reply',
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
      //contentHash: '122123213',
    },
  ],
};

describe('sync-replies', () => {
  test('should abort the sync when the organisation is not registered', async () => {
    const getReplies = vi.spyOn(replyConnector, 'getReplies').mockResolvedValue({
      nextSkipToken,
      validReplies,
      invalidReplies,
    });
    const [result, { step }] = setup(data);

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(getReplies).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    await db.insert(organisationsTable).values(organisation);

    const elba = spyOnElba();

    const getReplies = vi.spyOn(replyConnector, 'getReplies').mockResolvedValue({
      nextSkipToken,
      validReplies,
      invalidReplies,
    });

    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elba).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith(objects);

    expect(getReplies).toBeCalledTimes(1);
    expect(getReplies).toBeCalledWith({
      skipToken: data.skipToken,
      token,
      teamId: data.teamId,
      channelId: data.channelId,
      messageId: data.messageId,
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-next-replies-page', {
      name: 'teams/replies.sync.requested',
      data: { ...data, skipToken: nextSkipToken },
    });
  });

  test('should finalize the sync when there is no next page', async () => {
    await db.insert(organisationsTable).values(organisation);

    const elba = spyOnElba();

    const getReplies = vi.spyOn(replyConnector, 'getReplies').mockResolvedValue({
      nextSkipToken: null,
      validReplies,
      invalidReplies,
    });
    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elba).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith(objects);

    expect(getReplies).toBeCalledTimes(1);
    expect(getReplies).toBeCalledWith({
      token,
      skipToken: data.skipToken,
      teamId: data.teamId,
      channelId: data.channelId,
      messageId: data.messageId,
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('replies-sync-complete', {
      name: 'teams/replies.sync.completed',
      data: { messageId: data.messageId, organisationId: organisation.id },
    });
  });
});
