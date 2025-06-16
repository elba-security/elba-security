/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Buffer actually pass in crypto functions */
/* eslint-disable @typescript-eslint/no-unsafe-argument -- untyped Buffer actually pass in crypto functions */

import crypto from 'node:crypto';
import type { AWSConnection } from './types';

type AWSAuthHeader = {
  authorizationHeader: string;
  date: string;
};

export function getAWSAuthHeader(
  credentials: AWSConnection,
  method: string,
  service: string,
  path: string,
  querystring: string
): AWSAuthHeader {
  const accessKeyId = credentials.username;
  const secretAccessKey = credentials.password;
  const region = credentials.region;
  const host = 'iam.amazonaws.com';

  const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const payloadHash = crypto.createHash('sha256').update('').digest('hex');
  const canonicalHeaders = `host:${host}\nx-amz-date:${date}\n`;
  const signedHeaders = 'host;x-amz-date';

  const canonicalRequest = `${method}\n${path}\n${querystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${date.substring(0, 8)}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${date}\n${credentialScope}\n${crypto
    .createHash('sha256')
    .update(canonicalRequest)
    .digest('hex')}`;

  const getSignatureKey = (
    key: string,
    dateStamp: string,
    regionName: string,
    serviceName: string
  ): Buffer => {
    const kDate = crypto.createHmac('sha256', `AWS4${key}`).update(dateStamp).digest();
    const kRegion = crypto
      .createHmac('sha256', kDate as any)
      .update(regionName)
      .digest();
    const kService = crypto
      .createHmac('sha256', kRegion as any)
      .update(serviceName)
      .digest();
    return crypto
      .createHmac('sha256', kService as any)
      .update('aws4_request')
      .digest();
  };

  const signingKey = getSignatureKey(secretAccessKey, date.substring(0, 8), region, service);
  const signature = crypto
    .createHmac('sha256', signingKey as any)
    .update(stringToSign)
    .digest('hex');

  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { authorizationHeader, date };
}
