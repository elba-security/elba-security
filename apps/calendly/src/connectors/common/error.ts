import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

type CalendlyErrorOptions = { response?: Response };

export class CalendlyError extends Error {
  response?: Response;

  constructor(message: string, { response }: CalendlyErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'CalendlyError';
  }
}

export class CalendlyUnsupportedPlanError extends CalendlyError {}

export class CalendlyNotAdminError extends CalendlyError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }

  if (error instanceof CalendlyError && error.response?.status === 401) {
    return 'unauthorized';
  }

  if (error instanceof CalendlyNotAdminError) {
    return 'not_admin';
  }

  if (error instanceof CalendlyUnsupportedPlanError) {
    return 'unsupported_plan';
  }

  return null;
};
