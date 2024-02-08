import { DBXAccess, DBXAuth } from '@/connectors';
import { insertOrganisation } from './data';
import addSeconds from 'date-fns/addSeconds';
import subMinutes from 'date-fns/subMinutes';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';

type GenerateAccessToken = {
  code: string;
  organisationId: string;
  region: string;
};

export const generateAccessToken = async ({
  code,
  organisationId,
  region,
}: GenerateAccessToken) => {
  const dbxAuth = new DBXAuth();

  const { result, status } = await dbxAuth.getAccessToken({ code });

  if (status !== 200) {
    throw new Error(`Could not get Dropbox access token`);
  }

  const { access_token: accessToken, refresh_token, expires_in } = result;

  const dbx = new DBXAccess({
    accessToken,
  });

  const adminDetails = await dbx.teamTokenGetAuthenticatedAdmin();

  const {
    result: {
      admin_profile: { status: adminStatus, team_member_id, membership_type },
    },
  } = adminDetails;

  if (adminStatus['.tag'] !== 'active') {
    throw new Error(`Admin status is ${adminStatus['.tag']}, please activate your account`);
  }

  if (membership_type['.tag'] !== 'full') {
    throw new Error(`Admin has ${membership_type['.tag']} access, please upgrade to full access`);
  }

  dbx.setHeaders({
    selectAdmin: team_member_id,
  });

  const currentAccount = await dbx.usersGetCurrentAccount();

  const {
    result: { root_info, team, team_member_id: teamMemberId },
  } = currentAccount;

  if (!team || !teamMemberId) {
    throw new Error('The account is not a team account, please use a team account');
  }

  if (!root_info.root_namespace_id) {
    throw new Error('Could not get root namespace id');
  }

  const tokenExpiresAt = addSeconds(new Date(), expires_in);
  await insertOrganisation({
    organisationId,
    accessToken: await encrypt(accessToken),
    refreshToken: refresh_token,
    adminTeamMemberId: team_member_id,
    rootNamespaceId: root_info.root_namespace_id,
    region,
  });

  await inngest.send([
    {
      name: 'dropbox/token.refresh.triggered',
      data: {
        organisationId,
      },
      ts: subMinutes(tokenExpiresAt, 30).getTime(),
    },
    {
      name: 'dropbox/token.refresh.canceled',
      data: {
        organisationId,
      },
    },
    {
      name: 'dropbox/users.sync_page.triggered',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
      },
    },
  ]);

  return {
    status: 'completed',
  };
};
