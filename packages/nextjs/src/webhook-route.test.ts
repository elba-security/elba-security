import { describe, expect, it, vi } from 'vitest';
import { type WebhookRouteHandler, createWebhookRoute } from './webhook-route';

const setup = async (
  handler: WebhookRouteHandler<'users.delete_users_requested'>,
  payload: unknown
) => {
  const request = new Request('http://foo.bar', { method: 'POST', body: JSON.stringify(payload) });
  const response = await createWebhookRoute('users.delete_users_requested', handler)(request);

  return response;
};

const organisationId = '517b9388-16c9-445f-8d69-68d4031c1108';
const ids = ['id-1', 'id-2'];

describe('createWebhookRoute', () => {
  it('should return a 200 response when data is valid', async () => {
    const handler = vi.fn(() => Promise.resolve());
    const response = await setup(handler, { organisationId, ids });

    expect(response.status).toBe(200);
    expect(handler).toBeCalledTimes(1);
    expect(handler).toBeCalledWith({ organisationId, ids });
  });

  it('should return a 400 response when data is invalid', async () => {
    const handler = vi.fn(() => Promise.resolve());
    const response = await setup(handler, { foo: 'bar' });

    expect(response.status).toBe(400);
    expect(handler).toBeCalledTimes(0);
  });

  it('should throw when handler throw', async () => {
    const error = new Error('foo bar');
    const handler = vi.fn(() => Promise.reject(error));
    await expect(setup(handler, { organisationId, ids })).rejects.toThrow(error);

    expect(handler).toBeCalledTimes(1);
    expect(handler).toBeCalledWith({ organisationId, ids });
  });
});
