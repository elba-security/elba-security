import type { NextRequest, NextResponse } from 'next/server';
import type { createRequest, createResponse, RequestMethod } from 'node-mocks-http';
import { createMocks } from 'node-mocks-http';
import { vi } from 'vitest';

export type ApiRequest = NextRequest & ReturnType<typeof createRequest>;
export type APiResponse = NextResponse & ReturnType<typeof createResponse>;

export const mockRequestResponse = ({
  method = 'POST',
  body = {},
}: {
  method?: RequestMethod;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any;
}) => {
  const { req, res } = createMocks<ApiRequest, APiResponse>({
    method,
    body,
  });

  req.json = vi.fn().mockResolvedValue(body);

  return { req, res };
};
