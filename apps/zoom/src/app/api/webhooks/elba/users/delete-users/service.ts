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
      name: 'zoom/users.delete.requested',
      data: {
        organisationId,
        userId,
      },
    }))
  );
};
