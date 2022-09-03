
/**
 * This module provides easy, yet strong, facilities for encrypting and decrypting serializable objects. The
 * ease-of-use comes from the fact that this module is opinionated in its (strong) choice of cryptographic algorithms,
 * lengths, and iterations that cannot be overriden by its users.
 *
 * The module exports a `makeCryptoWith` function that takes a single argument, an `opts` object. This object requires
 * a property named `encryptionKey` which is a passphrase used by the encryption and decryption algorithms within
 * this module. The `makeCryptoWith` function returns an object containing two functions, `encrypt` and `decrypt`.
 *