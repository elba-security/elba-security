// Add your custom error code here
type MicrosoftErrorCode = 'DELTA_TOKEN_EXPIRED';

type MicrosoftOptions = { response?: Response; code?: MicrosoftErrorCode };

export class MicrosoftError extends Error {
  response?: Response;
  code?: MicrosoftErrorCode;

  constructor(message: string, { response, code }: MicrosoftOptions = {}) {
    super(message);
    this.response = response;
    this.code = code;
  }
}
