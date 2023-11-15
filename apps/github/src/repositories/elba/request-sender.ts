import { ElbaError } from './error';

export type RequestSenderOptions = {
  baseUrl: string;
  organisationId: string;
  sourceId: string;
};

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

  constructor({ baseUrl, organisationId, sourceId }: RequestSenderOptions) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.organisationId = organisationId;
    this.sourceId = sourceId;
  }

  async request<D extends Record<string, unknown>>(
    path: string,
    { data, method = 'GET' }: ElbaRequestInit<D>
  ): Promise<ElbaResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${path}`, {
        method,
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
    } catch (error: unknown) {
      throw new ElbaError('An unexpected error occured', { path, method, cause: error });
    }
  }
}
