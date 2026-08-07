import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Globe, 
  HelpCircle, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Mail, 
  Lock,
  RefreshCw
} from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { getSystemSettings, saveSystemSettings, sendOtpEmailViaAppsScript } from '../firebase';

interface AdminSettingsProps {
  onShowNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function AdminSettings({ onShowNotification }: AdminSettingsProps) {
  const { t, language } = useLanguage();
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  // Fetch settings on mount
  useEffect(() => {
    let active = true;
    getSystemSettings().then(settings => {
      if (active && settings.appsScriptUrl) {
        setAppsScriptUrl(settings.appsScriptUrl);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const cleanUrl = appsScriptUrl.trim();
      
      // Basic validation
      if (cleanUrl && !cleanUrl.startsWith('https://script.google.com/')) {
        onShowNotification(t('URL tidak valid. Harus diawali dengan https://script.google.com/'), 'error');
        setIsSaving(false);
        return;
      }

      await saveSystemSettings({ appsScriptUrl: cleanUrl });
      onShowNotification(t('Setelan sistem berhasil disimpan ke database cloud!'), 'success');
    } catch (error) {
      console.error(error);
      onShowNotification(t('Gagal menyimpan setelan. Coba lagi.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appsScriptUrl) {
      onShowNotification(t('Harap simpan URL Google Apps Script terlebih dahulu sebelum menguji.'), 'error');
      return;
    }
    if (!testEmail) {
      onShowNotification(t('Harap masukkan email penerima tes.'), 'error');
      return;
    }

    setIsTesting(true);
    try {
      // Send a test OTP email
      const testCode = Math.floor(100000 + Math.random() * 900000).toString();
      const success = await sendOtpEmailViaAppsScript(
        testEmail.trim().toLowerCase(),
        testCode,
        'Penguji Pancaran',
        appsScriptUrl.trim()
      );
      
      onShowNotification(t('Aksi kirim email tes berhasil dipicu! Silakan cek kotak masuk email Anda.'), 'success');
    } catch (error) {
      console.error(error);
      onShowNotification(t('Gagal memicu pengiriman email tes.'), 'error');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in" id="admin-settings-container">
      {/* Title block */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-blue-900/30 flex flex-col justify-between">
        {/* Soft, glowing ambient lights */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>
        
        {/* Traditional Botanical Batik Wallpaper Background Accent */}
        <div className="absolute inset-0 opacity-[0.22] pointer-events-none z-0 select-none overflow-hidden mix-blend-overlay">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="batikBotanicalSettings" width="160" height="160" patternUnits="userSpaceOnUse">
                {/* Background fine dots (cecek) */}
                <circle cx="20" cy="15" r="0.7" fill="#ffffff" opacity="0.3"/>
                <circle cx="35" cy="45" r="0.7" fill="#ffffff" opacity="0.3"/>
                <circle cx="10" cy="85" r="0.7" fill="#ffffff" opacity="0.3"/>
                <circle cx="50" cy="115" r="0.7" fill="#ffffff" opacity="0.3"/>
                <circle cx="80" cy="25" r="0.7" fill="#ffffff" opacity="0.3"/>
                <circle cx="95" cy="75" r="0.7" fill="#ffffff" opacity="0.3"/>
                <circle cx="70" cy="105" r="0.7" fill="#ffffff" opacity="0.3"/>
                <circle cx="120" cy="15" r="0.7" fill="#ffffff" opacity="0.3"/>
                <circle cx="140" cy="55" r="0.7" fill="#ffffff" opacity="0.3"/>
                <circle cx="110" cy="95" r="0.7" fill="#ffffff" opacity="0.3"/>
                <circle cx="130" cy="135" r="0.7" fill="#ffffff" opacity="0.3"/>
                <circle cx="25" cy="145" r="0.7" fill="#ffffff" opacity="0.3"/>
                <circle cx="150" cy="105" r="0.7" fill="#ffffff" opacity="0.3"/>
                <circle cx="85" cy="145" r="0.7" fill="#ffffff" opacity="0.3"/>
                
                {/* Scrolling vines/tendrils (Luwaran/Semen) */}
                <path d="M -10,30 Q 30,-10 60,20 T 110,10 T 170,40" fill="none" stroke="#60a5fa" strokeWidth="1" opacity="0.5" />
                <path d="M 0,110 Q 40,80 80,120 T 160,90 T 200,120" fill="none" stroke="#60a5fa" strokeWidth="1" opacity="0.5" />
                <path d="M 30,170 Q 70,120 100,160 T 180,130" fill="none" stroke="#60a5fa" strokeWidth="1" opacity="0.5" />
                
                {/* Swirly branches (Semen vines) */}
                <path d="M 35,45 Q 20,20 0,35 Q -10,50 15,60 C 35,70 50,40 35,45 Z" fill="none" stroke="#93c5fd" strokeWidth="1.2" opacity="0.6" />
                <path d="M 115,115 Q 100,90 80,105 Q 70,120 95,130 C 115,140 130,110 115,115 Z" fill="none" stroke="#93c5fd" strokeWidth="1.2" opacity="0.6" />
                
                {/* Botanical fan leaves (Batik Sogan Golden Wing / Sawat) */}
                {/* Motif 1 (Center-Left) */}
                <g transform="translate(45, 65) scale(0.85)">
                  <path d="M 0,0 C 15,-25 40,-25 50,-10 C 40,-5 20,-10 0,0" fill="#f59e0b" opacity="0.85"/>
                  <path d="M 0,0 C 25,-15 50,-5 50,15 C 40,10 20,5 0,0" fill="#fbbf24" opacity="0.85"/>
                  <path d="M 0,0 C 25,5 45,25 35,40 C 25,30 15,15 0,0" fill="#d97706" opacity="0.85"/>
                  <path d="M 0,0 C 5,-25 -15,-35 -25,-20 C -15,-15 -5,-10 0,0" fill="#f59e0b" opacity="0.85"/>
                  <path d="M 0,0 C -15,-25 -40,-15 -40,5 C -30,0 -15,0 0,0" fill="#fbbf24" opacity="0.85"/>
                  <circle cx="0" cy="0" r="4" fill="#ef4444"/>
                  <path d="M 0,0 L 10,-10 L 20,-5" stroke="#ffffff" strokeWidth="1" fill="none"/>
                </g>

                {/* Motif 2 (Top-Right) */}
                <g transform="translate(125, 40) scale(0.6) rotate(45)">
                  <path d="M 0,0 C 15,-25 40,-25 50,-10 C 40,-5 20,-10 0,0" fill="#fbbf24" opacity="0.85"/>
                  <path d="M 0,0 C 25,-15 50,-5 50,15 C 40,10 20,5 0,0" fill="#f59e0b" opacity="0.85"/>
                  <path d="M 0,0 C 25,5 45,25 35,40 C 25,30 15,15 0,0" fill="#d97706" opacity="0.85"/>
                  <path d="M 0,0 C 5,-25 -15,-35 -25,-20 C -15,-15 -5,-10 0,0" fill="#f59e0b" opacity="0.85"/>
                  <path d="M 0,0 C -15,-25 -40,-15 -40,5 C -30,0 -15,0 0,0" fill="#fbbf24" opacity="0.85"/>
                  <circle cx="0" cy="0" r="3" fill="#f87171"/>
                </g>

                {/* Motif 3 (Bottom-Right) */}
                <g transform="translate(115, 120) scale(0.75) rotate(-30)">
                  <path d="M 0,0 C 15,-25 40,-25 50,-10 C 40,-5 20,-10 0,0" fill="#f59e0b" opacity="0.85"/>
                  <path d="M 0,0 C 25,-15 50,-5 50,15 C 40,10 20,5 0,0" fill="#fbbf24" opacity="0.85"/>
                  <path d="M 0,0 C 25,5 45,25 35,40 C 25,30 15,15 0,0" fill="#d97706" opacity="0.85"/>
                  <path d="M 0,0 C 5,-25 -15,-35 -25,-20 C -15,-15 -5,-10 0,0" fill="#fbbf24" opacity="0.85"/>
                  <path d="M 0,0 C -15,-25 -40,-15 -40,5 C -30,0 -15,0 0,0" fill="#d97706" opacity="0.85"/>
                  <circle cx="0" cy="0" r="3.5" fill="#ef4444"/>
                </g>

                {/* Red Flowers/Buds */}
                <g transform="translate(20, 100)">
                  <path d="M 0,0 Q 10,-15 0,-25 Q -10,-15 0,0" fill="#ef4444" opacity="0.9"/>
                  <path d="M 0,-5 Q 6,-15 0,-22 Q -6,-15 0,-5" fill="#f87171" opacity="0.9"/>
                  <path d="M 0,0 L 0,5" stroke="#60a5fa" strokeWidth="1.2"/>
                </g>
                <g transform="translate(85, 25) rotate(15)">
                  <path d="M 0,0 Q 10,-15 0,-25 Q -10,-15 0,0" fill="#ef4444" opacity="0.9"/>
                  <path d="M 0,-5 Q 6,-15 0,-22 Q -6,-15 0,-5" fill="#f87171" opacity="0.9"/>
                  <path d="M 0,0 L 0,5" stroke="#60a5fa" strokeWidth="1.2"/>
                </g>
                <g transform="translate(145, 90) rotate(-45)">
                  <path d="M 0,0 Q 10,-15 0,-25 Q -10,-15 0,0" fill="#ef4444" opacity="0.9"/>
                  <path d="M 0,-5 Q 6,-15 0,-22 Q -6,-15 0,-5" fill="#f87171" opacity="0.9"/>
                  <path d="M 0,0 L 0,5" stroke="#60a5fa" strokeWidth="1.2"/>
                </g>

                {/* Small blue leaves */}
                <g transform="translate(65, 115) scale(0.6)">
                  <path d="M 0,0 C 15,-15 30,-10 35,5 C 20,5 10,-5 0,0" fill="#2563eb" opacity="0.8"/>
                  <path d="M 0,0 C -15,-15 -30,-10 -35,5 C -20,5 -10,-5 0,0" fill="#3b82f6" opacity="0.8"/>
                </g>
                <g transform="translate(100, 70) scale(0.5) rotate(60)">
                  <path d="M 0,0 C 15,-15 30,-10 35,5 C 20,5 10,-5 0,0" fill="#2563eb" opacity="0.8"/>
                  <path d="M 0,0 C -15,-15 -30,-10 -35,5 C -20,5 -10,-5 0,0" fill="#3b82f6" opacity="0.8"/>
                </g>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#batikBotanicalSettings)" />
          </svg>
        </div>
        
        <div className="relative z-10 space-y-2">
          <span className="text-[9px] uppercase tracking-widest bg-blue-500/20 text-blue-300 font-extrabold px-3 py-1 rounded-full border border-blue-500/30 mb-2 inline-block">
            {t('Konfigurasi Portal')}
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent flex items-center gap-2">
            <span>⚙️</span> {t('Setelan Sistem & Integrasi')}
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-3xl">
            {t('Kelola konfigurasi integrasi cloud, atur koneksi email OTP asli, dan pantau penyelarasan data portal Pancaran Lelang.')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Settings Form Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Config Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-base">{t('Konfigurasi Webhook Email')}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{t('Hubungkan web app dengan Google Apps Script Web App')}</p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${appsScriptUrl ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {appsScriptUrl ? t('Aktif') : t('Belum Terhubung')}
              </span>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Apps Script Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  {t('URL Google Apps Script Web App')}
                </label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={appsScriptUrl}
                    onChange={(e) => setAppsScriptUrl(e.target.value)}
                    className="w-full pl-3 pr-10 py-3 bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl text-xs font-mono text-slate-800 transition-all"
                  />
                  <div className="absolute right-3.5 top-3.5 text-slate-400">
                    <Globe className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  {t('URL ini diperoleh setelah Anda menerbitkan proyek Google Apps Script di Google Drive Anda sebagai "Web App" dengan akses "Anyone".')}
                </p>
              </div>

              {/* Status Alert Box */}
              {appsScriptUrl ? (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs flex items-start gap-2.5 text-emerald-800">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">{t('Layanan Email Asli Aktif!')}</p>
                    <p className="leading-relaxed text-[11px] text-emerald-700">
                      {t('Setiap pendaftar baru sekarang akan menerima kode verifikasi OTP asli secara instan ke email mereka langsung melalui server Gmail Anda. Kode OTP disembunyikan secara aman dari antarmuka web.')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs flex items-start gap-2.5 text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">{t('Layanan Email Berjalan Dalam Mode Simulasi')}</p>
                    <p className="leading-relaxed text-[11px] text-amber-700">
                      {t('Karena URL Google Apps Script kosong, pendaftaran pengguna akan dilakukan dalam mode simulasi, di mana kode verifikasi OTP akan ditampilkan langsung pada layar web pendaftaran untuk keperluan pengujian.')}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Save */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-lg shadow-blue-600/15 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>{t('Menyimpan...')}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{t('Simpan Konfigurasi')}</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* Test Delivery Config Card */}
          {appsScriptUrl && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="w-4.5 h-4.5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">{t('Uji Coba Pengiriman OTP')}</h3>
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                {t('Gunakan formulir cepat di bawah ini untuk mengirim email verifikasi tes ke email Anda guna memastikan integrasi berjalan lancar.')}
              </p>
              
              <form onSubmit={handleTestEmail} className="flex gap-2.5 max-w-md">
                <input
                  type="email"
                  required
                  placeholder={t('Contoh: nama.anda@pancaran-logistic.id')}
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl text-xs"
                />
                <button
                  type="submit"
                  disabled={isTesting}
                  className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {isTesting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>{t('Kirim Email Tes')}</span>
                  )}
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Tutorial Sidebar Column */}
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 text-slate-800">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-sm uppercase tracking-wider">{t('Panduan Pemasangan')}</h3>
            </div>
            
            <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
              <div className="space-y-1">
                <p className="font-bold text-slate-800">1. {t('Buat Proyek Apps Script')}</p>
                <p>{t('Buka')} <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium inline-flex items-center gap-0.5 hover:underline">script.google.com <ExternalLink className="w-3 h-3" /></a> {t('lalu buat Proyek Baru.')}</p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-slate-800">2. {t('Salin Kode')}</p>
                <p>{t('Buka file')} <code className="px-1.5 py-0.5 bg-slate-200 rounded text-[10px] font-mono">google_apps_script.js</code> {t('di project ini, salin seluruh kodenya, lalu tempelkan ke editor Apps Script Anda (menggantikan semua kode default).')}</p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-slate-800">3. {t('Dapatkan Firebase Config')}</p>
                <p>{t('Koneksi spreadsheet telah otomatis dikonfigurasi. Untuk pengiriman email, pastikan Anda menggunakan akun Google yang berwenang mengirim email.')}</p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-slate-800">4. {t('Terapkan Sebagai Web App')}</p>
                <p>{t('Klik tombol "Deploy" (Terapkan) > "New deployment" di kanan atas. Pilih jenis "Web app". Ubah pengaturan:')}</p>
                <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-500">
                  <li><strong>{t('Execute as:')}</strong> {t('Me (email Anda)')}</li>
                  <li><strong>{t('Who has access:')}</strong> {t('Anyone')}</li>
                </ul>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-slate-800">5. {t('Salin URL Web App')}</p>
                <p>{t('Setelah memberikan otorisasi akses MailApp, salin "Web app URL" yang diberikan, lalu tempel di kolom sebelah kiri dan klik "Simpan Konfigurasi".')}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center gap-2 text-slate-500">
              <Lock className="w-3.5 h-3.5" />
              <span className="text-[10px] italic">{t('Koneksi aman melalui protokol HTTPS bawaan Google.')}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
