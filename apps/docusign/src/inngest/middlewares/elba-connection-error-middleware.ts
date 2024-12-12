import { createElbaConnectionErrorMiddleware } from '@elba-security/inngest';
import { mapElbaConnectionError } from '@elba-security/sdk';
import { DocusignError } from '@/connectors/common/error';

export const elbaConnectionErrorMiddleware = createElbaConnectionErrorMiddleware({
  mapErrorFn: (error: unknown) => mapElbaConnectionError(DocusignError, error),
  eventName: 'docusign/app.uninstalled',
});
