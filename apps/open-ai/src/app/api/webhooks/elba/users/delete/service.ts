import { inngest } from '@/inngest/client';

export const deleteUserRequest = async ({
  id,
  organisationId,
}: {
  id: string;
  organisationId: string;
}) => {
  await inngest.send({
    name: 'open-ai/users.delete.requested',
    data: {
      id,
      organisationId,
    },
  });
};
