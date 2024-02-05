import { env } from '@/common/env';

const hexStringToUint8Array = (hex: string) => {
  const matches = hex.match(/[\da-f]{2}/gi) ?? []; // grab hex pairs
  return new Uint8Array(matches.map((h: string) => parseInt(h, 16)));
};

// https://medium.com/@jackoddy/verifying-slack-signatures-using-web-crypto-subtlecrypto-in-vercels-edge-runtime-45c1a1d2b33b
export const isRequestSignedBySlack = async (
  slackSignature: string,
  timestamp: number,
  body: string
) => {
  const textEncoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(env.SLACK_SIGNING_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  return crypto.subtle.verify(
    'HMAC',
    key,
    hexStringToUint8Array(slackSignature),
    textEncoder.encode(`v0:${timestamp}:${body}`)
  );
};
