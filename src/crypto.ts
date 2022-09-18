
/**
 * This module provides easy, yet strong, facilities for encrypting and decrypting serializable objects. The
 * ease-of-use comes from the fact that this module is opinionated in its (strong) choice of cryptographic algorithms,
 * lengths, and iterations that cannot be overriden by its users.
 *
 * The module exports a `makeCryptoWith` function that takes a single argument, an `opts` object. This object requires
 * a property named `encryptionKey` which is a passphrase used by the encryption and decryption algorithms within
 * this module. The `makeCryptoWith` function returns an object containing two functions, `encrypt` and `decrypt`.
 *
 * Both the `encrypt` and `decrypt` functions are inverses of each other and return Promises. That is:
 *   someSerializableObj === await decrypt(await encrypt(someSerializableObj)).
 */

import * as crypto from 'crypto';

const IV_LENGTH_IN_BYTES = 12;
const SALT_LENGTH_IN_BYTES = 64;
const KEY_LENGTH_IN_BYTES = 32;
const KEY_ITERATIONS = 10000;
const KEY_DIGEST = 'sha512';
const CIPHER_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_RESULT_ENCODING = 'base64';

export interface CryptoOptions {
  encryptionKey: string | Buffer;
}

export type EncryptOutput = string | object | number | boolean;

export interface Crypto {
  encrypt<Input = any>(input: Input, aad?: string): Promise<string>;
  decrypt(encryptedOutput: string | Buffer, aad?: string): Promise<EncryptOutput | EncryptOutput[]>;
  encryptSync<Input = any>(input: Input, aad?: string): string;
  decryptSync(encryptedOutput: string | Buffer, aad?: string): EncryptOutput | EncryptOutput[];
}

function _validateOpts({ encryptionKey }: CryptoOptions) {
  if (!encryptionKey) {
    throw new Error('encryptionKey is required');
  }
}

function _validateAAD(aad?: string) {
  if (aad == null) {
    return;
  }

  if (typeof aad !== 'string') {
    throw new Error('AAD must be a string');
  }

  if (aad.length === 0) {
    throw new Error('AAD cannot be an empty string');
  }
}

function _generateSalt() {
  return crypto.randomBytes(SALT_LENGTH_IN_BYTES);
}

function _generateIV() {
  return crypto.randomBytes(IV_LENGTH_IN_BYTES);
}

function _generateKeySync(encryptionKey: crypto.BinaryLike, salt: string | Buffer): Buffer {
  if (!Buffer.isBuffer(salt)) {
    salt = Buffer.from(salt, ENCRYPTION_RESULT_ENCODING);
  }

  const key = crypto.pbkdf2Sync(
    encryptionKey,
    salt,
    KEY_ITERATIONS,
    KEY_LENGTH_IN_BYTES,
    KEY_DIGEST
  );
  if (!Buffer.isBuffer(key)) {
    return Buffer.from(key, 'binary');
  }
  return key;
}

function _generateKey(encryptionKey: crypto.BinaryLike, salt: string | Buffer): Promise<Buffer> {
  if (!Buffer.isBuffer(salt)) {
    salt = Buffer.from(salt, ENCRYPTION_RESULT_ENCODING);
  }

  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      encryptionKey,
      salt,
      KEY_ITERATIONS,
      KEY_LENGTH_IN_BYTES,
      KEY_DIGEST,
      (err, key) => {
        if (err) {
          reject(err);
          return;
        }

        if (!Buffer.isBuffer(key)) {
          key = Buffer.from(key, 'binary');
        }

        resolve(key);
      }
    );
  });
}

function _serialize(serializable: any): string {
  const serializedObj = JSON.stringify(serializable);
  if (serializedObj === undefined) {
    throw Error('Object to be encrypted must be serializable');
  }
  return serializedObj;
}

function encrypt<Input = any>(
  serializedInput: string,
  iv: Buffer,
  key: Buffer,
  salt: Buffer,
  aad?: string
): string {
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, key, iv);

  if (aad != null) {
    cipher.setAAD(Buffer.from(aad, 'utf8'));
  }

  const encrypted = Buffer.concat([cipher.update(serializedInput, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, tag, encrypted]).toString(ENCRYPTION_RESULT_ENCODING);
}

function decrypt(
  key: Buffer,
  outputBytes: Buffer | Buffer,
  aad?: string
): EncryptOutput | EncryptOutput[] {
  const iv = outputBytes.slice(SALT_LENGTH_IN_BYTES, SALT_LENGTH_IN_BYTES + IV_LENGTH_IN_BYTES);
  const tag = outputBytes.slice(
    SALT_LENGTH_IN_BYTES + IV_LENGTH_IN_BYTES,
    SALT_LENGTH_IN_BYTES + IV_LENGTH_IN_BYTES + 16
  ); // Auth tag is always 16 bytes long
  const text = outputBytes.slice(SALT_LENGTH_IN_BYTES + IV_LENGTH_IN_BYTES + 16);

  const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  if (aad != null) {
    decipher.setAAD(Buffer.from(aad, 'utf8'));
  }

  const decrypted = decipher.update(text, undefined, 'utf8') + decipher.final('utf8');
  return JSON.parse(decrypted);
}

function asBuffer(encryptedOutput: string | Buffer) {
  return Buffer.isBuffer(encryptedOutput)
    ? encryptedOutput
    : Buffer.from(encryptedOutput, ENCRYPTION_RESULT_ENCODING);
}

/**
 * Implmenetation of encrypt() and decrypt() taken from https://gist.github.com/AndiDittrich/4629e7db04819244e843,
 * which was recommended by @jaymode
 */
export default function makeCryptoWith(opts: CryptoOptions): Crypto {
  _validateOpts(opts);
  const { encryptionKey } = opts;
  return {
    async encrypt(input, aad) {
      _validateAAD(aad);
      const salt = _generateSalt();
      const serializedInput = _serialize(input);
      const iv = _generateIV();
      const key = await _generateKey(encryptionKey, salt);
      return encrypt(serializedInput, iv, key, salt, aad);
    },
    async decrypt(encryptedOutput, aad) {
      _validateAAD(aad);
      const outputBytes = asBuffer(encryptedOutput);
      const salt = outputBytes.slice(0, SALT_LENGTH_IN_BYTES);
      const key = await _generateKey(encryptionKey, salt);
      return decrypt(key, outputBytes, aad);
    },
    encryptSync(input, aad) {
      _validateAAD(aad);
      const serializedInput = _serialize(input);
      const iv = _generateIV();
      const salt = _generateSalt();
      const key = _generateKeySync(encryptionKey, salt);
      return encrypt(serializedInput, iv, key, salt, aad);
    },
    decryptSync(encryptedOutput, aad) {
      _validateAAD(aad);
      const outputBytes = asBuffer(encryptedOutput);
      const salt = outputBytes.slice(0, SALT_LENGTH_IN_BYTES);
      const key = _generateKeySync(encryptionKey, salt);