import { type JWT } from 'google-auth-library';

export type BatchResponse = {
  rawResponse: string;
  ok: boolean;
  data: unknown;
};

const extractJSONDataFromRawResponse = (rawResponse: string): unknown => {
  const jsonPart = rawResponse.substring(rawResponse.indexOf('{'));
  try {
    return JSON.parse(jsonPart);
  } catch {
    return jsonPart;
  }
};

const getResponseBoundary = (contentType: string | undefined): string | null => {
  if (!contentType) {
    return null;
  }

  const match = /boundary=(?<boundary>.+)/.exec(contentType);

  return match?.[1] ?? null;
};

type BatchRequestParams = {
  auth: JWT;
  requests: {
    url: string;
    method: 'GET';
  }[];
};

export const batchRequest = async ({
  auth,
  requests,
}: BatchRequestParams): Promise<BatchResponse[]> => {
  const boundary = `batch_${Date.now()}`;

  const requestData = requests
    .map(
      (request) =>
        `--${boundary}\r\nContent-Type: application/http\r\n\r\n${request.method} ${request.url}\r\n`
    )
    .concat(`--${boundary}--`)
    .join('');

  const response = await auth.request({
    method: 'POST',
    url: 'https://www.googleapis.com/batch/gmail/v1',
    headers: { 'Content-Type': `multipart/mixed; boundary=${boundary}` },
    data: requestData,
  });

  const data = await (response.data as Blob).text();
  const responseBoundary = getResponseBoundary(response.headers['content-type'] as string);

  if (!responseBoundary) {
    throw new Error(
      `Could not extract response boundary from content-type header: ${response.headers['content-type']}`
    );
  }

  const parts = data.split(`--${responseBoundary}`);

  return parts.slice(1, parts.length - 1).map((rawResponse) => ({
    rawResponse,
    ok: rawResponse.includes('HTTP/1.1 200 OK'),
    data: rawResponse.includes('{') ? extractJSONDataFromRawResponse(rawResponse) : null,
  }));
};
