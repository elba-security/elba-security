import type { z } from 'zod';

type ApplyMinMaxParams<T extends z.ZodTypeAny> = {
  schema: z.ZodArray<T>;
  min?: number;
  max?: number;
};

export const applyMinMax = <T extends z.ZodTypeAny>({ schema, min, max }: ApplyMinMaxParams<T>) => {
  let appliedSchema = schema;
  if (min) {
    appliedSchema = appliedSchema.min(min);
  }
  if (max) {
    appliedSchema = appliedSchema.max(max);
  }
  return appliedSchema;
};
