import { z } from 'zod';
import type { MicrosoftPaginatedResponse } from './pagination';

export type MicrosoftDeltaPaginatedResponse<T> = MicrosoftPaginatedResponse<T> & {
  '@odata.deltaLink'?: string;
};

const tokenFromDeltaLinksSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return null;

  const deltaLinkUrl = new URL(value);
  return deltaLinkUrl.searchParams.get('token');
}, z.coerce.string().nullable());

// eslint-disable-next-line @typescript-eslint/unbound-method -- convenience
export const getTokenFromDeltaLinks = tokenFromDeltaLinksSchema.parse;
