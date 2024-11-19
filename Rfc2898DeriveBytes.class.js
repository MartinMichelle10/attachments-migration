const { pbkdf2Sync } = require('crypto');

const $key = Symbol('key');
const $salt = Symbol('salt');

class Rfc2898DeriveBytes {
  constructor(key, salt) {
    this[$key] = key;
    this[$salt] = salt;
  }

  getBytes(byteCount) {
    const salt = this[$salt];
    const key = this[$key];
    return pbkdf2Sync(key, salt, 1000, byteCount, 'sha1');
  }
}

module.exports = Rfc2898DeriveBytes;
