import { inngest } from '@/inngest/client';

export const deleteUsers = async ({
  userIds,
  organisationId,
  nangoConnectionId,
  region,
}: {
  userIds: string[];
  organisationId: string;
  nangoConnectionId: string;
  region: string;
}) => {
  await inngest.send(
    userIds.map((userId) => ({
      name: 'outreach/users.delete.requested',
      data: {
        organisationId,
        userId,
        nangoConnectionId,
        region,
      },
    }))
  );
};
