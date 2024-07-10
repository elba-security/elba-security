import { SignJWT } from 'jose';

export const generateToken = async ({
  clientId,
  secretId,
  secret,
  email,
}: {
  clientId: string;
  secretId: string;
  secret: string;
  email: string;
}): Promise<string> => {
  const key = new TextEncoder().encode(secret);

  const jwt = await new SignJWT({
    scp: ['tableau:users:read'],
  })
    .setIssuedAt()
    .setSubject(email)
    .setAudience('tableau')
    .setExpirationTime('9 minutes')
    .setProtectedHeader({ alg: 'HS256', kid: secretId, typ: 'JWT', iss: clientId })
    .sign(key);

  return jwt;
};
