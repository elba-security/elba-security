import { parseWebhookEventData } from '@elba-security/sdk';
import { type ElbaRoute } from '../../../../types';

export const deleteUsers: ElbaRoute = async (request, { config, inngest }) => {
  if (!config.users.deleteUser) {
    return new Response(null, { status: 404 });
  }
  const { organisationId, ids } = parseWebhookEventData(
    'users.delete_users_requested',
    await request.json()
  );

  await inngest.send(
    ids.map((userId) => ({
      name: `${config.name}/users.delete.requested`,
      data: {
        organisationId,
        userId,
      },
    }))
  );

  return new Response(null);
};
