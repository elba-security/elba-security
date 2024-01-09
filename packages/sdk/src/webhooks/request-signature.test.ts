import { describe, it, expect } from 'vitest';
import { ElbaError } from '../error';
import { validateWebhookRequestSignature } from './request-signature';

describe('validateWebhookRequestSignature', () => {
  it('should succeed when the signature is valid', async () => {
    const secret = 'test-secret';
    const payload = { data: 'example' };
    // crypto signature computed using the above secret and payload
    const signature = '8d39b9c99e442dd3cb018aa9b6e7d83a267881c5fa558f6fba4ec0ef1e06df4c';
    const request = new Request(new URL('http://foo.bar'), {
      method: 'post',
      body: JSON.stringify(payload),
      headers: { 'X-Elba-Signature': signature },
    });

    await expect(validateWebhookRequestSignature(request, secret)).resolves.toBe(undefined);
  });

  it('should fail when the signature is invalid', async () => {
    const secret = 'test-secret';
    const payload = { data: 'example' };

    const signature = 'invalid-signature';
    const request = new Request(new URL('http://foo.bar'), {
      method: 'post',
      body: JSON.stringify(payload),
      headers: { 'X-Elba-Signature': signature },
    });

    await expect(validateWebhookRequestSignature(request, secret)).rejects.toBeInstanceOf(
      ElbaError
    );
    await expect(validateWebhookRequestSignature(request, secret)).rejects.toMatchObject({
      message: 'Could not validate elba signature from webhook request',
      request,
    });
  });

  it('should fail when the signature is valid and payload invalid', async () => {
    const secret = 'test-secret';
    const payload = ['foo'];

    const signature = 'invalid-signature';
    const request = new Request(new URL('http://foo.bar'), {
      method: 'post',
      body: JSON.stringify(payload),
      headers: { 'X-Elba-Signature': signature },
    });

    await expect(validateWebhookRequestSignature(request, secret)).rejects.toBeInstanceOf(
      ElbaError
    );
    await expect(validateWebhookRequestSignature(request, secret)).rejects.toMatchObject({
      message: 'Could not validate payload from webhook request',
      request,
    });
  });
});
