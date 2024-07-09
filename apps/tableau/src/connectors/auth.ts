import { addMinutes } from 'date-fns';
import { TableauError } from './commons/error';

export type TableauAuthResponse = {
  credentials: {
    site: {
      id: string;
      contentUrl: string;
    };
    user: {
      id: string;
    };
    token: string;
  };
};

export const authenticate = async ({
  token,
  domain,
  contentUrl,
}: {
  token: string;
  domain: string;
  contentUrl: string;
}): Promise<TableauAuthResponse> => {
  const authUrl = new URL(`${domain}/api/3.22/auth/signin`);

  const response = await fetch(authUrl, {
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

  const { credentials } = (await response.json()) as TableauAuthResponse;

  return { credentials };
};

export const getTokenExpirationTimestamp = (): number => {
  return addMinutes(new Date(), 240).getTime(); // Tableau token expires in 240 minutes.
};
