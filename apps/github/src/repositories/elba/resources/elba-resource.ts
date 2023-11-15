import type { RequestSender } from '../request-sender';

export abstract class ElbaResource {
  protected readonly requestSender: RequestSender;

  constructor(requestSender: RequestSender) {
    this.requestSender = requestSender;
  }
}
