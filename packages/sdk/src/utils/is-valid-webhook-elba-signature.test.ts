import { describe, it, expect } from 'vitest';
import { isValidWebhookElbaSignature } from './is-valid-webhook-elba-signature';

describe('isValidWebhookElbaSignature', () => {
  it('should return true for a valid signature', async () => {
    const secret = 'test-secret';
    const payload = { data: 'example' };
    // crypto signature computed using the above secret and payload
    const validSignature = '8d39b9c99e442dd3cb018aa9b6e7d83a267881c5fa558f6fba4ec0ef1e06df4c';

    const result = await isValidWebhookElbaSignature(secret, payload, validSignature);
    expect(result).toBe(true);
  });

  it('should return false for an invalid signature', async () => {
    const secret = 'test-secret';
    const payload = { data: 'example' };
    const invalidSignature = 'invalid-signature';

    const result = await isValidWebhookElbaSignature(secret, payload, invalidSignature);
    expect(result).toBe(false);
  });
});
