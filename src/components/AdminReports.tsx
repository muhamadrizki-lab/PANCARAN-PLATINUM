import React, { useMemo, useState } from 'react';
import { Asset, Bid } from '../types';
import { 
  FileText, 
  Download, 
  FileSpreadsheet, 
  TrendingUp, 
  Package, 
  DollarSign, 
  Gavel, 
  Calendar, 
  Filter,
  X,
  Trophy,
  Phone,
  Mail,
  ChevronRight,
  Search,
  CheckCircle,
  Clock,
  ArrowUpRight,
  User,
  Eye,
  Info,
  ZoomIn,
  Copy,
  Check
} from 'lucide-react';
import { useLanguage } from './LanguageContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface AdminReportsProps {
  assets: Asset[];
}

const AdminReports: React.FC<AdminReportsProps> = ({ assets }) => {
  const { t, language } = useLanguage();
  const [dateFilter, setDateFilter] = useState<'all' | 'upcoming' | 'recent' | 'history'>('all');
  
  // Modal state
  const [activeModal, setActiveModal] = useState<'activeAssets' | 'soldAssets' | 'allBids' | 'soldRevenue' | 'assetBids' | null>(null);
  const [selectedAssetForBids, setSelectedAssetForBids] = useState<Asset | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [focusedReportBid, setFocusedReportBid] = useState<{ bid: Bid; asset: Asset } | null>(null);
  const [copiedState, setCopiedState] = useState(false);
  
  const activeAssets = useMemo(() => assets.filter(a => a.status === 'Open'), [assets]);
  
  const getAssetTimestamp = (asset: Asset): number => {
    if (asset.closeBidDate) {
      const d = new Date(asset.closeBidDate).getTime();
      if (!isNaN(d)) return d;
    }
    const assetBids = asset.bids || [];
    if (assetBids.length > 0) {
      const timestamps = assetBids.map(b => b.timestamp ? new Date(b.timestamp).getTime() : 0).filter(t => !isNaN(t) && t > 0);
      if (timestamps.length > 0) {
        return Math.max(...timestamps);
      }
    }
    return 0;
  };

  const soldAssets = useMemo(() => {
    const now = Date.now();
    let filtered = assets.filter(a => a.status === 'Sold');

    if (dateFilter === 'upcoming') {
      filtered = filtered.filter(a => getAssetTimestamp(a) > now);
    } else if (dateFilter === 'recent') {
      filtered = filtered.filter(a => getAssetTimestamp(a) <= now);
    } else if (dateFilter === 'history') {
      filtered = filtered.filter(a => {
        const t = getAssetTimestamp(a);
        return t > 0 && (now - t) > 1000 * 60 * 60 * 24 * 30; // > 30 days old
      });
    }

    return filtered.sort((a, b) => {
      const timeA = getAssetTimestamp(a);
      const timeB = getAssetTimestamp(b);
      if (dateFilter === 'history') {
        // Oldest first (so oldest past dates are at the bottom or ascending)
        return timeA - timeB;
      }
      // Default / recent / upcoming: Newest / most recent / upcoming first
      return timeB - timeA;
    });
  }, [assets, dateFilter]);
  
  const totalBidsCount = useMemo(() => {
    return soldAssets.reduce((sum, a) => sum + (a.bids?.length || 0), 0);
  }, [soldAssets]);

  const allBidsList = useMemo(() => {
    const list: Array<{ bid: Bid; asset: Asset; isHighest: boolean; rank: number }> = [];
    soldAssets.forEach(asset => {
      const sortedBids = [...(asset.bids || [])].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
      sortedBids.forEach((bid, idx) => {
        list.push({
          bid,
          asset,
          isHighest: idx === 0,
          rank: idx + 1
        });
      });
    });
    return list.sort((a, b) => {
      const timeA = a.bid.timestamp ? new Date(a.bid.timestamp).getTime() : 0;
      const timeB = b.bid.timestamp ? new Date(b.bid.timestamp).getTime() : 0;
      return timeB - timeA;
    });
  }, [soldAssets]);

  const getAssetSoldPrice = (asset: Asset): number => {
    const assetBids = asset.bids || [];
    if (assetBids.length > 0) {
      const prices = assetBids
        .map(b => Number(b.price !== undefined ? b.price : (b as any).amount))
        .filter(p => !isNaN(p) && p > 0);
      if (prices.length > 0) {
        return Math.max(...prices);
      }
    }
    return Number(asset.highestBid) || Number(asset.startingPrice) || 0;
  };

  const getAssetWinner = (asset: Asset): string => {
    const assetBids = asset.bids || [];
    if (assetBids.length > 0) {
      const sorted = [...assetBids].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
      return sorted[0].name || '-';
    }
    return '-';
  };

  const getAssetSoldDate = (asset: Asset): string => {
    if (asset.closeBidDate) {
      try {
        const d = new Date(asset.closeBidDate);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      } catch {}
    }
    const assetBids = asset.bids || [];
    if (assetBids.length > 0) {
      const validBids = assetBids.filter(b => b.timestamp);
      if (validBids.length > 0) {
        const sorted = [...validBids].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        try {
          const d = new Date(sorted[0].timestamp);
          if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
          }
        } catch {}
      }
    }
    return '-';
  };

  const totalSoldPrice = useMemo(() => {
    let total = 0;
    soldAssets.forEach(asset => {
      total += getAssetSoldPrice(asset);
    });
    return total;
  }, [soldAssets]);

  const lunasCount = useMemo(() => {
    return soldAssets.filter(a => a.paymentStatus === 'Lunas').length;
  }, [soldAssets]);

  const belumLunasCount = useMemo(() => {
    return soldAssets.filter(a => a.paymentStatus !== 'Lunas').length;
  }, [soldAssets]);

  const formatCurrency = (amount: number | undefined | null) => {
    const num = typeof amount === 'number' && !isNaN(amount) ? amount : (Number(amount) || 0);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const handleOpenAssetBids = (asset: Asset) => {
    setSelectedAssetForBids(asset);
    setActiveModal('assetBids');
    setModalSearch('');
  };

  const generateExcel = () => {
    const soldData = soldAssets.map(asset => {
      const soldPrice = getAssetSoldPrice(asset);
      const soldDate = getAssetSoldDate(asset);
      const winnerName = getAssetWinner(asset);
      const paymentStatus = asset.paymentStatus || 'Belum Lunas';
      return {
        'Tgl Terjual': soldDate,
        'ID Aset': asset.id,
        'No. Polisi / Unit': asset.plateNumber || '-',
        'Merek': asset.brand,
        'Kategori': asset.category,
        'Pemenang': winnerName,
        'Status Pembayaran': paymentStatus,
        'Harga Dasar': Number(asset.startingPrice) || 0,
        'Total Bid': (asset.bids || []).length,
        'Harga Terjual': soldPrice
      };
    });

    const activeData = activeAssets.map(asset => {
      return {
        'ID Aset': asset.id,
        'No. Polisi / Unit': asset.plateNumber || '-',
        'Merek': asset.brand,
        'Kategori': asset.category,
        'Lokasi': asset.location,
        'Harga Dasar': Number(asset.startingPrice) || 0,
        'Total Bid': (asset.bids || []).length
      };
    });

    const wb = XLSX.utils.book_new();
    
    const wsSold = XLSX.utils.json_to_sheet(soldData);
    XLSX.utils.book_append_sheet(wb, wsSold, 'Data Penjualan');

    const wsActive = XLSX.utils.json_to_sheet(activeData);
    XLSX.utils.book_append_sheet(wb, wsActive, 'Data Aset Aktif');

    XLSX.writeFile(wb, 'Laporan_Aset.xlsx');
  };

  const generatePDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4');
    
    doc.setFontSize(18);
    doc.text('Laporan Data Penjualan', 40, 40);
    
    doc.setFontSize(11);
    doc.text(`Total Aset Terjual: ${soldAssets.length}`, 40, 60);
    doc.text(`Total Penawaran Masuk (Bid): ${totalBidsCount}`, 40, 75);
    doc.text(`Total Harga Terjual: ${formatCurrency(totalSoldPrice)}`, 40, 90);

    const soldBody = soldAssets.map(asset => {
      const soldPrice = getAssetSoldPrice(asset);
      const soldDate = getAssetSoldDate(asset);
      const winnerName = getAssetWinner(asset);
      const paymentStatus = asset.paymentStatus || 'Belum Lunas';
      return [
        soldDate,
        asset.plateNumber || '-',
        asset.brand,
        winnerName,
        paymentStatus,
        formatCurrency(Number(asset.startingPrice) || 0),
        `${(asset.bids || []).length} Bid`,
        formatCurrency(soldPrice)
      ];
    });

    (doc as any).autoTable({
      startY: 105,
      head: [['Tgl Terjual', 'No. Polisi / Unit', 'Merek', 'Pemenang', 'Status', 'Harga Dasar', 'Total Bid', 'Harga Terjual']],
      body: soldBody,
    });

    doc.addPage();
    doc.setFontSize(18);
    doc.text('Laporan Data Aset Aktif', 40, 40);
    
    doc.setFontSize(11);
    doc.text(`Total Aset Aktif: ${activeAssets.length}`, 40, 60);

    const activeBody = activeAssets.map(asset => {
      return [
        asset.plateNumber || '-',
        asset.brand,
        asset.category,
        formatCurrency(Number(asset.startingPrice) || 0),
        `${(asset.bids || []).length} Bid`
      ];
    });

    (doc as any).autoTable({
      startY: 80,
      head: [['No. Polisi / Unit', 'Merek', 'Kategori', 'Harga Dasar', 'Total Bid']],
      body: activeBody,
    });

    doc.save('Laporan_Aset.pdf');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            {t('Laporan & Rekapitulasi')}
          </h2>
          <p className="text-sm text-slate-500">{t('Ringkasan data penjualan dan aset yang sedang aktif.')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={generateExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {t('Export Excel')}
          </button>
          <button
            onClick={generatePDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {t('Export PDF')}
          </button>
        </div>
      </div>

      {/* Summary Cards with Interactive Click */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Aset Aktif */}
        <div 
          onClick={() => {
            setActiveModal('activeAssets');
            setModalSearch('');
          }}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group"
          title={t('Klik untuk melihat daftar unit aktif')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-500 group-hover:text-blue-600 transition-colors">{t('Total Aset Aktif')}</h3>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{activeAssets.length} <span className="text-sm font-normal text-slate-500">unit</span></p>
          <p className="text-[11px] text-blue-600 font-semibold mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <span>{t('Lihat Unit Aktif')}</span> &rarr;
          </p>
        </div>

        {/* Card 2: Data Penjualan */}
        <div 
          onClick={() => {
            setActiveModal('soldAssets');
            setModalSearch('');
          }}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-emerald-300 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group"
          title={t('Klik untuk melihat rincian unit terjual')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-500 group-hover:text-emerald-600 transition-colors">{t('Data Penjualan')}</h3>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{soldAssets.length} <span className="text-sm font-normal text-slate-500">{t('unit terjual')}</span></p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <span>{t('Lihat Unit Terjual')}</span> &rarr;
          </p>
        </div>

        {/* Card 3: Total Penawaran (Bid) */}
        <div 
          onClick={() => {
            setActiveModal('allBids');
            setModalSearch('');
          }}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-indigo-300 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group"
          title={t('Klik untuk melihat semua riwayat penawaran')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Gavel className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-500 group-hover:text-indigo-600 transition-colors">{t('Total Penawaran (Bid)')}</h3>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalBidsCount} <span className="text-sm font-normal text-slate-500">bids</span></p>
          <p className="text-[11px] text-indigo-600 font-semibold mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <span>{t('Lihat Riwayat Bid')}</span> &rarr;
          </p>
        </div>

        {/* Card 4: Total Harga Terjual */}
        <div 
          onClick={() => {
            setActiveModal('soldRevenue');
            setModalSearch('');
          }}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-amber-300 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group"
          title={t('Klik untuk melihat rincian pendapatan')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-500 group-hover:text-amber-600 transition-colors">{t('Total Harga Terjual')}</h3>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalSoldPrice)}</p>
          <p className="text-[11px] text-amber-600 font-semibold mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <span>{t('Lihat Rincian Keuangan')}</span> &rarr;
          </p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800">{t('Preview Data Penjualan Terakhir')}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{t('Klik badge Total Bid pada unit untuk melihat seluruh penawar dan rincian lelang.')}</p>
          </div>
          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                dateFilter === 'all' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('Semua')}
            </button>
            <button
              onClick={() => setDateFilter('upcoming')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                dateFilter === 'upcoming' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('Mendatang')}
            </button>
            <button
              onClick={() => setDateFilter('recent')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                dateFilter === 'recent' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('Terbaru')}
            </button>
            <button
              onClick={() => setDateFilter('history')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                dateFilter === 'history' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('Riwayat / Lama')}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50/50 uppercase">
              <tr>
                <th className="px-6 py-3 font-semibold">{t('Tgl Terjual')}</th>
                <th className="px-6 py-3 font-semibold">{t('Aset')}</th>
                <th className="px-6 py-3 font-semibold">{t('Kategori')}</th>
                <th className="px-6 py-3 font-semibold">{t('Pemenang')}</th>
                <th className="px-6 py-3 font-semibold">{t('Status Pembayaran')}</th>
                <th className="px-6 py-3 font-semibold">{t('Harga Dasar')}</th>
                <th className="px-6 py-3 font-semibold text-center">{t('Total Bid')}</th>
                <th className="px-6 py-3 font-semibold">{t('Harga Terjual')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {soldAssets.map(asset => {
                const soldPrice = getAssetSoldPrice(asset);
                const soldDate = getAssetSoldDate(asset);
                const winnerName = getAssetWinner(asset);
                const paymentStatus = asset.paymentStatus || 'Belum Lunas';
                const bidCount = (asset.bids || []).length;
                return (
                  <tr key={asset.id} className="hover:bg-slate-50/70 transition-colors group/row">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{soldDate}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {asset.images && asset.images[0] && (
                          <img 
                            src={asset.images[0]} 
                            alt={asset.name} 
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0" 
                          />
                        )}
                        <div>
                          <p className="font-bold text-slate-800">{asset.plateNumber || '-'}</p>
                          <p className="text-xs text-slate-500">{asset.brand} {asset.name ? `• ${asset.name}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                        {asset.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="font-bold text-slate-800 text-xs">{winnerName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        paymentStatus === 'Lunas' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {paymentStatus === 'Lunas' ? '✓ Lunas' : '⏳ Belum Lunas'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {formatCurrency(Number(asset.startingPrice) || 0)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenAssetBids(asset)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white text-xs font-bold border border-blue-200 hover:border-blue-600 shadow-xs hover:shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        title={t('Klik untuk melihat detail seluruh penawaran')}
                      >
                        <Gavel className="w-3.5 h-3.5" />
                        <span>{bidCount} {t('Bid')}</span>
                        <Eye className="w-3 h-3 ml-0.5 opacity-70" />
                      </button>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600">
                      {formatCurrency(soldPrice)}
                    </td>
                  </tr>
                );
              })}
              {soldAssets.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    {t('Belum ada data penjualan')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: ASSET BIDS HISTORY MODAL (Triggered by X Bid click) */}
      {/* ========================================================= */}
      {activeModal === 'assetBids' && selectedAssetForBids && (() => {
        const sortedBids = [...(selectedAssetForBids.bids || [])].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        const filteredBids = sortedBids.filter(b => 
          (b.name || '').toLowerCase().includes(modalSearch.toLowerCase()) ||
          (b.contact || '').toLowerCase().includes(modalSearch.toLowerCase()) ||
          (b.email || '').toLowerCase().includes(modalSearch.toLowerCase())
        );
        const soldPrice = getAssetSoldPrice(selectedAssetForBids);
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-scale-up">
              {/* Modal Header */}
              <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
                    <Gavel className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <span>{t('Riwayat Penawaran (Bid)')}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-300 text-xs font-mono font-bold">
                        {selectedAssetForBids.plateNumber || selectedAssetForBids.id}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      {selectedAssetForBids.brand} {selectedAssetForBids.name ? `• ${selectedAssetForBids.name}` : ''} ({sortedBids.length} Total Penawaran)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveModal(null);
                    setSelectedAssetForBids(null);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Asset Snapshot Card */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">{t('Harga Dasar')}</span>
                  <span className="font-bold text-slate-700 font-mono text-sm">{formatCurrency(Number(selectedAssetForBids.startingPrice) || 0)}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">{t('Harga Terjual / Tertinggi')}</span>
                  <span className="font-bold text-emerald-600 font-mono text-sm">{formatCurrency(soldPrice)}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">{t('Pemenang')}</span>
                  <span className="font-bold text-slate-800 text-sm truncate block">{sortedBids[0]?.name || '-'}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">{t('Status Unit')}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                    {selectedAssetForBids.status}
                  </span>
                </div>
              </div>

              {/* Search in bids */}
              <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={t('Cari nama penawar, no. telepon, atau email...')}
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full pl-9.5 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <span className="text-xs text-slate-500 font-semibold shrink-0">
                  {filteredBids.length} {t('data ditemukan')}
                </span>
              </div>

              {/* Bids Table / List */}
              <div className="flex-1 overflow-y-auto p-4 max-h-[400px]">
                {filteredBids.length > 0 ? (
                  <div className="space-y-2.5">
                    {filteredBids.map((bid, idx) => {
                      const isWinner = idx === 0 && (Number(bid.price) || 0) === soldPrice;
                      const bidDate = bid.timestamp ? new Date(bid.timestamp).toLocaleString('id-ID', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      }) : '-';

                      return (
                        <div 
                          key={bid.id || idx}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                            isWinner 
                              ? 'bg-amber-50/50 border-amber-200 ring-1 ring-amber-300/50' 
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isWinner 
                                ? 'bg-amber-500 text-white shadow-xs' 
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {isWinner ? <Trophy className="w-4 h-4" /> : `#${idx + 1}`}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-800 text-sm">{bid.name}</h4>
                                {isWinner && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold uppercase tracking-wider">
                                    {t('Pemenang')}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span>{bidDate} WIB</span>
                                </span>
                                {bid.contact && (
                                  <span className="flex items-center gap-1 font-mono text-slate-600">
                                    <span>📱</span> {bid.contact}
                                  </span>
                                )}
                                {bid.email && (
                                  <span className="flex items-center gap-1 text-slate-600">
                                    <span>✉️</span> {bid.email}
                                  </span>
                                )}
                              </div>
                              {bid.scheduleSurveyDate && (
                                <p className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md inline-block mt-1 font-semibold">
                                  📅 {t('Jadwal Survei')}: {bid.scheduleSurveyDate} @ {bid.scheduleSurveyTime || 'N/A'} WIB
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <div className="text-right mr-1">
                              <span className="text-[10px] text-slate-400 font-semibold block uppercase">{t('Nominal Penawaran')}</span>
                              <span className={`font-mono font-extrabold text-base ${isWinner ? 'text-emerald-700' : 'text-slate-800'}`}>
                                {formatCurrency(Number(bid.price) || 0)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFocusedReportBid({ bid, asset: selectedAssetForBids })}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title={t('Zoom Detail Penawaran')}
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                              <span>{t('Zoom')}</span>
                            </button>
                            {bid.contact && (
                              <a
                                href={`https://wa.me/${bid.contact.replace(/\D/g, '').startsWith('0') ? '62' + bid.contact.replace(/\D/g, '').slice(1) : bid.contact.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 transition-colors"
                                title={t('Hubungi via WhatsApp')}
                              >
                                <Phone className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <Gavel className="w-12 h-12 mx-auto text-slate-300 mb-2 opacity-60" />
                    <p className="font-semibold text-sm text-slate-600">{t('Belum ada data penawaran untuk unit ini')}</p>
                    <p className="text-xs text-slate-400 mt-1">{t('Penawaran yang masuk dari peserta lelang akan tercatat di sini.')}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => {
                    setActiveModal(null);
                    setSelectedAssetForBids(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {t('Tutup')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* MODAL 2: TOTAL ASET AKTIF MODAL (Card 1 Click) */}
      {/* ========================================================= */}
      {activeModal === 'activeAssets' && (() => {
        const filtered = activeAssets.filter(a => 
          (a.plateNumber || '').toLowerCase().includes(modalSearch.toLowerCase()) ||
          (a.brand || '').toLowerCase().includes(modalSearch.toLowerCase()) ||
          (a.category || '').toLowerCase().includes(modalSearch.toLowerCase()) ||
          (a.location || '').toLowerCase().includes(modalSearch.toLowerCase())
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-scale-up">
              <div className="px-6 py-4.5 bg-blue-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{t('Daftar Aset Aktif / Open Bidding')}</h3>
                    <p className="text-xs text-blue-100">{activeAssets.length} {t('unit aktif siap dilelang')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={t('Cari no. polisi, merek, kategori, atau lokasi...')}
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full pl-9.5 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 max-h-[450px]">
                {filtered.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filtered.map(asset => (
                      <div key={asset.id} className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all flex items-center gap-3.5">
                        {asset.images && asset.images[0] ? (
                          <img src={asset.images[0]} alt={asset.brand} className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-800 text-sm truncate">{asset.plateNumber || asset.id}</h4>
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
                              {asset.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">{asset.brand} {asset.name ? `• ${asset.name}` : ''}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="font-mono font-bold text-xs text-slate-800">
                              {formatCurrency(Number(asset.startingPrice) || 0)}
                            </span>
                            <span className="text-[11px] text-indigo-600 font-semibold">
                              {(asset.bids || []).length} {t('Bids Masuk')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <Package className="w-12 h-12 mx-auto text-slate-300 mb-2 opacity-60" />
                    <p className="font-semibold text-sm text-slate-600">{t('Tidak ada aset aktif yang sesuai')}</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {t('Tutup')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* MODAL 3: DATA PENJUALAN / SOLD ASSETS MODAL (Card 2 Click) */}
      {/* ========================================================= */}
      {activeModal === 'soldAssets' && (() => {
        const filtered = soldAssets.filter(a => 
          (a.plateNumber || '').toLowerCase().includes(modalSearch.toLowerCase()) ||
          (a.brand || '').toLowerCase().includes(modalSearch.toLowerCase()) ||
          (getAssetWinner(a) || '').toLowerCase().includes(modalSearch.toLowerCase())
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-scale-up">
              <div className="px-6 py-4.5 bg-emerald-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{t('Rekapitulasi Unit Terjual')}</h3>
                    <p className="text-xs text-emerald-100">{soldAssets.length} {t('unit sukses terjual')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={t('Cari no. polisi, merek, pemenang...')}
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full pl-9.5 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 max-h-[450px]">
                {filtered.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {filtered.map(asset => {
                      const soldPrice = getAssetSoldPrice(asset);
                      const soldDate = getAssetSoldDate(asset);
                      const winner = getAssetWinner(asset);
                      return (
                        <div key={asset.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50 p-2 rounded-xl transition-colors">
                          <div className="flex items-center gap-3">
                            {asset.images && asset.images[0] && (
                              <img src={asset.images[0]} alt={asset.brand} className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-800 text-sm">{asset.plateNumber || asset.id}</h4>
                                <span className="text-xs text-slate-400">• {soldDate}</span>
                              </div>
                              <p className="text-xs text-slate-500">{asset.brand} {asset.name ? `• ${asset.name}` : ''}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                  <Trophy className="w-3.5 h-3.5 text-amber-500" /> {winner}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  asset.paymentStatus === 'Lunas' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {asset.paymentStatus === 'Lunas' ? 'Lunas' : 'Belum Lunas'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 font-semibold block uppercase">{t('Harga Terjual')}</span>
                              <span className="font-mono font-bold text-emerald-600 text-sm">{formatCurrency(soldPrice)}</span>
                            </div>
                            <button
                              onClick={() => handleOpenAssetBids(asset)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white text-xs font-bold transition-all cursor-pointer"
                            >
                              {(asset.bids || []).length} Bids &rarr;
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <TrendingUp className="w-12 h-12 mx-auto text-slate-300 mb-2 opacity-60" />
                    <p className="font-semibold text-sm text-slate-600">{t('Tidak ada data penjualan yang cocok')}</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {t('Tutup')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* MODAL 4: ALL BIDS OVERVIEW MODAL (Card 3 Click) */}
      {/* ========================================================= */}
      {activeModal === 'allBids' && (() => {
        const filtered = allBidsList.filter(item => 
          (item.bid.name || '').toLowerCase().includes(modalSearch.toLowerCase()) ||
          (item.asset.plateNumber || '').toLowerCase().includes(modalSearch.toLowerCase()) ||
          (item.asset.brand || '').toLowerCase().includes(modalSearch.toLowerCase()) ||
          (item.bid.contact || '').toLowerCase().includes(modalSearch.toLowerCase())
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-scale-up">
              <div className="px-6 py-4.5 bg-indigo-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                    <Gavel className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{t('Seluruh Riwayat Penawaran (Bids Log)')}</h3>
                    <p className="text-xs text-indigo-100">{totalBidsCount} {t('total penawaran masuk dari semua unit')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={t('Cari nama penawar, no. polisi, merek...')}
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full pl-9.5 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 max-h-[450px]">
                {filtered.length > 0 ? (
                  <div className="space-y-2">
                    {filtered.map((item, idx) => {
                      const bidDate = item.bid.timestamp ? new Date(item.bid.timestamp).toLocaleString('id-ID', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      }) : '-';

                      return (
                        <div key={idx} className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-800 text-xs sm:text-sm">{item.bid.name}</h4>
                              {item.isHighest && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-extrabold uppercase">
                                  👑 Pemenang
                                </span>
                              )}
                              <span className="text-[11px] font-mono text-slate-400">({bidDate})</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">
                              Unit: <strong className="text-slate-800">{item.asset.plateNumber || item.asset.id}</strong> • {item.asset.brand}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <span className="font-mono font-bold text-sm text-indigo-900 mr-1">
                              {formatCurrency(Number(item.bid.price) || 0)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setFocusedReportBid({ bid: item.bid, asset: item.asset })}
                              className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title={t('Zoom Detail Penawaran')}
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                              <span>{t('Zoom')}</span>
                            </button>
                            {item.bid.contact && (
                              <a
                                href={`https://wa.me/${item.bid.contact.replace(/\D/g, '').startsWith('0') ? '62' + item.bid.contact.replace(/\D/g, '').slice(1) : item.bid.contact.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors"
                                title="WhatsApp"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <Gavel className="w-12 h-12 mx-auto text-slate-300 mb-2 opacity-60" />
                    <p className="font-semibold text-sm text-slate-600">{t('Tidak ada penawaran yang cocok')}</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {t('Tutup')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* MODAL 5: TOTAL HARGA TERJUAL / REVENUE MODAL (Card 4 Click) */}
      {/* ========================================================= */}
      {activeModal === 'soldRevenue' && (() => {
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-scale-up">
              <div className="px-6 py-4.5 bg-amber-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{t('Rincian Pendapatan Lelang')}</h3>
                    <p className="text-xs text-amber-100">{t('Total omset dan status pembayaran lelang')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Financial Snapshot */}
              <div className="p-5 bg-amber-50/50 border-b border-amber-200/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-white rounded-xl border border-amber-200/80 shadow-xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('Total Omset')}</span>
                  <span className="font-mono font-extrabold text-base text-amber-700">{formatCurrency(totalSoldPrice)}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-200/80 shadow-xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('Terbayar (Lunas)')}</span>
                  <span className="font-mono font-bold text-base text-emerald-600">{lunasCount} {t('Unit')}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-amber-200/80 shadow-xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('Menunggu (Belum Lunas)')}</span>
                  <span className="font-mono font-bold text-base text-amber-600">{belumLunasCount} {t('Unit')}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 max-h-[400px]">
                <div className="space-y-2">
                  {soldAssets.map(asset => {
                    const soldPrice = getAssetSoldPrice(asset);
                    const startPrice = Number(asset.startingPrice) || 0;
                    const diff = soldPrice - startPrice;
                    return (
                      <div key={asset.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800 text-xs sm:text-sm">{asset.plateNumber || asset.id}</h4>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              asset.paymentStatus === 'Lunas' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {asset.paymentStatus === 'Lunas' ? 'Lunas' : 'Belum Lunas'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{asset.brand} • Dasar: {formatCurrency(startPrice)}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-emerald-600 text-sm block">{formatCurrency(soldPrice)}</span>
                          {diff > 0 && (
                            <span className="text-[10px] text-emerald-600 font-semibold font-mono">
                              +{formatCurrency(diff)} ({Math.round((diff / (startPrice || 1)) * 100)}%)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {t('Tutup')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* IMMERSIVE ZOOM BID DETAIL POPUP MODAL                     */}
      {/* ========================================================= */}
      {focusedReportBid && (() => {
        const { bid, asset } = focusedReportBid;
        const sortedBids = [...(asset.bids || [])].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        const rank = sortedBids.findIndex(b => b.id === bid.id) + 1;
        const isWinnerCandidate = rank === 1;
        
        let dateStr = '-';
        let timeStr = '-';
        if (bid.timestamp) {
          try {
            const d = new Date(bid.timestamp);
            if (!isNaN(d.getTime())) {
              dateStr = d.toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              });
              timeStr = d.toLocaleTimeString(language === 'en' ? 'en-US' : 'id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }) + ' WIB';
            }
          } catch {
            dateStr = bid.timestamp;
          }
        }

        const startPrice = Number(asset.startingPrice) || 0;
        const bidPrice = Number(bid.price) || 0;
        const priceDiff = bidPrice - startPrice;
        const diffPercent = startPrice > 0 ? ((priceDiff / startPrice) * 100).toFixed(1) : '0';

        const copyText = `📋 DETAIL PENAWARAN (BID)
Unit: ${asset.brand} ${asset.name || ''} (${asset.plateNumber || asset.id})
Peringkat: #${rank} ${isWinnerCandidate ? '👑 Penawar Tertinggi' : ''}
Nama Penawar: ${bid.name}
Nominal Bid: ${formatCurrency(bidPrice)}
Harga Dasar: ${formatCurrency(startPrice)}
Waktu Bidding: ${dateStr} @ ${timeStr}
Kontak/WA: ${bid.contact || '-'}
Email: ${bid.email || '-'}
${bid.scheduleSurveyDate ? `Jadwal Survei: ${bid.scheduleSurveyDate} @ ${bid.scheduleSurveyTime || '09:00'} WIB` : 'Jadwal Survei: Belum ada'}`;

        return (
          <div 
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[150] flex items-center justify-center p-3 sm:p-4 animate-fade-in"
            onClick={() => setFocusedReportBid(null)}
          >
            <div 
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-xl w-full p-6 sm:p-7 relative overflow-hidden transition-all duration-300 animate-zoom-in flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Accent Line */}
              <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${
                isWinnerCandidate ? 'from-amber-400 via-amber-500 to-yellow-400' : 'from-blue-500 via-indigo-500 to-sky-500'
              }`} />
              
              {/* Title Bar */}
              <div className="flex justify-between items-start mb-5 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl border ${
                    isWinnerCandidate ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-blue-50 border-blue-100 text-blue-600'
                  }`}>
                    <ZoomIn className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                        {t('Detail Penawaran Harga')}
                      </h3>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isWinnerCandidate 
                          ? 'bg-amber-500 text-white shadow-xs' 
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        #{rank} {isWinnerCandidate ? `👑 ${t('Pemenang / Tertinggi')}` : `${t('Peringkat')} ${rank}`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      {asset.brand} {asset.name ? `• ${asset.name}` : ''} • <span className="font-mono text-slate-700 font-bold">{asset.plateNumber || asset.id}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFocusedReportBid(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                  title={t('Tutup')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable details */}
              <div className="space-y-4 overflow-y-auto pr-1 flex-1 py-1">
                {/* Price Block */}
                <div className={`border rounded-2xl p-5 text-center shadow-xs ${
                  isWinnerCandidate ? 'bg-amber-50/40 border-amber-200' : 'bg-blue-50/30 border-blue-100'
                }`}>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                    {t('NILAI PENAWARAN (BID PRICE)')}
                  </span>
                  <span className="text-3xl sm:text-4xl font-extrabold text-blue-700 font-mono tracking-tight block">
                    {formatCurrency(bidPrice)}
                  </span>
                  <div className="flex items-center justify-center gap-2 mt-2 text-[11px] text-slate-500">
                    <span>{t('Harga Dasar')}: <strong className="font-mono">{formatCurrency(startPrice)}</strong></span>
                    <span>•</span>
                    <span className={priceDiff >= 0 ? 'text-emerald-600 font-bold' : 'text-slate-500 font-bold'}>
                      {priceDiff >= 0 ? `+${formatCurrency(priceDiff)} (+${diffPercent}%)` : `-${formatCurrency(Math.abs(priceDiff))}`}
                    </span>
                  </div>
                </div>

                {/* WAKTU BIDDING (TANGGAL & JAM) HIGHLIGHT CARD */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-md border border-slate-700/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-blue-300 font-bold text-xs">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span>{t('WAKTU BIDDING / INPUT PENAWARAN')}</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                      ✓ {t('Tercatat Sistem')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-700/60">
                    <div className="flex items-center gap-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                      <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">{t('Tanggal Penawaran')}</span>
                        <span className="text-xs font-bold text-white block">{dateStr}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">{t('Jam Input')}</span>
                        <span className="text-xs font-mono font-bold text-amber-300 block">{timeStr}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bidder Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                      {t('NAMA PENAWAR')}
                    </span>
                    <span className="text-sm font-bold text-slate-800 break-words block">
                      {bid.name}
                    </span>
                  </div>

                  <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                      {t('JADWAL KUNJUNGAN / SURVEY')}
                    </span>
                    {bid.scheduleSurveyDate ? (
                      <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs mt-1">
                        <Calendar className="w-4 h-4 shrink-0 text-blue-500" />
                        <span className="truncate">
                          {bid.scheduleSurveyDate} @ {bid.scheduleSurveyTime || '09:00'} WIB
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium italic mt-1">
                        {t('Belum ada jadwal survei.')}
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                      EMAIL
                    </span>
                    <div className="flex items-center justify-between gap-1 mt-1">
                      <span className="text-xs text-slate-700 font-semibold break-all block truncate flex-1">
                        {bid.email || '-'}
                      </span>
                      {bid.email && bid.email !== '-' && (
                        <a
                          href={`mailto:${bid.email}`}
                          className="p-1 bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 rounded-lg hover:border-blue-200 transition-all shrink-0 ml-1"
                          title={t('Kirim Email')}
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                      {t('NOMOR HP / WHATSAPP')}
                    </span>
                    <div className="flex items-center justify-between gap-1 mt-1">
                      <span className="text-xs text-slate-700 font-semibold break-words block truncate flex-1">
                        {bid.contact || '-'}
                      </span>
                      {bid.contact && bid.contact !== '-' && (
                        <a
                          href={`https://wa.me/${bid.contact.replace(/\D/g, '').startsWith('0') ? '62' + bid.contact.replace(/\D/g, '').slice(1) : bid.contact.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 bg-white hover:bg-emerald-50 text-emerald-600 border border-slate-200 rounded-lg hover:border-emerald-200 transition-all shrink-0 ml-1"
                          title={t('Hubungi via WhatsApp')}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Unit Asset Snapshot */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 text-[11px] text-slate-600 flex justify-between items-center">
                  <span>{t('Status Unit')}: <strong className="text-slate-800">{asset.status}</strong></span>
                  <span>{t('Lokasi')}: <strong className="text-slate-800">{asset.location || '-'}</strong></span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(copyText);
                    setCopiedState(true);
                    setTimeout(() => setCopiedState(false), 2000);
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                    copiedState 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/60"
                  }`}
                >
                  {copiedState ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedState ? t('Berhasil Disalin!') : t('Salin Detail')}</span>
                </button>

                {bid.contact && bid.contact !== '-' && (
                  <a
                    href={`https://wa.me/${bid.contact.replace(/\D/g, '').startsWith('0') ? '62' + bid.contact.replace(/\D/g, '').slice(1) : bid.contact.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/10 hover:shadow-emerald-600/20"
                  >
                    <Phone className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setFocusedReportBid(null)}
                  className="py-2.5 px-5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  {t('Tutup')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default AdminReports;
