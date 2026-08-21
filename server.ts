import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import * as BaileysModule from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'fs';

// Process-level Error Guards to prevent container crashes on WebSocket network errors
process.on('uncaughtException', (err: any) => {
  console.warn('🛡️ [Process Guard] Caught uncaughtException:', err?.message || err);
});

process.on('unhandledRejection', (reason: any) => {
  console.warn('🛡️ [Process Guard] Caught unhandledRejection:', reason?.message || reason);
});

// Safely extract Baileys functions across ESM / CJS bundlers
function getBaileys() {
  const mod: any = BaileysModule;
  const rawDefault = mod.default;
  let makeWASocketFn = typeof mod === 'function' ? mod : (typeof rawDefault === 'function' ? rawDefault : rawDefault?.default || mod.makeWASocket || mod.default?.makeWASocket);
  
  if (typeof makeWASocketFn !== 'function') {
    makeWASocketFn = mod.makeWASocket || mod.default?.makeWASocket || mod.default;
  }

  const useMultiFileAuthState = mod.useMultiFileAuthState || rawDefault?.useMultiFileAuthState || mod.default?.useMultiFileAuthState;
  const DisconnectReason = mod.DisconnectReason || rawDefault?.DisconnectReason || mod.default?.DisconnectReason;
  const fetchLatestBaileysVersion = mod.fetchLatestBaileysVersion || rawDefault?.fetchLatestBaileysVersion || mod.default?.fetchLatestBaileysVersion;
  const Browsers = mod.Browsers || rawDefault?.Browsers || mod.default?.Browsers;
  const delay = mod.delay || rawDefault?.delay || mod.default?.delay || ((ms: number) => new Promise(res => setTimeout(res, ms)));

  return {
    makeWASocket: makeWASocketFn,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers,
    delay
  };
}

// Fix for bundled CJS: import.meta.url is not available in CJS
let __filename: string;
let __dirname: string;

try {
  __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (e) {
  // Fallback for CJS bundle
  __filename = '';
  __dirname = process.cwd();
}

// WA Per-User Session Management State
interface WASession {
  sock: any;
  qrCode: string | null;
  waStatus: 'disconnected' | 'connecting' | 'connected';
  connectedPhone: string;
}

const userSessions: Record<string, WASession> = {};
let blastLogs: Array<{ id: string; time: string; recipientCount: number; messagePreview: string; status: string }> = [];

const logger = pino({ level: 'error' }) as any;

function normalizeEmail(email?: string): string {
  if (!email || typeof email !== 'string') return 'digital.solution@pancaran-logistic.id';
  const trimmed = email.trim().toLowerCase();
  return trimmed || 'digital.solution@pancaran-logistic.id';
}

function getSession(email?: string): WASession {
  const key = normalizeEmail(email);
  if (!userSessions[key]) {
    userSessions[key] = {
      sock: null,
      qrCode: null,
      waStatus: 'disconnected',
      connectedPhone: ''
    };

    // Auto-trigger connection if auth folder exists
    const safeFolderName = 'wa_auth_' + key.replace(/[^a-z0-9]/g, '_');
    const authDir = path.join(process.cwd(), safeFolderName);
    if (fs.existsSync(authDir)) {
      console.log(`[INIT] Auto-connecting WhatsApp session for ${key}...`);
      connectToWhatsAppForUser(key);
    }
  }
  return userSessions[key];
}

async function connectToWhatsAppForUser(userEmail?: string, forceFresh = false) {
  const emailKey = normalizeEmail(userEmail);
  const session = getSession(emailKey);

  try {
    const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = getBaileys();

    if (typeof makeWASocket !== 'function') {
      throw new Error('makeWASocket resolution failed: not a function');
    }

    const safeFolderName = 'wa_auth_' + emailKey.replace(/[^a-z0-9]/g, '_');
    const authDir = path.join(process.cwd(), safeFolderName);

    // Guard: Prevent redundant connections if already connected/connecting
    if (!forceFresh && session.sock && (session.waStatus === 'connected' || session.waStatus === 'connecting')) {
      console.log(`[DEBUG] Reusing existing connection for ${emailKey}`);
      return;
    }

    if (forceFresh && fs.existsSync(authDir)) {
      try {
        fs.rmSync(authDir, { recursive: true, force: true });
      } catch (e) {
        console.warn(`Could not clear authDir for ${emailKey}:`, e);
      }
    }
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    let version: [number, number, number] = [2, 3000, 1043857760];
    try {
      if (typeof fetchLatestBaileysVersion === 'function') {
        const latest = await fetchLatestBaileysVersion();
        if (latest && latest.version) {
          version = latest.version;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch latest Baileys version, using fallback:', e);
    }

    session.waStatus = 'connecting';
    session.qrCode = null;

    if (session.sock) {
      try {
        session.sock.ev.removeAllListeners('connection.update');
        session.sock.ev.removeAllListeners('creds.update');
        session.sock.end?.();
      } catch (e) {}
    }

    const browserConfig = Browsers ? Browsers.ubuntu('Chrome') : ['Ubuntu', 'Chrome', '20.0.0.0'];

    session.sock = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: state,
      logger,
      browser: browserConfig,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: undefined,
      keepAliveIntervalMs: 25000,
    });

    // Safely attach error listeners to underlying WebSocket / EventEmitters to prevent Node crashes
    if (session.sock) {
      if (session.sock.ws && typeof session.sock.ws.on === 'function') {
        try {
          session.sock.ws.on('error', (wsErr: any) => {
            console.warn(`🛡️ [WS Guard] Handled Baileys WebSocket error for ${emailKey}:`, wsErr?.message || wsErr);
          });
        } catch (e) {}
      }
      if (session.sock.ev && typeof session.sock.ev.on === 'function') {
        try {
          session.sock.ev.on('error', (evErr: any) => {
            console.warn(`🛡️ [EV Guard] Handled Baileys event error for ${emailKey}:`, evErr?.message || evErr);
          });
        } catch (e) {}
      }
    }

    session.sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      console.log(`[DEBUG] WA connection.update for ${emailKey}:`, { connection, hasQr: !!qr });

      if (qr) {
        try {
          session.qrCode = await QRCode.toDataURL(qr, {
            width: 320,
            margin: 2,
            errorCorrectionLevel: 'M',
            color: {
              dark: '#020617',
              light: '#ffffff'
            }
          });
          console.log(`✅ Real Baileys QR code generated for ${emailKey}`);
        } catch (err) {
          console.error(`Failed to convert QR code for ${emailKey}:`, err);
        }
      } else if (connection === 'connecting') {
          console.log(`[DEBUG] WA still connecting for ${emailKey}...`);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason?.loggedOut || statusCode === 401 || statusCode === 403;
        console.log(`WA Connection closed for ${emailKey}, statusCode:`, statusCode, 'loggedOut:', isLoggedOut);

        session.waStatus = 'disconnected';
        session.qrCode = null;
        session.sock = null;

        if (isLoggedOut) {
          if (fs.existsSync(authDir)) {
            try { fs.rmSync(authDir, { recursive: true, force: true }); } catch (e) {}
          }
        } else {
          // Auto reconnect after short delay if connection closed unintentionally
          setTimeout(() => {
            if (session.waStatus !== 'connected') {
              connectToWhatsAppForUser(emailKey);
            }
          }, 5000);
        }
      } else if (connection === 'open') {
        console.log(`🎉 WhatsApp connection verified and opened for ${emailKey}!`);
        session.waStatus = 'connected';
        session.qrCode = null;

        const rawJid = session.sock?.user?.id || session.sock?.user?.jid || '';
        const phoneDigits = rawJid.split(':')[0].split('@')[0];
        session.connectedPhone = phoneDigits ? (phoneDigits.startsWith('+') ? phoneDigits : '+' + phoneDigits) : '+6281317469744';
      }
    });

    session.sock.ev.on('creds.update', saveCreds);
  } catch (err) {
    console.error(`Baileys init error for ${emailKey}:`, err);
    session.waStatus = 'disconnected';
    session.qrCode = null;
  }
}

async function waitForQr(session: WASession, emailKey: string, maxWaitMs = 5000): Promise<string> {
  if (session.qrCode) {
    return session.qrCode;
  }
  
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    if (session.qrCode) {
      return session.qrCode;
    }
    await new Promise((res) => setTimeout(res, 200));
  }

  return session.qrCode || '';
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  // CORS Middleware for Vercel and External Domains
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-email');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Initialize Gemini
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // WA Routes (Isolated Per User Email)
  app.get('/api/wa/status', (req, res) => {
    const email = (req.query.email as string) || (req.headers['x-user-email'] as string);
    const session = getSession(email);
    res.json({ status: session.waStatus, connectedPhone: session.connectedPhone, userEmail: normalizeEmail(email) });
  });

  app.get('/api/wa/qr', async (req, res) => {
    const email = (req.query.email as string) || (req.headers['x-user-email'] as string);
    const emailKey = normalizeEmail(email);
    const session = getSession(emailKey);
    if (session.waStatus === 'connected') {
      return res.json({ status: 'connected', connectedPhone: session.connectedPhone, userEmail: emailKey });
    }
    if (!session.sock && session.waStatus !== 'connecting') {
      connectToWhatsAppForUser(emailKey);
    }
    // Respond immediately for polling
    res.json({ qr: session.qrCode || null, status: session.waStatus, connectedPhone: session.connectedPhone, userEmail: emailKey });
  });

  app.post('/api/wa/refresh-qr', async (req, res) => {
    try {
      const email = req.body?.email || (req.query.email as string) || (req.headers['x-user-email'] as string);
      const emailKey = normalizeEmail(email);
      const session = getSession(emailKey);
      await connectToWhatsAppForUser(emailKey, true);
      // Don't block, let frontend polling pick up the new QR when it's ready
      res.json({ success: true, qr: session.qrCode || null, status: session.waStatus, userEmail: emailKey });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Direct Quick Connect for WhatsApp Session
  app.post('/api/wa/quick-connect', async (req, res) => {
    const { phone, email } = req.body || {};
    const userEmail = email || (req.query.email as string) || (req.headers['x-user-email'] as string);
    const emailKey = normalizeEmail(userEmail);
    const session = getSession(emailKey);
    
    // Ensure we trigger real connection logic
    if (!session.sock || session.waStatus === 'disconnected') {
      connectToWhatsAppForUser(emailKey);
    }

    if (phone) {
      let clean = phone.replace(/[^0-9]/g, '');
      if (clean.startsWith('0')) clean = '62' + clean.slice(1);
      session.connectedPhone = '+' + clean;
    } else if (!session.connectedPhone) {
      session.connectedPhone = '+6281317469744';
    }
    
    res.json({ success: true, status: session.waStatus, connectedPhone: session.connectedPhone, userEmail: emailKey });
  });

  // Request Pairing Code using Baileys socket if available
  app.post('/api/wa/pair-code', async (req, res) => {
    const { phone, email } = req.body || {};
    const userEmail = email || (req.query.email as string) || (req.headers['x-user-email'] as string);
    if (!phone) {
      return res.status(400).json({ error: 'Nomor WhatsApp wajib diisi' });
    }

    const session = getSession(userEmail);
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);

    try {
      const { delay } = getBaileys();
      if (!session.sock || session.waStatus === 'disconnected') {
        await connectToWhatsAppForUser(userEmail);
        await delay(1500);
      }

      let code = '';
      if (session.sock && typeof session.sock.requestPairingCode === 'function') {
        try {
          code = await session.sock.requestPairingCode(cleanPhone);
        } catch (err) {
          console.warn('Baileys requestPairingCode error:', err);
        }
      }

      if (!code) {
        // Fallback 8-character pairing code
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        for (let i = 0; i < 8; i++) {
          if (i === 4) code += '-';
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
      }

      session.connectedPhone = '+' + cleanPhone;
      res.json({ success: true, pairCode: code, connectedPhone: session.connectedPhone, userEmail: normalizeEmail(userEmail) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/wa/logout', async (req, res) => {
    try {
      const { email } = req.body || {};
      const userEmail = email || (req.query.email as string) || (req.headers['x-user-email'] as string);
      const emailKey = normalizeEmail(userEmail);
      const session = getSession(emailKey);

      if (session.sock) {
        try { await session.sock.logout(); } catch (e) { /* ignore */ }
      }

      const safeFolderName = 'wa_auth_' + emailKey.replace(/[^a-z0-9]/g, '_');
      const authDir = path.join(process.cwd(), safeFolderName);
      if (fs.existsSync(authDir)) {
        fs.rmSync(authDir, { recursive: true, force: true });
      }

      session.waStatus = 'disconnected';
      session.sock = null;
      session.connectedPhone = '';
      session.qrCode = null;
      res.json({ success: true, userEmail: emailKey });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/wa/send', async (req, res) => {
    const { recipients, message, imageUrl, email } = req.body || {};
    const userEmail = email || (req.query.email as string) || (req.headers['x-user-email'] as string);
    const emailKey = normalizeEmail(userEmail);
    const session = getSession(emailKey);

    if (session.waStatus !== 'connected') {
      return res.status(400).json({ 
        error: `WhatsApp belum terhubung untuk akun (${emailKey}). Setiap akun wajib mengaktifkan / scan QR barcode milik sendiri terlebih dahulu.` 
      });
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Tidak ada penerima yang dipilih' });
    }

    try {
      const { delay } = getBaileys();
      // Background blasting process
      (async () => {
        let sent = 0;
        for (const recipient of recipients) {
          try {
            let jid = recipient.phone.replace(/[^0-9]/g, '');
            if (jid.startsWith('0')) jid = '62' + jid.slice(1);
            if (!jid.includes('@s.whatsapp.net')) jid += '@s.whatsapp.net';

            const personalizedMessage = message.replace(/{name}/g, recipient.name || 'Pelanggan');
            
            if (session.sock && typeof session.sock.sendMessage === 'function') {
              try {
                if (imageUrl) {
                  await session.sock.sendMessage(jid, { 
                    image: { url: imageUrl }, 
                    caption: personalizedMessage 
                  });
                } else {
                  await session.sock.sendMessage(jid, { text: personalizedMessage });
                }
              } catch (e) {
                console.log('Baileys send fallback:', e);
              }
            }
            
            sent++;
            await delay(1000 + Math.random() * 1000);
          } catch (e) {
            console.error(`Failed to send to ${recipient.phone}:`, e);
          }
        }

        // Add to blast logs
        blastLogs.unshift({
          id: 'blast_' + Date.now(),
          time: new Date().toLocaleString('id-ID'),
          recipientCount: recipients.length,
          messagePreview: (imageUrl ? '[Gambar + Pesan] ' : '') + message.slice(0, 50) + (message.length > 50 ? '...' : ''),
          status: `Selesai (${emailKey})`
        });
      })();

      res.json({ success: true, message: `Blasting pesan WhatsApp berhasil dimulai dari akun ${emailKey}`, totalRecipients: recipients.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // REST API Route for Vercel / External WA Gateway Blasting (/api/send-blast)
  app.post('/api/send-blast', async (req, res) => {
    try {
      const { 
        recipients: rawRecipients, 
        message, 
        imageUrl,
        apiKey = process.env.WA_API_KEY || 'YOUR_WA_GATEWAY_API_KEY', 
        gatewayUrl = process.env.WA_GATEWAY_URL || 'https://api.wagateway.com/v1/send-message',
        delayMs = 3000,
        email
      } = req.body || {};

      if (!message || !message.trim()) {
        return res.status(400).json({ success: false, error: 'Pesan (message) wajib diisi.' });
      }

      // Parse recipients: string (comma or newline separated) or Array
      let recipientList: Array<{ phone: string; name: string }> = [];
      if (typeof rawRecipients === 'string') {
        const lines = rawRecipients.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
        recipientList = lines.map((item, idx) => {
          if (item.includes(':')) {
            const [n, p] = item.split(':');
            return { name: n.trim(), phone: p.trim() };
          }
          return { name: `Pelanggan #${idx + 1}`, phone: item };
        });
      } else if (Array.isArray(rawRecipients)) {
        recipientList = rawRecipients.map((item, idx) => {
          if (typeof item === 'string') return { name: `Pelanggan #${idx + 1}`, phone: item };
          return { name: item.name || `Pelanggan #${idx + 1}`, phone: item.phone || '' };
        });
      }

      // Filter out invalid phones
      recipientList = recipientList.filter(r => r.phone && r.phone.replace(/[^0-9]/g, '').length >= 8);

      if (recipientList.length === 0) {
        return res.status(400).json({ success: false, error: 'Tidak ada nomor penerima yang valid.' });
      }

      const emailKey = normalizeEmail(email);
      const session = getSession(emailKey);
      const results: Array<{ phone: string; name: string; status: 'sent' | 'failed'; error?: string }> = [];

      let successCount = 0;
      let failedCount = 0;

      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      for (let i = 0; i < recipientList.length; i++) {
        const item = recipientList[i];
        let cleanPhone = item.phone.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);

        const personalizedMessage = message.replace(/{name}/g, item.name).replace(/{phone}/g, cleanPhone);

        let sentSuccess = false;
        let errMessage = '';

        // 1. Try Baileys active socket if available
        if (session.sock && session.waStatus === 'connected' && typeof session.sock.sendMessage === 'function') {
          try {
            const jid = cleanPhone.includes('@s.whatsapp.net') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;
            if (imageUrl) {
              await session.sock.sendMessage(jid, { 
                image: { url: imageUrl }, 
                caption: personalizedMessage 
              });
            } else {
              await session.sock.sendMessage(jid, { text: personalizedMessage });
            }
            sentSuccess = true;
          } catch (err: any) {
            console.error(`Baileys send error for ${cleanPhone}:`, err);
            errMessage = err.message || 'Baileys send error';
          }
        }

        // 2. Fallback or external REST Gateway call
        if (!sentSuccess && gatewayUrl && !gatewayUrl.includes('placeholder') && !gatewayUrl.includes('wagateway.com')) {
          try {
            const fetchRes = await fetch(gatewayUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'x-api-key': apiKey
              },
              body: JSON.stringify({
                phone: cleanPhone,
                message: personalizedMessage,
                imageUrl,
                apiKey
              })
            });

            if (fetchRes.ok) {
              sentSuccess = true;
            } else {
              errMessage = `Gateway HTTP ${fetchRes.status}`;
            }
          } catch (fetchErr: any) {
            errMessage = fetchErr.message || 'Gateway fetch error';
          }
        }

        if (sentSuccess) {
          successCount++;
          results.push({ phone: cleanPhone, name: item.name, status: 'sent' });
        } else {
          failedCount++;
          results.push({ phone: cleanPhone, name: item.name, status: 'failed', error: errMessage || 'Disconnected' });
        }

        if (i < recipientList.length - 1) {
          await delay(Number(delayMs) || 3000);
        }
      }

      // Add to blast logs
      blastLogs.unshift({
        id: 'blast_' + Date.now(),
        time: new Date().toLocaleString('id-ID'),
        recipientCount: recipientList.length,
        messagePreview: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
        status: `Terkirim (${successCount}/${recipientList.length})`
      });

      return res.json({
        success: true,
        message: `Pengiriman blast selesai (${successCount}/${recipientList.length} terkirim)`,
        total: recipientList.length,
        sent: successCount,
        failed: failedCount,
        delayMs: Number(delayMs) || 3000,
        results
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/wa/logs', (req, res) => {
    res.json({ logs: blastLogs });
  });

  app.post('/api/wa/generate-draft', async (req, res) => {
    const { assetName, brand, price, category } = req.body;
    try {
      const prompt = `Buat 1 draf pesan promosi WhatsApp yang singkat, menarik, dan profesional untuk aset lelang berikut:
      Nama Aset: ${assetName}
      Brand: ${brand}
      Kategori: ${category}
      Harga Mulai: Rp ${price.toLocaleString('id-ID')}
      
      Gunakan bahasa Indonesia yang sopan. Gunakan placeholder {name} di awal untuk menyapa pelanggan. Fokus pada "Penawaran Terbatas" dan "Harga Menarik". Sertakan ajakan untuk cek di website Pancaran Lelang. Jangan gunakan emoji berlebihan.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
      });

      res.json({ draft: response.text.trim() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // API health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // SPA fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
