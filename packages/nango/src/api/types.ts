import { type Connection, type AllAuthCredentials } from '@nangohq/types';

export type { Connection, AllAuthCredentials, AuthModeType } from '@nangohq/types';

export type CredentialsAuthTypes = NonNullable<AllAuthCredentials['type']>;

export type CredentialsType<AuthType extends CredentialsAuthTypes> = Extract<
  AllAuthCredentials,
  { type: AuthType }
>;

export type ConnectionType<AuthType extends CredentialsAuthTypes> = Omit<
  Connection,
  'credentials'
> & { credentials: CredentialsType<AuthType> };
