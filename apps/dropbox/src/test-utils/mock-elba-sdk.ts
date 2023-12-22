import { Elba } from '@elba-security/sdk';
import type { MockInstance } from 'vitest';
import { vi } from 'vitest';

type ElbaSpyOnType = {
  dataProtection: {
    updateObjects: MockInstance;
    deleteObjects: MockInstance;
  };
};

const mocks = vi.hoisted(() => {
  return {
    mockUpdateObjects: vi.fn(),
    mockDeleteObjects: vi.fn(),
  };
});

// Create a mock class for Elba SDK
class MockElba {
  constructor() {
    new Elba({
      apiKey: 'test-api-key',
      organisationId: 'test-organisation-id',
      sourceId: 'test-source-id',
      baseUrl: 'test-base-url',
    });
  }

  dataProtection = {
    updateObjects: mocks.mockUpdateObjects,
    deleteObjects: mocks.mockDeleteObjects,
  };

  thirdPartyApps = {
    updateObjects: vi.fn(),
    deleteObjects: vi.fn(),
  };

  connectionStatus = {
    update: vi.fn(),
  };

  users = {
    update: vi.fn(),
    delete: vi.fn(),
  };
}

export default MockElba;
