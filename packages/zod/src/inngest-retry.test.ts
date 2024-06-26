import { describe, expect, test } from 'vitest';
import { zInngestRetry } from './inngest-retry';

const schema = zInngestRetry();

describe('zInngestRetry', () => {
  test.each(['10', '0', 12, 0, 20, '20'])('should succeed when data is %j', (value) => {
    const result = schema.safeParse(value);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toBe(Number(value));
    }
  });

  test.each(['-1', '21', '100'])('should fails when data is %j', (value) => {
    const result = schema.safeParse(value);

    expect(result.success).toBe(false);
  });
});
