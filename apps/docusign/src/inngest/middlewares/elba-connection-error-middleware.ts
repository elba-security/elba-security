import { createElbaConnectionErrorMiddleware } from '@elba-security/inngest';
import { mapElbaConnectionError } from '@/connectors/common/error';

export const elbaConnectionErrorMiddelware = createElbaConnectionErrorMiddleware({
  mapErrorFn: mapElbaConnectionError,
  eventName: 'docusign/app.uninstalled',
});
