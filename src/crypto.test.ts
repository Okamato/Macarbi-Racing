
import makeCryptoWith, { Crypto } from './crypto';

describe('crypto', () => {
  let crypto: Crypto;

  beforeEach(() => {
    const opts = {
      encryptionKey: 'no wifi on this plane :(',
    };
    crypto = makeCryptoWith(opts);
  });

  it('throws if CryptoOptions does not include encryptionKey', () => {
    expect(() => {
      makeCryptoWith({} as any);
    }).toThrow();
  });

  describe('encrypt()', () => {
    it('fails if given an object that is not serializable', async () => {
      const testObj = () => 'I am a function';
      await expect(crypto.encrypt(testObj)).rejects.toThrow(
        /Object to be encrypted must be serializable/
      );
    });
  });

  describe('encrypt() and decrypt()', () => {
    it('can handle strings', async () => {
      const testObj = 'I am a string';
