import { DBXAccess, DBXAuth } from '@/repositories/dropbox/clients';
import { insertAccessToken } from './data';
import { addSeconds } from 'date-fns';
import { inngest } from '../../../../common/clients/inngest';

type GenerateAccessTokenArgs = {
  authenticationCode: string;
  organisationId: string;
};

export const generateAccessToken = async ({
  authenticationCode,
  organisationId,
}: GenerateAccessTokenArgs) => {
  const dbxAuth = new DBXAuth();

  const { result, status } = await dbxAuth.getAccessToken({ code: authenticationCode });

  if (status !== 200) {
    throw new Error(`Could not get Dropbox access token`);
  }

  const { access_token: accessToken, refresh_token, expires_in } = result;

  const dbxAccess = new DBXAccess({
    fetch: fetch,
    accessToken,
  });

  const adminDetails = await dbxAccess.teamTokenGetAuthenticatedAdmin();

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

  dbxAccess.setHeaders({
    selectAdmin: team_member_id,
  });

  const currentAccount = await dbxAccess.usersGetCurrentAccount();

  const {
    result: { root_info, team, team_member_id: teamMemberId },
  } = currentAccount;

  if (!team || !teamMemberId) {
    throw new Error('The account is not a team account, please use a team account');
  }

  if (!root_info.root_namespace_id) {
    throw new Error('Could not get root namespace id');
  }

  console.log('--------------TOKEN DETAILS---------------------');
  console.log(
    JSON.stringify(
      {
        organisationId,
        accessToken,
        refreshToken: refresh_token,
        expiresAt: addSeconds(new Date(), expires_in),
        adminTeamMemberId: team_member_id,
        rootNamespaceId: root_info.root_namespace_id,
        teamName: team?.name as string,
        unauthorizedAt: null,
      },
      null,
      2
    )
  );
  console.log('------------------------------------------------');

  try {
    const accessTokenExpiresAt = addSeconds(new Date(), expires_in);
    await insertAccessToken({
      organisationId,
      accessToken,
      refreshToken: refresh_token,
      expiresAt: accessTokenExpiresAt,
      adminTeamMemberId: team_member_id,
      rootNamespaceId: root_info.root_namespace_id,
      teamName: team?.name as string,
      unauthorizedAt: null,
    });

    await inngest.send({
      name: 'users/run-user-sync-jobs',
      data: {
        organisationId,
        accessToken,
        isFirstScan: true,
        syncStartedAt: new Date().toISOString(),
      },
    });

    return {
      status: 'success',
    };
  } catch (error) {
    throw new Error('An error occurred while saving access token', {
      cause: error?.message,
    });
  }
};
