import type { SlackWebhookHandlerContext, SlackEventHandlers } from './types';
import { appRateLimitedHandler } from './app-rate-limited';
import { appUninstalledHandler } from './app-uninstalled';
import { channelArchiveHandler } from './channel-archive';
import { channelCreatedHandler } from './channel-created';
import { channelDeletedHandler } from './channel-deleted';
// import { channelIdChangedHandler } from './channel-id-changed';
import { channelRenameHandler } from './channel-rename';
import { channelUnarchiveHandler } from './channel-unarchive';
import { messageHandler } from './message';
import { teamDomainChangedHandler } from './team-domain-changed';
import { userChangeHandler } from './user-change';
import { channelUnsharedHandler } from './channel-unshared';
import { channelSharedHandler } from './channel-shared';

const slackEventHandlers: SlackEventHandlers = {
  app_rate_limited: appRateLimitedHandler,
  app_uninstalled: appUninstalledHandler,
  channel_archive: channelArchiveHandler,
  channel_created: channelCreatedHandler,
  channel_deleted: channelDeletedHandler,
  // channel_id_changed: channelIdChangedHandler, // For private channel only
  channel_rename: channelRenameHandler,
  channel_shared: channelSharedHandler,
  channel_unarchive: channelUnarchiveHandler,
  channel_unshared: channelUnsharedHandler,
  message: messageHandler,
  team_domain_changed: teamDomainChangedHandler,
  user_change: userChangeHandler,
};

export const slackEventHandler = async (context: SlackWebhookHandlerContext) => {
  const payload = context.event.data.encrypted;
  const type = payload.event.type;
  const eventHandler = slackEventHandlers[type];
  if (!eventHandler) {
    return { message: 'Ignored: unhandled slack event type', type };
  }

  context.logger.info('Handling Slack event', { type, teamId: payload.team_id });

  return eventHandler(payload as never, context);
};
