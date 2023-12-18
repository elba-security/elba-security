import { test, describe } from 'vitest';

describe('asana webhook handler', () => {
  describe('verifyAsanaRequest', () => {
    test('should throws error when organisation has no webhook secret', () => {
      // TODO
    });

    test('should returns false when the signature does not match with the organisation webhook', () => {
      // TODO
    });

    test('should returns true when the signature does match with the organisation webhook', () => {
      // TODO
    });
  });

  describe('registerWebhookSecret', () => {
    test('should not update the webhook secret when organisation has already a webhook secret', () => {
      // TODO
    });

    test('should update the webhook secret when organisation has no webhook secret', () => {
      // TODO
    });
  });

  describe('handleWebhookEvent', () => {
    test('should ...');
  });
});
