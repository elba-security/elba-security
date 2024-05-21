import * as jose from 'jose';
import { env } from '@/env';

export type MicrosoftToken = {
  token: string;
  tenantId: string;
};

const JWKS = jose.createRemoteJWKSet(
  new URL('https://login.microsoftonline.com/common/discovery/v2.0/keys')
);

export async function validateTokens(tokens: MicrosoftToken[]) {
  try {
    await Promise.all(
      tokens.map(({ token, tenantId }) =>
        jose.jwtVerify(token, JWKS, {
          issuer: `https://sts.windows.net/${tenantId}/`,
          audience: env.MICROSOFT_CLIENT_ID,
        })
      )
    );
    return true;
  } catch (e) {
    return false;
  }
}
