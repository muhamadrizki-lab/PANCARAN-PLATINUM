import React, { useState } from 'react';
import { 
  Shield, 
  Mail, 
  Lock, 
  X, 
  AlertCircle, 
  User, 
  Phone, 
  ArrowLeft,
  Check,
  CheckCircle,
  Building,
  MapPin
} from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { AdminUser, RegisteredUser } from '../types';
import { db, addRegisteredUser, updateRegisteredUser, getSystemSettings, sendOtpEmailViaAppsScript } from '../firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { useEffect } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (email: string) => void;
  onExternalLoginSuccess: (email: string, name: string, phone?: string) => void;
  admins: AdminUser[];
}

export default function LoginModal({ 
  isOpen, 
  onClose, 
  onLoginSuccess, 
  onExternalLoginSuccess,
  admins 
}: LoginModalProps) {
  const { language, setLanguage, t } = useLanguage();
  const [mode, setMode] = useState<'login' | 'register' | 'verification' | 'pending_approval' | 'reset_password' | 'reset_password_verify' | 'reset_password_success'>('login');
  const [systemSettings, setSystemSettings] = useState<{ appsScriptUrl?: string }>({});

  useEffect(() => {
    if (isOpen) {
      getSystemSettings().then(settings => {
        setSystemSettings(settings);
      });
    }
  }, [isOpen]);
  
  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCompany, setRegCompany] = useState('');
  const [regAddress, setRegAddress] = useState('');

  // Verification fields
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  // Reset Password fields
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [enteredResetOtp, setEnteredResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetUserType, setResetUserType] = useState<'external' | 'admin'>('external');

  // Common UI states
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleReset = () => {
    setError('');
    setIsLoading(false);
    setEmail('');
    setPassword('');
    setRegName('');
    setRegEmail('');
    setRegPhone('');
    setRegPassword('');
    setRegCompany('');
    setRegAddress('');
    setEnteredCode('');
    setResetEmail('');
    setResetOtpCode('');
    setEnteredResetOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    setMode('login');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const matchedAdmin = admins.find(a => a.email.toLowerCase() === cleanEmail);
      const isPancaranEmail = cleanEmail.endsWith('@pancaran-logistic.id') || cleanEmail.endsWith('@pancaran-group.id');
      const isDefaultAdmin = cleanEmail === 'digital.solution@pancaran-logistic.id';

      if (matchedAdmin || isPancaranEmail || isDefaultAdmin) {
        // Enforce admin login
        const expectedPassword = matchedAdmin?.password || '12345678';
        if (cleanPassword === expectedPassword) {
          onLoginSuccess(cleanEmail);
          onClose();
          setIsLoading(false);
          return;
        } else {
          setError(t('Email atau password salah. Pastikan kredensial benar.'));
          setIsLoading(false);
          return;
        }
      } else {
        // Look in registered_users Firestore collection for external users
        const userDocRef = doc(db, 'registered_users', cleanEmail);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const userData = userSnap.data() as RegisteredUser;
          if (userData.password === cleanPassword) {
            if (!userData.emailVerified) {
              setVerificationEmail(cleanEmail);
              setVerificationCode(userData.verificationCode);
              setMode('verification');
              setIsLoading(false);
              return;
            }

            if (userData.status === 'Menunggu Verifikasi') {
              setVerificationEmail(cleanEmail);
              setVerificationCode(userData.verificationCode);
              setMode('verification');
              setIsLoading(false);
              return;
            }

            if (userData.status === 'Menunggu Persetujuan') {
              setError(t('Pendaftaran akun Anda berhasil, namun saat ini sedang menunggu persetujuan (approval) oleh Administrator Pancaran Logistics.'));
              setIsLoading(false);
              return;
            }

            if (userData.status === 'Ditolak') {
              setError(t('Pendaftaran Anda ditolak oleh Administrator. Hubungi support untuk informasi lebih lanjut.'));
              setIsLoading(false);
              return;
            }

            if (userData.status === 'Disetujui') {
              onExternalLoginSuccess(cleanEmail, userData.name, userData.phone);
              onClose();
              setIsLoading(false);
              return;
            }
          } else {
            setError(t('Email atau password salah. Pastikan kredensial benar.'));
          }
        } else {
          setError(t('Email tidak terdaftar. Hubungi Admin atau gunakan menu Daftar Baru.'));
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(t('Terjadi kesalahan saat masuk. Hubungi Admin.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanName = regName.trim();
    const cleanPhone = regPhone.trim();
    const cleanPassword = regPassword.trim();
    const cleanCompany = regCompany.trim();
    const cleanAddress = regAddress.trim();

    if (cleanPassword.length < 6) {
      setError(t('Kata sandi minimal harus 6 karakter.'));
      setIsLoading(false);
      return;
    }

    try {
      // Check if already registered in admins or registered_users
      const matchedAdmin = admins.some(a => a.email.toLowerCase() === cleanEmail);
      if (matchedAdmin) {
        setError(t('Email ini sudah terdaftar sebagai akun Administrator.'));
        setIsLoading(false);
        return;
      }

      const userDocRef = doc(db, 'registered_users', cleanEmail);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        setError(t('Email ini sudah terdaftar. Silakan masuk menggunakan akun Anda.'));
        setIsLoading(false);
        return;
      }

      const newRegUser: RegisteredUser = {
        email: cleanEmail,
        name: cleanName,
        phone: cleanPhone,
        password: cleanPassword,
        company: cleanCompany,
        address: cleanAddress,
        status: 'Menunggu Persetujuan',
        emailVerified: true,
        verificationCode: '',
        createdAt: new Date().toISOString()
      };

      await addRegisteredUser(newRegUser);

      setVerificationEmail(cleanEmail);
      setVerificationCode('');
      setMode('pending_approval');
    } catch (err: any) {
      console.error(err);
      setError(t('Gagal melakukan pendaftaran. Silakan coba kembali.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (enteredCode.trim() !== verificationCode) {
      setError(t('Kode verifikasi yang Anda masukkan salah.'));
      setIsLoading(false);
      return;
    }

    try {
      await updateRegisteredUser(verificationEmail, {
        emailVerified: true,
        status: 'Menunggu Persetujuan'
      });

      setVerificationSuccess(true);
      setTimeout(() => {
        setMode('pending_approval');
        setVerificationSuccess(false);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(t('Gagal memverifikasi email. Silakan coba lagi.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const cleanEmail = resetEmail.trim().toLowerCase();
    const cleanPassword = newPassword.trim();
    const cleanConfirm = confirmNewPassword.trim();

    if (!cleanEmail) {
      setError(t('Masukkan Email Anda'));
      setIsLoading(false);
      return;
    }

    if (cleanPassword.length < 6) {
      setError(t('Password minimal 6 karakter.'));
      setIsLoading(false);
      return;
    }

    if (cleanPassword !== cleanConfirm) {
      setError(t('Password tidak cocok.'));
      setIsLoading(false);
      return;
    }

    try {
      // 1. Check if it's an admin user
      const matchedAdmin = admins.find(a => a.email.toLowerCase() === cleanEmail);
      const isDefaultAdmin = cleanEmail === 'digital.solution@pancaran-logistic.id';
      
      let userFound = false;
      let userName = '';
      let isUserAdmin = false;

      if (matchedAdmin || isDefaultAdmin) {
        userFound = true;
        userName = matchedAdmin?.name || 'Digital Solution';
        isUserAdmin = true;
      } else {
        // 2. Check registered_users
        const userDocRef = doc(db, 'registered_users', cleanEmail);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as RegisteredUser;
          userFound = true;
          userName = userData.name;
          isUserAdmin = false;
        }
      }

      if (!userFound) {
        setError(t('Email tidak terdaftar atau salah.'));
        setIsLoading(false);
        return;
      }

      // Update the password directly in Firestore
      if (isUserAdmin) {
        const adminDocRef = doc(db, 'admins', cleanEmail);
        const adminSnap = await getDoc(adminDocRef);
        if (adminSnap.exists()) {
          await updateDoc(adminDocRef, { password: cleanPassword });
        } else if (isDefaultAdmin) {
          await setDoc(doc(db, 'admins', cleanEmail), {
            email: cleanEmail,
            name: userName,
            role: 'internal',
            createdAt: new Date().toISOString(),
            password: cleanPassword
          });
        }
      } else {
        const userDocRef = doc(db, 'registered_users', cleanEmail);
        await updateDoc(userDocRef, { password: cleanPassword });
      }

      setMode('reset_password_success');
    } catch (err: any) {
      console.error(err);
      setError(t('Gagal memproses reset password. Silakan coba lagi.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-zoom-in border border-slate-100">
        
        {/* Banner header image/gradient */}
        <div className="bg-gradient-to-br from-indigo-700 to-blue-900 p-6 text-white text-center relative">
          {/* Language Selector in Login Modal */}
          <div className="absolute top-4 left-4 flex bg-black/15 p-0.5 rounded-lg border border-white/10 z-10">
            <button
              type="button"
              onClick={() => setLanguage('id')}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                language === 'id' 
                  ? 'bg-white text-indigo-900 shadow font-bold' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              ID
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                language === 'en' 
                  ? 'bg-white text-indigo-900 shadow font-bold' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg bg-black/10 hover:bg-black/25 text-white/80 hover:text-white transition-all"
            title={t('Tutup')}
          >
            <X className="w-5 h-5" />
          </button>
          
          <Shield className="w-12 h-12 text-blue-200 mx-auto mb-2.5 animate-pulse" />
          
          {mode === 'login' && (
            <>
              <h2 className="text-xl font-bold tracking-tight">{t('Masuk ke Pancaran Lelang')}</h2>
              <p className="text-xs text-blue-100/80 mt-1">{t('Gunakan akun Anda untuk melihat harga dan melakukan penawaran.')}</p>
            </>
          )}
          {mode === 'register' && (
            <>
              <h2 className="text-xl font-bold tracking-tight">{t('Daftar Akun Baru')}</h2>
              <p className="text-xs text-blue-100/80 mt-1">{t('Lengkapi data Anda untuk mendapatkan akses penawaran unit lelang.')}</p>
            </>
          )}
          {mode === 'verification' && (
            <>
              <h2 className="text-xl font-bold tracking-tight">{t('Verifikasi Email Anda')}</h2>
              <p className="text-xs text-blue-100/80 mt-1">{t('Masukkan kode verifikasi OTP yang dikirimkan untuk mengaktifkan akun.')}</p>
            </>
          )}
          {mode === 'pending_approval' && (
            <>
              <h2 className="text-xl font-bold tracking-tight">{t('Pendaftaran Selesai')}</h2>
              <p className="text-xs text-blue-100/80 mt-1">{t('Status akun Anda sedang menunggu konfirmasi admin.')}</p>
            </>
          )}
          {mode === 'reset_password' && (
            <>
              <h2 className="text-xl font-bold tracking-tight">{t('Reset Password')}</h2>
              <p className="text-xs text-blue-100/80 mt-1">{t('Masukkan alamat email terdaftar dan buat password baru Anda.')}</p>
            </>
          )}
          {mode === 'reset_password_verify' && (
            <>
              <h2 className="text-xl font-bold tracking-tight">{t('Verifikasi OTP')}</h2>
              <p className="text-xs text-blue-100/80 mt-1">{t('Masukkan kode OTP dan buat password baru Anda.')}</p>
            </>
          )}
          {mode === 'reset_password_success' && (
            <>
              <h2 className="text-xl font-bold tracking-tight">{t('Reset Password Berhasil')}</h2>
              <p className="text-xs text-blue-100/80 mt-1">{t('Password Anda telah berhasil direset.')}</p>
            </>
          )}
        </div>

        {/* Modal Content Switcher */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. LOGIN MODE */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Email input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  {t('ALAMAT EMAIL')}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Password input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('KATA SANDI (PASSWORD)')}</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Lupa Password Link */}
              <div className="flex justify-end -mt-1 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('reset_password');
                    setError('');
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold hover:underline transition cursor-pointer"
                >
                  {t('Lupa Password?')}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/15 hover:shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span>{t('Masuk Aplikasi')}</span>
                )}
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-500">
                  {t('Belum memiliki akun lelang?')}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError('');
                    }}
                    className="text-indigo-600 hover:text-indigo-700 font-bold hover:underline transition cursor-pointer"
                  >
                    {t('Daftar Di Sini')}
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* 2. REGISTER MODE */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('NAMA LENGKAP')}</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Phone/WA */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('NOMOR HP / WHATSAPP')}</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 081234567890"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Company */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('NAMA PERUSAHAAN / INSTANSI')}</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT Pancaran Logistics atau Pribadi"
                    value={regCompany}
                    onChange={(e) => setRegCompany(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('ALAMAT LENGKAP')}</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Jl. Raya Cilincing No. 12, Jakarta Utara"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('ALAMAT EMAIL')}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="nama@email.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('KATA SANDI (MINIMAL 6 KARAKTER)')}</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    minLength={6}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/15 hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>{t('Daftarkan Akun')}</span>
                  )}
                </button>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="text-xs text-slate-500 hover:text-indigo-600 font-semibold flex items-center justify-center gap-1 mx-auto transition"
                >
                  <ArrowLeft className="w-4 h-4" /> {t('Kembali ke Menu Masuk')}
                </button>
              </div>
            </form>
          )}

          {/* 3. EMAIL VERIFICATION MODE */}
          {mode === 'verification' && (
            <form onSubmit={handleVerifySubmit} className="space-y-5">
              <div className="text-center space-y-2">
                <p className="text-xs text-slate-600">
                  {t('Kami telah membuat kode verifikasi OTP untuk email')} <strong className="text-indigo-600 font-mono">{verificationEmail}</strong>.
                </p>
                <p className="text-xs text-slate-500 leading-normal">
                  {t('Silakan masukkan 6 digit kode di bawah ini untuk memverifikasi keaslian kepemilikan email Anda.')}
                </p>
              </div>

              {/* OTP Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase block text-center">{t('KODE VERIFIKASI OTP')}</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="••••••"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full py-3.5 border-2 border-slate-200 rounded-xl text-center text-xl font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                />
              </div>

              {verificationSuccess ? (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 animate-pulse">
                  <Check className="w-4 h-4" /> {t('Email Berhasil Diverifikasi!')}
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/15 hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>{t('Verifikasi Sekarang')}</span>
                  )}
                </button>
              )}

              {/* Conditional Email Delivery Message / Simulation Helper Box */}
              {systemSettings?.appsScriptUrl ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-xs space-y-1.5 text-emerald-800">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('OTP Telah Dikirim ke Email Asli:')}</span>
                  </div>
                  <p className="leading-relaxed text-[11px] text-emerald-700">
                    {t('Sistem keamanan Pancaran Lelang telah mengirimkan 6 digit kode OTP ke email asli Anda. Silakan periksa Kotak Masuk (Inbox) atau folder Spam/Promosi Anda.')}
                  </p>
                  <p className="text-[10px] text-slate-400 italic">
                    {t('Kode verifikasi disembunyikan dari web ini untuk keamanan autentik.')}
                  </p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs space-y-1.5 text-amber-800">
                  <div className="flex items-center gap-1 font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{t('Layanan Email Belum Dikonfigurasi:')}</span>
                  </div>
                  <p className="leading-relaxed text-[11px] text-amber-700">
                    {t('Sistem email verifikasi asli belum dikonfigurasi oleh Administrator. Kode OTP tidak dapat ditampilkan di layar web demi keamanan data.')}
                  </p>
                  <p className="text-[10px] text-amber-600 italic">
                    {t('💡 Admin: Harap buka Setelan Admin dan masukkan URL Google Apps Script Web App agar kode verifikasi dapat terkirim secara otomatis ke email asli pendaftar.')}
                  </p>
                </div>
              )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-500 hover:text-indigo-600 font-semibold flex items-center justify-center gap-1 mx-auto transition"
                >
                  <ArrowLeft className="w-4 h-4" /> {t('Batalkan Pendaftaran')}
                </button>
              </div>
            </form>
          )}

          {/* 4. PENDING APPROVAL MODE */}
          {mode === 'pending_approval' && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                <Check className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-800">{t('Pendaftaran Berhasil Terkirim!')}</h3>
                <p className="text-xs text-slate-500 leading-normal max-w-xs mx-auto">
                  {t('Sesuai dengan kebijakan Pancaran Logistics, pendaftaran Anda saat ini berstatus')} <strong>{t('Menunggu Persetujuan Admin')}</strong>.
                </p>
                <p className="text-xs text-slate-500 leading-normal max-w-xs mx-auto">
                  {t('Administrator internal akan meninjau data pendaftaran Anda sebelum menyetujui akses ke katalog lelang.')}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-left text-slate-600 space-y-1 leading-normal">
                <p className="font-bold text-slate-700">{t('💡 Petunjuk Pengujian:')}</p>
                <p>{t('1. Masuk ke dashboard menggunakan Akun Admin.')}</p>
                <p>{t('2. Masuk ke menu "Manajemen Akses" > tab "Akses User Eksternal".')}</p>
                <p>{t('3. Cari email pendaftaran Anda lalu klik tombol "Setujui Akses" (Centang Hijau).')}</p>
                <p>{t('4. Setelah itu, Anda dapat masuk kembali dengan akun Anda untuk melihat harga lelang.')}</p>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md"
              >
                {t('Kembali ke Halaman Masuk')}
              </button>
            </div>
          )}

          {/* 5. RESET PASSWORD MODE (DIRECT RESET WITHOUT OTP) */}
          {mode === 'reset_password' && (
            <form onSubmit={handleResetPasswordRequest} className="space-y-4">
              {/* Email input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase block">
                  {t('ALAMAT EMAIL TERDAFTAR')}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="nama@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* New Password input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  {t('PASSWORD BARU')}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Confirm Password input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  {t('KONFIRMASI PASSWORD BARU')}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/15 hover:shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span>{t('Reset Password')}</span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-500 hover:text-indigo-600 font-semibold flex items-center justify-center gap-1 mx-auto transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> {t('Kembali ke Menu Masuk')}
                </button>
              </div>
            </form>
          )}

          {/* 7. RESET PASSWORD SUCCESS MODE */}
          {mode === 'reset_password_success' && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                <Check className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-800">{t('Reset Password Berhasil')}</h3>
                <p className="text-xs text-slate-500 leading-normal max-w-xs mx-auto">
                  {t('Password Anda berhasil diperbarui. Silakan kembali ke halaman masuk untuk menggunakan password baru Anda.')}
                </p>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                {t('Kembali ke Halaman Masuk')}
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
