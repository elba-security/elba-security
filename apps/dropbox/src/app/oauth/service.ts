import addSeconds from 'date-fns/addSeconds';
import { DBXAccess, DBXAuth } from '@/connectors';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import { insertOrganisation } from './data';

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

  const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn } = result;

  const dbx = new DBXAccess({
    accessToken,
  });

  const adminDetails = await dbx.teamTokenGetAuthenticatedAdmin();

  const {
    result: {
      admin_profile: {
        status: adminStatus,
        team_member_id: teamMemberId,
        membership_type: membershipType,
      },
    },
  } = adminDetails;

  if (adminStatus['.tag'] !== 'active') {
    throw new Error(`Admin status is ${adminStatus['.tag']}, please activate your account`);
  }

  if (membershipType['.tag'] !== 'full') {
    throw new Error(`Admin has ${membershipType['.tag']} access, please upgrade to full access`);
  }

  dbx.setHeaders({
    selectAdmin: teamMemberId,
  });

  const currentAccount = await dbx.usersGetCurrentAccount();

  const {
    result: { root_info: rootInfo, team },
  } = currentAccount;

  if (!team || !teamMemberId) {
    throw new Error('The account is not a team account, please use a team account');
  }

  if (!rootInfo.root_namespace_id) {
    throw new Error('Could not get root namespace id');
  }

  await insertOrganisation({
    organisationId,
    accessToken: await encrypt(accessToken),
    refreshToken,
    adminTeamMemberId: teamMemberId,
    rootNamespaceId: rootInfo.root_namespace_id,
    region,
  });

  await inngest.send([
    {
      name: 'dropbox/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), expiresIn).getTime(),
      },
    },
    {
      name: 'dropbox/users.sync_page.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
      },
    },
    {
      name: 'dropbox/app.install.requested',
      data: {
        organisationId,
      },
    },
  ]);

  return {
    status: 'completed',
  };
};
