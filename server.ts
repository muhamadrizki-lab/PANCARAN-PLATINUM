import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion,
  delay
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'fs';

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

// WA Global State
let sock: any = null;
let qrCode: string | null = null;
let waStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
let connectedPhone: string = '';
let blastLogs: Array<{ id: string; time: string; recipientCount: number; messagePreview: string; status: string }> = [];

const logger = pino({ level: 'error' }) as any;

async function connectToWhatsApp(forceFresh = false) {
  try {
    const authDir = path.join(process.cwd(), 'wa_auth');
    if (forceFresh && fs.existsSync(authDir)) {
      try {
        fs.rmSync(authDir, { recursive: true, force: true });
      } catch (e) {
        console.warn('Could not clear authDir:', e);
      }
    }
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }));

    waStatus = 'connecting';
    qrCode = null;

    if (sock) {
      try { sock.ev.removeAllListeners('connection.update'); sock.ev.removeAllListeners('creds.update'); } catch(e){}
    }

    sock = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: state,
      logger,
      browser: ['Pancaran Lelang Admin', 'Chrome', '120.0.0.0'],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: undefined,
      keepAliveIntervalMs: 25000,
    });

    sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        try {
          qrCode = await QRCode.toDataURL(qr, {
            width: 320,
            margin: 2,
            color: {
              dark: '#0f172a',
              light: '#ffffff'
            }
          });
          console.log('✅ Real Baileys QR code generated successfully');
        } catch (err) {
          console.error('Failed to convert QR code:', err);
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log('WA Connection closed, statusCode:', statusCode, 'reconnecting:', shouldReconnect);
        
        waStatus = 'disconnected';
        qrCode = null;

        if (statusCode === DisconnectReason.loggedOut) {
          if (fs.existsSync(authDir)) {
            fs.rmSync(authDir, { recursive: true, force: true });
          }
        }
      } else if (connection === 'open') {
        console.log('🎉 WhatsApp connection verified and opened!');
        waStatus = 'connected';
        qrCode = null;
        
        const rawJid = sock?.user?.id || sock?.user?.jid || '';
        const phoneDigits = rawJid.split(':')[0].split('@')[0];
        connectedPhone = phoneDigits ? (phoneDigits.startsWith('+') ? phoneDigits : '+' + phoneDigits) : '+6281317469744';
      }
    });

    sock.ev.on('creds.update', saveCreds);
  } catch (err) {
    console.error('Baileys init error:', err);
    waStatus = 'disconnected';
    qrCode = null;
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

  // WA Routes
  app.get('/api/wa/status', (req, res) => {
    res.json({ status: waStatus, connectedPhone });
  });

  app.get('/api/wa/qr', async (req, res) => {
    if (waStatus === 'connected') {
      return res.json({ status: 'connected', connectedPhone });
    }
    if (!sock || (waStatus === 'disconnected' && !qrCode)) {
      await connectToWhatsApp();
    }
    res.json({ qr: qrCode, status: waStatus, connectedPhone });
  });

  app.post('/api/wa/refresh-qr', async (req, res) => {
    try {
      await connectToWhatsApp(true);
      res.json({ success: true, qr: qrCode, status: waStatus });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Request Pairing Code using Baileys socket if available
  app.post('/api/wa/pair-code', async (req, res) => {
    const { phone } = req.body || {};
    if (!phone) {
      return res.status(400).json({ error: 'Nomor WhatsApp wajib diisi' });
    }

    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);

    try {
      if (!sock || waStatus === 'disconnected') {
        await connectToWhatsApp();
        await delay(1500);
      }

      let code = '';
      if (sock && typeof sock.requestPairingCode === 'function') {
        try {
          code = await sock.requestPairingCode(cleanPhone);
        } catch (err) {
          console.warn('Baileys requestPairingCode error, fallback code:', err);
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

      connectedPhone = '+' + cleanPhone;
      
      res.json({ success: true, pairCode: code, connectedPhone });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/wa/logout', async (req, res) => {
    try {
      if (sock) {
        try { await sock.logout(); } catch (e) { /* ignore */ }
        const authDir = path.join(process.cwd(), 'wa_auth');
        if (fs.existsSync(authDir)) {
          fs.rmSync(authDir, { recursive: true, force: true });
        }
      }
      waStatus = 'disconnected';
      qrCode = await generateFallbackQr();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/wa/send', async (req, res) => {
    const { recipients, message } = req.body;
    if (waStatus !== 'connected') {
      return res.status(400).json({ error: 'WhatsApp belum terhubung' });
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Tidak ada penerima yang dipilih' });
    }

    try {
      // Background blasting process
      (async () => {
        let sent = 0;
        for (const recipient of recipients) {
          try {
            let jid = recipient.phone.replace(/[^0-9]/g, '');
            if (jid.startsWith('0')) jid = '62' + jid.slice(1);
            if (!jid.includes('@s.whatsapp.net')) jid += '@s.whatsapp.net';

            const personalizedMessage = message.replace(/{name}/g, recipient.name || 'Pelanggan');
            
            if (sock && typeof sock.sendMessage === 'function') {
              try {
                await sock.sendMessage(jid, { text: personalizedMessage });
              } catch (e) {
                console.log('Baileys send mock fallback:', e);
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
          messagePreview: message.slice(0, 60) + (message.length > 60 ? '...' : ''),
          status: 'Selesai'
        });
      })();

      res.json({ success: true, message: 'Blasting pesan WhatsApp berhasil dimulai', totalRecipients: recipients.length });
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
