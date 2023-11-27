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

  const { access_token, refresh_token, expires_in } = result;

  const dbxAccess = new DBXAccess({
    fetch: fetch,
    accessToken: access_token,
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
    selectUser: team_member_id,
  });

  const {
    result: { name, account_type, root_info, team },
  } = await dbxAccess.usersGetCurrentAccount();

  if (account_type['.tag'] !== 'business') {
    throw new Error(
      `We don't support ${account_type['.tag']} account, please use business account`
    );
  }

  // if (root_info['.tag'] !== 'team') {
  //   throw new Error(`We don't support ${root_info['.tag']} account type`);
  // }

  if (!root_info.root_namespace_id) {
    throw new Error('Could not get root namespace id');
  }

  try {
    const accessTokenExpiresAt = addSeconds(new Date(), expires_in).toISOString();
    await insertAccessToken({
      organisationId,
      accessToken: access_token,
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
        accessToken: access_token,
        isFirstScan: true,
      },
    });

    return {
      status: 'success',
    };
  } catch (error: any) {
    throw new Error('An error occurred while saving access token', {
      cause: error?.message,
    });
  }
};
