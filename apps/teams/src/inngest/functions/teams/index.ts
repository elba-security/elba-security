import { handleTeamsWebhookEvent } from '@/inngest/functions/teams/handle-team-webhook-event';
import { messageDelete } from '@/inngest/functions/teams/data-protection/message-delete';
import { messageUpsert } from '@/inngest/functions/teams/data-protection/message-upsert';

export const teamsFunctions = [handleTeamsWebhookEvent, messageDelete, messageUpsert];
