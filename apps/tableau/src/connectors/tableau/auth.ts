import { addMinutes } from 'date-fns';
import { z } from 'zod';
import { TableauError } from '../commons/error';

const tableauAuthResponseSchema = z.object({
  credentials: z.object({
    site: z.object({
      id: z.string(),
      contentUrl: z.string(),
    }),
    user: z.object({
      id: z.string(),
    }),
    token: z.string(),
  }),
});
type TableauAuthResponse = z.infer<typeof tableauAuthResponseSchema>;

export const authenticate = async ({
  token,
  domain,
  contentUrl,
}: {
  token: string;
  domain: string;
  contentUrl: string;
}): Promise<TableauAuthResponse> => {
  const response = await fetch(`https://${domain}/api/3.22/auth/signin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      credentials: {
        jwt: token,
        site: {
          contentUrl,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new TableauError('Could not authenticate with Tableau', { response });
  }

  const responseData: unknown = await response.json();
  return tableauAuthResponseSchema.parse(responseData);
};

export const getTokenExpirationTimestamp = (): number => {
  return addMinutes(new Date(), 240).getTime(); // Tableau token expires in 240 minutes.
};
