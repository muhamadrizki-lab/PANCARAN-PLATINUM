import React, { useState, useRef } from 'react';
import { AdminUser, RegisteredUser, BiddingRequest, RefundRequest } from '../types';
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
  Clock,
  FileText,
  Upload,
  X,
  Eye
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
  
  // Bidding Access Requests
  biddingRequests?: BiddingRequest[];
  onApproveBiddingRequest?: (id: string) => void;
  onRejectBiddingRequest?: (id: string) => void;
  onDeleteBiddingRequest?: (id: string) => void;

  // Refund Requests
  refundRequests?: RefundRequest[];
  onApproveRefundRequest?: (id: string) => void;
  onRejectRefundRequest?: (id: string) => void;
  onDeleteRefundRequest?: (id: string) => void;
  onCreateRefundRequest?: (
    email: string, 
    amount: string, 
    bankName: string, 
    accountNumber: string, 
    accountHolder: string, 
    purpose: string,
    proofUrl?: string,
    registerEntryName?: string
  ) => Promise<void>;
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
  onToggleBiddingAccess,
  biddingRequests = [],
  onApproveBiddingRequest,
  onRejectBiddingRequest,
  onDeleteBiddingRequest,
  refundRequests = [],
  onApproveRefundRequest,
  onRejectRefundRequest,
  onDeleteRefundRequest,
  onCreateRefundRequest
}: AdminUsersProps) {
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'internal' | 'external' | 'bidding_requests'>('internal');
  
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
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [deleteBiddingReqId, setDeleteBiddingReqId] = useState<string | null>(null);
  const [deleteRefundReqId, setDeleteRefundReqId] = useState<string | null>(null);

  // Admin Create Refund Form States
  const [isCreateRefundOpen, setIsCreateRefundOpen] = useState(false);
  const [newRefundEmail, setNewRefundEmail] = useState('');
  const [newRefundAmount, setNewRefundAmount] = useState('');
  const [newRefundBankName, setNewRefundBankName] = useState('BCA');
  const [newRefundAccountNumber, setNewRefundAccountNumber] = useState('');
  const [newRefundAccountHolder, setNewRefundAccountHolder] = useState('');
  const [newRefundRegisterEntryName, setNewRefundRegisterEntryName] = useState('');
  const [newRefundPurpose, setNewRefundPurpose] = useState('Refund Jaminan Bidding');
  const [createRefundError, setCreateRefundError] = useState('');
  const [createRefundSuccess, setCreateRefundSuccess] = useState('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

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

  const handleCreateRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateRefundError('');
    setCreateRefundSuccess('');

    if (!newRefundEmail || !newRefundAmount || !newRefundBankName || !newRefundAccountNumber || !newRefundAccountHolder || !newRefundRegisterEntryName) {
      setCreateRefundError(t('Mohon lengkapi semua field formulir refund, termasuk nama register entry.'));
      return;
    }

    if (isNaN(Number(newRefundAmount)) || Number(newRefundAmount) <= 0) {
      setCreateRefundError(t('Jumlah refund harus berupa angka valid lebih dari 0.'));
      return;
    }

    setIsSubmittingRefund(true);
    try {
      if (onCreateRefundRequest) {
        await onCreateRefundRequest(
          newRefundEmail,
          newRefundAmount,
          newRefundBankName,
          newRefundAccountNumber,
          newRefundAccountHolder,
          newRefundPurpose,
          '',
          newRefundRegisterEntryName
        );
        setCreateRefundSuccess(t('Refund jaminan berhasil dibuat! Akses bidding konsumen otomatis dinonaktifkan.'));
        
        // Reset form fields
        setNewRefundEmail('');
        setNewRefundAmount('');
        setNewRefundAccountNumber('');
        setNewRefundAccountHolder('');
        setNewRefundRegisterEntryName('');
        setNewRefundPurpose('Refund Jaminan Bidding');

        setTimeout(() => {
          setIsCreateRefundOpen(false);
          setCreateRefundSuccess('');
        }, 3000);
      }
    } catch (err: any) {
      console.error("Failed creating refund request from admin", err);
      setCreateRefundError(err.message || t('Gagal memproses refund.'));
    } finally {
      setIsSubmittingRefund(false);
    }
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
          <button
            onClick={() => setActiveTab('bidding_requests')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
              activeTab === 'bidding_requests'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Lock className="w-4 h-4" />
            {t('Pending Akses Bidding')}
            {biddingRequests.filter(req => req.status === 'Pending').length > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-pulse">
                {biddingRequests.filter(req => req.status === 'Pending').length}
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

      {/* TAB 3: BIDDING ACCESS REQUESTS */}
      {activeTab === 'bidding_requests' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">{t('Permohonan Akses Bidding')}</h2>
              <p className="text-xs text-slate-500 mt-1">{t('Persetujuan atau penolakan bukti pembayaran dari pemohon akses bidding.')}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Pemohon')}</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Pilihan Akses')}</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Tanggal Pengajuan')}</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Bukti Transfer')}</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Status')}</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">{t('Aksi')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {biddingRequests.length > 0 ? (
                  [...biddingRequests]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((req) => {
                      return (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Pemohon info */}
                          <td className="py-4 px-6">
                            <div className="space-y-1">
                              <p className="font-extrabold text-slate-800">{req.userName}</p>
                              <p className="text-[10px] text-slate-400">{req.email}</p>
                            </div>
                          </td>

                          {/* Pilihan Akses */}
                          <td className="py-4 px-6">
                            <div className="space-y-1">
                              <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-bold text-[10px]">
                                {req.requestType}
                              </span>
                              {req.notes && (
                                <p className="text-[10px] text-slate-500 bg-slate-50 p-2 border border-slate-100 rounded-lg mt-1 whitespace-pre-wrap max-w-xs font-medium">
                                  <span className="font-bold text-slate-700 block text-[9px] uppercase tracking-wider mb-0.5">{t('Catatan Detail:')}</span>
                                  {req.notes}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Tanggal Pengajuan */}
                          <td className="py-4 px-6 text-slate-500">
                            {new Date(req.createdAt).toLocaleString('id-ID')}
                          </td>

                          {/* Bukti Transfer File Icon */}
                          <td className="py-4 px-6">
                            {req.proofUrl ? (
                              <button
                                type="button"
                                onClick={() => setSelectedReceiptUrl(req.proofUrl || null)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg border border-slate-200 transition cursor-pointer"
                                title={t('Klik untuk melihat bukti transfer')}
                              >
                                <FileText className="w-4.5 h-4.5 text-slate-500" />
                                <span className="text-[10px] font-extrabold text-slate-600">{t('Lihat Bukti')}</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 font-medium italic">-</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                              req.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : req.status === 'Rejected'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                  : 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                            }`}>
                              {req.status === 'Approved' && <Check className="w-3 h-3" />}
                              {req.status === 'Rejected' && <X className="w-3 h-3" />}
                              {req.status === 'Pending' && <Clock className="w-3 h-3" />}
                              {req.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {req.status === 'Pending' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onApproveBiddingRequest?.(req.id)}
                                    className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-100 hover:border-emerald-600 transition cursor-pointer"
                                    title={t('Setujui Akses Bidding')}
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onRejectBiddingRequest?.(req.id)}
                                    className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg border border-rose-100 hover:border-rose-600 transition cursor-pointer"
                                    title={t('Tolak Akses Bidding')}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              {deleteBiddingReqId === req.id ? (
                                <div className="flex items-center gap-1.5 bg-rose-50 p-1 rounded-xl border border-rose-200">
                                  <span className="text-[10px] font-bold text-rose-700 px-1">{t('Hapus?')}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteBiddingRequest?.(req.id);
                                      setDeleteBiddingReqId(null);
                                    }}
                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition"
                                  >
                                    {t('Ya')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteBiddingReqId(null)}
                                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-lg transition"
                                  >
                                    {t('Batal')}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteBiddingReqId(req.id)}
                                  className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 transition cursor-pointer"
                                  title={t('Hapus Permohonan')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 text-xs font-semibold">
                      {t('Belum ada permohonan akses bidding.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Permohonan Refund Deposit & Transaksi */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm mt-6">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">{t('Permohonan Refund Deposit & Transaksi')}</h2>
              <p className="text-xs text-slate-500 mt-1">{t('Daftar riwayat pengajuan refund jaminan pencabutan akses bidding konsumen.')}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateRefundOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 transition cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('Buat Form Refund (Super Admin)')}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Pemohon')}</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Detail Refund & Rekening')}</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Keperluan / Catatan')}</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Tanggal Pengajuan')}</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Status')}</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">{t('Aksi')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {refundRequests.length > 0 ? (
                  [...refundRequests]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((req) => {
                      return (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Pemohon */}
                          <td className="py-4 px-6">
                            <div className="space-y-1">
                              <p className="font-extrabold text-slate-800">{req.userName}</p>
                              <p className="text-[10px] text-slate-400">{req.email}</p>
                            </div>
                          </td>

                          {/* Detail Refund & Rekening */}
                          <td className="py-4 px-6">
                            <div className="space-y-1">
                              <p className="font-extrabold text-blue-700 text-xs">
                                Rp {Number(req.amount || 0).toLocaleString('id-ID')}
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {req.bankName} - {req.accountNumber} a.n {req.accountHolder}
                              </p>
                            </div>
                          </td>

                          {/* Keperluan */}
                          <td className="py-4 px-6">
                            <p className="text-[11px] text-slate-600 max-w-xs">{req.purpose || '-'}</p>
                          </td>

                          {/* Tanggal Pengajuan */}
                          <td className="py-4 px-6 text-slate-500">
                            {new Date(req.createdAt).toLocaleString('id-ID')}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                              req.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : req.status === 'Rejected'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                  : 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                            }`}>
                              {req.status === 'Approved' && <Check className="w-3 h-3" />}
                              {req.status === 'Rejected' && <X className="w-3 h-3" />}
                              {req.status === 'Pending' && <Clock className="w-3 h-3" />}
                              {req.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {req.status === 'Pending' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onApproveRefundRequest?.(req.id)}
                                    className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-100 hover:border-emerald-600 transition cursor-pointer"
                                    title={t('Setujui Refund')}
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onRejectRefundRequest?.(req.id)}
                                    className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg border border-rose-100 hover:border-rose-600 transition cursor-pointer"
                                    title={t('Tolak Refund')}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              {deleteRefundReqId === req.id ? (
                                <div className="flex items-center gap-1.5 bg-rose-50 p-1 rounded-xl border border-rose-200">
                                  <span className="text-[10px] font-bold text-rose-700 px-1">{t('Hapus?')}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteRefundRequest?.(req.id);
                                      setDeleteRefundReqId(null);
                                    }}
                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition"
                                  >
                                    {t('Ya')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteRefundReqId(null)}
                                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-lg transition"
                                  >
                                    {t('Batal')}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteRefundReqId(req.id)}
                                  className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 transition cursor-pointer"
                                  title={t('Hapus Permohonan')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 text-xs font-semibold">
                      {t('Belum ada permohonan refund deposit.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* Inline Proof of Transfer Modal */}
      {isCreateRefundOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm overflow-y-auto flex items-start justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100 p-6 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-800">{t('Refund Adjustment Super Admin')}</h3>
                <p className="text-xs text-slate-500">{t('Super Admin Dashboard - Proses refund jaminan bidding konsumen lelang.')}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateRefundOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRefundSubmit} className="flex-1 overflow-y-auto pr-1.5 space-y-4 mt-4 min-h-0">
              {createRefundError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{createRefundError}</span>
                </div>
              )}

              {createRefundSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-semibold flex items-start gap-2">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{createRefundSuccess}</span>
                </div>
              )}

              {/* Select Registered User */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('Pilih Konsumen / User')}</label>
                <select
                  value={newRefundEmail}
                  onChange={(e) => {
                    const email = e.target.value;
                    setNewRefundEmail(email);
                    // Pre-fill account holder with user name if available
                    const u = registeredUsers.find(item => item.email === email);
                    if (u) {
                      setNewRefundAccountHolder(u.name);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                >
                  <option value="" disabled>{t('-- Pilih User Eksternal --')}</option>
                  {registeredUsers
                    .filter(u => u.status === 'Disetujui')
                    .map(u => (
                      <option key={u.email} value={u.email}>
                        {u.name} ({u.email}) - {u.canBid !== false ? t('Akses Bidding Aktif') : t('Hanya Lihat')}
                      </option>
                    ))}
                </select>
              </div>

              {/* Nama Register Entry */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('Nama Register Entry')}</label>
                <input
                  type="text"
                  placeholder={t('Nama super admin pencatat refund')}
                  value={newRefundRegisterEntryName}
                  onChange={(e) => setNewRefundRegisterEntryName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              {/* Refund Amount */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('Jumlah Refund (Rp)')}</label>
                <input
                  type="number"
                  placeholder="Contoh: 5000000"
                  value={newRefundAmount}
                  onChange={(e) => setNewRefundAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                  min="1"
                />
              </div>

              {/* Purpose */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('Keperluan / Keterangan')}</label>
                <input
                  type="text"
                  placeholder="Contoh: Refund Deposit Jaminan Bidding"
                  value={newRefundPurpose}
                  onChange={(e) => setNewRefundPurpose(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Bank Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('Bank Tujuan')}</label>
                  <select
                    value={newRefundBankName}
                    onChange={(e) => setNewRefundBankName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  >
                    <option value="BCA">BCA</option>
                    <option value="Mandiri">Mandiri</option>
                    <option value="BNI">BNI</option>
                    <option value="BRI">BRI</option>
                    <option value="BSI">BSI</option>
                    <option value="Permata">Permata</option>
                  </select>
                </div>

                {/* Account Number */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('No. Rekening')}</label>
                  <input
                    type="text"
                    placeholder="Contoh: 812739123"
                    value={newRefundAccountNumber}
                    onChange={(e) => setNewRefundAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Account Holder Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('Nama Pemilik Rekening')}</label>
                <input
                  type="text"
                  placeholder="Sesuai nama di buku tabungan"
                  value={newRefundAccountHolder}
                  onChange={(e) => setNewRefundAccountHolder(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-500 leading-normal font-medium flex items-start gap-1.5">
                <AlertCircle className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{t('Memproses refund akan otomatis mencabut hak akses penawaran (bidding) konsumen ini di dashboard lelang.')}</span>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateRefundOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {t('Batal')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRefund}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 transition cursor-pointer flex items-center gap-1"
                >
                  {isSubmittingRefund && <Clock className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t('Proses Refund & Blokir Akses')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedReceiptUrl && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm overflow-y-auto flex items-start justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col my-auto animate-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                {t('Bukti Pembayaran / Transfer')}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedReceiptUrl(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 bg-slate-50 flex items-center justify-center max-h-[70vh] overflow-y-auto">
              <img
                src={selectedReceiptUrl}
                alt="Receipt Full Size"
                className="max-w-full max-h-[60vh] object-contain rounded-2xl border border-slate-200 bg-white shadow-inner"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-4 border-t border-slate-100 bg-white text-right">
              <button
                type="button"
                onClick={() => setSelectedReceiptUrl(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {t('Tutup')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
