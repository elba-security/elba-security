import { NextApiRequest, NextApiResponse } from 'next';
import { createRequest, createResponse, createMocks, RequestMethod } from 'node-mocks-http';

import { vi } from 'vitest';

export type ApiRequest = NextApiRequest & ReturnType<typeof createRequest>;
export type APiResponse = NextApiResponse & ReturnType<typeof createResponse>;

export const mockRequestResponse = ({
  method = 'POST',
  body = {},
}: {
  method?: RequestMethod;
  body?: any;
}) => {
  const { req, res } = createMocks<ApiRequest, APiResponse>({
    method,
    body,
  });

  req.json = vi.fn().mockResolvedValue(body);

  return { req, res };
};
