import { inngest } from '@/inngest/client';

export const deleteUsers = async ({
  ids,
  organisationId,
}: {
  ids: string[];
  organisationId: string;
}) => {
  await inngest.send(
    ids.map((userId) => ({
      name: 'calendly/users.delete.requested',
      data: {
        organisationId,
        userId,
      },
    }))
  );
};
