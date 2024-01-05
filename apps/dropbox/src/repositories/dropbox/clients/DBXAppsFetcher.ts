import { DBXAccess } from './DBXAccess';
import { DBXAppsFetcherOptions } from '../types/types';
import { formatThirdPartyObjects } from '../utils/format-apps-objects';

export class DBXAppsFetcher {
  private teamMemberId?: string;
  private dbx: DBXAccess;

  constructor({ accessToken, teamMemberId }: DBXAppsFetcherOptions) {
    this.teamMemberId = teamMemberId;
    this.dbx = new DBXAccess({
      accessToken,
    });
    this.dbx.setHeaders({
      selectUser: this.teamMemberId,
    });
  }

  fetchTeamMembersThirdPartyApps = async (cursor?: string) => {
    const {
      result: { apps, cursor: nextCursor, has_more: hasMore },
    } = await this.dbx.teamLinkedAppsListMembersLinkedApps({
      cursor,
    });

    if (!apps.length) {
      return {
        nextCursor,
        hasMore,
      };
    }

    const thirdPartyAppsMap = formatThirdPartyObjects(apps);

    return {
      apps: Array.from(thirdPartyAppsMap.values()),
      nextCursor: cursor,
      hasMore,
    };
  };

  fetchTeamMemberThirdPartyApps = async (teamMemberId: string) => {
    const {
      result: { linked_api_apps: apps },
    } = await this.dbx.teamLinkedAppsListMemberLinkedApps({
      team_member_id: teamMemberId!,
    });

    const thirdPartyAppsMap = formatThirdPartyObjects([
      {
        team_member_id: teamMemberId!,
        linked_api_apps: apps,
      },
    ]);

    return {
      apps: Array.from(thirdPartyAppsMap.values()),
    };
  };

  deleteTeamMemberThirdPartyApp = async ({
    teamMemberId,
    appId,
  }: {
    teamMemberId: string;
    appId: string;
  }) => {
    await this.dbx.teamLinkedAppsRevokeLinkedApp({
      team_member_id: teamMemberId!,
      app_id: appId,
    });
  };
}
