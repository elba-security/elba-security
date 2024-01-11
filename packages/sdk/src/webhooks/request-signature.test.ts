import { describe, it, expect } from 'vitest';
import { ElbaError } from '../error';
import { validateWebhookRequestSignature } from './request-signature';

describe('validateWebhookRequestSignature', () => {
  it('should succeed when the request signature is valid', async () => {
    const secret = 'test-secret';
    const payload = '{ "data": "example" }';
    // crypto signature computed using the above secret and payload
    const signature = 'b1d12035603a98adf998e23052a1c99ff356cc2903322f7dd1ccc6d2e2748863';
    const request = new Request(new URL('http://foo.bar'), {
      method: 'post',
      body: JSON.stringify(payload),
      headers: { 'X-Elba-Signature': signature },
    });

    await expect(validateWebhookRequestSignature(request, secret)).resolves.toBe(undefined);
  });

  it('should fail when the request signature is invalid', async () => {
    const secret = 'test-secret';
    const payload = '{ "data": "example" }';

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

  it('should fail when the request method is not supported', async () => {
    const secret = 'test-secret';
    const payload = undefined;

    const signature = 'invalid-signature';
    const request = new Request(new URL('http://foo.bar'), {
      method: 'get',
      body: JSON.stringify(payload),
      headers: { 'X-Elba-Signature': signature },
    });

    await expect(validateWebhookRequestSignature(request, secret)).rejects.toBeInstanceOf(
      ElbaError
    );
    await expect(validateWebhookRequestSignature(request, secret)).rejects.toMatchObject({
      message: 'Could not retrieve payload from webhook request',
      cause: `Method "GET" is not supported`,
      request,
    });
  });
});
