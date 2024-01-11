import { ElbaError } from '../error';

export type ValidateWebhookRequestSignatureResult =
  | {
      success: false;
      error: ElbaError;
    }
  | { success: true };

export const validateWebhookRequestSignature = async (request: Request, secret: string) => {
  // cloning is mandatory to make sure that request.json() still works after this function invokation
  const requestClone = request.clone();
  const signature = requestClone.headers.get('X-Elba-Signature');

  if (!signature) {
    throw new ElbaError("Could not retrieve header 'X-Elba-Signature' from webhook request", {
      request,
    });
  }

  if (requestClone.method !== 'POST') {
    throw new ElbaError('Could not retrieve payload from webhook request', {
      request,
      cause: `Method "${requestClone.method}" is not supported`,
    });
  }

  const payload = await requestClone.text();

  const isSignatureValid = await validateSignature(secret, payload, signature);

  if (!isSignatureValid) {
    throw new ElbaError('Could not validate elba signature from webhook request', {
      request,
    });
  }
};

/**
 * Validates the signature sent in the 'X-elba-Signature' header of a webhook request
 * received from elba.
 *
 * This function computes the HMAC SHA256 signature of the given payload and secret,
 * and then compares it in a timing-safe manner with the signature received in the webhook's
 * 'X-elba-Signature' header. This is used to ensure that the webhook request is indeed from elba
 * and has not been tampered with. The comparison is done using a timing-safe algorithm to prevent
 * timing attacks.
 *
 * @param secret - The secret key generated at the time of creating the elba integration.
 * @param payload - A string for which the signature is being validated.
 * @param elbaSignatureFromHeader - The signature to be validated against the computed signature.
 * @returns A promise that resolves to true if the computed signature matches
 *          the signature from the header; false otherwise.
 *
 * @example
 * ```ts
 * const secret = getSecurelyStoredSecret();
 * const payload = '{ "data": "example" }'
 * const signatureFromHeader = 'received-signature-from-header';
 * const isValid = await isValidWebhookElbaSignature(secret, payload, signatureFromHeader);
 * console.log("Is the signature valid?, isValid ? "Yes" : "No");
 * ```
 */
async function validateSignature(
  secret: string,
  payload: string,
  signature: string
): Promise<boolean> {
  const expectedSignature = await createWebhookElbaSignature(secret, payload);
  return timingSafeEqual(expectedSignature, signature);
}

/**
 * @internal
 * Asynchronously generates a HMAC SHA256 signature for a given payload using a secret.
 * Uses the SubtleCrypto API with the secret and a payload encoded to generate
 * a HMAC SHA256 signature. The signature is returned as a hexadecimal string.
 *
 * @param secret - The secret key used for HMAC generation.
 * @param payload - A string for which the signature is being generated.
 * @returns A promise that resolves to a hexadecimal string representation of the signature.
 *
 * @example
 * ```ts
 * const secret = getSecurelyStoredSecret();
 * const payload = '{ "data": "example" }'
 * const signature = await createHmacSha256Signature(secret, payload)
 * console.log(signature);
 * ```
 */
async function createWebhookElbaSignature(secret: string, payload: string) {
  // encode the secret and payload to Uint8Array
  const encoder = new TextEncoder();
  const encodedSecret = encoder.encode(secret);
  const encodedPayload = encoder.encode(JSON.stringify(payload));

  // generate a CryptoKey from the secret
  const key = await crypto.subtle.importKey(
    'raw',
    encodedSecret,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encodedPayload);

  return bufferToHex(signature);
}

/**
 * @internal
 * Converts an ArrayBuffer to a hexadecimal string.
 *
 * @param buffer - The ArrayBuffer to convert to a hexadecimal string.
 * @returns A string representing the hexadecimal value of the input buffer.
 *
 * @example
 * ```ts
 * // assuming 'signature' is an ArrayBuffer obtained from a crypto operation
 * const hexSignature = bufferToHex(signature);
 * console.log(hexSignature);
 * ```
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * @internal
 * Performs a timing-safe comparison between two strings.
 *
 * This function is used to compare two strings in a way that is safe against timing attacks.
 * It works by comparing each character's char code in the two strings, and it accumulates any
 * difference in a mismatch variable. The function ensures that the operation takes the same
 * amount of time regardless of where a difference occurs between the strings, making it
 * suitable for comparing sensitive data such as cryptographic hashes.
 *
 * @param a - The first string to compare.
 * @param b - The second string to compare.
 * @returns true if the strings are equal, false otherwise.
 *
 * @example
 * ```ts
 * const hash1 = 'abc123...';
 * const hash2 = 'abc123...';
 * const isEqual = timingSafeEqual(hash1, hash2);
 * console.log(isEqual);
 * ```
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    // eslint-disable-next-line no-bitwise -- bitwise operation is required for timing-safe comparison
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
}
