import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const APK_PATH = path.resolve(ROOT_DIR, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const VAULT_FILE = path.resolve(__dirname, 'vault.json');
const CONFIG_FILE = path.resolve(__dirname, 'config.json');

// Default Server Configuration
let config = {
  port: 3000,
  apiKey: 'lattice_live_key_2026',
  serverName: 'LatticeLedger Central Server',
  geminiApiKey: ''
};

if (fs.existsSync(CONFIG_FILE)) {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = { ...config, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('[Server] Error reading config.json:', err.message);
  }
} else {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

// Load or seed Vault Data
function loadVault() {
  if (fs.existsSync(VAULT_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(VAULT_FILE, 'utf8'));
    } catch (err) {
      console.warn('[Server] Error reading vault.json, resetting:', err.message);
    }
  }
  return [];
}

function saveVault(notes) {
  fs.writeFileSync(VAULT_FILE, JSON.stringify(notes, null, 2), 'utf8');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.apk': 'application/vnd.android.package-archive'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key'
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. APK DIRECT DOWNLOAD ENDPOINTS
  if (pathname === '/lattice-ledger.apk' || pathname === '/app-debug.apk' || pathname === '/download-apk') {
    if (fs.existsSync(APK_PATH)) {
      const stat = fs.statSync(APK_PATH);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': stat.size,
        'Content-Disposition': 'attachment; filename="LatticeLedger.apk"',
        'Access-Control-Allow-Origin': '*'
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      const stream = fs.createReadStream(APK_PATH);
      stream.pipe(res);
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('APK is currently compiling or not found. Please wait 10 seconds and try again.');
      return;
    }
  }

  // 2. MOBILE DOWNLOAD LANDING PAGE (/download)
  if (pathname === '/download') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    const hasApk = fs.existsSync(APK_PATH);
    const sizeMb = hasApk ? (fs.statSync(APK_PATH).size / (1024 * 1024)).toFixed(1) : '0';
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LatticeLedger - Android APK Download</title>
  <style>
    body {
      background-color: #09090b;
      color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      text-align: center;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 32px 24px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 16px;
      border: 1px solid rgba(99, 102, 241, 0.3);
    }
    h1 {
      font-size: 24px;
      margin: 0 0 8px 0;
      color: #fafafa;
    }
    p {
      color: #a1a1aa;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .btn {
      display: block;
      background: #6366f1;
      color: white;
      text-decoration: none;
      font-weight: 600;
      padding: 14px 20px;
      border-radius: 10px;
      font-size: 15px;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #4f46e5;
    }
    .key-box {
      margin-top: 24px;
      padding: 12px;
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 8px;
      text-align: left;
      font-size: 12px;
    }
    .key-title {
      color: #71717a;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .key-val {
      font-family: monospace;
      color: #a5b4fc;
      word-break: break-all;
      user-select: all;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Android Native App</div>
    <h1>LatticeLedger Mobile</h1>
    <p>Install the native APK on your Android device to access and edit your PKM knowledge vault with bi-directional sync.</p>
    
    <a href="/lattice-ledger.apk" class="btn">
      ⬇️ Download APK (${sizeMb} MB)
    </a>

    <div class="key-box">
      <div class="key-title">Server Connection Key</div>
      <div class="key-val">${config.apiKey}</div>
      <div style="margin-top:8px; color:#71717a; font-size:11px;">Server URL: <strong style="color:#e4e4e7">http://${req.headers.host || '192.168.0.4:3000'}</strong></div>
    </div>
  </div>
</body>
</html>`);
    return;
  }

  // 3. PUBLIC STATUS / HEALTH CHECK ENDPOINT
  if (pathname === '/api/status' || pathname === '/api/health') {
    const hasApk = fs.existsSync(APK_PATH);
    const vault = loadVault();
    sendJson(res, 200, {
      status: 'online',
      serverName: config.serverName,
      port: config.port,
      hasApk,
      apkSizeMb: hasApk ? (fs.statSync(APK_PATH).size / (1024 * 1024)).toFixed(1) : 0,
      notesCount: vault.length,
      apkDownloadUrl: `http://${req.headers.host || 'localhost:3000'}/lattice-ledger.apk`,
      authRequired: true
    });
    return;
  }

  // 4. API AUTHENTICATION CHECK FOR PROTECTED /api/* ENDPOINTS
  if (pathname.startsWith('/api/')) {
    const clientKey = req.headers['x-api-key'] || 
                      (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : '') ||
                      parsedUrl.searchParams.get('apiKey');

    if (!clientKey || clientKey !== config.apiKey) {
      sendJson(res, 401, {
        error: 'Unauthorized',
        message: 'Invalid or missing API key. Please pass x-api-key header or connect in Settings.'
      });
      return;
    }

    // A. GET /api/notes - Read all notes from Server Vault
    if (pathname === '/api/notes' && req.method === 'GET') {
      const notes = loadVault();
      sendJson(res, 200, { notes, count: notes.length, timestamp: Date.now() });
      return;
    }

    // B. POST /api/notes/sync - Bi-directional Timestamp Sync
    if (pathname === '/api/notes/sync' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          const incomingNotes = Array.isArray(payload.notes) ? payload.notes : [];
          const currentNotes = loadVault();

          const notesMap = new Map();
          // Seed with current server notes
          currentNotes.forEach(n => notesMap.set(n.id, n));

          // Merge incoming client notes using updatedAt timestamp
          incomingNotes.forEach(incoming => {
            const existing = notesMap.get(incoming.id);
            if (!existing || (incoming.updatedAt || 0) > (existing.updatedAt || 0)) {
              notesMap.set(incoming.id, incoming);
            }
          });

          const merged = Array.from(notesMap.values());
          saveVault(merged);

          sendJson(res, 200, {
            success: true,
            notes: merged,
            syncedAt: Date.now()
          });
        } catch (err) {
          sendJson(res, 400, { error: 'Invalid JSON payload', message: err.message });
        }
      });
      return;
    }

    // C. POST /api/notes - Overwrite / Save notes directly
    if (pathname === '/api/notes' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          if (Array.isArray(payload.notes)) {
            saveVault(payload.notes);
            sendJson(res, 200, { success: true, count: payload.notes.length, timestamp: Date.now() });
          } else {
            sendJson(res, 400, { error: 'Missing notes array in payload' });
          }
        } catch (err) {
          sendJson(res, 400, { error: 'Invalid JSON payload', message: err.message });
        }
      });
      return;
    }
  }

  // 5. STATIC FILES SERVING (React SPA dist/)
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  let filePath = path.join(DIST_DIR, safePath);

  // If path exists and is a file, serve it
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // SPA fallback to index.html for client-side routing
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(indexPath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

const PORT = process.env.PORT || config.port || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[LatticeLedger Server] Running on http://0.0.0.0:${PORT}`);
  console.log(`[LatticeLedger Server] Local LAN URL: http://192.168.0.4:${PORT}`);
  console.log(`[LatticeLedger Server] Download APK at: http://192.168.0.4:${PORT}/download`);
  console.log(`[LatticeLedger Server] API Key: ${config.apiKey}`);
});
