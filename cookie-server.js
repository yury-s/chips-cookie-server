import express from 'express';
import cors from 'cors';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Azure App Service terminates HTTPS at the front-end (Azure Load Balancer) →
// forwards to your app over HTTP on the internal port.
const port = process.env.PORT || 3000;
const app = express(); // origin1

// Configure CORS for both apps
app.use(cors({
  origin: true,
  credentials: true
}));

// Helper function to create URLs object
function createUrls(origin1, origin2) {
  return {
    origin1,
    origin2,
    read_origin1: origin1 + '/read-cookie.html',
    read_origin2_origin1: origin2 + '/frame-read-cookie.html',
    read_origin1_origin1: origin1 + '/frame-read-cookie.html',
    read_origin1_origin2_origin1: origin1 + '/nested-frame-read-cookie.html',
    set_origin1: origin1 + '/set-cookie.html',
    set_origin2_origin1: origin2 + '/frame-set-cookie.html',
    set_origin1_origin2_origin1: origin1 + '/nested-frame-set-cookie.html',
  };
}

// Create URLs for both origins
const urls = createUrls(
  `https://localhost:${port}`,
  `https://127.0.0.1:${port}`
);

// Common cookie handlers for both apps
function addCommonCookieHandlers(app, urls) {
  app.get('/', (req, res) => {
    res.send('Hello from HTTPS!');
  });

  // Read cookie handler
  app.get('/read-cookie.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    const cookies = req.headers.cookie?.split(';').map(c => c.trim()).sort().join('; ');
    res.end(`Received cookie: ${cookies}`);
  });

  // Frame set cookie handler
  app.get('/frame-set-cookie.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<iframe src='${urls.origin1}/set-cookie.html'></iframe>`);
  });

  // Frame read cookie handler
  app.get('/frame-read-cookie.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<iframe src='${urls.origin1}/read-cookie.html'></iframe>`);
  });

  // Nested frame handlers
  app.get('/nested-frame-set-cookie.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<iframe src='${urls.origin2}/frame-set-cookie.html'></iframe>`);
  });

  app.get('/nested-frame-read-cookie.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<iframe src='${urls.origin2}/frame-read-cookie.html'></iframe>`);
  });

  // Set cookie handler
  app.get('/set-cookie.html', (req, res) => {
    const isFrame = req.headers.referer;
    const cookieName = isFrame ? 'frame' : 'top-level';
    
    // Set both partitioned and non-partitioned cookies
    res.setHeader('Set-Cookie', [
      `${cookieName}-partitioned=value; SameSite=None; Path=/; Secure; Partitioned;`,
      `${cookieName}-non-partitioned=value; SameSite=None; Path=/; Secure;`
    ]);
    res.end();
  });
}

// Add handlers to both apps
addCommonCookieHandlers(app, urls);


function startLocalServer() {
  // Generate self-signed certificates if they don't exist
  if (!fs.existsSync(path.join(__dirname, 'key.pem')) || !fs.existsSync(path.join(__dirname, 'cert.pem'))) {
    console.log('Generating self-signed certificates...');
    execSync('openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"');
    console.log('Certificates generated successfully!');
  }

  // Create self-signed certificates for HTTPS
  const options = {
    key: fs.readFileSync(path.join(__dirname, 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
  };

  // Start both servers
  https.createServer(options, app).listen(port, () => {
    console.log(`Server running at https://localhost:${port}`);
  });  
}

function startAzureServer() {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

if (process.argv.includes('--local')) {
  startLocalServer();
} else {
  startAzureServer();
}