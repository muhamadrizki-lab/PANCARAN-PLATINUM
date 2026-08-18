import React, { useState } from 'react';
import { ShieldCheck, Search, Filter, CheckCircle, UserCheck, Lock, Eye, Calendar, Clock, ArrowUpRight, Award, FileText, Trash2 } from 'lucide-react';
import { ApprovalLog } from '../types';
import { useLanguage } from './LanguageContext';

interface AdminApprovalMatrixProps {
  approvalLogs: ApprovalLog[];
  onClearLogs?: () => void;
  loggedInAdminEmail?: string | null;
  onDeleteLog?: (logId: string) => void;
}

export const AdminApprovalMatrix: React.FC<AdminApprovalMatrixProps> = ({
  approvalLogs,
  onClearLogs,
  loggedInAdminEmail,
  onDeleteLog
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<ApprovalLog | null>(null);

  const filteredLogs = approvalLogs.filter(log => {
    const matchesSearch = 
      log.targetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterAction === 'all' || log.actionType === filterAction;
    return matchesSearch && matchesFilter;
  });

  // Calculate stats
  const totalLogs = approvalLogs.length;
  const soldCount = approvalLogs.filter(l => l.actionType === 'MARK_SOLD').length;
  const userApproveCount = approvalLogs.filter(l => l.actionType === 'APPROVE_USER').length;

  // Group by admin
  const adminStatsMap: { [email: string]: { name: string; count: number; sold: number; users: number } } = {
    'muhamad.rizki@pancaran-logistic.id': { name: 'Muhamad Rizki', count: 0, sold: 0, users: 0 },
    'angga.prahadi@pancaran-logistic.id': { name: 'Angga Prahadi', count: 0, sold: 0, users: 0 },
    'maskur@pancaran-logistic.id': { name: 'Maskur', count: 0, sold: 0, users: 0 },
    'thomas@pancaran-logistic.id': { name: 'Pak Thomas', count: 0, sold: 0, users: 0 },
    'digital.solution@pancaran-logistic.id': { name: 'Digital Solution', count: 0, sold: 0, users: 0 },
  };
  
  approvalLogs.forEach(log => {
    const email = log.adminEmail || 'admin@pancaran.co.id';
    if (!adminStatsMap[email]) {
      adminStatsMap[email] = { name: log.adminName || email, count: 0, sold: 0, users: 0 };
    }
    adminStatsMap[email].count += 1;
    if (log.actionType === 'MARK_SOLD') adminStatsMap[email].sold += 1;
    if (log.actionType === 'APPROVE_USER') adminStatsMap[email].users += 1;
  });

  const adminStatsList = Object.entries(adminStatsMap).map(([email, data]) => ({
    email,
    ...data
  }));

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case 'MARK_SOLD':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3"/> {t('Klik Sold / Terjual')}</span>;
      case 'APPROVE_USER':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 w-fit"><UserCheck className="w-3 h-3"/> {t('Setujui Pengguna')}</span>;
      case 'REJECT_USER':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit"><Lock className="w-3 h-3"/> {t('Tolak Pengguna')}</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1 w-fit"><ShieldCheck className="w-3 h-3"/> {actionType}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-500/30">
                {t('Audit Trail & Governance')}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">{t('Report History Approval Internal')}</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              {t('Melacak setiap persetujuan, akun admin yang bertugas, serta siapa yang menandai unit terjual (Sold) secara real-time.')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 text-center">
              <p className="text-xs text-slate-300">{t('Total Aksi Tercatat')}</p>
              <p className="text-xl font-black text-white">{totalLogs}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Total Klik Sold / Terjual')}</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{soldCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Persetujuan Akun User')}</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{userApproveCount}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Akun Admin Aktif')}</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">{adminStatsList.length}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Admin Breakdown Matrix Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-600" />
          <span>{t('Matriks Kinerja Admin & Akun Penyetuju')}</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminStatsList.map((admin) => (
            <div key={admin.email} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                  {admin.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-800 text-sm truncate">{admin.name}</h4>
                  <p className="text-xs text-slate-500 truncate">{admin.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-center text-xs">
                <div className="bg-white p-2 rounded-xl border border-slate-200/50">
                  <span className="block text-slate-400 text-[10px] uppercase font-bold">{t('Total Aksi')}</span>
                  <strong className="text-slate-800 font-black text-sm">{admin.count}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200/50">
                  <span className="block text-emerald-600 text-[10px] uppercase font-bold">{t('Sold')}</span>
                  <strong className="text-emerald-700 font-black text-sm">{admin.sold}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200/50">
                  <span className="block text-blue-600 text-[10px] uppercase font-bold">{t('User')}</span>
                  <strong className="text-blue-700 font-black text-sm">{admin.users}</strong>
                </div>
              </div>
            </div>
          ))}
          {adminStatsList.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-400 text-sm">
              {t('Belum ada data aksi admin yang tercatat.')}
            </div>
          )}
        </div>
      </div>

      {/* Logs Table Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Controls Bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('Cari target, admin, atau detail aksi...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              />
            </div>
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2.5 py-2 bg-slate-200/50 rounded-xl">
                {t('Reset')}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700"
            >
              <option value="all">{t('Semua Jenis Aksi')}</option>
              <option value="MARK_SOLD">{t('Klik Sold / Terjual')}</option>
              <option value="APPROVE_USER">{t('Setujui Pengguna')}</option>
              <option value="REJECT_USER">{t('Tolak Pengguna')}</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="py-3.5 px-6">{t('Waktu & Tanggal')}</th>
                <th className="py-3.5 px-6">{t('Jenis Aksi')}</th>
                <th className="py-3.5 px-6">{t('Target (Aset / User)')}</th>
                <th className="py-3.5 px-6">{t('Akun Admin / Penyetuju')}</th>
                <th className="py-3.5 px-6">{t('Keterangan / Detail')}</th>
                <th className="py-3.5 px-6 text-right">{t('Aksi')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="py-4 px-6 font-mono text-xs text-slate-600 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="py-4 px-6">
                    {getActionBadge(log.actionType)}
                  </td>
                  <td className="py-4 px-6 font-bold text-slate-800">
                    {log.targetName}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                        {(log.adminName || log.adminEmail || 'A').substring(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-xs">{log.adminName || 'Admin'}</p>
                        <p className="text-[11px] text-slate-400">{log.adminEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-slate-600 text-xs max-w-xs truncate" title={log.details}>
                    {log.details}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title={t('Zoom / Lihat Detail')}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t('Zoom')}</span>
                      </button>
                      
                      {loggedInAdminEmail === 'digital.solution@pancaran-logistic.id' && onDeleteLog && (
                        <button
                          onClick={() => {
                            if (window.confirm(t('Apakah Anda yakin ingin menghapus log histori ini?'))) {
                              onDeleteLog(log.id);
                            }
                          }}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all cursor-pointer"
                          title={t('Hapus Histori')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                    {t('Tidak ada riwayat approval atau aksi yang ditemukan.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail / Zoom Modal */}
      {selectedLog && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-indigo-600 text-white p-6 relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{t('Detail Histori Approval')}</h3>
                  <p className="text-xs text-indigo-200 font-mono">{selectedLog.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('Jenis Aksi')}</span>
                <div className="mt-1">{getActionBadge(selectedLog.actionType)}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t('Target Objek')}</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selectedLog.targetName}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t('Waktu Eksekusi')}</span>
                  <span className="font-semibold text-slate-700 text-xs mt-0.5 block font-mono">
                    {new Date(selectedLog.timestamp).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/60">
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">{t('Akun Penyetuju / Pelaku Aksi')}</span>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    {(selectedLog.adminName || 'Admin').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{selectedLog.adminName || 'Admin'}</p>
                    <p className="text-xs text-slate-500">{selectedLog.adminEmail}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('Keterangan Lengkap')}</span>
                <p className="text-slate-700 text-sm leading-relaxed">{selectedLog.details}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
              >
                {t('Tutup')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
