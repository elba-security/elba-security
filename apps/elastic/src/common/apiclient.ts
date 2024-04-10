import { ElasticError } from '@/connectors/commons/error';

export const getElasticApiClient = () => {
  const request = async (endpoint: string, options: RequestInit) => {
    const response = await fetch(`${endpoint}`, options);

    if (!response.ok) {
      throw new ElasticError('API request failed', { response });
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

  const get = async (endpoint: string, token: string) => {
    return request(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `ApiKey ${token}`,
        'Content-Type': 'application/json',
      },
    });
  };

  return { post, get };
};
