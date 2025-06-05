import { type gmail_v1 as gmail } from '@googleapis/gmail';

export function decodeBase64url(encoded: string): string {
  if (!encoded) {
    return '';
  }

  let base64Padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (base64Padded.length % 4) {
    base64Padded += '=';
  }

  const validBase64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

  // If the string is not empty and doesn't match the valid Base64 structure,
  // it's considered invalid/corrupt.
  if (base64Padded !== '' && !validBase64Regex.test(base64Padded)) {
    return '';
  }

  try {
    return atob(base64Padded);
  } catch (e) {
    return '';
  }
}

export function extractTextFromMessage(part: gmail.Schema$MessagePart): string | null {
  if (part.mimeType === 'text/plain') {
    if (part.body && typeof part.body.data === 'string') {
      return decodeBase64url(part.body.data);
    }
  }

  if (part.parts && part.parts.length > 0) {
    if (part.mimeType === 'multipart/alternative') {
      // For multipart/alternative, specifically look for the text/plain part.
      // Parts are typically ordered from least complex (text/plain) to most complex (text/html).
      for (const subPart of part.parts) {
        if (subPart.mimeType === 'text/plain') {
          if (subPart.body && typeof subPart.body.data === 'string') {
            return decodeBase64url(subPart.body.data);
          }
        }
      }
    } else if (part.mimeType?.startsWith('multipart/')) {
      // For other multipart types (e.g., mixed, related), iterate through parts
      // and return the content of the first text/plain part found.
      for (const subPart of part.parts) {
        const textContent = extractTextFromMessage(subPart);
        if (textContent !== null) {
          return textContent; // Return the first one found
        }
      }
    }
  }

  return null;
}
