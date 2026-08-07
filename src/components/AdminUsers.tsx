import React, { useState } from 'react';
import { AdminUser, RegisteredUser } from '../types';
import { useLanguage } from './LanguageContext';
import {   
  UserPlus, 
  Shield, 
  Mail, 
  Lock,
  Calendar, 
  Trash2, 
  Check, 
  AlertCircle,
  Users,
  Search,
  Phone,
  UserCheck,
  UserX,
  Clock
} from 'lucide-react';

interface AdminUsersProps {
  admins: AdminUser[];
  onAddAdmin: (newAdmin: AdminUser) => void;
  onDeleteAdmin: (email: string) => void;
  currentAdminEmail: string;
  // External registered users props
  registeredUsers?: RegisteredUser[];
  onApproveUser?: (email: string) => void;
  onRejectUser?: (email: string) => void;
  onDeleteRegisteredUser?: (email: string) => void;
  onToggleBiddingAccess?: (email: string, canBid: boolean) => void;
}

export default function AdminUsers({ 
  admins, 
  onAddAdmin, 
  onDeleteAdmin,
  currentAdminEmail,
  registeredUsers = [],
  onApproveUser,
  onRejectUser,
  onDeleteRegisteredUser,
  onToggleBiddingAccess
}: AdminUsersProps) {
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'internal' | 'external'>('internal');
  
  // Internal Admin Form States
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Admin Operasional'
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState<string | null>(null);
  const [isFormFocused, setIsFormFocused] = useState(false);

  // External Users Search State
  const [userSearch, setUserSearch] = useState('');
  const [externalDeleteConfirmEmail, setExternalDeleteConfirmEmail] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.name || !formData.email || !formData.password) {
      setErrorMsg(t('Mohon lengkapi nama, email, dan kata sandi admin.'));
      return;
    }

    if (formData.password.length < 6) {
      setErrorMsg(t('Kata sandi minimal 6 karakter.'));
      return;
    }

    // Check if email already exists
    const emailExists = admins.some(a => a.email.toLowerCase() === formData.email.toLowerCase());
    if (emailExists) {
      setErrorMsg(t('Email admin tersebut sudah terdaftar.'));
      return;
    }

    // Validate email format
    if (!formData.email.endsWith('@pancaran-logistic.id') && !formData.email.endsWith('@pancaran-group.id') && !formData.email.includes('@')) {
      setErrorMsg(t('Format email tidak valid. Direkomendasikan menggunakan email institusi Pancaran.'));
      return;
    }

    onAddAdmin({
      email: formData.email.toLowerCase(),
      name: formData.name,
      role: formData.role,
      password: formData.password,
      createdAt: new Date().toISOString().split('T')[0]
    });

    setSuccessMsg(`${t('Akses admin berhasil dibuat untuk')} ${formData.name}!`);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'Admin Operasional'
    });

    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  // Filter external users based on search
  const filteredExternalUsers = registeredUsers.filter(user => {
    const searchLower = userSearch.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.phone.toLowerCase().includes(searchLower) ||
      user.status.toLowerCase().includes(searchLower) ||
      (user.company && user.company.toLowerCase().includes(searchLower)) ||
      (user.address && user.address.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="space-y-8 animate-fade-in relative" id="admin-users-view">
      
      {/* Focus mode background dim overlay */}
      {isFormFocused && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-[2px] z-30 transition-all duration-300 cursor-pointer"
          onClick={() => {
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
            setIsFormFocused(false);
          }}
        />
      )}

      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{t('Manajemen Akses')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('Kelola otentikasi staf internal dan persetujuan registrasi akses lelang untuk pihak eksternal.')}</p>
        </div>

        {/* Tab Buttons */}
        <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center self-start md:self-center shrink-0 border border-slate-200">
          <button
            onClick={() => setActiveTab('internal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'internal'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            {t('Akses Admin Internal')}
          </button>
          <button
            onClick={() => setActiveTab('external')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
              activeTab === 'external'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            {t('Akses User Eksternal')}
            {registeredUsers.filter(u => u.status === 'Menunggu Persetujuan').length > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-pulse">
                {registeredUsers.filter(u => u.status === 'Menunggu Persetujuan').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: INTERNAL ACCESS */}
      {activeTab === 'internal' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Side: Create Access Form */}
          <div 
            className={`bg-white p-6 rounded-2xl border border-l-[6px] transition-all duration-300 space-y-6 lg:col-span-1 ${
              isFormFocused 
                ? 'relative z-40 border-blue-500 border-l-blue-600 shadow-2xl ring-2 ring-blue-500/20 scale-[1.02]' 
                : 'relative z-10 border-slate-200 border-l-slate-300 shadow-sm'
            }`} 
            id="create-access-form-container"
          >
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" /> {t('Buat Akses Baru')}
              </h2>
              <p className="text-xs text-slate-500">{t('Daftarkan akun email karyawan baru untuk memberikan akses masuk ke dashboard internal.')}</p>
            </div>

            <form 
              onSubmit={handleSubmit} 
              onFocusCapture={() => setIsFormFocused(true)}
              onBlurCapture={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setIsFormFocused(false);
                }
              }}
              className="space-y-4"
            >
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold flex items-start gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-semibold flex items-start gap-2">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Admin Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{t('Nama Lengkap Admin')}</label>
                <input
                  type="text"
                  placeholder={t('Contoh: Achmad Subagja')}
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              {/* Admin Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{t('Alamat Email Pancaran')}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    placeholder="name@pancaran-logistic.id"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400">{t('Harus berupa email institusi Pancaran.')}</p>
              </div>

              {/* Admin Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{t('Kata Sandi (Password)')}</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                    minLength={6}
                  />
                </div>
                <p className="text-[10px] text-slate-400">{t('Minimal 6 karakter.')}</p>
              </div>

              {/* Admin Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{t('Tingkatan Peran (Role)')}</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-700"
                >
                  <option value="Admin Operasional">{t('Admin Operasional (Input & Kelola Aset)')}</option>
                  <option value="Admin Keuangan">{t('Admin Keuangan (Otorisasi Unit Terjual)')}</option>
                  <option value="Super Admin">{t('Super Admin (Akses Penuh)')}</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>{t('Buat Hak Akses')}</span>
              </button>
            </form>
          </div>

          {/* Right Side: Admins List table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 border-l-[6px] border-l-slate-300 shadow-sm space-y-6 lg:col-span-2" id="admins-list-container">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" /> {t('Daftar Administrator Terdaftar')}
              </h2>
              <p className="text-xs text-slate-500">{t('Daftar staf internal Pancaran Logistics yang memegang otoritas sistem Lelang.')}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-400 font-bold uppercase">
                    <th className="py-3.5 px-4 font-bold">{t('Nama / Karyawan')}</th>
                    <th className="py-3.5 px-4 font-bold">{t('Email Akun')}</th>
                    <th className="py-3.5 px-4 font-bold">{t('Peran')}</th>
                    <th className="py-3.5 px-4 font-bold">{t('Terdaftar Pada')}</th>
                    <th className="py-3.5 px-4 text-center font-bold">{t('Aksi')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {admins.map((admin) => {
                    const isCurrent = admin.email === currentAdminEmail;
                    const isMainSuperAdmin = admin.email === 'digital.solution@pancaran-logistic.id';

                    return (
                      <tr key={admin.email} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4 font-medium text-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                              {admin.name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold">{admin.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-max mt-0.5">
                                  {t('Sedang Aktif')}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-600 text-xs">{admin.email}</td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700">
                            <Shield className="w-3.5 h-3.5" />
                            {t(admin.role)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-500 text-xs">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {admin.createdAt}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {deleteConfirmEmail === admin.email ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  onDeleteAdmin(admin.email);
                                  setDeleteConfirmEmail(null);
                                }}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold shadow-sm transition-all"
                              >
                                {t('Ya')}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmEmail(null)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold border border-slate-200 transition-all"
                              >
                                {t('Batal')}
                              </button>
                            </div>
                          ) : (
                            <button
                              disabled={isCurrent || isMainSuperAdmin}
                              onClick={() => setDeleteConfirmEmail(admin.email)}
                              className={`p-2 rounded-xl border transition-all ${
                                isCurrent || isMainSuperAdmin
                                  ? 'text-slate-300 border-slate-100 cursor-not-allowed bg-slate-50'
                                  : 'text-rose-500 border-slate-100 hover:border-rose-200 hover:bg-rose-50 active:scale-95'
                              }`}
                              title={isCurrent ? t("Anda sedang masuk dengan akun ini") : isMainSuperAdmin ? t("Akun Super Admin Utama tidak bisa dihapus") : t("Hapus Akses")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXTERNAL USER ACCESS RECAP */}
      {activeTab === 'external' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 border-l-[6px] border-l-slate-300 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" /> {t('Pendaftaran & Rekap Akses Eksternal')}
              </h2>
              <p className="text-xs text-slate-500">{t('Tinjau status verifikasi email, setujui/tolak permohonan akses katalog lelang oleh user umum.')}</p>
            </div>

            {/* Search inputs */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={t('Cari nama, email, status...')}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-400 font-bold uppercase">
                  <th className="py-3.5 px-4 font-bold">{t('Nama / No. HP')}</th>
                  <th className="py-3.5 px-4 font-bold">{t('Alamat Email')}</th>
                  <th className="py-3.5 px-4 font-bold">{t('Verifikasi Email')}</th>
                  <th className="py-3.5 px-4 font-bold">{t('Status Akses')}</th>
                  <th className="py-3.5 px-4 font-bold">{t('Akses Bidding')}</th>
                  <th className="py-3.5 px-4 font-bold">{t('Tanggal Daftar')}</th>
                  <th className="py-3.5 px-4 text-center font-bold">{t('Aksi Kelola')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredExternalUsers.length > 0 ? (
                  filteredExternalUsers.map((user) => {
                    return (
                      <tr key={user.email} className="hover:bg-slate-50/50 transition-colors">
                        
                        {/* Name & Phone & Company & Address */}
                        <td className="py-4 px-4 font-medium text-slate-800">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                              {user.name.charAt(0)}
                            </div>
                            <div className="flex flex-col max-w-[200px]">
                              <span className="font-semibold text-slate-800 leading-tight">{user.name}</span>
                              <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" /> {user.phone}
                              </span>
                              {user.company && (
                                <span className="text-[9px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-100/60 px-1.5 py-0.5 rounded w-max mt-1 uppercase tracking-wide">
                                  🏢 {user.company}
                                </span>
                              )}
                              {user.address && (
                                <span className="text-[10px] text-slate-400 font-normal mt-1 leading-normal italic" title={user.address}>
                                  📍 {user.address}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-4 px-4 font-mono text-slate-600 text-xs">{user.email}</td>

                        {/* Verification Status */}
                        <td className="py-4 px-4">
                          {user.emailVerified ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                              <Check className="w-3 h-3" /> {t('Verified')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                              <Clock className="w-3 h-3" /> {t('Pending OTP')}
                            </span>
                          )}
                        </td>

                        {/* Access Status badge */}
                        <td className="py-4 px-4">
                          {user.status === 'Disetujui' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800">
                              <UserCheck className="w-3.5 h-3.5" />
                              {t('Akses Disetujui')}
                            </span>
                          )}
                          {user.status === 'Menunggu Persetujuan' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 animate-pulse">
                              <Clock className="w-3.5 h-3.5" />
                              {t('Menunggu Approval')}
                            </span>
                          )}
                          {user.status === 'Menunggu Verifikasi' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800">
                              <Clock className="w-3.5 h-3.5" />
                              {t('Menunggu Verifikasi')}
                            </span>
                          )}
                          {user.status === 'Ditolak' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800">
                              <UserX className="w-3.5 h-3.5" />
                              {t('Akses Ditolak')}
                            </span>
                          )}
                        </td>

                        {/* Akses Bidding Toggle */}
                        <td className="py-4 px-4">
                          {user.status === 'Disetujui' ? (
                            <button
                              onClick={() => {
                                if (onToggleBiddingAccess) {
                                  const currentCanBid = user.canBid !== false;
                                  onToggleBiddingAccess(user.email, !currentCanBid);
                                }
                              }}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                user.canBid !== false
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 shadow-2xs'
                                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 hover:border-amber-300 shadow-2xs'
                              }`}
                              title={user.canBid !== false ? t('Klik untuk ubah ke Mode Hanya Lihat') : t('Klik untuk beri Akses Menawar')}
                            >
                              {user.canBid !== false ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                  <span>{t('Bisa Menawar')}</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>{t('Hanya Lihat')}</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono italic">
                              {t('Belum Aktif')}
                            </span>
                          )}
                        </td>

                        {/* Date Registered */}
                        <td className="py-4 px-4 text-slate-500 text-xs">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {user.createdAt ? user.createdAt.split('T')[0] : '-'}
                          </span>
                        </td>

                        {/* Approval / Rejection Actions */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Approve/Reject Buttons for Pending Approval */}
                            {user.status === 'Menunggu Persetujuan' && onApproveUser && onRejectUser && (
                              <>
                                <button
                                  onClick={() => onApproveUser(user.email)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-0.5 shadow-sm transition"
                                  title={t('Setujui Pendaftaran')}
                                >
                                  <Check className="w-3 h-3" /> {t('Setujui')}
                                </button>
                                <button
                                  onClick={() => onRejectUser(user.email)}
                                  className="px-2.5 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-0.5 shadow-sm transition"
                                  title={t('Tolak Pendaftaran')}
                                >
                                  <UserX className="w-3 h-3" /> {t('Tolak')}
                                </button>
                              </>
                            )}

                            {/* Approve Button for Denied user */}
                            {user.status === 'Ditolak' && onApproveUser && (
                              <button
                                onClick={() => onApproveUser(user.email)}
                                className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[10px] font-bold transition"
                                title={t('Ubah menjadi Setuju')}
                              >
                                {t('Pulihkan & Setujui')}
                              </button>
                            )}

                            {/* Reject Button for Approved user */}
                            {user.status === 'Disetujui' && onRejectUser && (
                              <button
                                onClick={() => onRejectUser(user.email)}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold transition"
                                title={t('Tangguhkan Akses')}
                              >
                                {t('Blokir Akses')}
                              </button>
                            )}

                            {/* Delete User entirely */}
                            {onDeleteRegisteredUser && (
                              <>
                                {externalDeleteConfirmEmail === user.email ? (
                                  <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 p-1.5 rounded-lg">
                                    <span className="text-[9px] font-bold text-rose-600">{t('Hapus?')}</span>
                                    <button
                                      onClick={() => {
                                        onDeleteRegisteredUser(user.email);
                                        setExternalDeleteConfirmEmail(null);
                                      }}
                                      className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[9px] font-bold"
                                    >
                                      {t('Ya')}
                                    </button>
                                    <button
                                      onClick={() => setExternalDeleteConfirmEmail(null)}
                                      className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[9px] font-semibold"
                                    >
                                      {t('Tidak')}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setExternalDeleteConfirmEmail(user.email)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-100 hover:border-rose-200 transition"
                                    title={t('Hapus Akun User Secara Permanen')}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 text-xs font-semibold">
                      {userSearch ? t('Tidak ada hasil pencarian yang cocok.') : t('Belum ada user eksternal yang mendaftar.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
