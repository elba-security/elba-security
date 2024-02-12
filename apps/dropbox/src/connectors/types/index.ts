import { DropboxAuthOptions, DropboxResponse, DropboxResponseError, team, users } from 'dropbox';

export type GetAccessToken = {
  code: string;
};

export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

export type DropboxAuthResult = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  uid: string;
  team_id: string;
};

export type DropboxAuthResultWithStatus = NonNullableFields<{
  status: number;
  result: DropboxAuthResult;
}>;

export interface DBXAuthOptions extends DropboxAuthOptions {
  redirectUri: string;
}

export { DropboxResponse, DropboxResponseError };
export type { team, users };

export type DBXAppsOption = {
  accessToken: string;
  teamMemberId?: string;
};
