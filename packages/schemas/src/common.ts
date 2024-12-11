import type { infer as zInfer } from 'zod';
import { z } from 'zod';

export const jsonSchema = z
  .unknown()
  .optional()
  .refine(
    (value) => {
      try {
        JSON.stringify(value);
        return true;
      } catch {
        return false;
      }
    },
    (value) => ({ message: `${String(value)} cannot be converted to JSON` })
  );

export const baseRequestSchema = z.object({
  organisationId: z.string().uuid(),
});

export type BaseRequest = zInfer<typeof baseRequestSchema>;

export const baseDeleteRequestSchema = z.union([
  z.object({
    ids: z.array(z.string().min(1)),
  }),
  z.object({
    syncedBefore: z.string().datetime(),
  }),
]);

export type BaseDeleteRequest = zInfer<typeof baseDeleteRequestSchema>;

export const elbaRegions = ['eu', 'us'] as const;

export const elbaRegionSchema = z.enum(elbaRegions);

export type ElbaRegion = zInfer<typeof elbaRegionSchema>;

export const baseWebhookSchema = z.object({
  organisationId: z.string().uuid(),
  nangoConnectionId: z.string().min(1).nullable(),
  region: elbaRegionSchema,
});

export type BaseWebhookData = zInfer<typeof baseWebhookSchema>;
