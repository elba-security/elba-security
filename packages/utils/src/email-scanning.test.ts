import { describe, it, expect } from 'vitest';
import { shouldAnalyzeEmail } from './email-scanning';

describe('shouldAnalyzeEmail', () => {
  it('should return true when sender and receiver have different business domains', () => {
    const result = shouldAnalyzeEmail({
      sender: 'john@company.com',
      receiver: 'jane@othercorp.com',
    });
    expect(result).toBe(true);
  });

  it('should return true when sender has business domain and receiver has personal domain', () => {
    const result = shouldAnalyzeEmail({
      sender: 'john@businesscorp.com',
      receiver: 'jane@gmail.com',
    });
    expect(result).toBe(true);
  });

  it('should return true when emails are in formatted strings', () => {
    const result = shouldAnalyzeEmail({
      sender: 'John Doe <john@company.com>',
      receiver: 'Jane Smith <jane@othercorp.com>',
    });
    expect(result).toBe(true);
  });

  it('should return true when emails are in quoted formatted strings', () => {
    const result = shouldAnalyzeEmail({
      sender: '"John Doe" <john@company.com>',
      receiver: '"Jane Smith" <jane@othercorp.com>',
    });
    expect(result).toBe(true);
  });

  it('should return false when sender and receiver have same domain', () => {
    const result = shouldAnalyzeEmail({
      sender: 'john@company.com',
      receiver: 'jane@company.com',
    });
    expect(result).toBe(false);
  });

  it('should return false when sender and receiver have same domain with different subdomains', () => {
    const result = shouldAnalyzeEmail({
      sender: 'john@mail.company.com',
      receiver: 'jane@hr.company.com',
    });
    expect(result).toBe(false);
  });

  it('should return false when sender has gmail.com domain', () => {
    const result = shouldAnalyzeEmail({
      sender: 'john@gmail.com',
      receiver: 'jane@company.com',
    });
    expect(result).toBe(false);
  });

  it('should return false when sender has a personal domain', () => {
    const result = shouldAnalyzeEmail({
      sender: 'john@msn.com',
      receiver: 'jane@company.com',
    });
    expect(result).toBe(false);
  });

  it('should return false when sender email cannot be extracted', () => {
    const result = shouldAnalyzeEmail({
      sender: 'invalid-email',
      receiver: 'jane@othercorp.com',
    });
    expect(result).toBe(false);
  });

  it('should return false when receiver email cannot be extracted', () => {
    const result = shouldAnalyzeEmail({
      sender: 'john@company.com',
      receiver: 'invalid-email',
    });
    expect(result).toBe(false);
  });

  it('should return false when both emails are invalid', () => {
    const result = shouldAnalyzeEmail({
      sender: 'invalid-sender',
      receiver: 'invalid-receiver',
    });
    expect(result).toBe(false);
  });
});
