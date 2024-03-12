import type { DataProtectionObject } from '@elba-security/sdk';
import type { MicrosoftMessage } from '@/connectors/microsoft/types';
import type { MessageMetadata } from './metadata';

export const convertISOToDate = (isoDate: string) => {
  return isoDate.split('T')[0];
};
export const formatDataProtectionObject = ({
  teamId,
  messageId,
  message,
  organisationId,
  membershipType,
  channelName,
  channelId,
}: {
  teamId: string;
  channelId: string;
  organisationId: string;
  messageId: string;
  membershipType: string;
  channelName: string;
  message: MicrosoftMessage;
}): DataProtectionObject => {
  const creationDate = convertISOToDate(message.createdDateTime);

  return {
    id: messageId,
    name: `#${channelName} - ${creationDate}`,
    metadata: {
      teamId,
      organisationId,
      channelId,
      messageId,
      type: message.type,
    } satisfies MessageMetadata,
    updatedAt: message.lastEditedDateTime ?? undefined,
    ownerId: message.from.user.id,
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
    url: message.webUrl,
    contentHash: message.etag,
  };
};
