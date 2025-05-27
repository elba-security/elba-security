import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

type DocusignErrorOptions = { response?: Response };

export class DocusignError extends Error {
  response?: Response;

  constructor(message: string, { response }: DocusignErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'DocusignError';
  }
}

export class DocusignNotAdminError extends DocusignError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof DocusignError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof DocusignNotAdminError) {
    return 'not_admin';
  }

  return null;
};
