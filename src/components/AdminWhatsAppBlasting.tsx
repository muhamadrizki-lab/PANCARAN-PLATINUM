import React, { useState, useEffect } from 'react';
import { Phone, QrCode, MessageSquare, Plus, RefreshCw } from 'lucide-react';
import { subscribeToWaSession, subscribeToWaTemplates } from '../wa_firestore';
import { WaTemplateData } from '../types';

export default function AdminWhatsAppBlasting() {
  const [waStatus, setWaStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [templates, setTemplates] = useState<WaTemplateData[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'barcode' | 'template' | 'blast'>('barcode');

  const fetchQr = async () => {
    try {
      const response = await fetch('/api/wa/qr');
      const data = await response.json();
      if (data.qr) {
        setQrCode(data.qr);
        setWaStatus('connecting');
      } else if (data.status === 'connected') {
        setWaStatus('connected');
        setQrCode(null);
      }
    } catch (error) {
      console.error('Error fetching QR:', error);
    }
  };

  useEffect(() => {
    const unsubSession = subscribeToWaSession('admin@pancaran-logistic.id', (session) => {
      setWaStatus(session?.status || 'disconnected');
      if (session?.status === 'connected') {
        setQrCode(null);
      }
    });
    const unsubTemplates = subscribeToWaTemplates((tpls) => {
      setTemplates(tpls);
    });

    // Poll for QR code if disconnected or connecting
    const qrInterval = setInterval(() => {
      if (waStatus !== 'connected') {
        fetchQr();
      }
    }, 5000);

    fetchQr();

    return () => {
      unsubSession();
      unsubTemplates();
      clearInterval(qrInterval);
    };
  }, [waStatus]);

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
        <Phone className="text-emerald-500" />
        WhatsApp Blasting
      </h2>

      <div className="flex gap-4 mb-8 border-b border-slate-200 pb-2">
        {(['barcode', 'template', 'blast'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`px-4 py-2 font-semibold capitalize ${activeSubTab === tab ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-slate-500'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeSubTab === 'barcode' && (
        <div className="text-center py-10">
          {waStatus === 'connected' ? (
            <div className="text-emerald-600 font-bold text-xl">WhatsApp Terhubung</div>
          ) : qrCode ? (
            <div>
              <img src={qrCode} alt="WhatsApp QR Code" className="mx-auto mb-4 border p-2" />
              <p className="text-slate-500">Scan QR Code dengan WhatsApp Anda</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <QrCode className="w-20 h-20 text-slate-300 mb-4" />
              <h3 className="text-xl font-bold mb-2">Membuat Barcode WhatsApp Web...</h3>
              <p className="text-slate-500">Status: {waStatus}</p>
              <button onClick={fetchQr} className="mt-4 flex items-center gap-2 text-emerald-600">
                <RefreshCw className="w-4 h-4" /> Refresh Barcode
              </button>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'template' && (
        <div>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg mb-4">
            <Plus className="w-4 h-4" /> Tambah Template
          </button>
          <div className="grid gap-4">
            {templates.map(t => (
              <div key={t.id} className="p-4 border rounded-xl">{t.name} - {t.category}</div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'blast' && (
        <div className="space-y-4">
          <textarea className="w-full p-4 border rounded-xl" rows={6} placeholder="Tulis pesan blasting..." />
          <button className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold w-full">
            <MessageSquare className="w-4 h-4 inline mr-2" /> Kirim Blasting
          </button>
        </div>
      )}
    </div>
  );
}
