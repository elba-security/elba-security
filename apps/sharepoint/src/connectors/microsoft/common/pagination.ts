import { z } from 'zod';

export const basePaginationSchema = z.object({
  value: z.array(z.unknown()),
});

export const microsoftPaginatedResponseSchema = basePaginationSchema.extend({
  '@odata.nextLink': z
    .string()
    .nullable()
    .optional()
    .transform((link) => {
      if (!link || !URL.canParse(link)) {
        return null;
      }

      const url = new URL(link);
      return url.searchParams.get('$skiptoken');
    }),
});

export type MicrosoftPaginatedResponse = z.infer<typeof microsoftPaginatedResponseSchema>;
