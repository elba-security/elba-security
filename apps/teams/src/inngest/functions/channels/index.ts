import { scheduleTeamsSync } from '@/inngest/functions/channels/schedule-teams-sync';
import { syncTeams } from '@/inngest/functions/channels/sync-teams';
import { syncChannels } from '@/inngest/functions/channels/sync-channels';
import { syncMessages } from '@/inngest/functions/channels/sync-messages';
import { syncReplies } from '@/inngest/functions/channels/sync-replies';

export const channelsFunctions = [
  scheduleTeamsSync,
  syncTeams,
  syncChannels,
  syncMessages,
  syncReplies,
];
