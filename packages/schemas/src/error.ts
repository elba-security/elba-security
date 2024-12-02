import { z } from 'zod';

export const elbaApiErrorCodeSchema = z.enum([
  'trial_org_issues_limit_exceeded',
  'method_not_allowed',
]);

export type ElbaApiErrorCode = z.infer<typeof elbaApiErrorCodeSchema>;

export const elbaApiErrorSchema = z.object({
  code: elbaApiErrorCodeSchema,
  message: z.string(),
});

export type ElbaApiError = z.infer<typeof elbaApiErrorSchema>;

export const elbaApiErrorResponseSchema = z.object({
  errors: z.array(elbaApiErrorSchema),
});

export type ElbaApiErrorResponse = z.infer<typeof elbaApiErrorResponseSchema>;
