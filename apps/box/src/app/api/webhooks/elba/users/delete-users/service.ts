import { inngest } from '@/inngest/client';

export const deleteUsers = async ({
  userIds,
  nangoConnectionId,
  region,
  organisationId,
}: {
  userIds: string[];
  nangoConnectionId: string;
  region: string;
  organisationId: string;
}) => {
  await inngest.send(
    userIds.map((userId) => ({
      name: 'box/users.delete.requested',
      data: {
        organisationId,
        userId,
        nangoConnectionId,
        region,
      },
    }))
  );
};
