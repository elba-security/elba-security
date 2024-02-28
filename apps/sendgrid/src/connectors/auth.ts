import { SendgridError } from './commons/error';

export const validateToken = async (token: string) => {
  const response = await fetch(`https://api.sendgrid.com/v3/api_keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new SendgridError('Could not validate token', { response });
  }
};
