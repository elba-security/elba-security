import { inngest } from '@/inngest/client';

export const deleteUser = async ({
  userId,
  organisationId,
}: {
  userId: string;
  organisationId: string;
}) => {
  await inngest.send({
    name: 'openai/users.delete.requested',
    data: {
      userId,
      organisationId,
    },
  });
};
