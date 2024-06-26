import { inngest } from '@/inngest/client';

export const deleteUserRequest = async ({
  userIds,
  organisationId,
}: {
  userIds: string[];
  organisationId: string;
}) => {
  await inngest.send(
    userIds.map((userId) => ({
      name: 'webflow/users.delete.requested',
      data: {
        userId,
        organisationId,
      },
    }))
  );
};
