
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