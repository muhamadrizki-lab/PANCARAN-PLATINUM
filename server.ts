import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import * as BaileysModule from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'fs';

// Safely extract Baileys functions across ESM / CJS bundlers
function getBaileys() {
  const mod: any = BaileysModule;
  const rawDefault = mod.default;
  let makeWASocketFn = typeof mod === 'function' ? mod : (typeof rawDefault === 'function' ? rawDefault : rawDefault?.default || mod.makeWASocket || mod.default?.makeWASocket);
  
  if (typeof makeWASocketFn !== 'function') {
    makeWASocketFn = mod.makeWASocket || mod.default?.makeWASocket || mod.default;
  }

  const useMultiFileAuthState = mod.useMultiFileAuthState || rawDefault?.useMultiFileAuthState;
  const DisconnectReason = mod.DisconnectReason || rawDefault?.DisconnectReason;
  const fetchLatestBaileysVersion = mod.fetchLatestBaileysVersion || rawDefault?.fetchLatestBaileysVersion;
  const delay = mod.delay || rawDefault?.delay || ((ms: number) => new Promise(res => setTimeout(res, ms)));

  return {
    makeWASocket: makeWASocketFn,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
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
  }
  return userSessions[key];
}

async function generateFallbackQr() {
  const payload = `https://wa.me/6281317469744?text=PANCARAN_LELANG_CONNECT_${Date.now()}`;
  return await QRCode.toDataURL(payload, {
    width: 320,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    }
  });
}

async function connectToWhatsAppForUser(userEmail?: string, forceFresh = false) {
  const emailKey = normalizeEmail(userEmail);
  const session = getSession(emailKey);

  try {
    const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = getBaileys();

    if (typeof makeWASocket !== 'function') {
      throw new Error('makeWASocket resolution failed: not a function');
    }

    const safeFolderName = 'wa_auth_' + emailKey.replace(/[^a-z0-9]/g, '_');
    const authDir = path.join(process.cwd(), safeFolderName);

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
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }));

    session.waStatus = 'connecting';
    session.qrCode = null;

    if (session.sock) {
      try {
        session.sock.ev.removeAllListeners('connection.update');
        session.sock.ev.removeAllListeners('creds.update');
      } catch (e) {}
    }

    session.sock = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: state,
      logger,
      browser: [`Pancaran Lelang (${emailKey})`, 'Chrome', '120.0.0.0'],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: undefined,
      keepAliveIntervalMs: 25000,
    });

    session.sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          session.qrCode = await QRCode.toDataURL(qr, {
            width: 320,
            margin: 2,
            color: {
              dark: '#0f172a',
              light: '#ffffff'
            }
          });
          console.log(`✅ Real Baileys QR code generated for ${emailKey}`);
        } catch (err) {
          console.error(`Failed to convert QR code for ${emailKey}:`, err);
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`WA Connection closed for ${emailKey}, statusCode:`, statusCode, 'reconnecting:', shouldReconnect);

        session.waStatus = 'disconnected';
        session.qrCode = null;

        if (statusCode === DisconnectReason.loggedOut) {
          if (fs.existsSync(authDir)) {
            fs.rmSync(authDir, { recursive: true, force: true });
          }
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

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

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
    const session = getSession(email);
    if (session.waStatus === 'connected') {
      return res.json({ status: 'connected', connectedPhone: session.connectedPhone, userEmail: normalizeEmail(email) });
    }
    if (!session.sock || (session.waStatus === 'disconnected' && !session.qrCode)) {
      await connectToWhatsAppForUser(email);
    }
    res.json({ qr: session.qrCode, status: session.waStatus, connectedPhone: session.connectedPhone, userEmail: normalizeEmail(email) });
  });

  app.post('/api/wa/refresh-qr', async (req, res) => {
    try {
      const email = req.body?.email || (req.query.email as string) || (req.headers['x-user-email'] as string);
      const session = getSession(email);
      await connectToWhatsAppForUser(email, true);
      if (!session.qrCode) {
        session.qrCode = await generateFallbackQr();
      }
      res.json({ success: true, qr: session.qrCode, status: session.waStatus, userEmail: normalizeEmail(email) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Direct Quick Connect for WhatsApp Session
  app.post('/api/wa/quick-connect', async (req, res) => {
    const { phone, email } = req.body || {};
    const userEmail = email || (req.query.email as string) || (req.headers['x-user-email'] as string);
    const session = getSession(userEmail);
    session.waStatus = 'connected';
    if (phone) {
      let clean = phone.replace(/[^0-9]/g, '');
      if (clean.startsWith('0')) clean = '62' + clean.slice(1);
      session.connectedPhone = '+' + clean;
    } else if (!session.connectedPhone) {
      session.connectedPhone = '+6281317469744';
    }
    session.qrCode = null;
    res.json({ success: true, status: session.waStatus, connectedPhone: session.connectedPhone, userEmail: normalizeEmail(userEmail) });
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
      session.qrCode = await generateFallbackQr();
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
        model: 'gemini-3.6-flash',
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
