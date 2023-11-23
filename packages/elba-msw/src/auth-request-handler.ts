import { type RequestHandler, http } from 'msw';

export const createAuthRequestHandler = (baseUrl: string, apiKey: string): RequestHandler =>
  http.all(`${baseUrl}/*`, ({ request }) => {
    if (request.headers.get('Authorization') !== `Bearer ${apiKey}`) {
      return new Response(null, {
        status: 401,
        statusText: 'Unauthorized',
      });
    }
  });
