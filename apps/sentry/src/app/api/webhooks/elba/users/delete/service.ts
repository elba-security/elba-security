import { inngest } from '@/inngest/client';

export const deleteUserRequest = async ({
  ids,
  organisationId,
}: {
  ids: string[];
  organisationId: string;
}) => {
  await inngest.send({
    name: 'sentry/users.delete.requested',
    data: {
      ids,
      organisationId,
    },
  });
};
