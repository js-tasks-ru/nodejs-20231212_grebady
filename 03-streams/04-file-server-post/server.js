const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const LimitSizeStream = require('./LimitSizeStream');
const {pipeline} = require('node:stream');
const LimitExceededError = require('./LimitExceededError');

const server = new http.Server();

server.on('request', (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname.slice(1);
  if (pathname.includes('/')) {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }
  const filepath = path.join(__dirname, 'files', pathname);

  switch (req.method) {
    case 'POST':
      fs.open(filepath, 'wx', (err, fd) => {
        if (err) {
          if (err.code === 'EEXIST') {
            res.statusCode = 409;
            res.end('Conflict');
            return;
          }

          res.statusCode = 500;
          res.end('Internal server error');
        }

        const writeStream = fs.createWriteStream(null, {fd});

        const limitedStream = new LimitSizeStream({
          limit: 2 ** 20,
        }); // 1 Мб

        pipeline(req, limitedStream, writeStream, (err) => {
          if (err) {
            if (err instanceof LimitExceededError) {
              res.statusCode = 413;
              res.end('Payload Too Large');
            } else {
              res.statusCode = 500;
              res.end('Internal server error');
            }
            fs.unlink(filepath, (unlinkErr) => {
              if (unlinkErr) {
                console.error(
                    `Failed to delete incomplete file: ${unlinkErr.message}`,
                );
              }
            });
          } else {
            res.statusCode = 201;
            res.end('Created');
          }
          fs.close(fd, (closeErr) => {
            if (closeErr) {
              console.error(
                  `Failed to close file descriptor: ${closeErr.message}`,
              );
            }
          });
        });

        req.on('aborted', () => {
          writeStream.destroy();
          fs.unlink(filepath, (err) => {
            if (err) {
              console.error(`Failed to delete incomplete file: ${err.message}`);
            }
          });
        });
      });
      break;

    default:
      res.statusCode = 501;
      res.end('Not implemented');
  }
});

module.exports = server;
