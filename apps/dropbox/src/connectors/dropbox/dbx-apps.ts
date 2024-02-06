import { DBXAccess } from './dbx-access';
import { DBXAppsOption } from '../types';
import { formatThirdPartyObjects } from '../utils/format-apps';

export class DBXApps {
  private teamMemberId?: string;
  private dbx: DBXAccess;

  constructor({ accessToken, teamMemberId }: DBXAppsOption) {
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

    return {
      apps: !apps.length ? [] : Array.from(formatThirdPartyObjects(apps).values()),
      nextCursor,
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
    return this.dbx.teamLinkedAppsRevokeLinkedApp({
      team_member_id: teamMemberId!,
      app_id: appId,
    });
  };
}
