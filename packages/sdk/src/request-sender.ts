import { ElbaError } from './error';
import type { ElbaOptions } from './types';

export type RequestSenderOptions = Required<Omit<ElbaOptions, 'region'>>;

export type ElbaResponse = Omit<Response, 'json'> & {
  json: <T = unknown>() => Promise<T>;
};

export type ElbaRequestInit<D extends Record<string, unknown>> = {
  method?: string;
  data: D;
};

export class RequestSender {
  private readonly baseUrl: string;
  private readonly organisationId: string;
  private readonly apiKey: string;

  constructor({ baseUrl, organisationId, apiKey }: RequestSenderOptions) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.organisationId = organisationId;
    this.apiKey = apiKey;
  }

  async request<D extends Record<string, unknown>>(
    path: string,
    { data, method = 'GET' }: ElbaRequestInit<D>
  ): Promise<ElbaResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          organisationId: this.organisationId,
        }),
      });

      if (!response.ok) {
        throw new ElbaError('Invalid response received from Elba API', {
          path,
          method,
          response,
          status: response.status,
        });
      }

      return response;
    } catch (error) {
      throw new ElbaError('An unexpected error occurred', { path, method, cause: error });
    }
  }
}
