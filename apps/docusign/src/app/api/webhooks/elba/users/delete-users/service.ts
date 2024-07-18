import { inngest } from '@/inngest/client';

export const deleteUsers = async ({
  organisationId,
  userIds,
}: {
  organisationId: string;
  userIds: string[];
}) => {
  await inngest.send({
    name: 'docusign/users.delete.requested',
    data: {
      organisationId,
      userIds,
    },
  });
};
