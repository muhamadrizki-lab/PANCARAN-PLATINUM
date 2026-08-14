import React, { useMemo } from 'react';
import { Asset, Bid } from '../types';
import { FileText, Download, FileSpreadsheet, TrendingUp, Package, DollarSign } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface AdminReportsProps {
  assets: Asset[];
}

const AdminReports: React.FC<AdminReportsProps> = ({ assets }) => {
  const { t } = useLanguage();
  
  const activeAssets = useMemo(() => assets.filter(a => a.status === 'Open'), [assets]);
  const soldAssets = useMemo(() => assets.filter(a => a.status === 'Sold'), [assets]);
  
  const totalSoldPrice = useMemo(() => {
    let total = 0;
    soldAssets.forEach(asset => {
      const assetBids = asset.bids || [];
      const highestBid = assetBids.length > 0 ? Math.max(...assetBids.map(b => b.amount)) : asset.startingPrice;
      total += highestBid;
    });
    return total;
  }, [soldAssets]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const generateExcel = () => {
    const soldData = soldAssets.map(asset => {
      const assetBids = asset.bids || [];
      const highestBid = assetBids.length > 0 ? Math.max(...assetBids.map(b => b.amount)) : asset.startingPrice;
      return {
        'ID Aset': asset.id,
        'No. Polisi / Unit': asset.plateNumber || '-',
        'Merek': asset.brand,
        'Kategori': asset.category,
        'Lokasi': asset.location,
        'Harga Dasar': asset.startingPrice,
        'Harga Terjual': highestBid
      };
    });

    const activeData = activeAssets.map(asset => {
      return {
        'ID Aset': asset.id,
        'No. Polisi / Unit': asset.plateNumber || '-',
        'Merek': asset.brand,
        'Kategori': asset.category,
        'Lokasi': asset.location,
        'Harga Dasar': asset.startingPrice
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
    doc.text(`Total Harga Terjual: ${formatCurrency(totalSoldPrice)}`, 40, 75);

    const soldBody = soldAssets.map(asset => {
      const assetBids = asset.bids || [];
      const highestBid = assetBids.length > 0 ? Math.max(...assetBids.map(b => b.amount)) : asset.startingPrice;
      return [
        asset.plateNumber || '-',
        asset.brand,
        asset.category,
        formatCurrency(asset.startingPrice),
        formatCurrency(highestBid)
      ];
    });

    (doc as any).autoTable({
      startY: 90,
      head: [['No. Polisi / Unit', 'Merek', 'Kategori', 'Harga Dasar', 'Harga Terjual']],
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
        formatCurrency(asset.startingPrice)
      ];
    });

    (doc as any).autoTable({
      startY: 80,
      head: [['No. Polisi / Unit', 'Merek', 'Kategori', 'Harga Dasar']],
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-500">{t('Total Aset Aktif')}</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">{activeAssets.length} <span className="text-sm font-normal text-slate-500">unit</span></p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-500">{t('Data Penjualan')}</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">{soldAssets.length} <span className="text-sm font-normal text-slate-500">{t('unit terjual')}</span></p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-500">{t('Total Harga Terjual')}</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalSoldPrice)}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">{t('Preview Data Penjualan Terakhir')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50/50 uppercase">
              <tr>
                <th className="px-6 py-3 font-semibold">{t('Aset')}</th>
                <th className="px-6 py-3 font-semibold">{t('Kategori')}</th>
                <th className="px-6 py-3 font-semibold">{t('Harga Dasar')}</th>
                <th className="px-6 py-3 font-semibold">{t('Harga Terjual')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {soldAssets.slice(0, 5).map(asset => {
                const assetBids = asset.bids || [];
                const highestBid = assetBids.length > 0 ? Math.max(...assetBids.map(b => b.amount)) : asset.startingPrice;
                return (
                  <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{asset.plateNumber || '-'}</p>
                      <p className="text-xs text-slate-500">{asset.brand}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                        {asset.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {formatCurrency(asset.startingPrice)}
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600">
                      {formatCurrency(highestBid)}
                    </td>
                  </tr>
                );
              })}
              {soldAssets.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    {t('Belum ada data penjualan')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
