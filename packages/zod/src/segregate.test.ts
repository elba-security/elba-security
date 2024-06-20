import { describe, expect, test } from 'vitest';
import { ZodError, z } from 'zod';
import type { ZSegregateParams } from './segregate';
import { zSegregate } from './segregate';

const schema = zSegregate(z.object({ id: z.string() }));
const validItems = [{ id: 'id-1' }, { id: 'id-2', foo: 'bar' }];
const invalidItems = [{}, false, undefined, { foo: 'bar' }];

describe('zSegregate', () => {
  test('should segregate valid and invalids items', () => {
    const result = schema.safeParse([...validItems, ...invalidItems]);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toStrictEqual({
        valids: validItems.map(({ id }) => ({ id })),
        invalids: invalidItems,
      });
    }
  });

  test('should return an error when the data is invalid', () => {
    const result = schema.safeParse('an error');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
      expect(result.error.errors).toMatchObject([
        {
          code: 'invalid_type',
          expected: 'array',
          received: 'string',
          path: [],
          message: 'Expected array, received string',
        },
      ]);
    }
  });

  test.each([
    {
      when: 'minValids value is not reached',
      params: {
        minValids: 1,
      },
      data: [],
    },
    {
      when: 'minInvalids value is not reached',
      params: {
        minInvalids: 1,
      },
      data: [],
    },
    {
      when: 'maxValids value is exceeded',
      params: {
        maxValids: 1,
      },
      data: [{ id: '1' }, { id: '2' }],
    },
    {
      when: 'maxInvalids value is exceeded',
      params: {
        maxInvalids: 1,
      },
      data: [null, 'foo'],
    },
  ] satisfies { when: string; params: ZSegregateParams; data: unknown }[])(
    `should return an error when $when`,
    ({ params, data }) => {
      const result = zSegregate(z.object({ id: z.string() }), params).safeParse(data);

      expect(result.success).toBe(false);
    }
  );

  test.each([
    {
      when: 'minValids value is reached',
      params: {
        minValids: 1,
      },
      data: [{ id: '1' }, { id: '2' }],
    },
    {
      when: 'minInvalids value is reached',
      params: {
        minInvalids: 1,
      },
      data: [null],
    },
    {
      when: 'maxValids value is not exceeded',
      params: {
        maxValids: 1,
      },
      data: [{ id: '1' }, null],
    },
    {
      when: 'maxInvalids value is not exceeded',
      params: {
        maxInvalids: 1,
      },
      data: [null, { id: '1' }],
    },
  ] satisfies { when: string; params: ZSegregateParams; data: unknown }[])(
    'should succeed when $when',
    ({ params, data }) => {
      const result = zSegregate(z.object({ id: z.string() }), params).safeParse(data);

      expect(result.success).toBe(true);
    }
  );
});
