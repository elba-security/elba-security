import type { RequestSender } from '../RequestSender';

export abstract class ElbaResource {
  protected readonly requestSender: RequestSender;

  constructor(requestSender: RequestSender) {
    this.requestSender = requestSender;
  }
}
