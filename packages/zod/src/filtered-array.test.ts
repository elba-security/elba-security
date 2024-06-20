import { describe, expect, test } from 'vitest';
import { ZodError, z } from 'zod';
import { zFilteredArray } from './filtered-array';

const schema = zFilteredArray(z.object({ id: z.string() }));

const validItems = [{ id: '1' }, { id: '2' }];
const invalidItems = ['10', null, undefined, true, { foo: 'bar' }];

describe('zFilteredArray', () => {
  test.each(invalidItems)('should return an error when data is $', (value) => {
    const result = schema.safeParse(value);

    expect(result.success).toBe(false);
  });

  test('should filter when data is an array', () => {
    const result = schema.safeParse([...validItems, ...invalidItems]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toStrictEqual(validItems);
    }
  });

  test('should return an error when valid items are less than min', () => {
    const result = zFilteredArray(z.object({ id: z.string() }), { min: 100 }).safeParse(validItems);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
      expect(result.error.errors).toMatchObject([
        {
          code: 'too_small',
          path: [],
        },
      ]);
    }
  });

  test('should return an error when valid items are more than max', () => {
    const result = zFilteredArray(z.object({ id: z.string() }), { max: 1 }).safeParse(validItems);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
      expect(result.error.errors).toMatchObject([
        {
          code: 'too_big',
          path: [],
        },
      ]);
    }
  });
});
