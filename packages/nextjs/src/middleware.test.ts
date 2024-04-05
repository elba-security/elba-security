import { describe, expect, test, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import * as elbaSdk from '@elba-security/sdk';
import { createElbaMiddleware } from './middleware';

const webhookSecret = 'webhook-secret';

const { config, middleware } = createElbaMiddleware({
  webhookSecret,
});

const setup = async () => {
  const request = new NextRequest(new URL('http://fiz.baz/api/webhook/elba/some-path'));
  // @ts-expect-error - partial nextjs middleware implementation
  return { request, result: await middleware(request) };
};

describe('createElbaMiddleware', () => {
  test('should return the right config', () => {
    expect(config).toStrictEqual({
      matcher: ['/api/webhook/elba/(.*)', '/api/webhooks/elba/(.*)'],
    });
  });

  test.each(['/api/webhook/elba/some-path', '/api/webhooks/elba/some-path'])(
    'should match path %s',
    (path) => {
      expect(config.matcher.some((pattern) => new RegExp(pattern).test(path))).toBe(true);
    }
  );

  test.each([
    '/api/webhook/source/some-path',
    '/api/webhooks/source/some-path',
    '/api/webhookss/elba/some-path',
    '/api/test/elba/some-path',
    '/some-path',
  ])('should not match path %s', (path) => {
    expect(config.matcher.some((pattern) => new RegExp(pattern).test(path))).toBe(false);
  });

  test('should returns handler response when the signature is valid', async () => {
    vi.spyOn(elbaSdk, 'validateWebhookRequestSignature').mockResolvedValue(undefined);

    const { request, result } = await setup();

    expect(result).toBe(undefined);
    expect(elbaSdk.validateWebhookRequestSignature).toBeCalledTimes(1);
    expect(elbaSdk.validateWebhookRequestSignature).toBeCalledWith(request, webhookSecret);
  });

  test('should returns unauthorized response when the signature is invalid', async () => {
    vi.spyOn(elbaSdk, 'validateWebhookRequestSignature').mockRejectedValue(new Error());

    const { request, result } = await setup();

    expect(result).toBeInstanceOf(NextResponse);
    expect(result?.status).toBe(401);
    expect(elbaSdk.validateWebhookRequestSignature).toBeCalledTimes(1);
    expect(elbaSdk.validateWebhookRequestSignature).toBeCalledWith(request, webhookSecret);
  });
});
