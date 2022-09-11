
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