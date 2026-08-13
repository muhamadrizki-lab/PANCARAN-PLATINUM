import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Sliders, 
  Save, 
  RotateCcw, 
  Image as ImageIcon, 
  CheckSquare, 
  Square, 
  ShieldCheck, 
  AlertCircle, 
  Phone, 
  Link as LinkIcon,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  ToggleLeft,
  ToggleRight,
  Layers,
  Upload,
  Calendar
} from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { PopupItem, PopupConfig, DEFAULT_POPUP_CONFIG, EMPTY_POPUP_CONFIG } from '../types';
import { getSystemSettings, saveSystemSettings } from '../firebase';

interface AdminPopupSettingsProps {
  popupConfig: PopupConfig;
  onSaveConfig: (newConfig: PopupConfig) => void;
  onShowNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  onPreviewPopup: (popupToPreview: PopupItem) => void;
}

interface PresetImage {
  label: string;
  url: string;
  surveyDate?: string;
  surveyTime?: string;
  surveyLocation?: string;
  biddingDate?: string;
  biddingTime?: string;
  additionalNote?: string;
}

const sampleImages: PresetImage[] = [
  { 
    label: 'Poster Lelang & Survei', 
    url: 'https://lh3.googleusercontent.com/d/17N7xTwx4PcaqLK3NN6nq04x0yATldWaU',
    surveyDate: '18 - 22 Agustus 2026',
    surveyTime: '09.00 - 16.00 WIB',
    surveyLocation: 'Pool & Gudang Logistik Pancaran Utama',
    biddingDate: '25 Agustus 2026',
    biddingTime: '10.00 WIB s/d Selesai',
    additionalNote: 'Penting: Peserta wajib hadir tepat waktu untuk survey fisik dan membawa KTP asli serta bukti transfer deposit.'
  },
  { label: 'Poster Lelang Truck', url: 'https://lh3.googleusercontent.com/d/19rthCmJjo1yZlT94ce5xY_mcwGnyaqjN' },
  { label: 'Gudang & Truck Banner (3D)', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Gudang Logistik', url: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1200&q=80' }
];

const BLANK_POPUP_FORM: Omit<PopupItem, 'id' | 'createdAt'> = {
  title: '',
  subtitle: '',
  layoutType: 'simple',
  imageUrl: '',
  mainDescription: '',
  depositHighlight: '',
  descriptionSuffix: '',
  securityTitle: '',
  securityDescription: '',
  cancellationTitle: '',
  cancellationDescription: '',
  closingSlogan: '',
  additionalNote: '',
  ctaButtonText: 'Hubungi Panitia',
  ctaButtonUrl: 'https://wa.me/6281317469744',
  showBeforeLogin: true,
  showAfterLogin: true,
  isActive: true,
};

export default function AdminPopupSettings({
  popupConfig,
  onSaveConfig,
  onShowNotification,
  onPreviewPopup,
}: AdminPopupSettingsProps) {
  const { t } = useLanguage();
  const popups = popupConfig?.popups || [];

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<PopupItem, 'id' | 'createdAt'>>(BLANK_POPUP_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenCreateForm = () => {
    setFormData(BLANK_POPUP_FORM);
    setEditingId(null);
    setIsCreating(true);
  };

  const handleOpenEditForm = (item: PopupItem) => {
    setFormData({
      title: item.title || '',
      subtitle: item.subtitle || '',
      layoutType: item.layoutType || (item.depositHighlight || item.securityTitle || item.cancellationTitle ? 'detailed' : 'simple'),
      imageUrl: item.imageUrl || '',
      mainDescription: item.mainDescription || '',
      depositHighlight: item.depositHighlight || '',
      descriptionSuffix: item.descriptionSuffix || '',
      securityTitle: item.securityTitle || '',
      securityDescription: item.securityDescription || '',
      cancellationTitle: item.cancellationTitle || '',
      cancellationDescription: item.cancellationDescription || '',
      closingSlogan: item.closingSlogan || '',
      ctaButtonText: item.ctaButtonText || 'Hubungi Panitia',
      ctaButtonUrl: item.ctaButtonUrl || 'https://wa.me/6281317469744',
      showBeforeLogin: item.showBeforeLogin ?? true,
      showAfterLogin: item.showAfterLogin ?? true,
      isActive: item.isActive ?? true,
    });
    setEditingId(item.id);
    setIsCreating(true);
  };

  const handleCloseForm = () => {
    setIsCreating(false);
    setEditingId(null);
  };

  const handleChange = (field: keyof Omit<PopupItem, 'id' | 'createdAt'>, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSavePopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      onShowNotification(t('Judul Pop-up wajib diisi!'), 'error');
      return;
    }

    setIsSaving(true);
    try {
      let updatedPopups: PopupItem[];

      if (editingId) {
        // Edit existing
        updatedPopups = popups.map((p) =>
          p.id === editingId
            ? {
                ...p,
                ...formData,
                closingSlogan: formData.closingSlogan || 'Mari bergabung dan dapatkan unit impian Anda di ajang eksklusif Pancaran Platinum!',
                ctaButtonText: formData.ctaButtonText || 'Hubungi Panitia untuk Akses Bidding',
                ctaButtonUrl: formData.ctaButtonUrl || 'https://wa.me/6281317469744?text=Halo%20Panitia%20Lelang%20Pancaran%20Platinum,%20saya%20ingin%20mengkonfirmasi%20deposit%20jaminan%20Rp10.000.000%20untuk%20akses%20bidding%20lelang.',
              }
            : p
        );
      } else {
        // Create new
        const newPopupItem: PopupItem = {
          id: 'popup_' + Date.now(),
          ...formData,
          closingSlogan: formData.closingSlogan || 'Mari bergabung dan dapatkan unit impian Anda di ajang eksklusif Pancaran Platinum!',
          ctaButtonText: formData.ctaButtonText || 'Hubungi Panitia untuk Akses Bidding',
          ctaButtonUrl: formData.ctaButtonUrl || 'https://wa.me/6281317469744?text=Halo%20Panitia%20Lelang%20Pancaran%20Platinum,%20saya%20ingin%20mengkonfirmasi%20deposit%20jaminan%20Rp10.000.000%20untuk%20akses%20bidding%20lelang.',
          createdAt: new Date().toISOString(),
        };
        updatedPopups = [newPopupItem, ...popups];
      }

      const newConfig: PopupConfig = { popups: updatedPopups };

      // Save locally & to Firestore
      onSaveConfig(newConfig);

      const existingSettings = await getSystemSettings();
      await saveSystemSettings({
        ...existingSettings,
        popupConfig: newConfig,
      });

      onShowNotification(
        editingId ? t('Pop-up berhasil diperbarui!') : t('Pop-up baru berhasil dibuat!'),
        'success'
      );
      handleCloseForm();
    } catch (error) {
      console.error('Error saving popup:', error);
      onShowNotification(t('Gagal menyimpan ke database cloud, perubahan disimpan secara lokal.'), 'info');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    const updated = popups.map((p) =>
      p.id === id ? { ...p, isActive: !p.isActive } : p
    );
    const newConfig = { popups: updated };
    onSaveConfig(newConfig);

    try {
      const existingSettings = await getSystemSettings();
      await saveSystemSettings({
        ...existingSettings,
        popupConfig: newConfig,
      });
      onShowNotification(t('Status keaktifan pop-up berhasil diubah.'), 'success');
    } catch (e) {}
  };

  const handleDeletePopup = async (id: string) => {
    if (!window.confirm(t('Apakah Anda yakin ingin menghapus pop-up ini?'))) return;

    const updated = popups.filter((p) => p.id !== id);
    const newConfig = { popups: updated };
    onSaveConfig(newConfig);

    try {
      const existingSettings = await getSystemSettings();
      await saveSystemSettings({
        ...existingSettings,
        popupConfig: newConfig,
      });
      onShowNotification(t('Pop-up berhasil dihapus!'), 'info');
    } catch (e) {}
  };

  const handleResetDefaultPopups = async () => {
    if (window.confirm(t('Kembalikan ke Pop-up Deposit Bawaan?'))) {
      onSaveConfig(DEFAULT_POPUP_CONFIG);
      try {
        const existingSettings = await getSystemSettings();
        await saveSystemSettings({
          ...existingSettings,
          popupConfig: DEFAULT_POPUP_CONFIG,
        });
        onShowNotification(t('Berhasil mengembalikan Pop-up Deposit Bawaan!'), 'success');
      } catch (e) {
        onShowNotification(t('Gagal menyimpan ke server, disimpan secara lokal.'), 'info');
      }
    }
  };

  const sampleImages = [
    {
      label: 'Poster Lelang Truck',
      url: 'https://lh3.googleusercontent.com/d/19rthCmJjo1yZlT94ce5xY_mcwGnyaqjN',
    },
    {
      label: 'Gudang & Truck Banner (3D)',
      url: 'https://lh3.googleusercontent.com/d/1QsGItLvspUKwE2au0ayEtT86r1sR-FX4',
    },
    {
      label: 'Gudang Logistik',
      url: 'https://lh3.googleusercontent.com/d/1mhiKxfRXG4nzn8A5TRCDVd4WUZCiZ388',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in" id="admin-popup-settings-container">
      {/* Title Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-blue-900/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-widest bg-blue-500/20 text-blue-300 font-extrabold px-3 py-1 rounded-full border border-blue-500/30 inline-block">
              {t('Manajemen Modal Pop-up')}
            </span>
            <span className="text-[9px] uppercase tracking-widest bg-slate-800 text-slate-300 font-bold px-2.5 py-0.5 rounded-full border border-slate-700">
              Total: {popups.length}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-blue-400 shrink-0" />
            <span>{t('Kelola Pop-up Modal')}</span>
          </h1>
          <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
            {t('Buat dan atur pop-up modal pengumuman secara manual untuk ditampilkan sebelum atau setelah pengguna login.')}
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5 shrink-0">
          {!isCreating && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDefaultPopups}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-700 transition flex items-center gap-2 cursor-pointer"
                title={t('Kembalikan ke Pop-up Deposit Bawaan')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('Reset Pop-up Deposit')}</span>
              </button>
              <button
                type="button"
                onClick={handleOpenCreateForm}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('Buat Pop-up Baru')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1: Form Create/Edit Pop-up */}
      {isCreating ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleCloseForm}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  {editingId ? t('Edit Pop-up Modal') : t('Buat Pop-up Modal Baru')}
                </h2>
                <p className="text-xs text-slate-500">
                  {t('Isi formulir di bawah ini untuk mengonfigurasi isi dan syarat pop-up')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCloseForm}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold px-3 py-1.5 rounded-lg border border-slate-200"
            >
              {t('Batal')}
            </button>
          </div>

          <form onSubmit={handleSavePopup} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form inputs */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Card 1: Activation Settings */}
              <div className="p-5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-4">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <span>{t('Kapan Pop-up Ditampilkan?')}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Tampil Sebelum Login */}
                  <label
                    onClick={() => handleChange('showBeforeLogin', !formData.showBeforeLogin)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                      formData.showBeforeLogin
                        ? 'bg-blue-50/80 border-blue-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="mt-0.5 text-blue-600 shrink-0">
                      {formData.showBeforeLogin ? (
                        <CheckSquare className="w-4 h-4 fill-blue-600 text-white" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-bold text-xs text-slate-900 block">
                        {t('Tampilkan Sebelum Login')}
                      </span>
                      <span className="text-[11px] text-slate-500 block leading-tight">
                        {t('Untuk pengunjung publik / tamu')}
                      </span>
                    </div>
                  </label>

                  {/* Tampil Setelah Login */}
                  <label
                    onClick={() => handleChange('showAfterLogin', !formData.showAfterLogin)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                      formData.showAfterLogin
                        ? 'bg-blue-50/80 border-blue-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="mt-0.5 text-blue-600 shrink-0">
                      {formData.showAfterLogin ? (
                        <CheckSquare className="w-4 h-4 fill-blue-600 text-white" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-bold text-xs text-slate-900 block">
                        {t('Tampilkan Setelah Login')}
                      </span>
                      <span className="text-[11px] text-slate-500 block leading-tight">
                        {t('Untuk pengguna / admin terdaftar')}
                      </span>
                    </div>
                  </label>
                </div>

                {/* Status Aktif */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{t('Status Keaktifan Pop-up')}</span>
                  <button
                    type="button"
                    onClick={() => handleChange('isActive', !formData.isActive)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 ${
                      formData.isActive
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-200 text-slate-600 border border-slate-300'
                    }`}
                  >
                    {formData.isActive ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{t('AKTIF')}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-slate-400" />
                        <span>{t('NON-AKTIF')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Form Controls */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    {t('Judul Pop-up')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl font-extrabold text-slate-900 text-xs sm:text-sm"
                    placeholder={t('Ketikkan judul pop-up di sini...')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    {t('Subjudul / Keterangan Tambahan')}
                  </label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => handleChange('subtitle', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl text-slate-700 text-xs sm:text-sm"
                    placeholder={t('Contoh: Informasi Resmi Deposit & Akses Penawaran')}
                  />
                </div>

                {/* Layout Type Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    {t('Pilih Format Tampilan Pop-up')}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleChange('layoutType', 'simple')}
                      className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                        formData.layoutType === 'simple' || !formData.layoutType
                          ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className={`w-4 h-4 ${formData.layoutType === 'simple' || !formData.layoutType ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className="font-extrabold text-xs text-slate-900">{t('Format Sederhana / Pengumuman')}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {t('Teks deskripsi paragraf bebas (Enter / Shift + Ctrl), banner gambar, & tombol WhatsApp. Form simpel tanpa kotak jaminan.')}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChange('layoutType', 'detailed')}
                      className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                        formData.layoutType === 'detailed'
                          ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className={`w-4 h-4 ${formData.layoutType === 'detailed' ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className="font-extrabold text-xs text-slate-900">{t('Format Detail Syarat Deposit')}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {t('Lengkap dengan teks sorotan deposit, kotak informasi jaminan (hijau), & kotak pembatalan (merah).')}
                      </p>
                    </button>
                  </div>
                </div>

                {/* Banner Image / Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider flex items-center justify-between">
                    <span>{t('Gambar Poster / Banner Pop-up')}</span>
                    {formData.imageUrl && (
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {t('Gambar terpasang')}
                      </span>
                    )}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => handleChange('imageUrl', e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl font-mono text-slate-800 text-xs"
                      placeholder={t('https://... atau klik Upload Gambar')}
                    />
                    <label className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2 shrink-0 transition-all shadow-xs active:scale-95">
                      <Upload className="w-4 h-4" />
                      <span>{t('Upload Gambar')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              alert(t('Ukuran file terlalu besar. Maksimal 5MB.'));
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (reader.result) {
                                handleChange('imageUrl', reader.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] text-slate-400 font-medium">{t('Atau pilih preset:')}</span>
                    {sampleImages.map((img: PresetImage, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (img.surveyDate) {
                            setFormData(prev => ({
                              ...prev,
                              imageUrl: img.url,
                              surveyDate: img.surveyDate,
                              surveyTime: img.surveyTime,
                              surveyLocation: img.surveyLocation,
                              biddingDate: img.biddingDate,
                              biddingTime: img.biddingTime,
                              additionalNote: img.additionalNote || ''
                            }));
                          } else {
                            handleChange('imageUrl', img.url);
                          }
                        }}
                        className="text-[10px] px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-slate-700 border border-slate-200 font-medium transition-all"
                      >
                        {img.label}
                      </button>
                    ))}
                  </div>
                </div>



                {/* BIDANG KHUSUS FORMAT DETAIL */}
                {formData.layoutType === 'detailed' && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                        {t('Teks Sorotan (Cetak Tebal)')}
                      </label>
                      <input
                        type="text"
                        value={formData.depositHighlight}
                        onChange={(e) => handleChange('depositHighlight', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-blue-50 border border-blue-200 font-extrabold text-blue-900 rounded-xl text-xs sm:text-sm"
                        placeholder={t('Contoh: deposit jaminan sebesar Rp10.000.000,-...')}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                        {t('Kelanjutan Teks Deskripsi (Setelah Sorotan)')}
                      </label>
                      <input
                        type="text"
                        value={formData.descriptionSuffix}
                        onChange={(e) => handleChange('descriptionSuffix', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl text-slate-800 text-xs sm:text-sm"
                        placeholder={t('Contoh: sebagai syarat aktif untuk melakukan penawaran (Bidding)...')}
                      />
                    </div>

                    {/* Kotak Informasi Tambahan Hijau & Merah */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Hijau */}
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                        <span className="font-extrabold text-emerald-900 text-xs flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          {t('Kotak Informasi Jaminan (Hijau)')}
                        </span>
                        <input
                          type="text"
                          value={formData.securityTitle}
                          onChange={(e) => handleChange('securityTitle', e.target.value)}
                          placeholder={t('Judul Kotak Jaminan')}
                          className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900"
                        />
                        <textarea
                          rows={2}
                          value={formData.securityDescription}
                          onChange={(e) => handleChange('securityDescription', e.target.value)}
                          placeholder={t('Isi Keterangan Jaminan')}
                          className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs text-emerald-950"
                        />
                      </div>

                      {/* Merah */}
                      <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                        <span className="font-extrabold text-rose-900 text-xs flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          {t('Kotak Informasi Pembatalan (Merah)')}
                        </span>
                        <input
                          type="text"
                          value={formData.cancellationTitle}
                          onChange={(e) => handleChange('cancellationTitle', e.target.value)}
                          placeholder={t('Judul Kotak Pembatalan')}
                          className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs font-bold text-rose-900"
                        />
                        <textarea
                          rows={2}
                          value={formData.cancellationDescription}
                          onChange={(e) => handleChange('cancellationDescription', e.target.value)}
                          placeholder={t('Isi Keterangan Pembatalan')}
                          className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs text-rose-950"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* BIDANG KHUSUS JADWAL SURVEY & LELANG */}
                {(!formData.layoutType || formData.layoutType === 'simple') && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      {t('Form Pengisian Detail Jadwal Survey & Lelang')}
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Survey Fisik Unit */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                          📅 {t('Jadwal Survey Fisik Unit')}
                        </span>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">{t('Tanggal Survey')}</label>
                          <input
                            type="text"
                            value={formData.surveyDate || ''}
                            onChange={(e) => handleChange('surveyDate', e.target.value)}
                            placeholder={t('Contoh: 18 - 22 Agustus 2026')}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">{t('Pukul Survey')}</label>
                          <input
                            type="text"
                            value={formData.surveyTime || ''}
                            onChange={(e) => handleChange('surveyTime', e.target.value)}
                            placeholder={t('Contoh: 09.00 - 16.00 WIB')}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">{t('Lokasi Survey')}</label>
                          <input
                            type="text"
                            value={formData.surveyLocation || ''}
                            onChange={(e) => handleChange('surveyLocation', e.target.value)}
                            placeholder={t('Contoh: Pool & Gudang Logistik Pancaran Utama')}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                          />
                        </div>
                      </div>

                      {/* Jadwal Mulai Lelang */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                          🚀 {t('Jadwal Mulai Lelang (Bidding)')}
                        </span>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">{t('Tanggal Lelang')}</label>
                          <input
                            type="text"
                            value={formData.biddingDate || ''}
                            onChange={(e) => handleChange('biddingDate', e.target.value)}
                            placeholder={t('Contoh: 25 Agustus 2026')}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">{t('Pukul Lelang')}</label>
                          <input
                            type="text"
                            value={formData.biddingTime || ''}
                            onChange={(e) => handleChange('biddingTime', e.target.value)}
                            placeholder={t('Contoh: 10.00 WIB s/d Selesai')}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                          />
                        </div>
                      </div>

                      {/* Note tambahan */}
                      <div className="col-span-1 sm:col-span-2 p-4 bg-amber-50/40 border border-amber-200 rounded-2xl space-y-2">
                        <span className="font-extrabold text-amber-900 text-xs flex items-center gap-1.5">
                          📝 {t('Note tambahan')}
                        </span>
                        <textarea
                          rows={2}
                          value={formData.additionalNote || ''}
                          onChange={(e) => handleChange('additionalNote', e.target.value)}
                          placeholder={t('Contoh: Peserta wajib hadir tepat waktu untuk survey fisik dan membawa KTP asli.')}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-1 focus:ring-amber-300 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}


              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  {t('Batal')}
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <span>{t('Menyimpan...')}</span>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{t('Simpan Pop-up')}</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Live Preview Column */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sticky top-24 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span>{t('Pratinjau Pop-up')}</span>
                </h4>

                <div className="border border-slate-200 bg-white rounded-2xl p-4 shadow-sm space-y-3">
                  <h5 className="font-extrabold text-slate-900 text-sm">
                    {formData.title || t('(Judul Pop-up)')}
                  </h5>
                  {formData.subtitle && (
                    <p className="text-[11px] text-slate-500">{formData.subtitle}</p>
                  )}

                  {formData.imageUrl && (
                    <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-100 border">
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Structured Schedule Display in Admin Preview */}
                  {(formData.surveyDate || formData.biddingDate) ? (
                    <div className="space-y-3 my-2 text-xs">
                      {formData.biddingDate && (
                        <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                          <h4 className="font-extrabold text-purple-900 text-xs flex items-center gap-1.5">
                            🚀 JADWAL MULAI LELANG (BIDDING):
                          </h4>
                          <div className="space-y-0.5 text-[11px] text-purple-950 font-medium pl-5">
                            <p>• <span className="font-bold">Tanggal:</span> {formData.biddingDate}</p>
                            {formData.biddingTime && <p>• <span className="font-bold">Pukul:</span> {formData.biddingTime}</p>}
                          </div>
                        </div>
                      )}

                      {formData.surveyDate && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                          <h4 className="font-extrabold text-blue-900 text-xs flex items-center gap-1.5">
                            📅 JADWAL SURVEY FISIK UNIT:
                          </h4>
                          <div className="space-y-0.5 text-[11px] text-blue-950 font-medium pl-5">
                            <p>• <span className="font-bold">Tanggal:</span> {formData.surveyDate}</p>
                            {formData.surveyTime && <p>• <span className="font-bold">Pukul:</span> {formData.surveyTime}</p>}
                            {formData.surveyLocation && <p>• <span className="font-bold">Lokasi:</span> {formData.surveyLocation}</p>}
                          </div>
                        </div>
                      )}

                      {formData.additionalNote && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                          <h4 className="font-extrabold text-amber-950 text-xs flex items-center gap-1.5">
                            📝 NOTE TAMBAHAN:
                          </h4>
                          <p className="text-[11px] text-amber-900 font-medium pl-5">
                            {formData.additionalNote}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                      {formData.mainDescription}{' '}
                      {formData.depositHighlight && (
                        <span className="font-extrabold text-blue-900 bg-blue-50 px-1 py-0.5 rounded">
                          {formData.depositHighlight}
                        </span>
                      )}
                      {formData.descriptionSuffix && ` ${formData.descriptionSuffix}`}
                    </p>
                  )}

                  {formData.securityTitle && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-0.5">
                      <span className="text-[11px] font-extrabold text-emerald-900 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        {formData.securityTitle}
                      </span>
                      <p className="text-[11px] text-emerald-950">{formData.securityDescription}</p>
                    </div>
                  )}

                  {formData.cancellationTitle && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl space-y-0.5">
                      <span className="text-[11px] font-extrabold text-rose-900 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        {formData.cancellationTitle}
                      </span>
                      <p className="text-[11px] text-rose-950">{formData.cancellationDescription}</p>
                    </div>
                  )}

                  {formData.closingSlogan && (
                    <p className="text-xs italic text-blue-950 text-center font-semibold">{formData.closingSlogan}</p>
                  )}

                  <div className="pt-2">
                    <a
                      href={formData.ctaButtonUrl || "https://wa.me/6281317469744"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{formData.ctaButtonText || t('Hubungi Panitia')}</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* VIEW 2: List Pop-ups or Empty State */
        <div className="space-y-6">
          {popups.length === 0 ? (
            /* Empty State Card when entering the menu initially */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center space-y-4 max-w-2xl mx-auto my-8">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <Layers className="w-8 h-8" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <h2 className="text-lg font-extrabold text-slate-900">
                  {t('Belum Ada Pop-up Modal')}
                </h2>
                <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
                  {t('Data pop-up modal masih kosong. Klik tombol di bawah untuk membuat modal pop-up baru pertama Anda.')}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenCreateForm}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('Buat Pop-up Modal Baru')}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Pop-ups List Table / Grid */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900 text-sm">{t('Daftar Pop-up Modal Terdaftar')}</h2>
                  <p className="text-xs text-slate-500">{t('Kelola, edit, atau aktifkan/nonaktifkan pop-up modal')}</p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateForm}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('Tambah Pop-up')}</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {popups.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                  >
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                            item.isActive
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {item.isActive ? t('● AKTIF') : t('○ NON-AKTIF')}
                        </span>

                        {item.showBeforeLogin && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                            {t('Sebelum Login')}
                          </span>
                        )}

                        {item.showAfterLogin && (
                          <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-full border border-purple-200">
                            {t('Setelah Login')}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-extrabold text-slate-900">{item.title}</h3>
                      {item.subtitle && <p className="text-xs text-slate-500">{item.subtitle}</p>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onPreviewPopup(item)}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl transition cursor-pointer"
                        title={t('Pratinjau Pop-up')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(item.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer ${
                          item.isActive
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {item.isActive ? t('Aktif') : t('Matikan')}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditForm(item)}
                        className="p-2 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                        title={t('Edit Pop-up')}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeletePopup(item.id)}
                        className="p-2 hover:bg-rose-50 text-rose-600 rounded-xl transition cursor-pointer"
                        title={t('Hapus Pop-up')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
