import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Render sets the PORT environment variable
const port = process.env.PORT || 3000;
// Vite outputs build artifacts to the 'dist' directory by default
const buildPath = path.join(__dirname, 'dist');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
  // Normalize path to prevent directory traversal
  let safePath = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');
  
  if (safePath === '/') safePath = '/index.html';
  
  let filePath = path.join(buildPath, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const ext = path.extname(safePath);
      // If it looks like a specific asset request (e.g. .js, .css) and is missing, return 404
      if (ext && ext !== '.html') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      
      // SPA Fallback: For routes (e.g. /meeting/123), serve index.html
      fs.readFile(path.join(buildPath, 'index.html'), (err, content) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Server Error: index.html not found. Make sure "npm run build" ran successfully.');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        }
      });
    } else {
      // Serve static file
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});