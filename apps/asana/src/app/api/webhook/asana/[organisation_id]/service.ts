import { webcrypto } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import type { WebhookEvent } from './types';

export const verifyAsanaRequest = async (
  payload: unknown,
  organisationId: string,
  signature: string
) => {
  const [organisation] = await db
    .select({ webhookSecret: Organisation.webhookSecret })
    .from(Organisation)
    .where(eq(Organisation.id, organisationId));

  if (!organisation?.webhookSecret) {
    throw new Error(`Could not retrieve webhookSecret of organisation with id=${organisationId}`);
  }

  const encoder = new TextEncoder();
  const secretKeyData = encoder.encode(organisation.webhookSecret);
  const payloadData = encoder.encode(JSON.stringify(payload));
  const signatureData = Buffer.from(signature, 'hex');

  // Import the secret key for HMAC
  const key = await webcrypto.subtle.importKey(
    'raw',
    secretKeyData,
    {
      name: 'HMAC',
      hash: { name: 'SHA-256' },
    },
    false,
    ['sign']
  );

  // Generate HMAC signature for the payload
  const hmac = await webcrypto.subtle.sign('HMAC', key, payloadData);

  // Compare the HMAC signature with the received signature
  return Buffer.from(hmac).equals(signatureData);
};

export const registerWebhookSecret = async (organisationId: string, webhookSecret: string) => {
  await db
    .update(Organisation)
    .set({ webhookSecret })
    .where(and(eq(Organisation.id, organisationId), isNull(Organisation.webhookSecret)));
};

export const handleWebhookEvent = async (event: WebhookEvent, organisationId: string) => {
  // if the event is about a deleted user
  // use sdk to remove the user: await elba.users.delete({ ids: [userId] })
  // if the event is about an added user
  // use sdk to add the user: await elba.users.update({ users: [{ user }] })
  // ...
};
