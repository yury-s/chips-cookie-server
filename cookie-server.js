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

const app = express();

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

// Azure App Service terminates HTTPS at the front-end (Azure Load Balancer) →
// forwards to your app over HTTP on the internal port.
const port = process.env.PORT || 3000;
const origin1 = process.env.ORIGIN1 || `localhost:${port}`;
const origin2 = process.env.ORIGIN2 || `127.0.0.1:${port}`;

// Create URLs for both origins
const urls = createUrls(
  `https://${origin1}`,
  `https://${origin2}`
);

// Common cookie handlers for both apps
function addCommonCookieHandlers(app, urls) {
  app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cookie Test URLs</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 0 20px; }
            .button-group { margin-bottom: 20px; }
            h2 { color: #333; }
            .nav-link {
              display: block;
              margin: 10px 0;
              padding: 10px 15px;
              background-color: #4CAF50;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              width: 100%;
              text-align: left;
              text-decoration: none;
            }
            .nav-link:hover { background-color: #45a049; }
          </style>
        </head>
        <body>
          <h1>Cookie Test URLs</h1>
          
          <div class="button-group">
            <h2>Read Cookie Tests</h2>
            <a href="${urls.read_origin1}" class="nav-link">Read Cookie (Origin 1)</a>
            <a href="${urls.read_origin2_origin1}" class="nav-link">Read Cookie (Origin 2 &rarr; Origin 1)</a>
            <a href="${urls.read_origin1_origin1}" class="nav-link">Read Cookie (Origin 1 &rarr; Origin 1)</a>
            <a href="${urls.read_origin1_origin2_origin1}" class="nav-link">Read Cookie (Origin 1 &rarr; Origin 2 &rarr; Origin 1)</a>
          </div>

          <div class="button-group">
            <h2>Set Cookie Tests</h2>
            <a href="${urls.set_origin1}" class="nav-link">Set Cookie (Origin 1)</a>
            <a href="${urls.set_origin2_origin1}" class="nav-link">Set Cookie (Origin 2 &rarr; Origin 1)</a>
            <a href="${urls.set_origin1_origin2_origin1}" class="nav-link">Set Cookie (Origin 1 &rarr; Origin 2 &rarr; Origin 1)</a>
          </div>
        </body>
      </html>
    `;
    res.end(html);
  });

  // Read cookie handler
  app.get('/read-cookie.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    const cookies = req.headers.cookie?.split(';').map(c => c.trim()).sort() || [];
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Received Cookies</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 0 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; }
            tr:hover { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h2>Received Cookies</h2>
          <table>
            <thead>
              <tr>
                <th>Cookie</th>
              </tr>
            </thead>
            <tbody>
              ${cookies.map(cookie => `<tr><td>${cookie}</td></tr>`).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    res.end(html);
  });

  // Frame set cookie handler
  app.get('/frame-set-cookie.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<iframe src='${urls.origin1}/set-cookie.html?isFrame=true' width="100%" height="580px" style="border: 1px solid rgb(122, 50, 50);"></iframe>`);
  });

  // Frame read cookie handler
  app.get('/frame-read-cookie.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<iframe src='${urls.origin1}/read-cookie.html' width="100%" height="580px" style="border: 1px solid rgb(122, 50, 50);"></iframe>`);
  });

  // Nested frame handlers
  app.get('/nested-frame-set-cookie.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<iframe src='${urls.origin2}/frame-set-cookie.html' width="100%" height="600px" style="border: 1px solid rgb(145, 169, 148);"></iframe>`);
  });

  app.get('/nested-frame-read-cookie.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<iframe src='${urls.origin2}/frame-read-cookie.html' width="100%" height="600px" style="border: 1px solid rgb(145, 169, 148);"></iframe>`);
  });

  // Set cookie handler
  app.get('/set-cookie.html', (req, res) => {
    const cookieName = !!req.query.isFrame ? 'frame' : 'top-level';
    
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