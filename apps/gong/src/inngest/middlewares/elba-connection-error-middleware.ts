import { createElbaConnectionErrorMiddleware } from '@elba-security/inngest';
import { mapElbaConnectionError } from '@/connectors/common/error';

export const elbaConnectionErrorMiddleware = createElbaConnectionErrorMiddleware({
  mapErrorFn: mapElbaConnectionError,
  eventName: 'gong/app.uninstalled',
});
