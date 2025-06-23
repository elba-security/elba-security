import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { createElbaTrialIssuesLimitExceededMiddleware } from '@elba-security/inngest';
import { type UpdateConnectionsObjects } from '@elba-security/schemas';
import type { InngestEvents } from './functions';
import { gmailUnauthorizedMiddleware } from './middlewares/gmail-unauthorized-middleware';

type ElbaUpdateConnectionsEvents = {
  'us/elba/connections.updated': {
    data: {
      sourceId: string;
    } & UpdateConnectionsObjects;
  };
  'eu/elba/connections.updated': {
    data: {
      sourceId: string;
    } & UpdateConnectionsObjects;
  };
};

type GmailSyncCancelledEvent = {
  'gmail/sync.cancelled': {
    data: {
      organisationId: string;
    };
  };
};

export const inngest = new Inngest({
  id: 'gmail',
  schemas: new EventSchemas().fromRecord<
    InngestEvents & ElbaUpdateConnectionsEvents & GmailSyncCancelledEvent
  >(),
  middleware: [
    gmailUnauthorizedMiddleware,
    createElbaTrialIssuesLimitExceededMiddleware('gmail/sync.cancel'),
  ],
  logger,
});
