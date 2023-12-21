// All patterns we're looking for in our log keys to make sure we don't log sensitive data
// Feel free to add more
const sensitiveKeys = [
  /cookie/i, // cookies contain our tokens
  /passw(?:or)?d/i,
  /^pass$/i,
  /^pw$/,
  /secret/i,
  /bearer/i,
  /authorization/i,
  /authorisation/i,
];

const whitelistedKeys = ['url', 'message'];

// a function that clones an object and only keeps primitive values
// and avoid circular references
// `stringifyDeepObjects` is to avoid having too many distinct fields in Axiom. Instead, we will just log large objects as strings
export const serializeLogObject = (logObject: any, stringifyNestedObjects = false) => {
  const cache = new WeakMap();
  const serialize = (obj: any, parentPropertyKey?: string) => {
    // Special cases handling
    if (isSensitiveKey(parentPropertyKey)) {
      return '[REDACTED]';
    }

    let object = obj;
    // extract specific fields but still continue to serialize the rest of the object
    // so that redaction is applied in depth
    if (obj instanceof Request) {
      object = compactRequest(obj);
    } else if (obj instanceof Response) {
      object = compactResponse(obj);
    } else if (obj instanceof Error) {
      object = enrichError(obj);
    }

    if (typeof object === 'string') {
      if (!whitelistedKeys.includes(parentPropertyKey || '') && isSensitiveKey(object)) {
        return '[REDACTED]';
      }
      if (object.length > 1000) {
        return `${object.slice(0, 1000)} ...[truncated due to size]`;
      }
    }
    if (object instanceof Map) {
      return [...object.entries()];
    }
    if (object instanceof Set) {
      return [...object.values()];
    }
    if (object instanceof Date) {
      return object.toISOString();
    }

    // handle primitives
    if (object === null || typeof object !== 'object') {
      return object;
    }

    // handle circular references
    if (cache.has(object)) {
      return '[Circular ref]';
    }

    const result: Record<string, any> = Array.isArray(object) ? [] : {};
    cache.set(object, result);

    Object.getOwnPropertyNames(object).forEach((nestedKey) => {
      result[nestedKey] = serialize(object[nestedKey], nestedKey);
    });
    cache.delete(object);

    return result;
  };

  try {
    const serializedObj = serialize(logObject);
    if (stringifyNestedObjects && typeof serializedObj === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(serializedObj)) {
        result[key] = typeof value === 'object' ? JSON.stringify(value) : value;
      }
      return result;
    }
    return serializedObj;
  } catch (e: any) {
    return {
      message: 'failed to serialize object',
      error: e?.message,
    };
  }
};

export const enrichError = (error: Error) => {
  const enrichedCause: any = error.cause instanceof Error ? enrichError(error.cause) : error.cause;

  const enrichedError = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: enrichedCause,
  };

  return {
    ...error,
    ...enrichedError,
  };
};

const compactRequest = (req: Request) => {
  return {
    url: req.url,
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
  };
};

const compactResponse = (res: Response) => {
  return {
    url: res.url,
    status: res.status,
  };
};

const isSensitiveKey = (key: string | undefined) => {
  if (key) {
    return sensitiveKeys.some((regex) => regex.test(key));
  }
  return false;
};
