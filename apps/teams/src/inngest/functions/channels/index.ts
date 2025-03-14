import { scheduleTeamsSync } from './schedule-teams-sync';
import { syncTeams } from './sync-teams';
import { syncChannels } from './sync-channels';
import { syncMessages } from './sync-messages';
import { syncReplies } from './sync-replies';

export const channelsFunctions = [
  scheduleTeamsSync,
  syncTeams,
  syncChannels,
  syncMessages,
  syncReplies,
];
