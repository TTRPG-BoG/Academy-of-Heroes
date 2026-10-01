#!/usr/bin/env node

'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { URL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');
const mimeTypes = new Map([
  ['.avif', 'image/avif'],
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.webp', 'image/webp']
]);

function resolveRequestPath(requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  } catch {
    return null;
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^[/\\]+/, '');
  const filePath = path.resolve(projectRoot, relativePath);
  if (filePath !== projectRoot && !filePath.startsWith(`${projectRoot}${path.sep}`)) return null;
  return filePath;
}

function writePlainText(response, statusCode, message) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(message);
}

function createServer() {
  return http.createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD');
      writePlainText(response, 405, 'Method Not Allowed');
      return;
    }

    const filePath = resolveRequestPath(request.url);
    if (!filePath) {
      writePlainText(response, 403, 'Forbidden');
      return;
    }

    try {
      const stats = await fs.promises.stat(filePath);
      if (!stats.isFile()) {
        writePlainText(response, 404, 'Not Found');
        return;
      }

      response.writeHead(200, {
        'Content-Type': mimeTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream',
        'Content-Length': stats.size,
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Content-Type-Options': 'nosniff'
      });

      if (request.method === 'HEAD') {
        response.end();
      } else {
        fs.createReadStream(filePath).pipe(response);
      }
    } catch (error) {
      if (error.code === 'ENOENT') writePlainText(response, 404, 'Not Found');
      else {
        console.error(error);
        writePlainText(response, 500, 'Internal Server Error');
      }
    }
  });
}

function readPort(argumentsList) {
  const portFlagIndex = argumentsList.indexOf('--port');
  const rawPort = portFlagIndex >= 0 ? argumentsList[portFlagIndex + 1] : process.env.PORT || '8080';
  const port = Number.parseInt(rawPort, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new RangeError(`Invalid port: ${rawPort}`);
  }
  return port;
}

if (require.main === module) {
  try {
    const port = readPort(process.argv.slice(2));
    createServer().listen(port, '127.0.0.1', () => {
      console.log(`Academy of Heroes is available at http://localhost:${port}/`);
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { createServer, readPort, resolveRequestPath };
