
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