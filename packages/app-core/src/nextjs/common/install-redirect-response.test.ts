import { describe, expect, test, vi } from 'vitest';
import * as elbaSdk from '@elba-security/sdk';
import { ElbaInstallRedirectResponse } from './install-redirect-response';

const baseUrl = 'http://foo.bar';
const sourceId = 'e29fe169-4f40-4864-87f7-6025fc875e4f';

describe('ElbaInstallRedirectResponse', () => {
  test('should be an internal error response when no region is provided', () => {
    vi.spyOn(elbaSdk, 'getRedirectUrl').mockReturnValue('http://baz.foo');
    const response = new ElbaInstallRedirectResponse({ baseUrl, sourceId });

    expect(response.status).toBe(500);
    expect(elbaSdk.getRedirectUrl).toBeCalledTimes(0);
  });

  test('should be a redirect response when region is provided', () => {
    vi.spyOn(elbaSdk, 'getRedirectUrl').mockReturnValue('http://baz.foo');
    const response = new ElbaInstallRedirectResponse({
      baseUrl,
      sourceId,
      region: 'eu',
      error: 'internal_error',
    });

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('http://baz.foo');

    expect(elbaSdk.getRedirectUrl).toBeCalledTimes(1);
    expect(elbaSdk.getRedirectUrl).toBeCalledWith({
      sourceId,
      baseUrl,
      region: 'eu',
      error: 'internal_error',
    });
  });
});
