import { z } from 'zod';
import { applyMinMax } from './utils';

export type ZFilteredArrayParams = {
  min?: number;
  max?: number;
};

export const zFilteredArray = <T extends z.ZodTypeAny>(
  schema: T,
  params: ZFilteredArrayParams = {}
) => {
  return z.preprocess(
    (data, ctx) => {
      const result = z.array(z.unknown()).safeParse(data);
      if (!result.success) {
        result.error.issues.forEach(ctx.addIssue);
        return null;
      }

      return result.data
        .map((item) => (schema.safeParse(item).success ? (item as T) : undefined))
        .filter((item): item is T => Boolean(item));
    },
    applyMinMax({ schema: z.array(schema), ...params })
  );
};
