import { FivetranError } from '@/connectors/commons/error';

export const getFivetranApiClient = () => {
  const request = async (endpoint: string, options: RequestInit) => {
    const response = await fetch(`${endpoint}`, options);

    if (!response.ok) {
      throw new FivetranError('API request failed', { response });
    }

    return response.json();
  };

  const post = async (endpoint: string, token: string, body: URLSearchParams | BodyInit) => {
    return request(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body instanceof URLSearchParams ? body.toString() : body,
    });
  };

  const get = async (endpoint: string, token: string) => {
    return request(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${token}`,
        'Content-Type': 'application/json',
      },
    });
  };

  return { post, get };
};
