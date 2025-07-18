import { z } from 'zod';

// Configuration categories enum
export const configurationCategorySchema = z.enum([
  'authentication',
  'authorization',
  'sharing',
  'privacy',
  'compliance',
  'data_protection',
  'user_management',
  'audit_logging',
  'encryption',
  'network_security',
  'api_security',
  'general_settings',
]);

export type ConfigurationCategory = z.infer<typeof configurationCategorySchema>;

// Risk levels for metadata
export const configurationRiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);

export type ConfigurationRiskLevel = z.infer<typeof configurationRiskLevelSchema>;

// Configuration metadata schema
export const configurationMetadataSchema = z
  .object({
    display_name: z.string().optional(),
    description: z.string().optional(),
    risk_level: configurationRiskLevelSchema.optional(),
    documentation_url: z.string().url().optional(),
  })
  .passthrough();

export type ConfigurationMetadata = z.infer<typeof configurationMetadataSchema>;

// Main configuration object schema
export const configurationObjectSchema = z.object({
  id: z.string().uuid().optional(),
  category: configurationCategorySchema,
  sub_category: z.string().min(1),
  configuration: z.record(z.unknown()),
  metadata: configurationMetadataSchema.optional(),
  source_updated_at: z.string().datetime().optional(),
});

export type ConfigurationObject = z.infer<typeof configurationObjectSchema>;

// POST /configurations/objects request body
export const postConfigurationObjectsRequestBodySchema = z.object({
  organisationId: z.string().uuid(),
  configurations: z.array(configurationObjectSchema).min(1).max(1000),
});

export type PostConfigurationObjectsRequestBody = z.infer<
  typeof postConfigurationObjectsRequestBodySchema
>;

// POST /configurations/objects search params
export const postConfigurationObjectsSearchParamsSchema = z.object({
  syncedBefore: z.string().datetime().optional(),
});

export type PostConfigurationObjectsSearchParams = z.infer<
  typeof postConfigurationObjectsSearchParamsSchema
>;

// POST /configurations/objects response
export const postConfigurationObjectsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    received: z.number().int().min(0),
    created: z.number().int().min(0),
    updated: z.number().int().min(0),
    deleted: z.number().int().min(0),
  }),
});

export type PostConfigurationObjectsResponse = z.infer<
  typeof postConfigurationObjectsResponseSchema
>;

// DELETE /configurations/objects request body
export const deleteConfigurationObjectsRequestBodySchema = z
  .union([
    z.object({
      organisationId: z.string().uuid(),
      ids: z.array(z.string().uuid()).min(1),
    }),
    z.object({
      organisationId: z.string().uuid(),
      syncedBefore: z.string().datetime(),
    }),
  ])
  .superRefine((data, ctx) => {
    // Ensure only one of ids or syncedBefore is provided
    if ('ids' in data && 'syncedBefore' in data) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Must provide either ids or syncedBefore, not both',
      });
    }
  });

export type DeleteConfigurationObjectsRequestBody = z.infer<
  typeof deleteConfigurationObjectsRequestBodySchema
>;

// DELETE /configurations/objects response
export const deleteConfigurationObjectsResponseSchema = z.object({
  success: z.boolean(),
});

export type DeleteConfigurationObjectsResponse = z.infer<
  typeof deleteConfigurationObjectsResponseSchema
>;
