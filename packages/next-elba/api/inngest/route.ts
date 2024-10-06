import { serve } from 'inngest/next';
import { type InngestFunction } from 'inngest';
import { syncUsers } from '../../inngest/functions/users/sync-users';
import { deleteUser } from '../../inngest/functions/users/delete-user';
import { type ElbaContext } from '../../types';
import { scheduleUsersSyncs } from '../../inngest/functions/users/schedule-users-syncs';
import { refreshToken } from '../../inngest/functions/tokens/refresh-token';

export const createInngestRoutes = (context: ElbaContext) => {
  const { inngest, config } = context;
  const functions: InngestFunction.Any[] = [scheduleUsersSyncs(context), syncUsers(context)];

  if (config.users.deleteUser) {
    functions.push(deleteUser(context));
  }

  if (config.oauth?.refresh) {
    functions.push(refreshToken(context));
  }

  return serve({
    client: inngest,
    functions,
  });
};
