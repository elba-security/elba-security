import { describe, it, expect } from 'vitest';
import type { gmail_v1 as gmail } from '@googleapis/gmail';
import { decodeBase64url, extractTextFromMessage } from './email';

// Helper function to create base64url encoded strings for test data
const b64UrlEncode = (str: string): string => {
  // Assuming tests run in Node.js environment where Buffer is available
  const base64 = Buffer.from(str, 'utf8').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

describe('decodeBase64url', () => {
  it('should return an empty string for empty input', () => {
    expect(decodeBase64url('')).toBe('');
  });

  it('should correctly decode a valid base64url string', () => {
    expect(decodeBase64url(b64UrlEncode('Hello World'))).toBe('Hello World');
  });

  it('should correctly decode base64url strings with - and _ characters', () => {
    const originalText =
      'This string uses characters that become - and _ in base64url! $#%#$#^%&^*(&*)*)(*)*';
    const encoded = b64UrlEncode(originalText);
    expect(decodeBase64url(encoded)).toBe(originalText);
  });

  it('should correctly decode base64url strings that would normally require padding in base64', () => {
    expect(decodeBase64url(b64UrlEncode('Man'))).toBe('Man'); // TWFu
    expect(decodeBase64url(b64UrlEncode('Ma'))).toBe('Ma'); // TWE
    expect(decodeBase64url(b64UrlEncode('M'))).toBe('M'); // TQ
  });

  it('should return an empty string for a corrupt/invalid base64 input', () => {
    expect(decodeBase64url('ThisIsNotValidBase64$$$')).toBe('');
  });
});

describe('extractTextFromMessage', () => {
  it('should extract text from a simple text/plain part', () => {
    const part: gmail.Schema$MessagePart = {
      mimeType: 'text/plain',
      body: { data: b64UrlEncode('Simple plain text.') },
    };
    expect(extractTextFromMessage(part)).toBe('Simple plain text.');
  });

  it('should return null if text/plain part has no body or body.data', () => {
    const partNoData: gmail.Schema$MessagePart = { mimeType: 'text/plain', body: {} };
    expect(extractTextFromMessage(partNoData)).toBe(null);

    const partUndefinedData: gmail.Schema$MessagePart = {
      mimeType: 'text/plain',
      body: { data: undefined },
    };
    expect(extractTextFromMessage(partUndefinedData)).toBe(null);

    const partNullBody: gmail.Schema$MessagePart = {
      mimeType: 'text/plain',
      // @ts-expect-error -- testing purpose
      body: null,
    };
    expect(extractTextFromMessage(partNullBody)).toBe(null);
  });

  it('should return an empty string if text/plain body.data decodes to an empty string', () => {
    const part: gmail.Schema$MessagePart = {
      mimeType: 'text/plain',
      body: { data: b64UrlEncode('') },
    };
    expect(extractTextFromMessage(part)).toBe('');
  });

  it('should prioritize text/plain from multipart/alternative (text/plain first)', () => {
    const part: gmail.Schema$MessagePart = {
      mimeType: 'multipart/alternative',
      parts: [
        { mimeType: 'text/plain', body: { data: b64UrlEncode('This is plain text.') } },
        { mimeType: 'text/html', body: { data: b64UrlEncode('<p>This is HTML.</p>') } },
      ],
    };
    expect(extractTextFromMessage(part)).toBe('This is plain text.');
  });

  it('should prioritize text/plain from multipart/alternative (text/html first)', () => {
    const part: gmail.Schema$MessagePart = {
      mimeType: 'multipart/alternative',
      parts: [
        { mimeType: 'text/html', body: { data: b64UrlEncode('<p>This is HTML.</p>') } },
        { mimeType: 'text/plain', body: { data: b64UrlEncode('This is plain text.') } },
      ],
    };
    expect(extractTextFromMessage(part)).toBe('This is plain text.');
  });

  it('should return null if multipart/alternative has no text/plain part', () => {
    const part: gmail.Schema$MessagePart = {
      mimeType: 'multipart/alternative',
      parts: [{ mimeType: 'text/html', body: { data: b64UrlEncode('<p>Only HTML.</p>') } }],
    };
    expect(extractTextFromMessage(part)).toBe(null);
  });

  it('should extract text/plain from multipart/mixed', () => {
    const part: gmail.Schema$MessagePart = {
      mimeType: 'multipart/mixed',
      parts: [
        { mimeType: 'text/calendar', body: { data: b64UrlEncode('Calendar data') } },
        { mimeType: 'text/plain', body: { data: b64UrlEncode('Text from mixed part.') } },
      ],
    };
    expect(extractTextFromMessage(part)).toBe('Text from mixed part.');
  });

  it('should extract the first text/plain part found in multipart/mixed', () => {
    const part: gmail.Schema$MessagePart = {
      mimeType: 'multipart/mixed',
      parts: [
        { mimeType: 'text/plain', body: { data: b64UrlEncode('First text.') } },
        {
          mimeType: 'application/pdf',
          body: {
            /* ... */
          },
        },
        { mimeType: 'text/plain', body: { data: b64UrlEncode('Second text.') } },
      ],
    };
    expect(extractTextFromMessage(part)).toBe('First text.');
  });

  it('should extract text/plain from deeply nested multipart (mixed -> alternative -> plain)', () => {
    const part: gmail.Schema$MessagePart = {
      mimeType: 'multipart/mixed',
      parts: [
        {
          mimeType: 'multipart/alternative',
          parts: [
            { mimeType: 'text/plain', body: { data: b64UrlEncode('Deeply nested plain text.') } },
            { mimeType: 'text/html', body: { data: b64UrlEncode('<p>HTML.</p>') } },
          ],
        },
        {
          mimeType: 'image/jpeg',
          body: {
            /* ... */
          },
        },
      ],
    };
    expect(extractTextFromMessage(part)).toBe('Deeply nested plain text.');
  });

  it('should return null if no text/plain part is found in a complex multipart structure', () => {
    const part: gmail.Schema$MessagePart = {
      mimeType: 'multipart/mixed',
      parts: [
        { mimeType: 'text/html', body: { data: b64UrlEncode('<p>HTML only.</p>') } },
        {
          mimeType: 'multipart/related',
          parts: [
            {
              mimeType: 'application/pdf',
              body: {
                /* ... */
              },
            },
          ],
        },
      ],
    };
    expect(extractTextFromMessage(part)).toBe(null);
  });

  it('should return null for a non-text/plain, non-multipart part', () => {
    const part: gmail.Schema$MessagePart = {
      mimeType: 'application/json',
      body: { data: b64UrlEncode('{"key":"value"}') },
    };
    expect(extractTextFromMessage(part)).toBe(null);
  });

  it('should return null if parts array exists but is empty for a multipart type', () => {
    const part: gmail.Schema$MessagePart = {
      mimeType: 'multipart/mixed',
      parts: [],
    };
    expect(extractTextFromMessage(part)).toBe(null);
  });

  it('should handle a part with undefined mimeType gracefully (not process its body directly)', () => {
    const part: gmail.Schema$MessagePart = {
      mimeType: undefined, // or null
      body: { data: b64UrlEncode('Some data') },
    };
    expect(extractTextFromMessage(part)).toBe(null);
  });

  it('should skip parts with undefined mimeType within a multipart and find subsequent text/plain', () => {
    const part: gmail.Schema$MessagePart = {
      mimeType: 'multipart/mixed',
      parts: [
        { mimeType: undefined, body: { data: b64UrlEncode('Data from unknown part type') } },
        { mimeType: 'text/plain', body: { data: b64UrlEncode('Valid plain text here.') } },
      ],
    };
    expect(extractTextFromMessage(part)).toBe('Valid plain text here.');
  });
});
