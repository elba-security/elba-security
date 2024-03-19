import { inngest } from '@/inngest/client';

export const deleteUsers = async ({ userId }: { userId: string }) => {
  await inngest.send([
    {
      name: 'pagerduty/users.delete.requested',
      data: {
        userId,
      },
    },
  ]);
};
