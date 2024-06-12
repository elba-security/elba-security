import { inngest } from '@/inngest/client';

export const deleteUserRequest = async ({
  ids,
  organisationId,
}: {
  ids: string[];
  organisationId: string;
}) => {
  await inngest.send({
    name: 'webflow/users.delete.requested',
    data: {
      ids,
      organisationId,
    },
  });
};