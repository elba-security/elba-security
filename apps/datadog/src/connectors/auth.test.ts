/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
/**
 * DISCLAIMER:
 * The tests provided in this file are specifically designed for the `auth` connectors function.
 * Theses tests exists because the services & inngest functions using this connector mock it.
 * If you are using an SDK we suggest you to mock it not to implements calls using msw.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '../../vitest/setup-msw-handlers';
import { getVarification } from './auth';
import { DatadogError } from './commons/error';

const validApiKey = 'valid_api_key';
const valid = true;

describe('auth connector', () => {
  describe('getVarification', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get('https://api.datadoghq.com/api/v1/validate', ({ request }) => {
          // briefly implement API endpoint behaviour
          if (request.headers.get('DD-API-KEY') !== validApiKey) {
            return new Response(undefined, { status: 401 });
          }
          return Response.json({ valid });
        })
      );
    });

    test('should return the true when the API key is valid', async () => {
      await expect(getVarification(validApiKey)).resolves.toStrictEqual({ valid });
    });

    test('should throw when the API key is invalid', async () => {
      await expect(getVarification('invalid-api-key')).rejects.toBeInstanceOf(DatadogError);
    });
  });
});
