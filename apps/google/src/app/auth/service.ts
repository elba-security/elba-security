import { getGoogleOAuthClient } from '@/connectors/google/clients';
import { getGoogleUser } from '@/connectors/google/users';

export const getGoogleInfo = async (code: string) => {
  const authClient = getGoogleOAuthClient();
  const {
    tokens: { access_token: accessToken },
  } = await authClient.getToken({ code });

  if (!accessToken) {
    throw new Error('Missing access token');
  }

  const { sub: userId, email } = await authClient.getTokenInfo(accessToken);
  if (!userId || !email) {
    throw new Error('Missing user id / email');
  }

  authClient.setCredentials({ access_token: accessToken });

  try {
    const user = await getGoogleUser({
      auth: authClient,
      userKey: userId,
    });

    if (!user.isAdmin) {
      throw new Error('User is not admin');
    }

    if (!user.customerId) {
      throw new Error('Missing Google customer id');
    }

    return { email, customerId: user.customerId };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- error handling
  } catch (error: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- error handling
    if (error?.errors?.[0]?.reason === 'forbidden') {
      throw new Error('User is not admin');
    }

    throw error;
  }
};
