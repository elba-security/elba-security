import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { inngest } from '@/inngest/client';
import { handleSlackWebhookMessage } from './service';

const mockedDate = '2023-01-01T00:00:00.000Z';

describe('handleSlackInstallation', () => {
  beforeAll(() => {
    vi.setSystemTime(mockedDate);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('Should successfully verify signature and return challenge if event type is url_verification', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    const result = await handleSlackWebhookMessage(
      new NextRequest('https://localhost', {
        method: 'POST',
        headers: new Headers({
          'x-slack-request-timestamp': '1672531200000',
          'x-slack-signature':
            'v0=c814b324e2b059aa98c6bf9414401082f37ed257cee0f2a5299d2a64bf0fbbb7',
        }),
        body: '{"type":"url_verification","challenge":"challenge"}',
      })
    );

    expect(result).toEqual({ challenge: 'challenge' });

    expect(send).toBeCalledTimes(0);
  });

  it('Should successfully verify signature and handle event', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    const result = await handleSlackWebhookMessage(
      new NextRequest('https://localhost', {
        method: 'POST',
        headers: new Headers({
          'x-slack-request-timestamp': '1672531200000',
          'x-slack-signature':
            'v0=3c1c482fe3f22571fcb697700047e9b14478948f6574cc860036c2b01fa4bf59',
        }),
        body: '{}',
      })
    );

    expect(result).toEqual(undefined);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      data: { encrypted: {} },
      id: 'slack-event-undefined',
      name: 'slack/slack.webhook.event.received',
    });
  });

  it('Should fail if headers are missing', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await expect(() =>
      handleSlackWebhookMessage(new NextRequest('https://localhost'))
    ).rejects.toThrowError('Missing timestamp or signature');

    expect(send).toBeCalledTimes(0);
  });

  it('Should fail if request timestamp is too old', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await expect(() =>
      handleSlackWebhookMessage(
        new NextRequest('https://localhost', {
          headers: new Headers({
            'x-slack-request-timestamp': '1',
            'x-slack-signature': 'invalid-signature',
          }),
        })
      )
    ).rejects.toThrowError('Request timestamp too old');

    expect(send).toBeCalledTimes(0);
  });

  it('Should fail if the signature version is not supported', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await expect(() =>
      handleSlackWebhookMessage(
        new NextRequest('https://localhost', {
          headers: new Headers({
            'x-slack-request-timestamp': '1672531200000',
            'x-slack-signature': 'v1',
          }),
        })
      )
    ).rejects.toThrowError('Unhandled signature version: v1');

    expect(send).toBeCalledTimes(0);
  });

  it('Should fail if no signature is provided', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await expect(() =>
      handleSlackWebhookMessage(
        new NextRequest('https://localhost', {
          headers: new Headers({
            'x-slack-request-timestamp': '1672531200000',
            'x-slack-signature': 'v0',
          }),
        })
      )
    ).rejects.toThrowError('No signature provided');

    expect(send).toBeCalledTimes(0);
  });

  it('Should fail if the signature is invalid', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await expect(() =>
      handleSlackWebhookMessage(
        new NextRequest('https://localhost', {
          headers: new Headers({
            'x-slack-request-timestamp': '1672531200000',
            'x-slack-signature': 'v0=invalid-signature',
          }),
        })
      )
    ).rejects.toThrowError('Failed to verify slack signature');

    expect(send).toBeCalledTimes(0);
  });
});
