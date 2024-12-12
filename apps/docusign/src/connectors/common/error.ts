import { type ConnectionErrorType } from '@elba-security/sdk';

type DocusignErrorOptions = { response?: Response; code?: ConnectionErrorType };

export class DocusignError extends Error {
  response?: Response;
  code?: ConnectionErrorType;

  constructor(message: string, { response, code }: DocusignErrorOptions = {}) {
    super(message);
    this.response = response;
    this.code = code;
    this.name = 'DocusignError';
  }
}
