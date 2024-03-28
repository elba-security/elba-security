import { inngest } from '@/inngest/client';

export const refreshAuthenticationObject = async ({
  organisationId,
  userId,
}: {
  organisationId: string;
  userId: string;
}) => {
  await inngest.send({
    name: 'google/authentication.refresh_object.requested',
    data: {
      organisationId,
      userId,
    },
  });
};
