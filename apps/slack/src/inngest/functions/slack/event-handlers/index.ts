import type { SlackWebhookHandlerContext, SlackEventHandlers } from './types';
import { appRateLimitedHandler } from './app-rate-limited';
import { appUninstalledHandler } from './app-uninstalled';
import { channelArchiveHandler } from './channel-archive';
import { channelCreatedHandler } from './channel-created';
import { channelDeletedHandler } from './channel-deleted';
import { channelIdChangedHandler } from './channel-id-changed';
import { channelRenameHandler } from './channel-rename';
import { channelUnarchiveHandler } from './channel-unarchive';
import { messageHandler } from './message';
import { teamDomainChangedHandler } from './team-domain-changed';
import { userChangeHandler } from './user-change';

const slackEventHandlers: SlackEventHandlers = {
  app_rate_limited: appRateLimitedHandler,
  app_uninstalled: appUninstalledHandler,
  channel_archive: channelArchiveHandler,
  channel_created: channelCreatedHandler, // TODO: test
  channel_deleted: channelDeletedHandler, // TODO: test
  channel_id_changed: channelIdChangedHandler, // TODO: test,
  channel_rename: channelRenameHandler, // TODO: test
  channel_unarchive: channelUnarchiveHandler, // TODO: test
  message: messageHandler,
  team_domain_changed: teamDomainChangedHandler,
  user_change: userChangeHandler,

  // channel_history_changed => state of the world for the channel
  // channel_shared: async () => {},
  // channel_unshared: async () => {},
  // // channel_joined: async () => {}, // NOT AVAILABLE
  // channel_left: async () => {},
  // // team_rename: async () => {},
  // user_profile_changed: async () => {}, // Same as user_change
  // team_join: async () => {}, // We could use user_change instead
};

export const slackEventHandler = async (context: SlackWebhookHandlerContext) => {
  const payload = context.event.data;
  const type = payload.event.type;
  const eventHandler = slackEventHandlers[type];
  if (!eventHandler) {
    return { message: 'Ignored: unhandled slack event type', type };
  }

  return eventHandler(payload as never, context);
};
