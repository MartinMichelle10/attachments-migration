const { Writable } = require('stream');

class BufferWritableStream extends Writable {
  constructor(options = {}) {
    super(options);
    this.chunks = [];
  }

  _write(chunk, _encoding, callback) {
    this.chunks.push(chunk);
    callback();
  }

  getBuffer() {
    return Buffer.concat(this.chunks);
  }
};

module.exports = BufferWritableStream;
