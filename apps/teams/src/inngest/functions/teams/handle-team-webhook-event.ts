import { type GetInngestFunctionInput, inngest } from '@/inngest/client';
import { teamsEventHandler } from '@/inngest/functions/teams/event-handlers';

const handleTeamWebhookEventEventName = 'teams/teams.webhook.event.received';

export type HandleTeamsWebhookEventEventName = typeof handleTeamWebhookEventEventName;

export type TeamsWebhookHandlerContext = GetInngestFunctionInput<HandleTeamsWebhookEventEventName>;

export const handleTeamsWebhookEvent = inngest.createFunction(
  { id: 'teams-handle-teams-webhook-event', retries: 5 },
  { event: handleTeamWebhookEventEventName },
  teamsEventHandler
);
