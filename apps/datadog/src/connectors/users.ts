/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation. When requesting against API endpoint we might prefer
 * to valid the response data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { DatadogError } from './commons/error';

type Attributes = {
  name: string;
  handle: string;
  created_at: string;
  modified_at: string;
  email: string;
  icon: string;
  title: string;
  verified: boolean;
  service_account: boolean;
  disabled: boolean;
  allowed_login_methods: [];
  status: 'Active';
  mfa_enabled: boolean;
};

export type DatadogUser = {
  type: string;
  id: string;
  attributes: Attributes;
};

export const getUsers = async (appKey: string, apiKey: string) => {
  const response = await fetch('https://api.datadoghq.com/api/v2/users', {
    method: 'GET',
    headers: {
      'DD-API-KEY': apiKey,
      'DD-APPLICATION-KEY': appKey,
    },
  });
  if (!response.ok) {
    throw new DatadogError('Could not retrieve users', { response });
  }
  const result = (await response.json()) as { data: DatadogUser[] };
  return result.data;
};
