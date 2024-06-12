import { inngest } from '@/inngest/client';

export const deleteUsers = async ({
  userIds,
  organisationId,
}: {
  userIds: string[];
  organisationId: string;
}) => {
  await inngest.send(
    userIds.map((userId) => ({
      name: 'jira/users.delete.requested',
      data: {
        organisationId,
        userId,
      },
    }))
  );
};
