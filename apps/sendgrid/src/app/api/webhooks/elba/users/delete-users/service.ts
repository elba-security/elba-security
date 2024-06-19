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
      name: 'sendgrid/users.delete.requested',
      data: {
        organisationId,
        userId,
      },
    }))
  );
};
