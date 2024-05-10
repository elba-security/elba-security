type SegmentErrorOptions = { response?: Response; request?: Request };

export class SegmentError extends Error {
  response?: Response;
  request?: Request;

  constructor(message: string, { response, request }: SegmentErrorOptions = {}) {
    super(message);
    this.response = response;
    this.request = request;
  }
}
