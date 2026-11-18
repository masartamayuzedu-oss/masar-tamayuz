const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 10000);
const ROOT = path.resolve(__dirname);
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

function send(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cache-Control': status === 200 ? 'public, max-age=300' : 'no-store'
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET, HEAD');
    return send(res, 405, 'Method Not Allowed');
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
  } catch {
    return send(res, 400, 'Bad Request');
  }
  if (pathname.includes('\0')) return send(res, 400, 'Bad Request');

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidate = path.resolve(ROOT, relativePath);
  if (candidate !== ROOT && !candidate.startsWith(ROOT + path.sep)) {
    return send(res, 403, 'Forbidden');
  }

  try {
    // Resolve symlinks too; lexical path checks alone do not prevent symlink escapes.
    const realRoot = await fs.promises.realpath(ROOT);
    const realFile = await fs.promises.realpath(candidate);
    if (realFile !== realRoot && !realFile.startsWith(realRoot + path.sep)) {
      return send(res, 403, 'Forbidden');
    }
    const stat = await fs.promises.stat(realFile);
    if (!stat.isFile()) return send(res, 404, 'Not Found');
    const ext = path.extname(realFile).toLowerCase();
    const baseHeaders = {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'SAMEORIGIN',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Cache-Control': 'public, max-age=300',
      'Accept-Ranges': 'bytes'
    };
    const range = req.headers.range;
    let start = 0;
    let end = Math.max(0, stat.size - 1);
    let status = 200;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) {
        res.writeHead(416, { ...baseHeaders, 'Content-Range': `bytes */${stat.size}` });
        return res.end();
      }
      if (!match[1]) {
        const suffix = Number(match[2]);
        start = Math.max(0, stat.size - suffix);
      } else {
        start = Number(match[1]);
        if (match[2]) end = Math.min(end, Number(match[2]));
      }
      if (start > end || start >= stat.size) {
        res.writeHead(416, { ...baseHeaders, 'Content-Range': `bytes */${stat.size}` });
        return res.end();
      }
      status = 206;
      baseHeaders['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
    }
    baseHeaders['Content-Length'] = stat.size ? end - start + 1 : 0;
    res.writeHead(status, baseHeaders);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(realFile, stat.size ? { start, end } : undefined).on('error', () => {
      if (!res.headersSent) send(res, 500, 'Internal Server Error');
      else res.destroy();
    }).pipe(res);
  } catch {
    return send(res, 404, 'Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
