import { describe, it, expect } from 'vitest';
import {
  _createWebhookElbaSignature,
  _bufferToHex,
  _timingSafeEqual,
  isValidWebhookElbaSignature,
} from './is-valid-webhook-elba-signature';

describe('isValidWebhookElbaSignature', () => {
  it('should return true for a valid signature', async () => {
    const secret = 'test-secret';
    const payload = { data: 'example' };
    const validSignature = await _createWebhookElbaSignature(secret, payload);

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

describe('_createWebhookElbaSignature', () => {
  it('should create a consistent signature for the same secret and payload', async () => {
    const secret = 'test-secret';
    const payload = { data: 'example' };

    const signature1 = await _createWebhookElbaSignature(secret, payload);
    const signature2 = await _createWebhookElbaSignature(secret, payload);

    expect(signature1).toBe(signature2);
  });

  it('should create different signatures for different secrets', async () => {
    const secret1 = 'test-secret-1';
    const secret2 = 'test-secret-2';
    const payload = { data: 'example' };

    const signature1 = await _createWebhookElbaSignature(secret1, payload);
    const signature2 = await _createWebhookElbaSignature(secret2, payload);

    expect(signature1).not.toBe(signature2);
  });
});

describe('_bufferToHex', () => {
  it('should convert an ArrayBuffer to a hex string', () => {
    const buffer = new Uint8Array([1, 2, 3, 255]).buffer;
    const hex = _bufferToHex(buffer);

    expect(hex).toBe('010203ff');
  });
});

describe('_timingSafeEqual', () => {
  it('should return true for equal strings', () => {
    const str1 = 'test-string';
    const str2 = 'test-string';

    expect(_timingSafeEqual(str1, str2)).toBe(true);
  });

  it('should return false for unequal strings', () => {
    const str1 = 'test-string-1';
    const str2 = 'test-string-2';

    expect(_timingSafeEqual(str1, str2)).toBe(false);
  });

  it('should return false for strings of different lengths', () => {
    const str1 = 'short';
    const str2 = 'longer-string';

    expect(_timingSafeEqual(str1, str2)).toBe(false);
  });
});
