import { NextRequest, NextResponse } from 'next/server';

export const mockRequestResponse = async ({
  method = 'POST',
  url,
  handler,
  body = {},
  cookies = {},
}: {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  handler: (req: NextRequest) => Promise<void | NextResponse<unknown>>;
  url: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any;
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
    return new NextResponse(null, { status: 200 });
  }

  return response;
};
