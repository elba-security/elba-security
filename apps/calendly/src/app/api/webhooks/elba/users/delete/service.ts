import { inngest } from '@/inngest/client';

export const deleteUserRequest = async ({
  id,
  organisationId,
}: {
  id: string;
  organisationId: string;
}) => {
  await inngest.send({
    name: 'calendly/users.delete.requested',
    data: {
      id,
      organisationId,
    },
  });
};
