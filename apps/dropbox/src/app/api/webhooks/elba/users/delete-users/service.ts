import { inngest } from '@/inngest/client';

export const deleteUsers = async ({
  nangoConnectionId,
  userIds,
}: {
  nangoConnectionId: string;
  userIds: string[];
}) => {
  await inngest.send(
    userIds.map((userId) => ({
      name: 'dropbox/users.delete.requested',
      data: {
        nangoConnectionId,
        userId,
      },
    }))
  );
};
