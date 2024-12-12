import { inngest } from '@/inngest/client';

export const deleteUsers = async ({
  organisationId,
  nangoConnectionId,
  region,
  userIds,
}: {
  userIds: string[];
  organisationId: string;
  nangoConnectionId: string;
  region: string;
}) => {
  await inngest.send(
    userIds.map((userId) => ({
      name: 'calendly/users.delete.requested',
      data: {
        organisationId,
        userId,
        nangoConnectionId,
        region,
      },
    }))
  );
};
