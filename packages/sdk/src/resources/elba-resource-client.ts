import type { RequestSender } from '../request-sender';

export abstract class ElbaResourceClient {
  protected readonly requestSender: RequestSender;

  constructor(requestSender: RequestSender) {
    this.requestSender = requestSender;
  }
}
