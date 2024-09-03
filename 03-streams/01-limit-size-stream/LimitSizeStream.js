const stream = require('node:stream');
const LimitExceededError = require('./LimitExceededError');

class LimitSizeStream extends stream.Transform {
  constructor(options) {
    super(options);
    this.limit = options.limit;
    this.currentLength = 0;
  }

  _transform(chunk, encoding, callback) {
    if ((this.currentLength + chunk.length > this.limit)) {
      callback(new LimitExceededError(), null);
      return;
    }
    this.currentLength += chunk.length;
    callback(null, chunk);
  }
}

module.exports = LimitSizeStream;
