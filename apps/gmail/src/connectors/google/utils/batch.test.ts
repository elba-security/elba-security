/* eslint-disable @typescript-eslint/no-unsafe-assignment -- testing purpose */
import { describe, it, expect, vi } from 'vitest';
import { batchRequest } from './batch';

describe('batchRequest', () => {
  it('should make successful batch request with single GET request', async () => {
    const mockAuth = {
      request: vi.fn(),
    };
    const mockResponseData = `--batch_response_boundary
Content-Type: application/http

HTTP/1.1 200 OK
Content-Type: application/json

{"id": "123", "name": "test"}
--batch_response_boundary--`;

    const mockBlob = {
      text: vi.fn().mockResolvedValue(mockResponseData),
    };

    mockAuth.request.mockResolvedValue({
      data: mockBlob,
      headers: {
        'content-type': 'multipart/mixed; boundary=batch_response_boundary',
      },
    });

    const requests = [
      {
        url: '/gmail/v1/users/me/messages',
        method: 'GET' as const,
      },
    ];

    const result = await batchRequest({
      // @ts-expect-error -- this is a mock
      auth: mockAuth,
      requests,
    });

    expect(mockAuth.request).toHaveBeenCalledWith({
      method: 'POST',
      url: 'https://www.googleapis.com/batch/gmail/v1',
      headers: {
        'Content-Type': expect.stringMatching(/^multipart\/mixed; boundary=batch_\d+$/),
      },
      data: expect.stringContaining('GET /gmail/v1/users/me/messages'),
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      rawResponse: expect.stringContaining('HTTP/1.1 200 OK'),
      ok: true,
      data: { id: '123', name: 'test' },
    });
  });

  it('should handle multiple batch requests', async () => {
    const mockAuth = {
      request: vi.fn(),
    };
    const mockResponseData = `--batch_response_boundary
Content-Type: application/http

HTTP/1.1 200 OK
Content-Type: application/json

{"id": "123"}
--batch_response_boundary
Content-Type: application/http

HTTP/1.1 200 OK
Content-Type: application/json

{"id": "456"}
--batch_response_boundary--`;

    const mockBlob = {
      text: vi.fn().mockResolvedValue(mockResponseData),
    };

    mockAuth.request.mockResolvedValue({
      data: mockBlob,
      headers: {
        'content-type': 'multipart/mixed; boundary=batch_response_boundary',
      },
    });

    const requests = [
      { url: '/gmail/v1/users/me/messages/1', method: 'GET' as const },
      { url: '/gmail/v1/users/me/messages/2', method: 'GET' as const },
    ];

    const result = await batchRequest({
      // @ts-expect-error -- this is a mock
      auth: mockAuth,
      requests,
    });

    expect(result).toHaveLength(2);
    expect(result[0]?.data).toEqual({ id: '123' });
    expect(result[1]?.data).toEqual({ id: '456' });
    expect(result[0]?.ok).toBe(true);
    expect(result[1]?.ok).toBe(true);
  });

  it('should handle failed requests (non-200 status)', async () => {
    const mockAuth = {
      request: vi.fn(),
    };
    const mockResponseData = `--batch_response_boundary
Content-Type: application/http

HTTP/1.1 404 Not Found
Content-Type: application/json

{"error": {"code": 404, "message": "Not found"}}
--batch_response_boundary--`;

    const mockBlob = {
      text: vi.fn().mockResolvedValue(mockResponseData),
    };

    mockAuth.request.mockResolvedValue({
      data: mockBlob,
      headers: {
        'content-type': 'multipart/mixed; boundary=batch_response_boundary',
      },
    });

    const requests = [{ url: '/gmail/v1/users/me/messages/invalid', method: 'GET' as const }];

    const result = await batchRequest({
      // @ts-expect-error -- this is a mock
      auth: mockAuth,
      requests,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.ok).toBe(false);
    expect(result[0]?.data).toEqual({
      error: { code: 404, message: 'Not found' },
    });
  });

  it('should handle responses without JSON data', async () => {
    const mockAuth = {
      request: vi.fn(),
    };
    const mockResponseData = `--batch_response_boundary
Content-Type: application/http

HTTP/1.1 204 No Content

--batch_response_boundary--`;

    const mockBlob = {
      text: vi.fn().mockResolvedValue(mockResponseData),
    };

    mockAuth.request.mockResolvedValue({
      data: mockBlob,
      headers: {
        'content-type': 'multipart/mixed; boundary=batch_response_boundary',
      },
    });

    const requests = [{ url: '/gmail/v1/users/me/messages/delete', method: 'GET' as const }];

    const result = await batchRequest({
      // @ts-expect-error -- this is a mock
      auth: mockAuth,
      requests,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.ok).toBe(false); // 204 is not 200 OK
    expect(result[0]?.data).toBeNull();
  });

  it('should handle malformed JSON gracefully', async () => {
    const mockAuth = {
      request: vi.fn(),
    };
    const mockResponseData = `--batch_response_boundary
Content-Type: application/http

HTTP/1.1 200 OK
Content-Type: application/json

{invalid json}
--batch_response_boundary--`;

    const mockBlob = {
      text: vi.fn().mockResolvedValue(mockResponseData),
    };

    mockAuth.request.mockResolvedValue({
      data: mockBlob,
      headers: {
        'content-type': 'multipart/mixed; boundary=batch_response_boundary',
      },
    });

    const requests = [{ url: '/gmail/v1/users/me/messages', method: 'GET' as const }];

    const result = await batchRequest({
      // @ts-expect-error -- this is a mock
      auth: mockAuth,
      requests,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.ok).toBe(true);
    expect(result[0]?.data).toBe('{invalid json}\n'); // Falls back to raw string with newline
  });

  it('should throw error when content-type header is missing', async () => {
    const mockAuth = {
      request: vi.fn(),
    };
    const mockBlob = {
      text: vi.fn().mockResolvedValue('some response'),
    };

    mockAuth.request.mockResolvedValue({
      data: mockBlob,
      headers: {},
    });

    const requests = [{ url: '/gmail/v1/users/me/messages', method: 'GET' as const }];

    await expect(
      batchRequest({
        // @ts-expect-error -- this is a mock
        auth: mockAuth,
        requests,
      })
    ).rejects.toThrow('Could not extract response boundary from content-type header: undefined');
  });

  it('should throw error when boundary cannot be extracted from content-type', async () => {
    const mockAuth = {
      request: vi.fn(),
    };
    const mockBlob = {
      text: vi.fn().mockResolvedValue('some response'),
    };

    mockAuth.request.mockResolvedValue({
      data: mockBlob,
      headers: {
        'content-type': 'multipart/mixed',
      },
    });

    const requests = [{ url: '/gmail/v1/users/me/messages', method: 'GET' as const }];

    await expect(
      batchRequest({
        // @ts-expect-error -- this is a mock
        auth: mockAuth,
        requests,
      })
    ).rejects.toThrow(
      'Could not extract response boundary from content-type header: multipart/mixed'
    );
  });

  it('should generate proper multipart request format', async () => {
    const mockAuth = {
      request: vi.fn(),
    };
    const mockBlob = {
      text: vi.fn().mockResolvedValue(`--test_boundary
Content-Type: application/http

HTTP/1.1 200 OK

{}
--test_boundary--`),
    };

    mockAuth.request.mockResolvedValue({
      data: mockBlob,
      headers: {
        'content-type': 'multipart/mixed; boundary=test_boundary',
      },
    });

    const requests = [
      { url: '/gmail/v1/users/me/messages/1', method: 'GET' as const },
      { url: '/gmail/v1/users/me/messages/2', method: 'GET' as const },
    ];

    await batchRequest({
      // @ts-expect-error -- this is a mock
      auth: mockAuth,
      requests,
    });

    const callArgs = mockAuth.request.mock.calls[0]?.[0] as { data: string };
    const requestData = callArgs.data;

    // Check that the request data contains proper multipart format
    expect(requestData).toMatch(/--batch_\d+/);
    expect(requestData).toContain('Content-Type: application/http');
    expect(requestData).toContain('GET /gmail/v1/users/me/messages/1');
    expect(requestData).toContain('GET /gmail/v1/users/me/messages/2');
    expect(requestData).toMatch(/--batch_\d+--$/);
  });

  it('should handle boundary with quotes in content-type header', async () => {
    const mockAuth = {
      request: vi.fn(),
    };
    const mockBlob = {
      text: vi.fn().mockResolvedValue(`--"quoted_boundary"
Content-Type: application/http

HTTP/1.1 200 OK

{"test": true}
--"quoted_boundary"--`),
    };

    mockAuth.request.mockResolvedValue({
      data: mockBlob,
      headers: {
        'content-type': 'multipart/mixed; boundary="quoted_boundary"',
      },
    });

    const requests = [{ url: '/gmail/v1/users/me/messages', method: 'GET' as const }];

    const result = await batchRequest({
      // @ts-expect-error -- this is a mock
      auth: mockAuth,
      requests,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.data).toEqual({ test: true });
  });
});
