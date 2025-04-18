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
      name: 'asana/users.delete.requested',
      data: {
        organisationId,
        nangoConnectionId,
        region,
        userId,
      },
    }))
  );
};
