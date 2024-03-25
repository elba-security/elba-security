import { NextRequest, NextResponse } from 'next/server';

export const mockNextRequest = async ({
  method = 'POST',
  url = 'https://example.com',
  handler,
  body = {},
  cookies = {},
}: {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  handler: (req: NextRequest) => Promise<undefined | NextResponse>;
  url?: string;
  body?: Record<string, unknown>;
  cookies?: Record<string, string>;
}): Promise<NextResponse> => {
  const request = new NextRequest(url, {
    method,
    ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
  });
  for (const [key, value] of Object.entries(cookies)) {
    request.cookies.set(key, value);
  }
  const response = await handler(request);
  if (!response) {
    return new NextResponse(null, { status: 307 });
  }
  return response;
};
