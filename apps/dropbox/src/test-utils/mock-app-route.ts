import { NextRequest, NextResponse } from 'next/server';

export const mockNextRequest = async ({
  method = 'POST',
  url = 'https://example.com',
  handler,
  body = {},
  cookies = {},
}: {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  handler: (req: NextRequest) => Promise<void | NextResponse<unknown>>;
  url?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: Record<string, unknown>;
  cookies?: Record<string, string>;
}): Promise<NextResponse> => {
  const request = new NextRequest(url, {
    method,
    ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
  });

  if (cookies) {
    for (const [key, value] of Object.entries(cookies)) {
      request.cookies.set(key, value);
    }
  }

  const response = await handler(request);

  if (!response) {
    return new NextResponse(null, { status: 307 });
  }

  return response;
};
