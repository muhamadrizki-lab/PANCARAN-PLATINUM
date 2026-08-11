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
  Layout
} from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface AdminWhatsAppBlastingProps {
  registeredUsers: RegisteredUser[];
  assets: Asset[];
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
}

export default function AdminWhatsAppBlasting({ registeredUsers, assets }: AdminWhatsAppBlastingProps) {
  const { t } = useLanguage();
  const [waStatus, setWaStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
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
  const [activeTab, setActiveTab] = useState<'connect' | 'blast' | 'templates'>('blast');

  // Fetch WA Status
  const checkStatus = async () => {
    try {
      const res = await fetch('/api/wa/status');
      const data = await res.json();
      setWaStatus(data.status);
      if (data.status === 'disconnected') {
        fetchQr();
      }
    } catch (e) {
      console.error('Failed to check WA status', e);
    }
  };

  const fetchQr = async () => {
    try {
      setWaStatus('connecting');
      const res = await fetch('/api/wa/qr');
      const data = await res.json();
      if (data.qr) {
        setQrCode(data.qr);
      }
    } catch (e) {
      console.error('Failed to fetch QR', e);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

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
          message: messageContent 
        })
      });
      
      const data = await res.json();
      if (data.success) {
        alert('Blasting WA berhasil dimulai!');
      } else {
        alert('Gagal memulai blasting: ' + data.error);
      }
    } catch (e) {
      console.error('Failed to start blast', e);
    } finally {
      setIsBlasting(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('Putus koneksi WhatsApp?')) return;
    try {
      await fetch('/api/wa/logout', { method: 'POST' });
      checkStatus();
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header section with Status */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-500" />
            WhatsApp Marketing Hub
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Kelola promosi dan broadcast pesan WhatsApp ke seluruh pelanggan Pancaran Lelang.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
            waStatus === 'connected' 
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
              : waStatus === 'connecting'
              ? 'bg-amber-50 text-amber-600 border-amber-100'
              : 'bg-slate-50 text-slate-500 border-slate-100'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              waStatus === 'connected' ? 'bg-emerald-500' : waStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
            }`} />
            {waStatus === 'connected' ? 'Terhubung' : waStatus === 'connecting' ? 'Menghubungkan...' : 'Terputus'}
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
          onClick={() => setActiveTab('blast')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'blast' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Send className="w-4 h-4" />
          Blasting
        </button>
        <button 
          onClick={() => setActiveTab('connect')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'connect' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <QrCode className="w-4 h-4" />
          Koneksi
        </button>
        <button 
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'templates' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layout className="w-4 h-4" />
          Template
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Interface */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'blast' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-bold text-slate-700 block">Pesan Blast</label>
                  <button 
                    onClick={generateDraft}
                    disabled={isGeneratingDraft}
                    className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3" />
                    {isGeneratingDraft ? 'Generating...' : 'Auto-Draft Promo'}
                  </button>
                </div>
                <textarea 
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Tulis pesan promosi Anda di sini... Gunakan {name} untuk menyapa penerima."
                  className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm outline-none resize-none"
                />
                <div className="flex flex-wrap gap-2">
                  {['{name}', '{asset_name}', '{brand}', '{price}'].map(tag => (
                    <button 
                      key={tag}
                      onClick={() => setMessageContent(prev => prev + ' ' + tag)}
                      className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-200"
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
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-95'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  {isBlasting ? 'Sedang Blasting...' : 'Mulai Blast WA'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'connect' && (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
              {waStatus === 'connected' ? (
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">WhatsApp Terhubung</h3>
                    <p className="text-slate-500 text-sm mt-1">Anda sudah siap untuk melakukan blasting pesan.</p>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="px-6 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-bold text-sm hover:bg-rose-100 transition-all"
                  >
                    Putus Koneksi
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Hubungkan WhatsApp</h3>
                    <p className="text-slate-500 text-sm mt-1">Scan kode QR di bawah menggunakan aplikasi WhatsApp Anda.</p>
                  </div>
                  
                  <div className="relative p-4 bg-white border-4 border-slate-100 rounded-3xl inline-block shadow-inner">
                    {qrCode ? (
                      <img src={qrCode} alt="WA QR" className="w-64 h-64" />
                    ) : (
                      <div className="w-64 h-64 bg-slate-50 flex items-center justify-center rounded-2xl">
                        <RefreshCw className="w-10 h-10 text-slate-300 animate-spin" />
                      </div>
                    )}
                    {waStatus === 'connecting' && !qrCode && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                        <div className="text-center">
                          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                          <p className="text-[10px] font-bold text-slate-600 mt-2">Menyiapkan Sesi...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs text-slate-400 max-w-xs">
                      Pastikan perangkat Anda terhubung ke internet. Sesi akan otomatis tersambung setelah scan berhasil.
                    </p>
                    <button 
                      onClick={fetchQr}
                      className="text-xs font-bold text-blue-600 flex items-center gap-1.5 hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" /> Refresh QR
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Draft & Template</h3>
                <button className="text-xs font-bold bg-slate-900 text-white px-4 py-2 rounded-xl flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" /> Tambah Template
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map(tpl => (
                  <div key={tpl.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-emerald-600">{tpl.name}</span>
                      <button className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {tpl.content}
                    </p>
                    <button 
                      onClick={() => setMessageContent(tpl.content)}
                      className="mt-3 text-[10px] font-bold text-blue-600 flex items-center gap-1"
                    >
                      Gunakan Template <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
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
                <div className="min-w-0">
                  <p className={`text-xs font-bold truncate ${
                    selectedUsers.includes(user.email) ? 'text-emerald-700' : 'text-slate-800'
                  }`}>
                    {user.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">{user.phone}</p>
                </div>
                {selectedUsers.includes(user.email) && (
                  <div className="ml-auto">
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
