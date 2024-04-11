import { BoxError } from '@/connectors/commons/error';

export const getBoxApiClient = () => {
  const request = async (endpoint: string, options: RequestInit) => {
    const response = await fetch(`${endpoint}`, options);

    if (!response.ok) {
      throw new BoxError('API request failed', { response });
    }

    return response.json();
  };

  const post = async (endpoint: string, body: URLSearchParams | BodyInit) => {
    return request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body instanceof URLSearchParams ? body.toString() : body,
    });
  };

  const del = async (endpoint: string, token: string) => {
    return request(endpoint, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  };

  const get = async (endpoint: string, token: string) => {
    return request(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  };

  return { post, del, get };
};
