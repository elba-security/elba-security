import type { infer as zInfer } from 'zod';
import { z } from 'zod';
import { admin_directory_v1 as adminDirectory } from '@googleapis/admin';

export const googleTokenSchema = z.object({
  clientId: z.string().min(1),
  displayText: z.string().min(1),
  scopes: z.array(z.string().min(1)),
});

export type GoogleToken = zInfer<typeof googleTokenSchema>;

const googleTokenFields = ['clientId', 'displayText', 'scopes'];

export const getGoogleToken = async ({
  fields = googleTokenFields.join(','),
  ...getTokenParams
}: adminDirectory.Params$Resource$Tokens$Get) => {
  const { data: token } = await new adminDirectory.Admin({}).tokens.get({
    ...getTokenParams,
    fields,
  });

  const result = googleTokenSchema.safeParse(token);
  if (!result.success) {
    throw new Error('Failed to parse google token');
  }

  return result.data;
};

export const listGoogleTokens = async ({
  fields = [...googleTokenFields.map((field) => `items/${field}`)].join(','),
  ...listTokensParams
}: adminDirectory.Params$Resource$Tokens$List) => {
  const {
    data: { items: googleTokens },
  } = await new adminDirectory.Admin({}).tokens.list({
    ...listTokensParams,
    fields,
  });

  const tokens: GoogleToken[] = [];
  for (const token of googleTokens || []) {
    const result = googleTokenSchema.safeParse(token);
    if (result.success) {
      tokens.push(result.data);
    }
  }

  return tokens;
};

export const deleteGoogleToken = async (
  deleteTokenParams: adminDirectory.Params$Resource$Tokens$Delete
) => {
  return new adminDirectory.Admin({}).tokens.delete(deleteTokenParams);
};
