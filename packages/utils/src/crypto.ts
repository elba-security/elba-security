const arrayBufferFromHexString = (hexString: string) => {
  const matches = hexString.match(/[0-9a-f]{2}/gi);
  if (!matches || hexString.length !== matches.length * 2) {
    throw new Error('Invalid hex string');
  }

  const bytes = Uint8Array.from(matches.map((hex) => parseInt(hex, 16)));
  return bytes.buffer;
};

const hexStringFromArrayBuffer = (buffer: ArrayBuffer) => {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const encryptAES256GCM = async ({ data, keyHex }: { data: string; keyHex: string }) => {
  const ivArrayBuffer = crypto.getRandomValues(new Uint8Array(16));
  const keyArrayBuffer = arrayBufferFromHexString(keyHex);

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
    encryptedData.slice(0, encryptedData.byteLength - 16),
    encryptedData.slice(encryptedData.byteLength - 16),
  ];

  const encryptedHex = hexStringFromArrayBuffer(encryptedArrayBuffer);
  const tagHex = hexStringFromArrayBuffer(tagArrayBuffer);
  const ivHex = hexStringFromArrayBuffer(ivArrayBuffer);

  return `${ivHex}${tagHex}${encryptedHex}`;
};

export const decryptAES256GCM = async ({
  dataHex,
  keyHex,
}: {
  dataHex: string;
  keyHex: string;
}) => {
  const [ivHex, tagHex, encryptedHex] = [
    dataHex.substring(0, 32),
    dataHex.substring(32, 64),
    dataHex.substring(64),
  ];

  const dataArrayBuffer = arrayBufferFromHexString(`${encryptedHex}${tagHex}`);
  const ivArrayBuffer = arrayBufferFromHexString(ivHex);
  const keyArrayBuffer = arrayBufferFromHexString(keyHex);

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
