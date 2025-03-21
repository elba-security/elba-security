import { describe, expect, test } from 'vitest';
import { ElbaError } from '../error';
import { parseWebhookEventData } from './event-data';

describe('parseWebhookEventData', () => {
  test('should throw when the payload is invalid', () => {
    const data = { foo: 'bar' };
    const setup = () => parseWebhookEventData('data_protection.start_sync_requested', data);

    expect(setup).toThrowError(ElbaError);
    expect(setup).toThrowError('Could not validate webhook event data');
  });

  test('should returns the event data when the payload is valid', () => {
    const data = {
      region: 'eu',
      nangoConnectionId: null,
      organisationId: '139ed8eb-2f8c-4784-b330-019d57737f06',
      someExtraData: 'foo',
    };
    const result = parseWebhookEventData('data_protection.start_sync_requested', data);

    expect(result).toStrictEqual({
      region: 'eu',
      nangoConnectionId: null,
      organisationId: data.organisationId,
    });
  });
});
