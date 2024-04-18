import { inngest } from '@/inngest/client';

export const deleteUser = async ({
  userId,
  organisationId,
}: {
  userId: string;
  organisationId: string;
}) => {
  await inngest.send([
    {
      name: 'gitlab/users.delete.requested',
      data: {
        organisationId,
        userId,
      },
    },
  ]);
};
