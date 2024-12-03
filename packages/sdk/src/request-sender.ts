import { elbaApiErrorResponseSchema } from '@elba-security/schemas';
import { type ElbaApiError, ElbaError } from './error';
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
        let elbaApiErrors: ElbaApiError[] | undefined;
        try {
          const body: unknown = await response.clone().json();
          elbaApiErrors = elbaApiErrorResponseSchema.parse(body).errors;
        } catch (_) {} // eslint-disable-line no-empty -- nothing to do in catch

        throw new ElbaError('Invalid response received from Elba API', {
          path,
          method,
          response,
          status: response.status,
          elbaApiErrors,
        });
      }

      return response;
    } catch (error) {
      if (error instanceof ElbaError) {
        throw error;
      }

      throw new ElbaError('An unexpected error occurred', { path, method, cause: error });
    }
  }
}
