import { describe, it, expect } from 'vitest';
import { getRedirectUrl } from './redirection';

const sourceId = 'some-source-id';
const baseUrl = new URL('http://foo.bar/baz');

describe('getRedirectUrl', () => {
  it('should format error url correctly when error is given', () => {
    const url = getRedirectUrl({ sourceId, baseUrl, error: 'unauthorized' });
    expect(url).contain('error=unauthorized');
    expect(url).not.contain('success');
    expect(url).contain(baseUrl.toString());
    expect(url).contain(`source_id=${sourceId}`);
  });

  it('should format error url correctly when error is not given', () => {
    const url = getRedirectUrl({ sourceId, baseUrl });
    expect(url).not.contain('error');
    expect(url).contain('success');
    expect(url).contain(baseUrl.toString());
    expect(url).contain(`source_id=${sourceId}`);
  });
});
