import { describe, it, expect } from 'vitest';
import { getRedirectUrl } from './redirection';

const sourceId = 'some-source-id';
const baseUrl = 'http://foo.{REGION}.bar/baz';

describe('getRedirectUrl', () => {
  it('should format error url correctly when error is given', () => {
    const url = getRedirectUrl({ sourceId, baseUrl, region: 'eu', error: 'unauthorized' });
    expect(url).contain('error=unauthorized');
    expect(url).not.contain('success');
    expect(url).contain('.eu.');
    expect(url).contain(`source_id=${sourceId}`);
  });

  it('should format error url correctly when error is not given', () => {
    const url = getRedirectUrl({ sourceId, region: 'eu', baseUrl });
    expect(url).not.contain('error');
    expect(url).contain('.eu.');
    expect(url).contain('success');
    expect(url).contain(`source_id=${sourceId}`);
  });
});
