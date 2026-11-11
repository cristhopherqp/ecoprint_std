/**
 * EcoPrint Studio - Servidor HTTP Estático Ligero (Node.js Nativo)
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.mjs': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Cache-Control': 'no-cache'
};

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('405 Método no permitido');
    return;
  }

  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch {
    res.writeHead(400, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('400 Solicitud malformada');
    return;
  }

  if (decodedUrl === '/' || decodedUrl === '') {
    decodedUrl = '/index.html';
  }

  // Resolución segura de ruta para prevenir Directory Traversal
  const filePath = path.resolve(__dirname, '.' + decodedUrl);
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('403 Acceso denegado');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('404 Recurso no encontrado');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': contentType
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=UTF-8' });
      }
      res.end('500 Error interno al leer el archivo');
    });
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  🌱 EcoPrint Studio Servidor Local Activo`);
  console.log(`  🔗 Abre en tu navegador: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
