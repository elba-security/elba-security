import type { InferSelectModel } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { channelCreatedHandler } from '@/inngest/functions/teams/event-handlers/channel-created';
import type { TeamsWebhookHandlerContext } from '@/inngest/functions/teams/handle-team-webhook-event';
import { channelDeletedHandler } from '@/inngest/functions/teams/event-handlers/channel-deleted';
import type { WebhookPayload } from '@/app/api/webhooks/microsoft/event-handler/service';
import { EventType } from '@/app/api/webhooks/microsoft/event-handler/service';
import { messageCreatedOrUpdatedHandler } from '@/inngest/functions/teams/event-handlers/message-created-updated';
import { replyCreatedOrUpdatedHandler } from '@/inngest/functions/teams/event-handlers/reply-created-updated';
import { messageDeletedHandler } from '@/inngest/functions/teams/event-handlers/message-deleted';
import { replyDeletedHandler } from '@/inngest/functions/teams/event-handlers/reply-deleted';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';

type TeamsEventHandlerPayload = WebhookPayload & {
  token: string;
  organisationId: string;
  organisations: Pick<InferSelectModel<typeof organisationsTable>, 'id' | 'token' | 'region'>[];
};

export type TeamsEventHandler = (
  event: TeamsEventHandlerPayload,
  context: TeamsWebhookHandlerContext
) => Promise<unknown>;

const teamsEventHandlers: Record<EventType, TeamsEventHandler> = {
  [EventType.ChannelCreated]: channelCreatedHandler,
  [EventType.ChannelDeleted]: channelDeletedHandler,
  [EventType.MessageCreated]: messageCreatedOrUpdatedHandler,
  [EventType.MessageUpdated]: messageCreatedOrUpdatedHandler,
  [EventType.MessageDeleted]: messageDeletedHandler,
  [EventType.ReplyCreated]: replyCreatedOrUpdatedHandler,
  [EventType.ReplyUpdated]: replyCreatedOrUpdatedHandler,
  [EventType.ReplyDeleted]: replyDeletedHandler,
};
export const teamsEventHandler = async (context: TeamsWebhookHandlerContext) => {
  const payload = context.event.data.payload;
  const type = payload.event;
  const eventHandler = teamsEventHandlers[type];

  const organisations = await context.step.run('get-organisations', async () =>
    db
      .select({
        id: organisationsTable.id,
        token: organisationsTable.token,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.tenantId, payload.tenantId))
  );
  const token = organisations[0]?.token;
  const organisationId = organisations[0]?.id;

  if (organisations.length === 0 || !token || !organisationId) {
    throw new NonRetriableError('Could not retrieve any organisation with this tenantId');
  }

  return eventHandler(
    {
      ...payload,
      token,
      organisationId,
      organisations,
    },
    context
  );
};
