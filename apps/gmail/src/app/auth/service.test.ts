import { afterEach, describe, expect, it, vi } from 'vitest';
import * as googleAuth from 'google-auth-library';
import * as googleUsers from '@/connectors/google/users';
import { getGoogleInfo } from './service';

const OAuth2Client = googleAuth.OAuth2Client;

describe('getGoogleInfo', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Should successfully return google information', async () => {
    const oauth2ClientMock = vi
      .spyOn(googleAuth, 'OAuth2Client')
      .mockImplementation((...options: ConstructorParameters<typeof googleAuth.OAuth2Client>) => {
        const googleOAuth2Client = new OAuth2Client(...options);

        // @ts-expect-error -- this is a mock
        vi.spyOn(googleOAuth2Client, 'getToken').mockResolvedValue({
          tokens: {
            access_token: 'access-token',
          } satisfies googleAuth.Credentials,
        });
        // @ts-expect-error -- this is a mock
        vi.spyOn(googleOAuth2Client, 'getTokenInfo').mockResolvedValue({
          sub: 'user-id',
          email: 'user@org.local',
        });
        vi.spyOn(googleOAuth2Client, 'setCredentials');

        return googleOAuth2Client;
      });

    vi.spyOn(googleUsers, 'getGoogleUser').mockResolvedValue({
      id: 'user-id',
      name: { fullName: 'John Doe' },
      primaryEmail: 'user@org.local',
      customerId: 'customer-id',
      isAdmin: true,
    });

    const result = await getGoogleInfo('1234');

    expect(result).toStrictEqual({ customerId: 'customer-id', email: 'user@org.local' });

    expect(oauth2ClientMock).toBeCalledTimes(1);
    expect(oauth2ClientMock).toBeCalledWith({
      clientId: 'google-auth-client-id',
      clientSecret: 'google-auth-client-secret',
      redirectUri: 'https://google',
    });

    const oauth2Instance = oauth2ClientMock.mock.results[0]?.value as
      | googleAuth.OAuth2Client
      | undefined;

    expect(oauth2Instance?.getToken).toBeCalledTimes(1);
    expect(oauth2Instance?.getToken).toBeCalledWith({ code: '1234' });

    expect(oauth2Instance?.getTokenInfo).toBeCalledTimes(1);
    expect(oauth2Instance?.getTokenInfo).toBeCalledWith('access-token');

    expect(oauth2Instance?.setCredentials).toBeCalledTimes(1);
    expect(oauth2Instance?.setCredentials).toBeCalledWith({ access_token: 'access-token' });

    expect(googleUsers.getGoogleUser).toBeCalledTimes(1);
    expect(googleUsers.getGoogleUser).toBeCalledWith({ auth: oauth2Instance, userKey: 'user-id' });
  });

  it("Should throw if access token can't be retrieved", async () => {
    const oauth2ClientMock = vi
      .spyOn(googleAuth, 'OAuth2Client')
      .mockImplementation((...options: ConstructorParameters<typeof googleAuth.OAuth2Client>) => {
        const googleOAuth2Client = new OAuth2Client(...options);

        // @ts-expect-error -- this is a mock
        vi.spyOn(googleOAuth2Client, 'getToken').mockResolvedValue({
          tokens: {} satisfies googleAuth.Credentials,
        });
        // @ts-expect-error -- this is a mock
        vi.spyOn(googleOAuth2Client, 'getTokenInfo').mockResolvedValue({
          sub: 'user-id',
          email: 'user@org.local',
        });
        vi.spyOn(googleOAuth2Client, 'setCredentials');

        return googleOAuth2Client;
      });

    vi.spyOn(googleUsers, 'getGoogleUser').mockResolvedValue({
      id: 'user-id',
      name: { fullName: 'John Doe' },
      primaryEmail: 'user@org.local',
      customerId: 'customer-id',
      isAdmin: true,
    });

    await expect(getGoogleInfo('1234')).rejects.toThrowError('Missing access token');

    expect(oauth2ClientMock).toBeCalledTimes(1);
    expect(oauth2ClientMock).toBeCalledWith({
      clientId: 'google-auth-client-id',
      clientSecret: 'google-auth-client-secret',
      redirectUri: 'https://google',
    });

    const oauth2Instance = oauth2ClientMock.mock.results[0]?.value as
      | googleAuth.OAuth2Client
      | undefined;

    expect(oauth2Instance?.getToken).toBeCalledTimes(1);
    expect(oauth2Instance?.getToken).toBeCalledWith({ code: '1234' });

    expect(oauth2Instance?.getTokenInfo).toBeCalledTimes(0);
    expect(oauth2Instance?.setCredentials).toBeCalledTimes(0);
    expect(googleUsers.getGoogleUser).toBeCalledTimes(0);
  });

  it("Should throw if user info can't be retrieved", async () => {
    const oauth2ClientMock = vi
      .spyOn(googleAuth, 'OAuth2Client')
      .mockImplementation((...options: ConstructorParameters<typeof googleAuth.OAuth2Client>) => {
        const googleOAuth2Client = new OAuth2Client(...options);

        // @ts-expect-error -- this is a mock
        vi.spyOn(googleOAuth2Client, 'getToken').mockResolvedValue({
          tokens: {
            access_token: 'access-token',
          } satisfies googleAuth.Credentials,
        });
        // @ts-expect-error -- this is a mock
        vi.spyOn(googleOAuth2Client, 'getTokenInfo').mockResolvedValue({});
        vi.spyOn(googleOAuth2Client, 'setCredentials');

        return googleOAuth2Client;
      });

    vi.spyOn(googleUsers, 'getGoogleUser').mockResolvedValue({
      id: 'user-id',
      name: { fullName: 'John Doe' },
      primaryEmail: 'user@org.local',
      customerId: 'customer-id',
      isAdmin: true,
    });

    await expect(getGoogleInfo('1234')).rejects.toThrowError('Missing user id / email');

    expect(oauth2ClientMock).toBeCalledTimes(1);
    expect(oauth2ClientMock).toBeCalledWith({
      clientId: 'google-auth-client-id',
      clientSecret: 'google-auth-client-secret',
      redirectUri: 'https://google',
    });

    const oauth2Instance = oauth2ClientMock.mock.results[0]?.value as
      | googleAuth.OAuth2Client
      | undefined;

    expect(oauth2Instance?.getToken).toBeCalledTimes(1);
    expect(oauth2Instance?.getToken).toBeCalledWith({ code: '1234' });

    expect(oauth2Instance?.getTokenInfo).toBeCalledTimes(1);
    expect(oauth2Instance?.getTokenInfo).toBeCalledWith('access-token');

    expect(oauth2Instance?.setCredentials).toBeCalledTimes(0);
    expect(googleUsers.getGoogleUser).toBeCalledTimes(0);
  });

  it('Should throw when receiving forbidden error', async () => {
    const oauth2ClientMock = vi
      .spyOn(googleAuth, 'OAuth2Client')
      .mockImplementation((...options: ConstructorParameters<typeof googleAuth.OAuth2Client>) => {
        const googleOAuth2Client = new OAuth2Client(...options);

        // @ts-expect-error -- this is a mock
        vi.spyOn(googleOAuth2Client, 'getToken').mockResolvedValue({
          tokens: {
            access_token: 'access-token',
          } satisfies googleAuth.Credentials,
        });
        // @ts-expect-error -- this is a mock
        vi.spyOn(googleOAuth2Client, 'getTokenInfo').mockResolvedValue({
          sub: 'user-id',
          email: 'user@org.local',
        });
        vi.spyOn(googleOAuth2Client, 'setCredentials');

        return googleOAuth2Client;
      });

    vi.spyOn(googleUsers, 'getGoogleUser').mockRejectedValue({ errors: [{ reason: 'forbidden' }] });

    await expect(getGoogleInfo('1234')).rejects.toThrowError('User is not admin');

    expect(oauth2ClientMock).toBeCalledTimes(1);
    expect(oauth2ClientMock).toBeCalledWith({
      clientId: 'google-auth-client-id',
      clientSecret: 'google-auth-client-secret',
      redirectUri: 'https://google',
    });

    const oauth2Instance = oauth2ClientMock.mock.results[0]?.value as
      | googleAuth.OAuth2Client
      | undefined;

    expect(oauth2Instance?.getToken).toBeCalledTimes(1);
    expect(oauth2Instance?.getToken).toBeCalledWith({ code: '1234' });

    expect(oauth2Instance?.getTokenInfo).toBeCalledTimes(1);
    expect(oauth2Instance?.getTokenInfo).toBeCalledWith('access-token');

    expect(oauth2Instance?.setCredentials).toBeCalledTimes(1);
    expect(oauth2Instance?.setCredentials).toBeCalledWith({ access_token: 'access-token' });

    expect(googleUsers.getGoogleUser).toBeCalledTimes(1);
    expect(googleUsers.getGoogleUser).toBeCalledWith({ auth: oauth2Instance, userKey: 'user-id' });
  });

  it('Should throw if user is not admin', async () => {
    const oauth2ClientMock = vi
      .spyOn(googleAuth, 'OAuth2Client')
      .mockImplementation((...options: ConstructorParameters<typeof googleAuth.OAuth2Client>) => {
        const googleOAuth2Client = new OAuth2Client(...options);

        // @ts-expect-error -- this is a mock
        vi.spyOn(googleOAuth2Client, 'getToken').mockResolvedValue({
          tokens: {
            access_token: 'access-token',
          } satisfies googleAuth.Credentials,
        });
        // @ts-expect-error -- this is a mock
        vi.spyOn(googleOAuth2Client, 'getTokenInfo').mockResolvedValue({
          sub: 'user-id',
          email: 'user@org.local',
        });
        vi.spyOn(googleOAuth2Client, 'setCredentials');

        return googleOAuth2Client;
      });

    vi.spyOn(googleUsers, 'getGoogleUser').mockResolvedValue({
      id: 'user-id',
      name: { fullName: 'John Doe' },
      primaryEmail: 'user@org.local',
      customerId: 'customer-id',
    });

    await expect(getGoogleInfo('1234')).rejects.toThrowError('User is not admin');

    expect(oauth2ClientMock).toBeCalledTimes(1);
    expect(oauth2ClientMock).toBeCalledWith({
      clientId: 'google-auth-client-id',
      clientSecret: 'google-auth-client-secret',
      redirectUri: 'https://google',
    });

    const oauth2Instance = oauth2ClientMock.mock.results[0]?.value as
      | googleAuth.OAuth2Client
      | undefined;

    expect(oauth2Instance?.getToken).toBeCalledTimes(1);
    expect(oauth2Instance?.getToken).toBeCalledWith({ code: '1234' });

    expect(oauth2Instance?.getTokenInfo).toBeCalledTimes(1);
    expect(oauth2Instance?.getTokenInfo).toBeCalledWith('access-token');

    expect(oauth2Instance?.setCredentials).toBeCalledTimes(1);
    expect(oauth2Instance?.setCredentials).toBeCalledWith({ access_token: 'access-token' });

    expect(googleUsers.getGoogleUser).toBeCalledTimes(1);
    expect(googleUsers.getGoogleUser).toBeCalledWith({ auth: oauth2Instance, userKey: 'user-id' });
  });

  it("Should throw if customer id can't be retrieved", async () => {
    const oauth2ClientMock = vi
      .spyOn(googleAuth, 'OAuth2Client')
      .mockImplementation((...options: ConstructorParameters<typeof googleAuth.OAuth2Client>) => {
        const googleOAuth2Client = new OAuth2Client(...options);

        // @ts-expect-error -- this is a mock
        vi.spyOn(googleOAuth2Client, 'getToken').mockResolvedValue({
          tokens: {
            access_token: 'access-token',
          } satisfies googleAuth.Credentials,
        });
        // @ts-expect-error -- this is a mock
        vi.spyOn(googleOAuth2Client, 'getTokenInfo').mockResolvedValue({
          sub: 'user-id',
          email: 'user@org.local',
        });
        vi.spyOn(googleOAuth2Client, 'setCredentials');

        return googleOAuth2Client;
      });

    vi.spyOn(googleUsers, 'getGoogleUser').mockResolvedValue({
      id: 'user-id',
      name: { fullName: 'John Doe' },
      primaryEmail: 'user@org.local',
      isAdmin: true,
    });

    await expect(getGoogleInfo('1234')).rejects.toThrowError('Missing Google customer id');

    expect(oauth2ClientMock).toBeCalledTimes(1);
    expect(oauth2ClientMock).toBeCalledWith({
      clientId: 'google-auth-client-id',
      clientSecret: 'google-auth-client-secret',
      redirectUri: 'https://google',
    });

    const oauth2Instance = oauth2ClientMock.mock.results[0]?.value as
      | googleAuth.OAuth2Client
      | undefined;

    expect(oauth2Instance?.getToken).toBeCalledTimes(1);
    expect(oauth2Instance?.getToken).toBeCalledWith({ code: '1234' });

    expect(oauth2Instance?.getTokenInfo).toBeCalledTimes(1);
    expect(oauth2Instance?.getTokenInfo).toBeCalledWith('access-token');

    expect(oauth2Instance?.setCredentials).toBeCalledTimes(1);
    expect(oauth2Instance?.setCredentials).toBeCalledWith({ access_token: 'access-token' });

    expect(googleUsers.getGoogleUser).toBeCalledTimes(1);
    expect(googleUsers.getGoogleUser).toBeCalledWith({ auth: oauth2Instance, userKey: 'user-id' });
  });
});
