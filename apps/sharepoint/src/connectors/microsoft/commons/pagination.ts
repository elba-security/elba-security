import { z } from 'zod';

export const microsoftPaginatedResponseSchema = z.object({
  '@odata.nextLink': z.string().url().nullable().optional(),
  value: z.array(z.unknown()),
});

export type MicrosoftPaginatedResponse = z.infer<typeof microsoftPaginatedResponseSchema>;

const nextSkipTokenFromNextLinkSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return null;

  const nextLinkUrl = new URL(value);
  return nextLinkUrl.searchParams.get('$skiptoken');
}, z.coerce.string().nullable());

// TODO: get rid of this by simplifying it
// eslint-disable-next-line @typescript-eslint/unbound-method -- convenience
export const getNextSkipTokenFromNextLink = nextSkipTokenFromNextLinkSchema.parse;
