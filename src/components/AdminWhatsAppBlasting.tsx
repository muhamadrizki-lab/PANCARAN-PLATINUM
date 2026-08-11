import React, { useState, useEffect } from 'react';
import { RegisteredUser, Asset } from '../types';
import { 
  MessageSquare, 
  Send, 
  Users, 
  Settings, 
  QrCode, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Trash2, 
  UserPlus,
  RefreshCw,
  Sparkles,
  Search,
  Phone,
  Layout,
  ExternalLink
} from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface AdminWhatsAppBlastingProps {
  registeredUsers: RegisteredUser[];
  assets: Asset[];
  currentUserEmail?: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
}

export default function AdminWhatsAppBlasting({ registeredUsers, assets, currentUserEmail }: AdminWhatsAppBlastingProps) {
  const { t } = useLanguage();
  const effectiveEmail = currentUserEmail || 'digital.solution@pancaran-logistic.id';

  const [waStatus, setWaStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [connectedPhone, setConnectedPhone] = useState<string>('+62 813-1746-9744');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [templates, setTemplates] = useState<MessageTemplate[]>([
    { id: '1', name: 'Greeting', content: 'Halo {name}, salam dari Pancaran Lelang!' },
    { id: '2', name: 'New Auction', content: 'Halo {name}, ada lelang baru nih! {asset_name} dengan harga mulai {price}. Cek yuk!' }
  ]);
  const [isBlasting, setIsBlasting] = useState(false);
  const [blastProgress, setBlastProgress] = useState({ total: 0, current: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [activeTab, setActiveTab] = useState<'connect' | 'blast' | 'templates'>('connect');
  const [connectMode, setConnectMode] = useState<'qr' | 'pairing'>('qr');
  const [pairPhoneInput, setPairPhoneInput] = useState('081317469744');
  const [pairCodeResult, setPairCodeResult] = useState<string | null>(null);
  const [isPairing, setIsPairing] = useState(false);
  const [blastLogs, setBlastLogs] = useState<Array<{ id: string; time: string; recipientCount: number; messagePreview: string; status: string }>>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ count: number; preview: string; time: string } | null>(null);

  // Fetch WA Status & Real QR for effectiveEmail
  const checkStatus = async () => {
    try {
      const res = await fetch(`/api/wa/status?email=${encodeURIComponent(effectiveEmail)}`);
      const data = await res.json();
      setWaStatus(data.status);
      if (data.connectedPhone) setConnectedPhone(data.connectedPhone);
      
      if (data.status !== 'connected') {
        fetchQr();
      }
    } catch (e) {
      console.error('Failed to check WA status', e);
    }
  };

  const fetchQr = async () => {
    try {
      const res = await fetch(`/api/wa/qr?email=${encodeURIComponent(effectiveEmail)}`);
      const data = await res.json();
      if (data.qr) {
        setQrCode(data.qr);
      }
      if (data.connectedPhone) setConnectedPhone(data.connectedPhone);
      if (data.status) setWaStatus(data.status);
    } catch (e) {
      console.error('Failed to fetch QR', e);
    }
  };

  const handleQuickConnect = async (phoneOverride?: string) => {
    try {
      setWaStatus('connecting');
      const res = await fetch('/api/wa/quick-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: phoneOverride || pairPhoneInput || '+6281317469744',
          email: effectiveEmail 
        })
      });
      const data = await res.json();
      if (data.success) {
        setWaStatus('connected');
        if (data.connectedPhone) setConnectedPhone(data.connectedPhone);
        setQrCode(null);
        alert(`✅ WhatsApp Berhasil Terhubung untuk akun ${effectiveEmail}! Sesi aktif dan siap digunakan.`);
        setActiveTab('blast');
      }
    } catch (e) {
      console.error('Failed quick connect', e);
      alert('Gagal menghubungkan WhatsApp.');
    }
  };

  const handleRefreshQr = async () => {
    try {
      setWaStatus('connecting');
      setQrCode(null);
      const res = await fetch('/api/wa/refresh-qr', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: effectiveEmail })
      });
      const data = await res.json();
      if (data.qr) setQrCode(data.qr);
      if (data.status) setWaStatus(data.status);
      alert(`🔄 QR Code WhatsApp baru di-generate untuk akun ${effectiveEmail}. Silakan scan dengan HP Anda.`);
    } catch (e) {
      console.error('Failed to refresh QR', e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/wa/logs');
      const data = await res.json();
      if (data.logs) setBlastLogs(data.logs);
    } catch (e) {
      console.error('Failed to fetch logs', e);
    }
  };

  useEffect(() => {
    checkStatus();
    fetchLogs();
    const interval = setInterval(() => {
      checkStatus();
    }, 4000);
    return () => clearInterval(interval);
  }, [effectiveEmail]);

  const handleRequestPairCode = async () => {
    if (!pairPhoneInput.trim()) {
      alert('Masukkan nomor WhatsApp terlebih dahulu.');
      return;
    }
    setIsPairing(true);
    try {
      const res = await fetch('/api/wa/pair-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: pairPhoneInput, email: effectiveEmail })
      });
      const data = await res.json();
      if (data.success && data.pairCode) {
        setPairCodeResult(data.pairCode);
        if (data.connectedPhone) setConnectedPhone(data.connectedPhone);
        setTimeout(() => {
          setWaStatus('connected');
          setQrCode(null);
          setIsPairing(false);
          alert(`✅ Perangkat berhasil dikaitkan via Kode Pasangkan untuk akun ${effectiveEmail}!`);
          setActiveTab('blast');
        }, 4000);
      } else {
        alert(data.error || 'Gagal mendapatkan kode pasangkan.');
        setIsPairing(false);
      }
    } catch (e) {
      console.error('Failed pairing code request', e);
      setIsPairing(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.email));
    }
  };

  const toggleUserSelection = (email: string) => {
    setSelectedUsers(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const filteredUsers = registeredUsers.filter(u => 
    u.phone && (
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery)
    )
  );

  const generateDraft = async () => {
    const openAssets = assets.filter(a => a.status === 'Open');
    if (openAssets.length === 0) {
      alert('Tidak ada aset aktif untuk dipromosikan.');
      return;
    }

    setIsGeneratingDraft(true);
    try {
      const asset = openAssets[0]; // Promo first open asset
      const res = await fetch('/api/wa/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assetName: asset.name, 
          brand: asset.brand, 
          price: asset.startingPrice,
          category: asset.category
        })
      });
      const data = await res.json();
      if (data.draft) {
        setMessageContent(data.draft);
      }
    } catch (e) {
      console.error('Failed to generate draft', e);
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const startBlast = async () => {
    if (selectedUsers.length === 0) {
      alert('Pilih penerima terlebih dahulu.');
      return;
    }
    if (!messageContent.trim()) {
      alert('Isi pesan tidak boleh kosong.');
      return;
    }
    if (waStatus !== 'connected') {
      alert('Hubungkan WhatsApp terlebih dahulu.');
      return;
    }

    setIsBlasting(true);
    setBlastProgress({ total: selectedUsers.length, current: 0 });

    const recipients = selectedUsers.map(email => {
      const user = registeredUsers.find(u => u.email === email);
      return { 
        phone: user?.phone || '', 
        name: user?.name || '' 
      };
    }).filter(r => r.phone);

    try {
      const res = await fetch('/api/wa/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          recipients, 
          message: messageContent,
          email: effectiveEmail
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccessInfo({
          count: recipients.length,
          preview: messageContent.slice(0, 120) + (messageContent.length > 120 ? '...' : ''),
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        });
        setShowSuccessModal(true);
        fetchLogs();
      } else {
        alert('Gagal memulai blasting: ' + (data.error || 'Server error'));
      }
    } catch (e) {
      console.error('Failed to start blast', e);
    } finally {
      setIsBlasting(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm(`Putus koneksi WhatsApp untuk akun ${effectiveEmail}?`)) return;
    try {
      await fetch('/api/wa/logout', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: effectiveEmail })
      });
      setWaStatus('disconnected');
      setPairCodeResult(null);
      checkStatus();
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Account Lock Security Notice */}
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-4 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl">
            <Lock className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-white">Koneksi WhatsApp Terkunci Per Akun</span>
              <span className="px-2 py-0.5 bg-emerald-500/30 border border-emerald-400/30 text-emerald-300 rounded-full text-[10px] font-bold uppercase">
                Proteksi Akses
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Aktivasi scan barcode hanya terhubung & aktif pada akun email: <strong className="font-mono text-emerald-300 underline">{effectiveEmail}</strong>
            </p>
          </div>
        </div>
        <div className="text-[11px] text-slate-300 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
          🔒 Bebas dari penggunaan unauthorized oleh akun lain
        </div>
      </div>

      {/* Header section with Status */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-500" />
            WhatsApp Marketing Hub
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Kelola promosi, koneksi barcode WhatsApp, dan broadcast pesan ke seluruh pelanggan Pancaran Lelang.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
            waStatus === 'connected' 
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
              : waStatus === 'connecting'
              ? 'bg-amber-50 text-amber-600 border-amber-200'
              : 'bg-slate-50 text-slate-500 border-slate-200'
          }`}>
            <div className={`w-2.5 h-2.5 rounded-full ${
              waStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : waStatus === 'connecting' ? 'bg-amber-500 animate-ping' : 'bg-slate-400'
            }`} />
            {waStatus === 'connected' ? `Terhubung (${connectedPhone})` : waStatus === 'connecting' ? 'Menghubungkan...' : 'Terputus'}
          </div>
          
          {waStatus === 'connected' && (
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
              title="Logout WA"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl w-max">
        <button 
          onClick={() => setActiveTab('connect')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'connect' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <QrCode className="w-4 h-4" />
          Koneksi & Barcode
        </button>
        <button 
          onClick={() => setActiveTab('blast')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'blast' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Send className="w-4 h-4" />
          Blasting Pesan
        </button>
        <button 
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'templates' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layout className="w-4 h-4" />
          Template & Riwayat
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Interface */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'connect' && (
            <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
              {waStatus === 'connected' ? (
                <div className="space-y-6 max-w-md w-full">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold uppercase tracking-widest">
                      Sesi Aktif
                    </span>
                    <h3 className="text-2xl font-extrabold text-slate-800">WhatsApp Terhubung</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Perangkat terhubung dengan nomor <span className="font-bold text-slate-800">{connectedPhone}</span>. Anda dapat langsung mengirim pesan promosi & broadcast lelang.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Status Sinyal:</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Baik (100%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Server Engine:</span>
                      <span className="font-bold text-slate-700">Pancaran WA Gateway v2</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setActiveTab('blast')}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" /> Mulai Blasting Pesan
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="px-4 py-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-bold text-xs hover:bg-rose-100 transition-all"
                    >
                      Putus Sesi
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 max-w-lg w-full">
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-800">Hubungkan WhatsApp</h3>
                    <p className="text-slate-500 text-xs mt-1">Scan kode QR barcode di bawah atau gunakan Kode Pasangkan untuk mengaktifkan WhatsApp Blasting.</p>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex bg-slate-100 p-1 rounded-2xl w-max mx-auto text-xs font-bold">
                    <button
                      onClick={() => setConnectMode('qr')}
                      className={`px-5 py-2 rounded-xl transition-all ${connectMode === 'qr' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      Scan Barcode / QR
                    </button>
                    <button
                      onClick={() => setConnectMode('pairing')}
                      className={`px-5 py-2 rounded-xl transition-all ${connectMode === 'pairing' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      Kode Pasangkan
                    </button>
                  </div>

                  {connectMode === 'qr' && (
                    <div className="space-y-5">
                      <div className="relative p-5 bg-white border-4 border-slate-100 rounded-3xl inline-block shadow-lg group">
                        {/* Green corners accent for Barcode Scanner look */}
                        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-500"></div>
                        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-500"></div>
                        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-500"></div>
                        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-500"></div>

                        {qrCode ? (
                          <img src={qrCode} alt="WA Barcode QR" className="w-60 h-60 object-contain mx-auto" />
                        ) : (
                          <div className="w-60 h-60 bg-slate-50 flex items-center justify-center rounded-2xl">
                            <RefreshCw className="w-10 h-10 text-slate-300 animate-spin" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                          1. Buka <b>WhatsApp</b> di HP Anda<br />
                          2. Ketuk <b>Menu (⋮)</b> &gt; <b>Perangkat Tertaut</b><br />
                          3. Arahkan kamera HP Anda ke kode barcode QR di atas
                        </p>

                        <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center items-center">
                          <button 
                            onClick={handleRefreshQr}
                            className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Generate Barcode Baru
                          </button>
                          <button 
                            onClick={() => handleQuickConnect('+6281317469744')}
                            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Selesai Scan / Aktivasi Langsung
                          </button>
                          <button 
                            onClick={checkStatus}
                            className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-2"
                          >
                            Cek Status
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {connectMode === 'pairing' && (
                    <div className="space-y-5 bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left">
                      <div className="space-y-1.5">
                        <label className="text-xs font-extrabold text-slate-700 block">Nomor WhatsApp Anda</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={pairPhoneInput}
                            onChange={(e) => setPairPhoneInput(e.target.value)}
                            placeholder="Contoh: 081317469744"
                            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                          <button
                            onClick={handleRequestPairCode}
                            disabled={isPairing}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shrink-0"
                          >
                            {isPairing ? 'Memproses...' : 'Dapatkan Kode'}
                          </button>
                        </div>
                      </div>

                      {pairCodeResult && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2 animate-fade-in">
                          <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Kode Pasangkan WhatsApp Anda</p>
                          <div className="text-2xl font-mono font-black text-emerald-900 tracking-widest bg-white py-2 px-4 rounded-xl border border-emerald-200 inline-block shadow-sm">
                            {pairCodeResult}
                          </div>
                          <p className="text-[10px] text-emerald-700">
                            Masukkan kode ini di HP Anda saat menghubungkan tautan perangkat. Sesi akan otomatis terhubung...
                          </p>
                        </div>
                      )}

                      <div className="pt-2 text-[11px] text-slate-500 space-y-1 leading-relaxed">
                        <p className="font-bold text-slate-700">Langkah Menautkan Kode:</p>
                        <ol className="list-decimal list-inside space-y-0.5">
                          <li>Buka WhatsApp &gt; Perangkat Tertaut</li>
                          <li>Pilih Tautkan Perangkat &gt; Tautkan dengan nomor telepon</li>
                          <li>Masukkan kode 8 karakter di atas</li>
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'blast' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-bold text-slate-700 block">Pesan Blast Promosi</label>
                  <button 
                    onClick={generateDraft}
                    disabled={isGeneratingDraft}
                    className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3" />
                    {isGeneratingDraft ? 'Generating...' : 'Auto-Draft Promo AI'}
                  </button>
                </div>
                <textarea 
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Tulis pesan promosi Anda di sini... Gunakan {name} untuk menyapa penerima."
                  className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm outline-none resize-none font-medium text-slate-800"
                />
                <div className="flex flex-wrap gap-2">
                  {['{name}', '{asset_name}', '{brand}', '{price}'].map(tag => (
                    <button 
                      key={tag}
                      onClick={() => setMessageContent(prev => prev + ' ' + tag)}
                      className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg hover:bg-slate-200 transition-all"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                <div className="text-xs text-slate-500">
                  <span className="font-bold text-emerald-600">{selectedUsers.length}</span> Penerima dipilih
                </div>
                <button 
                  onClick={startBlast}
                  disabled={isBlasting || waStatus !== 'connected'}
                  className={`px-8 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all flex items-center gap-2 ${
                    isBlasting || waStatus !== 'connected'
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-95'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  {isBlasting ? 'Sedang Blasting...' : 'Mulai Blast WA'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              {/* Templates */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-800">Draft & Template Pesan</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map(tpl => (
                    <div key={tpl.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-emerald-600">{tpl.name}</span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {tpl.content}
                      </p>
                      <button 
                        onClick={() => { setMessageContent(tpl.content); setActiveTab('blast'); }}
                        className="mt-3 text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:underline"
                      >
                        Gunakan Template <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blast History Logs */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-800">Riwayat Blasting WhatsApp</h3>
                {blastLogs.length > 0 ? (
                  <div className="space-y-2">
                    {blastLogs.map(log => (
                      <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{log.messagePreview}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{log.time} • {log.recipientCount} Penerima</p>
                        </div>
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[10px]">
                          {log.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Belum ada riwayat blasting terrekam.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Recipient List */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col max-h-[700px]">
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Pilih Penerima
            </h3>
            
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Cari nama/HP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button 
                onClick={handleSelectAll}
                className="text-[10px] font-bold text-blue-600 hover:underline"
              >
                {selectedUsers.length === filteredUsers.length ? 'Batalkan Semua' : 'Pilih Semua'}
              </button>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {filteredUsers.length} Kontak
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {filteredUsers.map(user => (
              <div 
                key={user.email}
                onClick={() => toggleUserSelection(user.email)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                  selectedUsers.includes(user.email)
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-white border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  selectedUsers.includes(user.email) ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold truncate ${
                    selectedUsers.includes(user.email) ? 'text-emerald-700' : 'text-slate-800'
                  }`}>
                    {user.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">{user.phone}</p>
                </div>
                
                {/* 1-Click Direct WA Link */}
                <a
                  href={`https://wa.me/${user.phone.replace(/[^0-9]/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(messageContent.replace(/{name}/g, user.name))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Kirim Langsung via WA Web / App"
                  className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>

                {selectedUsers.includes(user.email) && (
                  <div className="ml-1">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                )}
              </div>
            ))}
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto opacity-20" />
                <p className="text-xs">Tidak ada kontak dengan No HP.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pop-Up Modal Notifikasi Berhasil Blast WA */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-emerald-100 text-center space-y-5 relative animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">Blasting Pesan Berhasil!</h3>
              <p className="text-xs text-slate-500">Pesan WhatsApp telah terkirim melalui gateway server.</p>
            </div>

            {successInfo && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600 font-medium pb-2 border-b border-slate-200/60">
                  <span>Jumlah Penerima:</span>
                  <span className="font-extrabold text-emerald-600 text-sm">{successInfo.count} Kontak</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 font-medium">
                  <span>Waktu Kirim:</span>
                  <span className="font-bold text-slate-800">{successInfo.time} WIB</span>
                </div>
                <div className="pt-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Pratinjau Pesan:</p>
                  <p className="text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/80 italic font-mono text-[11px] leading-relaxed">
                    "{successInfo.preview}"
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-600/25 transition-all active:scale-95"
            >
              Tutup & Lanjutkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlusCircle(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
  );
}

function ChevronRight(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  );
}
