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

// const nextSkipTokenFromNextLinkSchema = z.preprocess((value) => {
//   if (typeof value !== 'string') return null;

//   const nextLinkUrl = new URL(value);
//   return nextLinkUrl.searchParams.get('$skiptoken');
// }, z.coerce.string().nullable());

// // TODO: get rid of this by simplifying it
// // eslint-disable-next-line @typescript-eslint/unbound-method -- convenience
// export const getNextSkipTokenFromNextLink = nextSkipTokenFromNextLinkSchema.parse;
