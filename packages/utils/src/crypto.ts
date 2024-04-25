export const arrayBufferFromHexString = (hexString: string) => {
  const matches = hexString.match(/[0-9a-f]{2}/gi);
  if (!matches || hexString.length !== matches.length * 2) {
    throw new Error('Invalid hex string');
  }

  return Uint8Array.from(matches.map((hex) => parseInt(hex, 16)));
};

export const hexStringFromArrayBuffer = (buffer: Uint8Array) => {
  return [...buffer].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const encryptText = async ({
  data,
  key,
  iv,
}: {
  data: string;
  key: string;
  iv?: string;
}) => {
  let ivArrayBuffer: Uint8Array;
  if (iv) {
    ivArrayBuffer = arrayBufferFromHexString(iv);
  } else {
    ivArrayBuffer = crypto.getRandomValues(new Uint8Array(16));
  }
  const keyArrayBuffer = arrayBufferFromHexString(key);

  const secretKey = await crypto.subtle.importKey(
    'raw',
    keyArrayBuffer,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt']
  );

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      length: 256,
      tagLength: 128,
      iv: ivArrayBuffer,
    },
    secretKey,
    new TextEncoder().encode(data)
  );

  const [encryptedArrayBuffer, tagArrayBuffer] = [
    new Uint8Array(encryptedData.slice(0, encryptedData.byteLength - 16)),
    new Uint8Array(encryptedData.slice(encryptedData.byteLength - 16)),
  ];

  const encryptedHex = hexStringFromArrayBuffer(encryptedArrayBuffer);
  const tagHex = hexStringFromArrayBuffer(tagArrayBuffer);
  const ivHex = hexStringFromArrayBuffer(ivArrayBuffer);

  return `${ivHex}${tagHex}${encryptedHex}`;
};

export const decryptText = async ({ data, key }: { data: string; key: string }) => {
  const [ivHex, tagHex, encryptedHex] = [
    data.substring(0, 32),
    data.substring(32, 64),
    data.substring(64),
  ];

  const dataArrayBuffer = arrayBufferFromHexString(`${encryptedHex}${tagHex}`);
  const ivArrayBuffer = arrayBufferFromHexString(ivHex);
  const keyArrayBuffer = arrayBufferFromHexString(key);

  const secretKey = await crypto.subtle.importKey(
    'raw',
    keyArrayBuffer,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['decrypt']
  );

  const decryptedArrayBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      length: 256,
      tagLength: 128,
      iv: ivArrayBuffer,
    },
    secretKey,
    dataArrayBuffer
  );

  return new TextDecoder().decode(decryptedArrayBuffer);
};
