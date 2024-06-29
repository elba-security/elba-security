import type { DropboxAuthOptions } from 'dropbox';
import { DropboxAuth } from 'dropbox';
import { env } from '@/env';
import type { DropboxAuthResult, DropboxAuthResultWithStatus, GetAccessToken } from '../types';

export class DBXAuth {
  private dbxAuth: DropboxAuth;
  private redirectUri: string;

  constructor(options?: DropboxAuthOptions) {
    const defaultOptions: DropboxAuthOptions = {
      fetch,
      clientId: env.DROPBOX_CLIENT_ID,
      clientSecret: env.DROPBOX_CLIENT_SECRET,
      ...options,
    };

    this.dbxAuth = new DropboxAuth(defaultOptions);

    this.redirectUri = env.DROPBOX_REDIRECT_URI;
  }

  async getAuthUrl({ state }: { state: string }) {
    return this.dbxAuth.getAuthenticationUrl(this.redirectUri, state, 'code', 'offline');
  }

  async getAccessToken({ code }: GetAccessToken): Promise<DropboxAuthResultWithStatus> {
    const response = await this.dbxAuth.getAccessTokenFromCode(this.redirectUri, code);
    const dropboxAuthResult = response.result as DropboxAuthResult;

    return {
      status: response.status,
      result: dropboxAuthResult,
    };
  }

  async refreshAccessToken() {
    // eslint-disable-next-line -- Type is incorrect, it returns a promise
    await this.dbxAuth.refreshAccessToken();

    return {
      access_token: this.dbxAuth.getAccessToken(),
      expires_at: this.dbxAuth.getAccessTokenExpiresAt(),
    };
  }
}
