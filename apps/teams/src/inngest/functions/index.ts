import { syncUsersSchedule } from '@/inngest/functions/users/sync-users-schedule';
import { syncTeams } from '@/inngest/functions/channels/sync-teams';
import { syncUsers } from '@/inngest/functions/users/sync-users';
import { syncChannels } from '@/inngest/functions/channels/sync-channels';
import { syncMessages } from '@/inngest/functions/channels/sync-messages';
import { syncReplies } from '@/inngest/functions/channels/sync-replies';
import { subscribeToChannels } from '@/inngest/functions/subscribtions/subscription-to-channels';
import { handleTeamsWebhookEvent } from '@/inngest/functions/teams/handle-team-webhook-event';
import { subscribeToChannelMessage } from '@/inngest/functions/subscribtions/subscription-to-channel-message';
import { subscribeRefreshExpire } from '@/inngest/functions/subscribtions/subscribe-refresh-expire';
import { refreshToken } from './tokens/refresh-token';

export const inngestFunctions = [
  refreshToken,
  syncUsers,
  syncUsersSchedule,
  syncTeams,
  syncChannels,
  syncMessages,
  syncReplies,
  subscribeToChannels,
  subscribeRefreshExpire,
  subscribeToChannelMessage,
  handleTeamsWebhookEvent,
];
