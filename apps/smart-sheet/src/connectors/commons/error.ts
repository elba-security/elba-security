type SmartSheetErrorOptions = { response?: Response };

export class SmartSheetError extends Error {
  response?: Response;

  constructor(message: string, { response }: SmartSheetErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
