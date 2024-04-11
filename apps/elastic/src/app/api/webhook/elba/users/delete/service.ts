import { inngest } from '@/inngest/client';

export const deleteUsers = async ({
  userIds,
  organisationId,
}: {
  userIds: string;
  organisationId: string;
}) => {
  await inngest.send([
    {
      name: 'elastic/users.delete.requested',
      data: {
        organisationId,
        userIds,
      },
    },
  ]);
};
