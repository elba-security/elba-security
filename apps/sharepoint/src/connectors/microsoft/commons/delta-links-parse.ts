import { z } from 'zod';
import { microsoftPaginatedResponseSchema } from './pagination';

export const microsoftDeltaPaginatedResponseSchema = microsoftPaginatedResponseSchema.extend({
  '@odata.deltaLink': z.string().url().optional(),
});

export type MicrosoftDeltaPaginatedResponse = z.infer<typeof microsoftDeltaPaginatedResponseSchema>;

const tokenFromDeltaLinksSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return null;

  const deltaLinkUrl = new URL(value);
  return deltaLinkUrl.searchParams.get('token');
}, z.coerce.string().nullable());

// eslint-disable-next-line @typescript-eslint/unbound-method -- convenience
export const getTokenFromDeltaLinks = tokenFromDeltaLinksSchema.parse;
