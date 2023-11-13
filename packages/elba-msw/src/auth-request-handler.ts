import { http } from 'msw';

export const createAuthRequestHandler = (baseUrl: string, apiKey: string) =>
  http.all(`${baseUrl}/*`, async ({ request }) => {
    if (request.headers.get('Authorization') !== `Bearer ${apiKey}`) {
      return new Response(null, {
        status: 401,
        statusText: 'Unauthorized',
      });
    }
  });
