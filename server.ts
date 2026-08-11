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

const logger = pino({ level: 'error' }) as any;

async function connectToWhatsApp() {
  const authDir = path.join(process.cwd(), 'wa_auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  waStatus = 'connecting';
  sock = makeWASocket({
    version,
    printQRInTerminal: false,
    auth: state,
    logger,
    browser: ['Pancaran Lelang', 'Chrome', '1.0.0']
  });

  sock.ev.on('connection.update', async (update: any) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      qrCode = await QRCode.toDataURL(qr);
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('WA Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
      waStatus = 'disconnected';
      qrCode = null;
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('WA Connection opened');
      waStatus = 'connected';
      qrCode = null;
    }
  });

  sock.ev.on('creds.update', saveCreds);
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
    res.json({ status: waStatus });
  });

  app.get('/api/wa/qr', async (req, res) => {
    if (waStatus === 'connected') {
      return res.json({ status: 'connected' });
    }
    if (!sock || waStatus === 'disconnected') {
      await connectToWhatsApp();
    }
    res.json({ qr: qrCode, status: waStatus });
  });

  app.post('/api/wa/logout', async (req, res) => {
    try {
      if (sock) {
        await sock.logout();
        const authDir = path.join(process.cwd(), 'wa_auth');
        if (fs.existsSync(authDir)) {
          fs.rmSync(authDir, { recursive: true, force: true });
        }
      }
      waStatus = 'disconnected';
      qrCode = null;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/wa/send', async (req, res) => {
    const { recipients, message } = req.body;
    if (waStatus !== 'connected' || !sock) {
      return res.status(400).json({ error: 'WhatsApp not connected' });
    }

    try {
      // Start blasting in background
      (async () => {
        for (const recipient of recipients) {
          try {
            let jid = recipient.phone.replace(/[^0-9]/g, '');
            if (jid.startsWith('0')) jid = '62' + jid.slice(1);
            if (!jid.includes('@s.whatsapp.net')) jid += '@s.whatsapp.net';

            const personalizedMessage = message.replace(/{name}/g, recipient.name);
            await sock.sendMessage(jid, { text: personalizedMessage });
            await delay(3000 + Math.random() * 2000); // Anti-spam delay
          } catch (e) {
            console.error(`Failed to send to ${recipient.phone}:`, e);
          }
        }
      })();

      res.json({ success: true, message: 'Blasting started' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
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
