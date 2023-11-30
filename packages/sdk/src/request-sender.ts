import { ElbaError } from './error';
import type { ElbaOptions } from './types';

export type RequestSenderOptions = Required<ElbaOptions>;

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
  private readonly sourceId: string;
  private readonly apiKey: string;

  constructor({ baseUrl, organisationId, sourceId, apiKey }: RequestSenderOptions) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.organisationId = organisationId;
    this.sourceId = sourceId;
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
        },
        body: JSON.stringify({
          ...data,
          organisationId: this.organisationId,
          sourceId: this.sourceId,
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
      throw new ElbaError('An unexpected error occured', { path, method, cause: error });
    }
  }
}
