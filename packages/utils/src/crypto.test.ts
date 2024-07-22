import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  arrayBufferFromHexString,
  decryptText,
  encryptText,
  hexStringFromArrayBuffer,
} from './crypto';

describe('crypto', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('arrayBufferFromHexString', () => {
    test('should fail if the input is not a proper hex formatted string', () => {
      expect(() => arrayBufferFromHexString('zzzz')).toThrowError('Invalid hex string');
    });

    test('should fail if the input length is not even', () => {
      expect(() => arrayBufferFromHexString('abcde')).toThrowError('Invalid hex string');
    });

    test('should successfully return an array buffer', () => {
      const result = arrayBufferFromHexString('00010203');
      expect(result.byteLength).toEqual(4);
      expect(new Uint8Array(result)).toEqual(new Uint8Array([0, 1, 2, 3]));
    });
  });

  describe('hexStringFromArrayBuffer', () => {
    test('should successfully return an hex string', () => {
      const result = hexStringFromArrayBuffer(new Uint8Array([0, 1, 2, 3]));
      expect(result).toEqual('00010203');
    });
  });

  describe('encryptText', () => {
    test('should successfully encrypt text with random IV', async () => {
      vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => array);
      const data = 'test';
      const key = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
      const result = await encryptText({ data, key });
      expect(crypto.getRandomValues).toBeCalledTimes(1);
      expect(result).toEqual(
        '00000000000000000000000000000000660d323774196d0d8e56e408b8b5a4ffbcdb2b4e'
      );
    });

    test('should successfully encrypt text with specified IV', async () => {
      vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => array);
      const data = 'test';
      const key = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
      const iv = '00000000000000000000000000000000';
      const result = await encryptText({ data, key, iv });
      expect(crypto.getRandomValues).toBeCalledTimes(0);
      expect(result).toEqual(
        '00000000000000000000000000000000660d323774196d0d8e56e408b8b5a4ffbcdb2b4e'
      );
    });
  });

  describe('decryptText', () => {
    test('should successfully decrypt text', async () => {
      const data = '00000000000000000000000000000000660d323774196d0d8e56e408b8b5a4ffbcdb2b4e';
      const key = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
      const result = await decryptText({ data, key });
      expect(result).toEqual('test');
    });
  });
});
