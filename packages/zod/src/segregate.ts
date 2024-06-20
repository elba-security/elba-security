import { z } from 'zod';
import { applyMinMax } from './utils';

export type ZSegregateParams = {
  minValids?: number;
  minInvalids?: number;
  maxValids?: number;
  maxInvalids?: number;
};

export const zSegregate = <T extends z.ZodTypeAny>(schema: T, params: ZSegregateParams = {}) => {
  const baseSchema = z.preprocess(
    (data, ctx) => {
      const result = z.array(z.unknown()).safeParse(data);
      if (!result.success) {
        result.error.issues.forEach(ctx.addIssue);
        return null;
      }
      const valids: z.infer<T> = [];
      const invalids: unknown[] = [];

      for (const item of result.data) {
        const itemResult = schema.safeParse(item);
        if (itemResult.success) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- it's indeed a safe assignment
          valids.push(itemResult.data);
        } else {
          invalids.push(item);
        }
      }

      return { valids, invalids };
    },
    z.object({
      valids: applyMinMax({
        schema: z.array(schema),
        min: params.minValids,
        max: params.maxValids,
      }),
      invalids: applyMinMax({
        schema: z.array(z.unknown()),
        min: params.minInvalids,
        max: params.maxInvalids,
      }),
    })
  );

  return baseSchema;
};
