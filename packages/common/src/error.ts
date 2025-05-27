import { type ConnectionErrorType } from '@elba-security/schemas';

export class IntegrationError extends Error {
  readonly response?: Response;
  constructor(message: string, { response, ...opts }: ErrorOptions & { response?: Response }) {
    super(message, opts);
    this.name = 'IntegrationError';
    this.response = response;
  }
}

export class IntegrationConnectionError extends Error {
  readonly response?: Response;
  readonly metadata?: unknown;
  readonly type: ConnectionErrorType;
  constructor(
    message: string,
    {
      response,
      type,
      metadata,
      ...opts
    }: ErrorOptions & { response?: Response; type: ConnectionErrorType; metadata?: unknown }
  ) {
    super(message, opts);
    this.name = 'IntegrationConnectionError';
    this.response = response;
    this.type = type;
    this.metadata = metadata;
  }
}

export const getErrorCausedBy = <T extends Error>({
  error,
  errorClass,
}: {
  error: unknown;
  errorClass: new (...params: never[]) => T;
}): T | null => {
  let currentError = error;
  while (currentError) {
    if (currentError instanceof errorClass) {
      return currentError;
    }

    if (currentError instanceof Error) {
      currentError = currentError.cause;
    }
  }

  return null;
};

export const isErrorCausedBy = ({
  error,
  errorClass,
}: {
  error: unknown;
  errorClass: new (...params: never[]) => Error;
}) => {
  return getErrorCausedBy({ error, errorClass }) !== null;
};
