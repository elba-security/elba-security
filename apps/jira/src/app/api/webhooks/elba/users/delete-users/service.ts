import { inngest } from '@/inngest/client';

export const deleteUsers = async ({
  organisationId,
  nangoConnectionId,
  region,
  userIds,
}: {
  organisationId: string;
  nangoConnectionId: string;
  region: string;
  userIds: string[];
}) => {
  await inngest.send(
    userIds.map((userId) => ({
      name: 'jira/users.delete.requested',
      data: {
        organisationId,
        userId,
        nangoConnectionId,
        region,
      },
    }))
  );
};
