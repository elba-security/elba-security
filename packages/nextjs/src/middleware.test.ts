import { describe, expect, test, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import * as elbaSdk from '@elba-security/sdk';
import { createElbaMiddleware } from './middleware';

const webhookSecret = 'webhook-secret';

const middleware = createElbaMiddleware({ webhookSecret });

const setup = async () => {
  const request = new NextRequest(new URL('http://fiz.baz/api/webhook/elba/some-path'));
  // @ts-expect-error - partial nextjs middleware implementation
  return { request, result: await middleware(request) };
};

describe('createElbaMiddleware', () => {
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
