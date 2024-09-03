const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const server = new http.Server();

server.on('request', (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname.slice(1);
  if (pathname.includes('/')) {
    res.statusCode = 400;
    res.end('Bad Request');
  }

  const filepath = path.join(__dirname, 'files', pathname);
  const streamIn = fs.createReadStream(filepath);
  streamIn.on('error', (err) => {
    if (err.code === 'ENOENT') {
      res.statusCode = 404;
      res.end('Not Found');
    } else {
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  req.on('aborted', () => res.end());

  switch (req.method) {
    case 'GET':
      streamIn.pipe(res);
      break;

    default:
      res.statusCode = 501;
      res.end('Not implemented');
  }
});

module.exports = server;
