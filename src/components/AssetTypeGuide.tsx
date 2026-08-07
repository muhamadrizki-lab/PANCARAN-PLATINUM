import React, { useState } from 'react';
import { useLanguage } from './LanguageContext';
import { Asset } from '../types';
import { 
  Truck, 
  Search, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Compass, 
  Calendar, 
  Activity, 
  MapPin, 
  ShieldCheck, 
  FileText,
  Clock,
  Briefcase,
  Layers2
} from 'lucide-react';

interface AssetTypeGuideProps {
  assets?: Asset[];
}

export default function AssetTypeGuide({ assets = [] }: AssetTypeGuideProps) {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const filteredData = assets.filter(item => {
    const term = searchQuery.toLowerCase();
    
    const name = item.name || '';
    const brand = item.brand || '';
    const category = item.category || '';
    const plateNumber = item.plateNumber || '';
    const location = item.location || '';
    const model = item.model || '';
    const series = item.series || '';
    
    return (
      name.toLowerCase().includes(term) ||
      brand.toLowerCase().includes(term) ||
      category.toLowerCase().includes(term) ||
      plateNumber.toLowerCase().includes(term) ||
      location.toLowerCase().includes(term) ||
      model.toLowerCase().includes(term) ||
      series.toLowerCase().includes(term)
    );
  });

  const isId = language === 'id';

  return (
    <div className="bg-white rounded-3xl border border-slate-200 border-l-[6px] border-l-blue-600 shadow-sm overflow-hidden mt-6" id="asset-type-guide-section">
      {/* Header Panel */}
      <div className="p-6 bg-slate-900 text-white relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Layers className="w-24 h-24 text-white" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-600 rounded-xl">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">
              {isId ? 'Eksplorasi Detail Aset' : 'Asset Specifications Explorer'}
            </span>
            <h2 className="text-lg font-extrabold text-white mt-0.5">
              {isId ? 'Spesifikasi & Informasi Detail Data Aset Aktif' : 'Active Asset Specifications & Detailed Information'}
            </h2>
          </div>
        </div>
        <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
          {isId 
            ? 'Menampilkan data dimensi kargo, konfigurasi gardan, masa berlaku dokumen legalitas (KEUR/STNK), serta spesifikasi detail seluruh armada yang aktif dalam sistem lelang Pancaran Group.'
            : 'Displays cargo dimensions, axle configuration, document validity (KEUR/STNK), and detailed specifications of all active fleets in the Pancaran Group auction system.'}
        </p>
      </div>

      {/* Control Search Bar */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder={isId ? 'Cari nama aset, merek, kategori, nomor polisi...' : 'Search asset name, brand, category, plate...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium text-slate-700 bg-white shadow-xs"
          />
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>{isId ? 'Klik baris armada untuk melihat spesifikasi mekanis & legalitas lengkap' : 'Click asset row to view full mechanical specs & legalities'}</span>
        </div>
      </div>

      {/* Responsive Table Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[750px]">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <th className="py-3.5 px-5 w-[25%]">{isId ? 'Armada / Kategori' : 'Asset / Category'}</th>
              <th className="py-3.5 px-4 w-[18%]">{isId ? 'No. Polisi & Tahun' : 'Plate No & Year'}</th>
              <th className="py-3.5 px-4 w-[20%]">{isId ? 'Dimensi Kargo' : 'Cargo Dimensions'}</th>
              <th className="py-3.5 px-4 w-[15%]">{isId ? 'Gardan / Ban' : 'Axle Config'}</th>
              <th className="py-3.5 px-4 w-[12%]">{isId ? 'Lokasi' : 'Location'}</th>
              <th className="py-3.5 px-4 w-[10%] text-right">{isId ? 'Detil' : 'Details'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <React.Fragment key={item.id}>
                  {/* Table Row */}
                  <tr 
                    onClick={() => toggleExpand(item.id)}
                    className={`cursor-pointer hover:bg-blue-50/20 transition-all ${
                      isExpanded ? 'bg-blue-50/40 font-medium' : ''
                    }`}
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg shrink-0 ${isExpanded ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 tracking-tight">
                            {item.name || `${item.brand} ${item.model || ''}`}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {item.brand} • {t(item.category)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs">
                      <p className="font-semibold text-slate-700 font-mono">{item.plateNumber || '-'}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{isId ? 'Tahun' : 'Year'} {item.modelYear || '-'}</p>
                    </td>
                    <td className="py-4 px-4 text-xs font-mono text-slate-600">
                      {item.dimensions || '-'}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-600 font-medium">
                      {item.axels ? `${item.axels} ${isId ? 'Gardan' : 'Axles'}` : '-'}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[100px]">{item.location}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button 
                        type="button"
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <tr className="bg-blue-50/15">
                      <td colSpan={6} className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-xs leading-relaxed animate-fade-in">
                          
                          {/* Col 1: Technical specs */}
                          <div className="md:col-span-4 space-y-3.5">
                            <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs">
                              <div className="flex items-center gap-1.5 mb-3">
                                <Activity className="w-4 h-4 text-blue-600" />
                                <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                                  {isId ? 'Spesifikasi Mekanis' : 'Mechanical Specs'}
                                </span>
                              </div>
                              <div className="space-y-2 font-medium text-slate-600">
                                <div className="flex justify-between py-1 border-b border-slate-50">
                                  <span className="text-slate-400">{isId ? 'Model' : 'Model'}</span>
                                  <span className="text-slate-800 font-semibold">{item.model || '-'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-50">
                                  <span className="text-slate-400">{isId ? 'Seri (Series)' : 'Series'}</span>
                                  <span className="text-slate-800 font-semibold">{item.series || '-'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-50">
                                  <span className="text-slate-400">{isId ? 'Konfigurasi Gardan' : 'Axle Config'}</span>
                                  <span className="text-slate-800 font-semibold">{item.axels || '-'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-50">
                                  <span className="text-slate-400">{isId ? 'Dimensi Kargo' : 'Cargo Dimensions'}</span>
                                  <span className="text-slate-800 font-semibold font-mono">{item.dimensions || '-'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-50">
                                  <span className="text-slate-400">{isId ? 'Warna Unit' : 'Vehicle Color'}</span>
                                  <span className="text-slate-800 font-semibold">{item.vehicleColour || '-'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-50">
                                  <span className="text-slate-400">{isId ? 'Bahan Bakar' : 'Fuel Type'}</span>
                                  <span className="text-slate-800 font-semibold">{item.fuelType || '-'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-50">
                                  <span className="text-slate-400">{isId ? 'Tenaga Mesin' : 'Horsepower'}</span>
                                  <span className="text-slate-800 font-semibold">{item.horsepower || '-'}</span>
                                </div>
                                <div className="flex justify-between py-1">
                                  <span className="text-slate-400">Odometer</span>
                                  <span className="text-slate-800 font-semibold font-mono">{item.odometer ? `${item.odometer} KM` : '-'}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Col 2: Legality & Documents */}
                          <div className="md:col-span-4 space-y-3.5">
                            <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs">
                              <div className="flex items-center gap-1.5 mb-3">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                                  {isId ? 'Legalitas & Dokumen' : 'Legality & Documents'}
                                </span>
                              </div>
                              <div className="space-y-2 font-medium text-slate-600">
                                <div className="flex justify-between py-1 border-b border-slate-50">
                                  <span className="text-slate-400">{isId ? 'Kondisi Unit' : 'Unit Condition'}</span>
                                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">{item.condition || '-'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-50">
                                  <span className="text-slate-400">{isId ? 'Masa Berlaku KEUR' : 'KEUR Valid Until'}</span>
                                  <span className="text-slate-800 font-semibold font-mono">{item.keurValidUntil || '-'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-50">
                                  <span className="text-slate-400">{isId ? 'Masa STNK (Plat)' : 'STNK Plate Valid'}</span>
                                  <span className="text-slate-800 font-semibold font-mono">{item.stnkPlateValidUntil || '-'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-50">
                                  <span className="text-slate-400">{isId ? 'Pajak STNK Tahunan' : 'Annual STNK Tax'}</span>
                                  <span className="text-slate-800 font-semibold font-mono">{item.stnkTaxValidUntil || '-'}</span>
                                </div>
                                <div className="flex justify-between py-1">
                                  <span className="text-slate-400">Status</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    item.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {item.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Col 3: Attachment Chassis details (if any) */}
                          <div className="md:col-span-4 space-y-3.5">
                            {item.haveAttachment ? (
                              <div className="bg-blue-50/20 border border-blue-200/50 rounded-2xl p-4 shadow-xs">
                                <div className="flex items-center gap-1.5 mb-3">
                                  <Layers2 className="w-4 h-4 text-blue-600" />
                                  <span className="font-extrabold text-blue-900 text-xs uppercase tracking-wider">
                                    {isId ? 'Data Karoseri Buntut' : 'Attachment Details'}
                                  </span>
                                </div>
                                <div className="space-y-2 font-medium text-slate-600">
                                  <div className="flex justify-between py-1 border-b border-blue-100/30">
                                    <span className="text-slate-400">{isId ? 'Kategori Buntut' : 'Attachment Cat'}</span>
                                    <span className="text-blue-900 font-semibold">{item.attachmentCategory || '-'}</span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-blue-100/30">
                                    <span className="text-slate-400">Type</span>
                                    <span className="text-blue-900 font-semibold">{item.attachmentType || '-'}</span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-blue-100/30">
                                    <span className="text-slate-400">{isId ? 'Gardan Buntut' : 'Attachment Axles'}</span>
                                    <span className="text-blue-900 font-semibold">{item.attachmentAxels || '-'}</span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-blue-100/30">
                                    <span className="text-slate-400">{isId ? 'Tahun Buntut' : 'Built Year'}</span>
                                    <span className="text-blue-900 font-semibold">{item.attachmentYearBuilt || '-'}</span>
                                  </div>
                                  <div className="flex justify-between py-1">
                                    <span className="text-slate-400">Dimensi (PxLxT)</span>
                                    <span className="text-blue-900 font-semibold font-mono">
                                      {item.attachmentLength || '-'}x{item.attachmentWidth || '-'}x{item.attachmentHeight || '-'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-slate-50/50 border border-slate-200/50 rounded-2xl p-5 text-center flex flex-col items-center justify-center h-full min-h-[140px]">
                                <Compass className="w-6 h-6 text-slate-300 mb-2" />
                                <p className="text-[11px] text-slate-400 font-medium">
                                  {isId 
                                    ? 'Tidak memiliki karoseri buntut tambahan'
                                    : 'No additional attachment/chassis registered'}
                                </p>
                              </div>
                            )}
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {filteredData.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                  {isId ? 'Tidak ada data aset yang terdaftar atau cocok dengan pencarian.' : 'No asset data registered or matches your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-2">
        <span>PT Pancaran Logistics • {isId ? 'Sistem Inventarisasi Spesifikasi & Legalitas Armada' : 'Fleet Specifications & Legality Inventory'}</span>
        <span className="font-mono text-[9px] bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded-md">V1.5-2026</span>
      </div>
    </div>
  );
}
