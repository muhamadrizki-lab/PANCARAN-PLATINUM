import React, { useState, useEffect } from 'react';
import { Asset, Bid, AdminUser, RegisteredUser, normalizeCategory } from '../types';
import AssetTypeGuide from './AssetTypeGuide';
import { 
  Truck, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Users, 
  Calendar, 
  TrendingUp, 
  ChevronRight,
  Search,
  Filter,
  Shield,
  Globe,
  FileText,
  Layers,
  Wrench,
  Building2,
  Package,
  Info,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ExternalLink,
  Eye,
  X,
  Printer,
  Sparkles,
  Tag,
  Sliders
} from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { OfficialWinnerLetterModal } from './OfficialWinnerLetterModal';

interface AdminDashboardProps {
  assets: Asset[];
  onSelectAsset: (assetId: string) => void;
  admins?: AdminUser[];
  registeredUsers?: RegisteredUser[];
}

export default function AdminDashboard({ 
  assets, 
  onSelectAsset,
  admins = [],
  registeredUsers = []
}: AdminDashboardProps) {
  const { t, language } = useLanguage();
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | 'Vehicle' | 'Used part' | 'Property' | 'Miscellaneous'>('Vehicle');
  const [detailedCategoryModal, setDetailedCategoryModal] = useState<'all' | 'Vehicle' | 'Used part' | 'Property' | 'Miscellaneous' | null>(null);
  const [detailCategorySearch, setDetailCategorySearch] = useState('');
  const [detailCategoryStatus, setDetailCategoryStatus] = useState<'all' | 'Sold' | 'Open' | 'Lunas' | 'Belum Lunas'>('all');
  const [surveyFilter, setSurveyFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyItem | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeMetricModal, setActiveMetricModal] = useState<'assets' | 'sold' | 'open' | 'bidders' | 'admins' | 'users' | 'omzet' | 'lunas' | 'belum_lunas' | null>(null);
  const [metricSearchQuery, setMetricSearchQuery] = useState('');
  const [selectedWinnerLetterAsset, setSelectedWinnerLetterAsset] = useState<Asset | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Category counts from full asset database
  const totalAllCount = assets.length;
  const vehicleCount = assets.filter(a => normalizeCategory(a.category) === 'Vehicle').length;
  const usedPartCount = assets.filter(a => normalizeCategory(a.category) === 'Used part').length;
  const propertyCount = assets.filter(a => normalizeCategory(a.category) === 'Property').length;
  const miscCount = assets.filter(a => normalizeCategory(a.category) === 'Miscellaneous').length;

  // Filter assets dynamically based on selected category
  const displayedAssets = assets.filter(asset => {
    if (selectedCategoryFilter === 'all') return true;
    const norm = normalizeCategory(asset.category);
    return norm === selectedCategoryFilter;
  });

  // 1. Metric calculations based on filtered displayedAssets
  const totalAssets = displayedAssets.length;
  const soldAssets = displayedAssets.filter(a => a.status === 'Sold');
  const totalSold = soldAssets.length;
  const totalOpen = displayedAssets.filter(a => a.status === 'Open').length;

  const totalOmzet = soldAssets.reduce((sum, asset) => {
    const highestVal = asset.bids && asset.bids.length > 0 ? Math.max(...asset.bids.map(b => Number(b.price) || 0)) : (Number(asset.startingPrice) || 0);
    return sum + (Number(highestVal) || 0);
  }, 0);

  const lunasCount = soldAssets.filter(a => a.paymentStatus === 'Lunas').length;
  const belumLunasCount = soldAssets.filter(a => a.paymentStatus !== 'Lunas').length;

  // Highest price calculation (from starting prices or bids)
  const maxPrice = displayedAssets.reduce((max, asset) => {
    const validBids = (asset.bids || []).map(b => Number(b.price) || 0);
    const highestVal = Math.max(Number(asset.startingPrice) || 0, Number(asset.highestBid) || 0, ...validBids, 0);
    return highestVal > max ? highestVal : max;
  }, 0);

  // Total unique bidders based on emails/names across filtered bids
  const uniqueBidders = new Set<string>();
  displayedAssets.forEach(asset => {
    (asset.bids || []).forEach(bid => {
      uniqueBidders.add(bid.email.toLowerCase());
    });
  });
  const totalBidders = uniqueBidders.size;

  // 2. Total assets per brand calculations for displayed category
  const brandCounts: { [key: string]: number } = {};
  displayedAssets.forEach(asset => {
    const brandKey = asset.brand || 'Lainnya';
    brandCounts[brandKey] = (brandCounts[brandKey] || 0) + 1;
  });

  const brandData = Object.entries(brandCounts).map(([brand, count]) => ({
    brand,
    count,
    percentage: totalAssets > 0 ? Math.round((count / totalAssets) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  // 3. Extract all scheduled surveys for displayed category
  interface SurveyItem {
    assetId: string;
    assetName: string;
    bidderName: string;
    bidderContact: string;
    bidderEmail: string;
    date: string;
    time: string;
    bidPrice: number;
  }

  const allSurveys: SurveyItem[] = [];
  displayedAssets.forEach(asset => {
    (asset.bids || []).forEach(bid => {
      if (bid.scheduleSurveyDate) {
        allSurveys.push({
          assetId: asset.id,
          assetName: asset.name,
          bidderName: bid.name,
          bidderContact: bid.contact,
          bidderEmail: bid.email,
          date: bid.scheduleSurveyDate,
          time: bid.scheduleSurveyTime || 'N/A',
          bidPrice: bid.price
        });
      }
    });
  });

  // Sort surveys by date/time ascending
  const sortedSurveys = allSurveys.sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time === 'N/A' ? '00:00' : a.time}`);
    const dateB = new Date(`${b.date}T${b.time === 'N/A' ? '00:00' : b.time}`);
    return dateA.getTime() - dateB.getTime();
  });

  // Filter surveys
  const todayStr = new Date().toISOString().split('T')[0];
  const filteredSurveys = sortedSurveys.filter(survey => {
    // Apply search query
    const matchesSearch = 
      survey.bidderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      survey.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      survey.assetId.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch && searchQuery) return false;

    // Apply date filter (filter tanggal pengisian)
    if (filterDate && survey.date !== filterDate) return false;

    if (surveyFilter === 'upcoming') {
      return survey.date >= todayStr;
    } else if (surveyFilter === 'past') {
      return survey.date < todayStr;
    }
    return true;
  });

  // Format currency
  const formatIDR = (value: number | undefined | null) => {
    const num = typeof value === 'number' && !isNaN(value) ? value : (Number(value) || 0);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="space-y-8 animate-fade-in" id="admin-dashboard-container">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-blue-900/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        {/* Soft, glowing ambient lights */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>
        
        {/* Traditional Botanical Batik Wallpaper Background Accent */}
        <div className="absolute inset-0 opacity-[0.22] pointer-events-none z-0 select-none overflow-hidden mix-blend-overlay">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="batikBotanicalDashboard" width="160" height="160" patternUnits="userSpaceOnUse">
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
            <rect width="100%" height="100%" fill="url(#batikBotanicalDashboard)" />
          </svg>
        </div>
        
        <div className="relative z-10 space-y-2 max-w-2xl">
          <span className="text-[9px] uppercase tracking-widest bg-blue-500/20 text-blue-300 font-extrabold px-3 py-1 rounded-full border border-blue-500/30 mb-2 inline-block">
            {t('Sistem Manajemen Internal')}
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">
            {t('Dashboard Pancaran Lelang')}
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            {t('Halo Admin, kelola aset lelang komersial, pantau penawaran harga, dan atur survei fisik dalam satu portal terpadu.')}
          </p>
        </div>
        
        <div className="relative overflow-hidden bg-slate-950/60 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-blue-500/20 text-xs md:text-sm font-mono self-stretch md:self-auto text-center md:text-left flex flex-col justify-center shadow-inner shadow-blue-500/5 z-10 shrink-0 min-w-[200px]">
          <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">{t('Waktu Sistem (WIB)')}</p>
          <p className="font-semibold text-white mt-1.5">
            {currentTime.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-blue-400 font-extrabold mt-1 text-base md:text-lg tracking-widest drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]">
            {currentTime.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
          </p>
        </div>
      </div>

      {/* Category Filter Action Grid (Vehicle, Used Part, Property, Miscellaneous) */}
      <div className="space-y-3.5" id="category-filter-dashboard">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span>{t('Kategori Aset Lelang')}</span>
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full lowercase tracking-normal">
                {displayedAssets.length} {t('unit aktif')}
              </span>
            </h2>
            {selectedCategoryFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('all')}
                className="text-[11px] text-slate-500 hover:text-blue-600 font-medium underline cursor-pointer"
              >
                {t('Tampilkan Semua')} ({totalAllCount})
              </button>
            )}
          </div>
          
          <button
            type="button"
            onClick={() => {
              setDetailedCategoryModal(selectedCategoryFilter);
              setDetailCategorySearch('');
              setDetailCategoryStatus('all');
            }}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-blue-700 border border-slate-200/90 hover:border-blue-300 rounded-xl text-xs font-bold shadow-2xs hover:shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer group ml-auto"
            title={t('Buka Analisa Detail Kategori')}
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
            <span>{t('Buka Detail Dashboard Kategori')}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
          </button>
        </div>

        {/* 4 Category Cards matching user screenshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Vehicle */}
          <div
            onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === 'Vehicle' ? 'all' : 'Vehicle')}
            className={`rounded-2xl p-4 sm:p-5 transition-all cursor-pointer select-none relative flex flex-col justify-between ${
              selectedCategoryFilter === 'Vehicle'
                ? 'bg-white border-2 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                : 'bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                selectedCategoryFilter === 'Vehicle' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
              }`}>
                <Truck className="w-5 h-5" />
              </div>
              {selectedCategoryFilter === 'Vehicle' && (
                <span className="w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-blue-100 shrink-0"></span>
              )}
            </div>
            <div className="mt-3.5">
              <h3 className="text-base font-bold text-slate-900 leading-snug">Vehicle</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{t('Kendaraan & Armada')}</p>
            </div>
          </div>

          {/* 2. Used Part */}
          <div
            onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === 'Used part' ? 'all' : 'Used part')}
            className={`rounded-2xl p-4 sm:p-5 transition-all cursor-pointer select-none relative flex flex-col justify-between ${
              selectedCategoryFilter === 'Used part'
                ? 'bg-white border-2 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                : 'bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                selectedCategoryFilter === 'Used part' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
              }`}>
                <Wrench className="w-5 h-5" />
              </div>
              {selectedCategoryFilter === 'Used part' && (
                <span className="w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-blue-100 shrink-0"></span>
              )}
            </div>
            <div className="mt-3.5">
              <h3 className="text-base font-bold text-slate-900 leading-snug">Used Part</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{t('Suku Cadang / Sparepart')}</p>
            </div>
          </div>

          {/* 3. Property */}
          <div
            onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === 'Property' ? 'all' : 'Property')}
            className={`rounded-2xl p-4 sm:p-5 transition-all cursor-pointer select-none relative flex flex-col justify-between ${
              selectedCategoryFilter === 'Property'
                ? 'bg-white border-2 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                : 'bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                selectedCategoryFilter === 'Property' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
              }`}>
                <Building2 className="w-5 h-5" />
              </div>
              {selectedCategoryFilter === 'Property' && (
                <span className="w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-blue-100 shrink-0"></span>
              )}
            </div>
            <div className="mt-3.5">
              <h3 className="text-base font-bold text-slate-900 leading-snug">Property</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{t('Tanah & Properti')}</p>
            </div>
          </div>

          {/* 4. Miscellaneous */}
          <div
            onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === 'Miscellaneous' ? 'all' : 'Miscellaneous')}
            className={`rounded-2xl p-4 sm:p-5 transition-all cursor-pointer select-none relative flex flex-col justify-between ${
              selectedCategoryFilter === 'Miscellaneous'
                ? 'bg-white border-2 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                : 'bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                selectedCategoryFilter === 'Miscellaneous' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
              }`}>
                <Package className="w-5 h-5" />
              </div>
              {selectedCategoryFilter === 'Miscellaneous' && (
                <span className="w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-blue-100 shrink-0"></span>
              )}
            </div>
            <div className="mt-3.5">
              <h3 className="text-base font-bold text-slate-900 leading-snug">Miscellaneous</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{t('Aset Lain-lain / Peralatan')}</p>
            </div>
          </div>
        </div>

        {/* Notice when Category is Empty */}
        {totalAssets === 0 && (
          <div className="p-3.5 bg-amber-50/90 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {t('Data aktual untuk kategori')} <strong>{selectedCategoryFilter}</strong> {t('saat ini masih kosong (0 unit lelang di database).')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setDetailedCategoryModal(selectedCategoryFilter);
                setDetailCategorySearch('');
                setDetailCategoryStatus('all');
              }}
              className="text-amber-800 hover:text-amber-950 font-bold underline shrink-0 cursor-pointer"
            >
              {t('Lihat Analisa & Format Kategori')}
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4" id="stats-metric-grid">
        {/* Total Asset */}
        <div 
          onClick={() => { setActiveMetricModal('assets'); setMetricSearchQuery(''); }}
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-[6px] border-l-slate-300 flex flex-col justify-between h-full min-h-[140px] hover:shadow-md cursor-pointer hover:border-slate-300 hover:border-l-blue-500 hover:scale-[1.02] active:scale-[0.99] transition-all duration-300"
        >
          <div className="flex justify-between items-start gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider line-clamp-2 min-h-[32px]">{t('Total Asset')}</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-slate-800 leading-none">{totalAssets}</p>
            <span className="text-xs text-blue-600 font-medium block mt-1.5 truncate flex items-center gap-1">
              <span>{t('Unit di Database')}</span>
              <span className="text-[9px] bg-blue-50 text-blue-700 px-1 py-0.2 rounded font-mono font-bold">VIEW</span>
            </span>
          </div>
        </div>

        {/* Total Sold */}
        <div 
          onClick={() => { setActiveMetricModal('sold'); setMetricSearchQuery(''); }}
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-[6px] border-l-slate-300 flex flex-col justify-between h-full min-h-[140px] hover:shadow-md cursor-pointer hover:border-slate-300 hover:border-l-emerald-500 hover:scale-[1.02] active:scale-[0.99] transition-all duration-300"
        >
          <div className="flex justify-between items-start gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider line-clamp-2 min-h-[32px]">{t('Aset Terjual')}</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-emerald-600 leading-none">{totalSold}</p>
            <span className="text-xs text-emerald-600 font-medium block mt-1.5 truncate flex items-center justify-between gap-1">
              <span>{totalAssets > 0 ? Math.round((totalSold / totalAssets) * 100) : 0}% {t('Sukses Lelang')}</span>
              <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded font-mono font-bold">VIEW</span>
            </span>
          </div>
        </div>

        {/* Total Open */}
        <div 
          onClick={() => { setActiveMetricModal('open'); setMetricSearchQuery(''); }}
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-[6px] border-l-slate-300 flex flex-col justify-between h-full min-h-[140px] hover:shadow-md cursor-pointer hover:border-slate-300 hover:border-l-blue-400 hover:scale-[1.02] active:scale-[0.99] transition-all duration-300"
        >
          <div className="flex justify-between items-start gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider line-clamp-2 min-h-[32px]">{t('Aset Aktif')}</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-blue-600 leading-none">{totalOpen}</p>
            <span className="text-xs text-blue-600 font-medium block mt-1.5 truncate flex items-center justify-between gap-1">
              <span>{t('Menerima Penawaran')}</span>
              <span className="text-[9px] bg-blue-50 text-blue-700 px-1 py-0.2 rounded font-mono font-bold">VIEW</span>
            </span>
          </div>
        </div>

        {/* Total Bidder */}
        <div 
          onClick={() => { setActiveMetricModal('bidders'); setMetricSearchQuery(''); }}
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-[6px] border-l-slate-300 flex flex-col justify-between h-full min-h-[140px] hover:shadow-md cursor-pointer hover:border-slate-300 hover:border-l-purple-500 hover:scale-[1.02] active:scale-[0.99] transition-all duration-300"
        >
          <div className="flex justify-between items-start gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider line-clamp-2 min-h-[32px]">{t('Total Bidder')}</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-slate-800 leading-none">{totalBidders}</p>
            <span className="text-xs text-purple-600 font-medium block mt-1.5 truncate flex items-center justify-between gap-1">
              <span>{t('Partisipan Unik')}</span>
              <span className="text-[9px] bg-purple-50 text-purple-700 px-1 py-0.2 rounded font-mono font-bold">VIEW</span>
            </span>
          </div>
        </div>

        {/* Total Akses Internal */}
        <div 
          onClick={() => { setActiveMetricModal('admins'); setMetricSearchQuery(''); }}
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-[6px] border-l-slate-300 flex flex-col justify-between h-full min-h-[140px] hover:shadow-md cursor-pointer hover:border-slate-300 hover:border-l-slate-600 hover:scale-[1.02] active:scale-[0.99] transition-all duration-300"
        >
          <div className="flex justify-between items-start gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider line-clamp-2 min-h-[32px]">{t('Akses Internal')}</span>
            <div className="p-2 bg-slate-50 text-slate-500 rounded-xl shrink-0">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-slate-700 leading-none">{admins.length}</p>
            <span className="text-xs text-slate-500 font-medium block mt-1.5 truncate flex items-center justify-between gap-1">
              <span>{t('Administrator Aktif')}</span>
              <span className="text-[9px] bg-slate-100 text-slate-700 px-1 py-0.2 rounded font-mono font-bold">VIEW</span>
            </span>
          </div>
        </div>

        {/* Total Akses Eksternal */}
        <div 
          onClick={() => { setActiveMetricModal('users'); setMetricSearchQuery(''); }}
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-[6px] border-l-slate-300 flex flex-col justify-between h-full min-h-[140px] hover:shadow-md cursor-pointer hover:border-slate-300 hover:border-l-blue-900 hover:scale-[1.02] active:scale-[0.99] transition-all duration-300"
        >
          <div className="flex justify-between items-start gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider line-clamp-2 min-h-[32px]">{t('Akses Eksternal')}</span>
            <div className="p-2 bg-slate-50 text-slate-500 rounded-xl shrink-0">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-slate-700 leading-none">{registeredUsers.length}</p>
            <span className="text-xs text-slate-500 font-medium block mt-1.5 truncate flex items-center justify-between gap-1">
              <span>{t('Pengguna Terdaftar')}</span>
              <span className="text-[9px] bg-slate-100 text-slate-700 px-1 py-0.2 rounded font-mono font-bold">VIEW</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="stats-financial-grid">
        {/* Total Omzet */}
        <div 
          onClick={() => {
            setActiveMetricModal('omzet');
            setMetricSearchQuery('');
          }}
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-[6px] border-l-slate-300 flex flex-col justify-between h-full min-h-[140px] hover:shadow-md cursor-pointer hover:border-slate-300 hover:border-l-indigo-500 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 group"
          title={t('Klik untuk melihat rincian omzet')}
        >
          <div className="flex justify-between items-start gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider line-clamp-2 min-h-[32px] group-hover:text-indigo-600 transition-colors">{t('Total Omzet Terjual')}</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-indigo-600 leading-none">{formatIDR(totalOmzet)}</p>
            <span className="text-xs text-indigo-600 font-medium block mt-1.5 truncate flex items-center gap-1">
              <span>{t('Dari')} {totalSold} {t('Unit Terjual')}</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">&rarr;</span>
            </span>
          </div>
        </div>

        {/* Lunas */}
        <div 
          onClick={() => {
            setActiveMetricModal('lunas');
            setMetricSearchQuery('');
          }}
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-[6px] border-l-slate-300 flex flex-col justify-between h-full min-h-[140px] hover:shadow-md cursor-pointer hover:border-slate-300 hover:border-l-emerald-600 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 group"
          title={t('Klik untuk melihat unit yang sudah lunas')}
        >
          <div className="flex justify-between items-start gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider line-clamp-2 min-h-[32px] group-hover:text-emerald-600 transition-colors">{t('Pembayaran Lunas')}</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-emerald-600 leading-none">{lunasCount}</p>
            <span className="text-xs text-emerald-600 font-medium block mt-1.5 truncate flex items-center gap-1">
              <span>{t('Unit Terjual (Lunas)')}</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">&rarr;</span>
            </span>
          </div>
        </div>

        {/* Belum Lunas */}
        <div 
          onClick={() => {
            setActiveMetricModal('belum_lunas');
            setMetricSearchQuery('');
          }}
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-[6px] border-l-slate-300 flex flex-col justify-between h-full min-h-[140px] hover:shadow-md cursor-pointer hover:border-slate-300 hover:border-l-amber-500 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 group"
          title={t('Klik untuk melihat unit yang belum lunas')}
        >
          <div className="flex justify-between items-start gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider line-clamp-2 min-h-[32px] group-hover:text-amber-600 transition-colors">{t('Belum Lunas')}</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-amber-600 leading-none">{belumLunasCount}</p>
            <span className="text-xs text-amber-600 font-medium block mt-1.5 truncate flex items-center gap-1">
              <span>{t('Unit Terjual (Belum Lunas)')}</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">&rarr;</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Layout - Charts & Survey */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Brand Distribution Chart (Left/2-cols on desktop) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 border-l-[6px] border-l-slate-300 shadow-sm space-y-6 lg:col-span-1" id="brand-distribution-section">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{t('Total Aset per Brand')}</h2>
            <p className="text-xs text-slate-500 mt-1">{t('Porsi distribusi armada lelang Pancaran Logistics berdasarkan merek manufaktur.')}</p>
          </div>

          <div className="space-y-4">
            {brandData.map((item) => (
              <div key={item.brand} className="space-y-2">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-slate-700">{item.brand}</span>
                  <span className="text-slate-500">{item.count} {t('Unit')} <span className="text-slate-400">({item.percentage}%)</span></span>
                </div>
                {/* Horizontal Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      item.brand === 'Hino' ? 'bg-blue-600' :
                      item.brand === 'Isuzu' ? 'bg-cyan-500' :
                      item.brand === 'Fuso' ? 'bg-amber-500' :
                      item.brand === 'Scania' ? 'bg-rose-500' :
                      'bg-slate-500'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}

            {brandData.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                {t('Belum ada data armada/brand tersedia.')}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
            <span>{t('Per 2026. Semua aset fisik di pool internal.')}</span>
          </div>
        </div>

        {/* Schedule Survey (Right/2-cols on desktop) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 border-l-[6px] border-l-slate-300 shadow-sm space-y-6 lg:col-span-2" id="schedule-survey-section">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" /> {t('Jadwal Survei Fisik')}
              </h2>
              <p className="text-xs text-slate-500 mt-1">{t('Daftar booking kunjungan calon pembeli untuk inspeksi fisik kendaraan.')}</p>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg self-stretch sm:self-auto">
              <button
                onClick={() => setSurveyFilter('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  surveyFilter === 'all' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('Semua')}
              </button>
              <button
                onClick={() => setSurveyFilter('upcoming')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  surveyFilter === 'upcoming' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('Mendatang')}
              </button>
              <button
                onClick={() => setSurveyFilter('past')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  surveyFilter === 'past' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('Riwayat')}
              </button>
            </div>
          </div>

          {/* Search bar & Date filter inside surveys */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-7 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('Cari nama bidder, brand, atau armada...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 cursor-pointer"
                    title={t('Hapus')}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                type="button"
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all flex items-center gap-1 cursor-pointer shrink-0"
                onClick={() => {
                  const inputEl = document.querySelector('input[placeholder="Cari nama bidder, brand, atau armada..."]') as HTMLInputElement;
                  if (inputEl) inputEl.focus();
                }}
              >
                <Search className="w-3.5 h-3.5" />
                <span>{t('Cari')}</span>
              </button>
            </div>
            <div className="relative md:col-span-5 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 bg-white"
                />
              </div>
              {filterDate && (
                <button
                  onClick={() => setFilterDate('')}
                  className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-100 transition-colors"
                  title="Reset Filter Tanggal"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Survey List */}
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {filteredSurveys.map((survey, index) => {
              const isUpcoming = survey.date >= todayStr;
              return (
                <div 
                  key={`${survey.assetId}-${survey.bidderEmail}-${index}`}
                  className="p-4 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50/50 hover:bg-white transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group cursor-pointer shadow-sm hover:shadow-md"
                  onClick={() => setSelectedSurvey(survey)}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                        {survey.assetId}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isUpcoming ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isUpcoming ? t('Mendatang') : t('Selesai')}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">{survey.assetName}</h3>
                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                      <span>{t('Bidder')}: <strong className="text-slate-800 font-bold">{survey.bidderName}</strong> ({survey.bidderContact})</span>
                      <span>Email: <strong className="text-slate-800 font-bold">{survey.bidderEmail}</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end gap-2 shrink-0 w-full md:w-auto border-t md:border-t-0 pt-2 md:pt-0">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{survey.date} @ {survey.time} WIB</span>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-3 w-full">
                      <span className="text-xs text-slate-900 font-bold">Bidding: {formatIDR(survey.bidPrice)}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAsset(survey.assetId);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-all"
                      >
                        {t('Lihat Aset')} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredSurveys.length === 0 && (
              <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
                {t('Tidak ada jadwal survei fisik ditemukan.')}
              </div>
            )}
          </div>
        </div>
      </div>

      <AssetTypeGuide assets={displayedAssets} />

      {/* Detail Survey Modal - Large & Focused */}
      {selectedSurvey && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setSelectedSurvey(null)}
        >
          <div 
            className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 relative">
              <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-600/30 text-blue-300 px-2.5 py-1 rounded-full border border-blue-500/20">
                {t('Detail Jadwal Survei')}
              </span>
              <h3 className="text-xl font-bold mt-3 leading-snug">{selectedSurvey.assetName}</h3>
              <p className="text-xs font-mono text-slate-300 mt-1">{t('ID Asset')}: <span className="font-bold text-white">{selectedSurvey.assetId}</span></p>
              
              <button 
                onClick={() => setSelectedSurvey(null)}
                className="absolute top-6 right-6 text-slate-300 hover:text-white transition-colors p-1 bg-slate-800/80 hover:bg-slate-800 rounded-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Date & Time display - TAMPIL BESAR DAN FOKUS */}
              <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100 flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-xl">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">{t('WAKTU SURVEI FISIK')}</span>
                  <strong className="text-slate-900 font-bold text-lg block mt-0.5">
                    {selectedSurvey.date} @ {selectedSurvey.time} WIB
                  </strong>
                </div>
              </div>

              {/* Bidder Info */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('Informasi Calon Pembeli / Bidder')}</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider mb-0.5">{t('Nama Lengkap')}</span>
                    <strong className="text-slate-900 text-base font-bold">{selectedSurvey.bidderName}</strong>
                  </div>
                  
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider mb-0.5">{t('Kontak / No HP')}</span>
                    <strong className="text-slate-900 text-base font-bold">{selectedSurvey.bidderContact}</strong>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 sm:col-span-2">
                    <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider mb-0.5">{t('Alamat Email')}</span>
                    <strong className="text-slate-900 text-base font-bold break-all">{selectedSurvey.bidderEmail}</strong>
                  </div>
                </div>
              </div>

              {/* Bidding Amount */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">{t('Nilai Penawaran / Bidding')}</span>
                  <strong className="text-emerald-600 text-xl font-bold mt-1 block">
                    {formatIDR(selectedSurvey.bidPrice)}
                  </strong>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onSelectAsset(selectedSurvey.assetId);
                      setSelectedSurvey(null);
                    }}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
                  >
                    {t('Lihat Detail Unit')} <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedSurvey(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors border border-slate-200/60"
                  >
                    {t('Tutup')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Metric Detail Popups */}
      {activeMetricModal && (() => {
        // Prepare bidders data from displayedAssets
        const uniqueBiddersMap: { 
          [email: string]: { 
            name: string; 
            contact: string; 
            email: string; 
            bidCount: number; 
            maxBidPrice: number; 
            assetsBid: { assetId: string; assetName: string; price: number; timestamp?: string }[] 
          } 
        } = {};

        displayedAssets.forEach(asset => {
          (asset.bids || []).forEach(bid => {
            const emailLower = bid.email.toLowerCase();
            if (!uniqueBiddersMap[emailLower]) {
              uniqueBiddersMap[emailLower] = {
                name: bid.name,
                contact: bid.contact,
                email: bid.email,
                bidCount: 0,
                maxBidPrice: 0,
                assetsBid: []
              };
            }
            uniqueBiddersMap[emailLower].bidCount += 1;
            if (bid.price > uniqueBiddersMap[emailLower].maxBidPrice) {
              uniqueBiddersMap[emailLower].maxBidPrice = bid.price;
            }
            
            const existingAssetBid = uniqueBiddersMap[emailLower].assetsBid.find(a => a.assetId === asset.id);
            if (!existingAssetBid) {
              uniqueBiddersMap[emailLower].assetsBid.push({
                assetId: asset.id,
                assetName: asset.name,
                price: bid.price,
                timestamp: bid.timestamp
              });
            } else if (bid.price > existingAssetBid.price) {
              existingAssetBid.price = bid.price;
              existingAssetBid.timestamp = bid.timestamp;
            }
          });
        });
        const biddersList = Object.values(uniqueBiddersMap);

        // Filter details based on active modal
        let modalTitle = '';
        let modalColorClass = '';
        let modalIcon = null;
        let contentList = [];

        if (activeMetricModal === 'assets') {
          modalTitle = t('Daftar Seluruh Aset');
          modalColorClass = 'bg-blue-600';
          modalIcon = <Truck className="w-5 h-5 text-blue-100" />;
          contentList = displayedAssets.filter(asset => 
            asset.name.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            asset.brand.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            asset.category.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            (asset.plateNumber || '').toLowerCase().includes(metricSearchQuery.toLowerCase())
          );
        } else if (activeMetricModal === 'sold') {
          modalTitle = t('Daftar Aset Terjual');
          modalColorClass = 'bg-emerald-600';
          modalIcon = <CheckCircle className="w-5 h-5 text-emerald-100" />;
          contentList = displayedAssets.filter(asset => asset.status === 'Sold').filter(asset => 
            asset.name.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            asset.brand.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            asset.category.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            (asset.plateNumber || '').toLowerCase().includes(metricSearchQuery.toLowerCase())
          );
        } else if (activeMetricModal === 'open') {
          modalTitle = t('Daftar Aset Aktif');
          modalColorClass = 'bg-blue-500';
          modalIcon = <Clock className="w-5 h-5 text-blue-100" />;
          contentList = displayedAssets.filter(asset => asset.status === 'Open').filter(asset => 
            asset.name.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            asset.brand.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            asset.category.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            (asset.plateNumber || '').toLowerCase().includes(metricSearchQuery.toLowerCase())
          );
        } else if (activeMetricModal === 'omzet') {
          modalTitle = t('Rincian Omzet Penjualan');
          modalColorClass = 'bg-indigo-600';
          modalIcon = <DollarSign className="w-5 h-5 text-indigo-100" />;
          contentList = displayedAssets.filter(asset => asset.status === 'Sold').filter(asset => 
            asset.name.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            asset.brand.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            asset.category.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            (asset.plateNumber || '').toLowerCase().includes(metricSearchQuery.toLowerCase())
          );
        } else if (activeMetricModal === 'lunas') {
          modalTitle = t('Daftar Unit Terjual (Lunas)');
          modalColorClass = 'bg-emerald-600';
          modalIcon = <CheckCircle className="w-5 h-5 text-emerald-100" />;
          contentList = displayedAssets.filter(asset => asset.status === 'Sold' && asset.paymentStatus === 'Lunas').filter(asset => 
            asset.name.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            asset.brand.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            asset.category.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            (asset.plateNumber || '').toLowerCase().includes(metricSearchQuery.toLowerCase())
          );
        } else if (activeMetricModal === 'belum_lunas') {
          modalTitle = t('Daftar Unit Terjual (Belum Lunas)');
          modalColorClass = 'bg-amber-600';
          modalIcon = <Clock className="w-5 h-5 text-amber-100" />;
          contentList = displayedAssets.filter(asset => asset.status === 'Sold' && asset.paymentStatus !== 'Lunas').filter(asset => 
            asset.name.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            asset.brand.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            asset.category.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            (asset.plateNumber || '').toLowerCase().includes(metricSearchQuery.toLowerCase())
          );
        } else if (activeMetricModal === 'bidders') {
          modalTitle = t('Daftar Bidder / Peserta Lelang');
          modalColorClass = 'bg-purple-600';
          modalIcon = <Users className="w-5 h-5 text-purple-100" />;
          contentList = biddersList.filter(bidder => 
            bidder.name.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            bidder.email.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            bidder.contact.toLowerCase().includes(metricSearchQuery.toLowerCase())
          );
        } else if (activeMetricModal === 'admins') {
          modalTitle = t('Daftar Akses Internal (Admin)');
          modalColorClass = 'bg-slate-700';
          modalIcon = <Shield className="w-5 h-5 text-slate-100" />;
          contentList = admins.filter(admin => 
            admin.name.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            admin.email.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            admin.role.toLowerCase().includes(metricSearchQuery.toLowerCase())
          );
        } else if (activeMetricModal === 'users') {
          modalTitle = t('Daftar Akses Eksternal (Pengguna)');
          modalColorClass = 'bg-blue-900';
          modalIcon = <Globe className="w-5 h-5 text-blue-100" />;
          contentList = registeredUsers.filter(user => 
            user.name.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            user.phone.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            (user.company || '').toLowerCase().includes(metricSearchQuery.toLowerCase())
          );
        }

        return (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
            onClick={() => setActiveMetricModal(null)}
          >
            <div 
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-scale-in flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`${modalColorClass} text-white p-6 relative shrink-0`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl">
                    {modalIcon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold leading-tight">{modalTitle}</h3>
                    <p className="text-xs text-white/80 mt-1">
                      {t('Menampilkan')} {contentList.length} {t('data hasil filter')}
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setActiveMetricModal(null)}
                  className="absolute top-6 right-6 text-white/85 hover:text-white transition-colors p-1 bg-white/10 hover:bg-white/20 rounded-full"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search Bar - Sticky */}
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 shrink-0">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={t('Cari data...')}
                    value={metricSearchQuery}
                    onChange={(e) => setMetricSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                </div>
                {metricSearchQuery && (
                  <button 
                    onClick={() => setMetricSearchQuery('')}
                    className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2 py-1 bg-slate-200/50 rounded-lg"
                  >
                    {t('Reset')}
                  </button>
                )}
              </div>

              {/* List Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-[250px] custom-scrollbar">
                {contentList.map((item: any, idx) => {
                  if (activeMetricModal === 'assets' || activeMetricModal === 'sold' || activeMetricModal === 'open') {
                    const isSold = item.status === 'Sold';
                    const activeBidsCount = item.bids ? item.bids.length : 0;
                    
                    return (
                      <div 
                        key={item.id}
                        onClick={() => {
                          onSelectAsset(item.id);
                          setActiveMetricModal(null);
                        }}
                        className="p-4 rounded-2xl border border-slate-100 hover:border-blue-200 bg-slate-50/50 hover:bg-blue-50/10 transition-all flex items-center justify-between gap-4 group cursor-pointer shadow-sm"
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          {item.imageUrl ? (
                            <img 
                              src={item.imageUrl} 
                              alt={item.name} 
                              className="w-14 h-14 object-cover rounded-xl border border-slate-200/60 shrink-0 shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-14 h-14 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 font-bold text-xs">
                              Unit
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">
                                {item.id}
                              </span>
                              <span className="text-xs text-slate-400 font-medium">{item.brand}</span>
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isSold ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                              }`}>
                                {isSold ? t('Terjual') : t('Aktif')}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors">
                              {item.name}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                              <span>Plat: <strong className="text-slate-700 font-bold">{item.plateNumber}</strong></span>
                              <span>Kategori: <strong className="text-slate-700 font-bold">{item.category}</strong></span>
                              <span>{t('Tahun')}: <strong className="text-slate-700 font-bold">{item.modelYear}</strong></span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                            {isSold ? t('Harga Akhir') : t('Penawaran Tertinggi')}
                          </span>
                          <span className={`text-sm font-bold ${isSold ? 'text-emerald-600' : 'text-blue-600'}`}>
                            {formatIDR(item.highestBid || item.startingPrice)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {activeBidsCount} Bidder
                          </span>
                          {isSold && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedWinnerLetterAsset(item);
                              }}
                              className="mt-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-[10px] rounded-lg shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
                              title={t('Cetak Surat Pemenang Resmi (PDF)')}
                            >
                              <FileText className="w-3 h-3" />
                              <span>Surat Pemenang (PDF)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  } else if (activeMetricModal === 'bidders') {
                    return (
                      <div 
                        key={item.email}
                        className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col gap-3 shadow-sm"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
                            <p className="text-xs text-slate-500 mt-0.5 font-mono break-all">{item.email}</p>
                            <p className="text-xs text-slate-600 font-medium mt-1">HP: {item.contact}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block tracking-wider mb-0.5">Penawaran Tertinggi</span>
                            <span className="text-sm font-bold text-purple-600">{formatIDR(item.maxBidPrice)}</span>
                            <span className="text-[10px] text-slate-500 block font-bold mt-0.5">{item.bidCount} Bids</span>
                          </div>
                        </div>

                        {/* Assets bid list */}
                        {item.assetsBid && item.assetsBid.length > 0 && (
                          <div className="border-t border-slate-100 pt-2.5 mt-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('Menawar Unit / Tanggal Bid')}:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {item.assetsBid.map((assetBid: any) => (
                                <button
                                  key={assetBid.assetId}
                                  onClick={() => {
                                    onSelectAsset(assetBid.assetId);
                                    setActiveMetricModal(null);
                                  }}
                                  className="text-[11px] bg-purple-50/70 hover:bg-purple-100/90 border border-purple-100/80 text-purple-700 p-2.5 rounded-xl transition-all flex flex-col items-start gap-1 group/btn text-left shadow-2xs hover:shadow-xs w-full"
                                >
                                  <div className="flex items-center gap-1.5 w-full">
                                    <span className="font-bold text-slate-800 line-clamp-1">{assetBid.assetName}</span>
                                    <ChevronRight className="w-3.5 h-3.5 text-purple-400 group-hover/btn:translate-x-0.5 transition-transform shrink-0 ml-auto" />
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-purple-600 font-semibold mt-0.5 flex-wrap">
                                    <span className="bg-purple-100/80 px-1.5 py-0.5 rounded text-[9px] font-extrabold">{formatIDR(assetBid.price)}</span>
                                    {assetBid.timestamp && (
                                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 font-normal">
                                        <Clock className="w-3 h-3 text-slate-300" />
                                        {(() => {
                                          try {
                                            const d = new Date(assetBid.timestamp);
                                            const locale = language === 'id' ? 'id-ID' : 'en-US';
                                            return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
                                          } catch {
                                            return assetBid.timestamp;
                                          }
                                        })()}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  } else if (activeMetricModal === 'admins') {
                    return (
                      <div 
                        key={item.email}
                        className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex justify-between items-center gap-4 shadow-sm"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
                            <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {item.role}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 font-mono">{item.email}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">{t('Terdaftar')}</span>
                          <span className="text-xs text-slate-600 font-mono mt-0.5 block">{item.createdAt ? item.createdAt.split('T')[0] : '-'}</span>
                        </div>
                      </div>
                    );
                  } else if (activeMetricModal === 'users') {
                    const statusColors = 
                      item.status === 'Disetujui' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                      item.status === 'Ditolak' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                      'bg-amber-50 text-amber-700 border border-amber-100';

                    return (
                      <div 
                        key={item.email}
                        className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-3 shadow-sm"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
                            {item.company && (
                              <span className="text-[10px] font-medium bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                                {item.company}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 font-mono break-all">{item.email}</p>
                          <p className="text-xs text-slate-600 mt-1">HP: <span className="font-bold">{item.phone}</span></p>
                        </div>
                        <div className="flex sm:flex-col justify-between items-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColors}`}>
                            {item.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Joined: {item.createdAt ? item.createdAt.split('T')[0] : '-'}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}

                {contentList.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    {t('Tidak ada data yang cocok dengan pencarian.')}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
                <button
                  onClick={() => setActiveMetricModal(null)}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors border border-slate-300/40"
                >
                  {t('Tutup')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Official Winner Decision Letter Modal */}
      {selectedWinnerLetterAsset && (
        <OfficialWinnerLetterModal
          asset={selectedWinnerLetterAsset}
          onClose={() => setSelectedWinnerLetterAsset(null)}
          formatIDR={formatIDR}
        />
      )}

      {/* Comprehensive Category Detailed Analytics Dashboard Modal */}
      {detailedCategoryModal && (() => {
        const activeCat = detailedCategoryModal;
        const catTitle = activeCat === 'all' ? t('Semua Kategori Aset Lelang') :
                         activeCat === 'Vehicle' ? 'Kategori: Vehicle (Armada Komersial)' :
                         activeCat === 'Used part' ? 'Kategori: Used Part (Suku Cadang & Scrap)' :
                         activeCat === 'Property' ? 'Kategori: Property (Lahan & Bangunan Gudang)' :
                         'Kategori: Miscellaneous (Aset Lain-lain & Peralatan)';
        
        const catDescription = activeCat === 'all' ? t('Konsolidasi data analitik seluruh armada, suku cadang, dan properti lelang') :
                               activeCat === 'Vehicle' ? t('Data performa lelang armada truk, head trailer, wingbox, tronton, dan kendaraan komersial') :
                               activeCat === 'Used part' ? t('Data analitik lelang komponen bekas: ban luar/dalam, aki basah/kering, besi scrap, dan oli pelumas') :
                               activeCat === 'Property' ? t('Data analitik lelang properti komersial: lahan industri, pergudangan, dan bangunan operasional') :
                               t('Data analitik lelang inventaris logistik, genset, forklift, perlengkapan bengkel, dan peralatan lainnya');

        const catIcon = activeCat === 'all' ? <Layers className="w-6 h-6 text-white" /> :
                        activeCat === 'Vehicle' ? <Truck className="w-6 h-6 text-white" /> :
                        activeCat === 'Used part' ? <Wrench className="w-6 h-6 text-white" /> :
                        activeCat === 'Property' ? <Building2 className="w-6 h-6 text-white" /> :
                        <Package className="w-6 h-6 text-white" />;

        const catThemeBg = activeCat === 'all' ? 'from-slate-900 via-blue-900 to-indigo-900' :
                           activeCat === 'Vehicle' ? 'from-blue-900 via-blue-800 to-indigo-950' :
                           activeCat === 'Used part' ? 'from-amber-900 via-amber-800 to-slate-950' :
                           activeCat === 'Property' ? 'from-emerald-900 via-emerald-800 to-slate-950' :
                           'from-slate-900 via-slate-800 to-indigo-950';

        const catBadgeColor = activeCat === 'all' ? 'bg-blue-500/30 text-blue-200 border-blue-400/40' :
                              activeCat === 'Vehicle' ? 'bg-blue-500/30 text-blue-200 border-blue-400/40' :
                              activeCat === 'Used part' ? 'bg-amber-500/30 text-amber-200 border-amber-400/40' :
                              activeCat === 'Property' ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40' :
                              'bg-purple-500/30 text-purple-200 border-purple-400/40';

        const catAssets = assets.filter(a => {
          if (activeCat === 'all') return true;
          return normalizeCategory(a.category) === activeCat;
        });

        const totalCatCount = catAssets.length;
        const soldCatList = catAssets.filter(a => a.status === 'Sold');
        const openCatList = catAssets.filter(a => a.status === 'Open');
        const totalSoldCat = soldCatList.length;
        const totalOpenCat = openCatList.length;

        const catOmzetVal = soldCatList.reduce((sum, a) => {
          const highestVal = a.bids && a.bids.length > 0 ? Math.max(...a.bids.map(b => Number(b.price) || 0)) : (Number(a.startingPrice) || 0);
          return sum + (Number(highestVal) || 0);
        }, 0);

        const catLunasVal = soldCatList.filter(a => a.paymentStatus === 'Lunas').length;
        const catBelumLunasVal = soldCatList.filter(a => a.paymentStatus !== 'Lunas').length;

        const catMaxPriceVal = catAssets.reduce((max, a) => {
          const validBids = (a.bids || []).map(b => Number(b.price) || 0);
          const val = Math.max(Number(a.startingPrice) || 0, Number(a.highestBid) || 0, ...validBids, 0);
          return val > max ? val : max;
        }, 0);

        const catAvgPriceVal = totalSoldCat > 0 ? Math.round(catOmzetVal / totalSoldCat) : 0;
        const catSuccessPct = totalCatCount > 0 ? Math.round((totalSoldCat / totalCatCount) * 100) : 0;

        // Unique bidders in this category
        const catBidders = new Set<string>();
        let catTotalBidCount = 0;
        catAssets.forEach(a => {
          (a.bids || []).forEach(b => {
            catBidders.add(b.email.toLowerCase());
            catTotalBidCount += 1;
          });
        });

        // Brand / Subcategory distribution
        const catSubBreakdown: { [key: string]: number } = {};
        catAssets.forEach(a => {
          let label = a.brand || 'Umum';
          if (activeCat === 'Used part' && a.usedPartCategory) {
            label = `${a.usedPartCategory} (${a.brand || 'Scrap'})`;
          } else if (activeCat === 'Property' && a.propertyType) {
            label = `${a.propertyType} (${a.location || 'Area'})`;
          }
          catSubBreakdown[label] = (catSubBreakdown[label] || 0) + 1;
        });

        const catSubList = Object.entries(catSubBreakdown).map(([label, count]) => ({
          label,
          count,
          pct: totalCatCount > 0 ? Math.round((count / totalCatCount) * 100) : 0
        })).sort((a, b) => b.count - a.count);

        // Filtered Asset List for Table/Cards
        const filteredModalAssets = catAssets.filter(asset => {
          const matchesSearch = 
            asset.name.toLowerCase().includes(detailCategorySearch.toLowerCase()) ||
            asset.brand.toLowerCase().includes(detailCategorySearch.toLowerCase()) ||
            asset.category.toLowerCase().includes(detailCategorySearch.toLowerCase()) ||
            (asset.plateNumber || '').toLowerCase().includes(detailCategorySearch.toLowerCase()) ||
            (asset.location || '').toLowerCase().includes(detailCategorySearch.toLowerCase());

          if (!matchesSearch) return false;

          if (detailCategoryStatus === 'Sold') return asset.status === 'Sold';
          if (detailCategoryStatus === 'Open') return asset.status === 'Open';
          if (detailCategoryStatus === 'Lunas') return asset.status === 'Sold' && asset.paymentStatus === 'Lunas';
          if (detailCategoryStatus === 'Belum Lunas') return asset.status === 'Sold' && asset.paymentStatus !== 'Lunas';
          return true;
        });

        return (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
              
              {/* Header with Visual Banner */}
              <div className={`relative p-5 sm:p-7 bg-gradient-to-r ${catThemeBg} text-white shrink-0 overflow-hidden`}>
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
                      {catIcon}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] uppercase tracking-widest font-extrabold px-2.5 py-0.5 rounded-full border ${catBadgeColor}`}>
                          {activeCat === 'all' ? 'Multi-Category' : activeCat}
                        </span>
                        <span className="text-xs text-white/80 font-mono">
                          {totalCatCount} {t('Unit Terdaftar')}
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                        {catTitle}
                      </h3>
                      <p className="text-white/70 text-xs sm:text-sm mt-0.5 max-w-2xl leading-relaxed">
                        {catDescription}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title={t('Cetak / Simpan PDF')}
                    >
                      <Printer className="w-4 h-4" />
                      <span className="hidden sm:inline">{t('Cetak')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailedCategoryModal(null)}
                      className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-all cursor-pointer"
                      title={t('Tutup')}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Sub Category Quick Switcher inside Modal */}
                <div className="relative z-10 flex items-center gap-2 mt-5 pt-4 border-t border-white/15 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-xs text-white/70 font-semibold shrink-0 mr-1">{t('Pilih Kategori')}:</span>
                  <button
                    type="button"
                    onClick={() => { setDetailedCategoryModal('all'); setDetailCategorySearch(''); setDetailCategoryStatus('all'); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      activeCat === 'all' ? 'bg-white text-blue-900 shadow-md ring-2 ring-white/50' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    Semua ({assets.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDetailedCategoryModal('Vehicle'); setDetailCategorySearch(''); setDetailCategoryStatus('all'); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      activeCat === 'Vehicle' ? 'bg-white text-blue-900 shadow-md ring-2 ring-white/50' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    Vehicle ({vehicleCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDetailedCategoryModal('Used part'); setDetailCategorySearch(''); setDetailCategoryStatus('all'); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      activeCat === 'Used part' ? 'bg-white text-amber-900 shadow-md ring-2 ring-white/50' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    Used Part ({usedPartCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDetailedCategoryModal('Property'); setDetailCategorySearch(''); setDetailCategoryStatus('all'); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      activeCat === 'Property' ? 'bg-white text-emerald-900 shadow-md ring-2 ring-white/50' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    Property ({propertyCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDetailedCategoryModal('Miscellaneous'); setDetailCategorySearch(''); setDetailCategoryStatus('all'); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      activeCat === 'Miscellaneous' ? 'bg-white text-purple-900 shadow-md ring-2 ring-white/50' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    Miscellaneous ({miscCount})
                  </button>
                </div>
              </div>

              {/* Modal Body - Scrollable Content */}
              <div className="p-4 sm:p-6 space-y-6 overflow-y-auto max-h-[calc(92vh-180px)] bg-slate-50/50">
                
                {/* 1. Category KPI Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                  {/* Total Unit */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('Total Unit')}</span>
                    <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{totalCatCount}</p>
                    <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">{t('Unit di Database')}</span>
                  </div>

                  {/* Sukses Terjual */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">{t('Sukses Terjual')}</span>
                    <p className="text-2xl font-black text-emerald-700 mt-1 font-mono">{totalSoldCat}</p>
                    <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">{catSuccessPct}% {t('Keberhasilan')}</span>
                  </div>

                  {/* Aset Aktif */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">{t('Aset Aktif')}</span>
                    <p className="text-2xl font-black text-blue-700 mt-1 font-mono">{totalOpenCat}</p>
                    <span className="text-[11px] text-blue-600 font-medium mt-0.5 block">{t('Menerima Penawaran')}</span>
                  </div>

                  {/* Total Omzet */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs sm:col-span-2 lg:col-span-2">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">{t('Total Omzet Terjual')}</span>
                    <p className="text-xl sm:text-2xl font-black text-indigo-700 mt-1 font-mono truncate">{formatIDR(catOmzetVal)}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                      <span className="text-emerald-700 font-bold">{catLunasVal} Lunas</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-amber-700 font-bold">{catBelumLunasVal} Belum Lunas</span>
                    </div>
                  </div>

                  {/* Total Partisipan */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">{t('Partisipan')}</span>
                    <p className="text-2xl font-black text-purple-700 mt-1 font-mono">{catBidders.size}</p>
                    <span className="text-[11px] text-purple-600 font-medium mt-0.5 block">{catTotalBidCount} {t('Total Bid')}</span>
                  </div>
                </div>

                {/* 2. Sub-Category Distribution & Analytic Summary */}
                {totalCatCount > 0 && catSubList.length > 0 && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-blue-600" />
                        <span>
                          {activeCat === 'Vehicle' ? t('Distribusi Brand Armada Truk') :
                           activeCat === 'Used part' ? t('Distribusi Komponen Suku Cadang') :
                           activeCat === 'Property' ? t('Distribusi Jenis Properti') :
                           t('Distribusi Komposisi Aset')}
                        </span>
                      </h4>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {catSubList.length} {t('varian/klasifikasi')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {catSubList.map(item => (
                        <div key={item.label} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between gap-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-800 truncate" title={item.label}>{item.label}</span>
                            <span className="font-mono font-extrabold text-blue-700 ml-2">{item.count} unit</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mt-1.5">
                            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${item.pct}%` }}></div>
                          </div>
                          <span className="text-[10px] text-slate-500 text-right">{item.pct}% dari total</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Empty State Explanation (Used Part & Property = 0) */}
                {totalCatCount === 0 && (
                  <div className="bg-white p-8 sm:p-10 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-4 shadow-xs">
                    <div className="w-16 h-16 mx-auto bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-200 shadow-inner">
                      {activeCat === 'Used part' ? <Wrench className="w-8 h-8" /> :
                       activeCat === 'Property' ? <Building2 className="w-8 h-8" /> :
                       <Package className="w-8 h-8" />}
                    </div>
                    <div className="max-w-md mx-auto space-y-1.5">
                      <h4 className="text-base sm:text-lg font-bold text-slate-800">
                        {t('Belum Ada Data Lelang Aktual untuk')} {activeCat}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                        {activeCat === 'Used part' 
                          ? t('Suku cadang seperti Ban Luar/Dalam, Aki Basah/Kering, Besi Scrap, dan Oli Drum saat ini belum ada yang dilelang.')
                          : activeCat === 'Property'
                          ? t('Listing properti seperti Lahan Industri, Pergudangan, dan Bangunan Operasional saat ini belum tersedia.')
                          : t('Tidak ada unit terdaftar pada kategori ini.')}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 max-w-lg mx-auto flex flex-wrap items-center justify-center gap-2">
                      <span className="text-xs text-slate-500 font-semibold">{t('Spesifikasi yang Didukung')}:</span>
                      {activeCat === 'Used part' ? (
                        <>
                          <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold rounded-lg">Ban Bekas & Tread Depth</span>
                          <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold rounded-lg">Aki & Air Aki</span>
                          <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold rounded-lg">Besi Scrap Penimbangan</span>
                          <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold rounded-lg">Oli & Pelumas Drum</span>
                        </>
                      ) : activeCat === 'Property' ? (
                        <>
                          <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-lg">Luas Tanah (m²)</span>
                          <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-lg">Luas Bangunan (m²)</span>
                          <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-lg">Jual / Sewa</span>
                          <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-lg">Jadwal Open House</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* 4. Filter and Data Table for Category Assets */}
                {totalCatCount > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
                    {/* Filter Bar */}
                    <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-blue-600" />
                        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                          {t('Daftar Aset Aktual')} ({filteredModalAssets.length} / {totalCatCount})
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Search Input */}
                        <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={detailCategorySearch}
                            onChange={(e) => setDetailCategorySearch(e.target.value)}
                            placeholder={t('Cari nama, plat, brand...')}
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                          {detailCategorySearch && (
                            <button
                              type="button"
                              onClick={() => setDetailCategorySearch('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-300">
                          <button
                            type="button"
                            onClick={() => setDetailCategoryStatus('all')}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                              detailCategoryStatus === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Semua
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetailCategoryStatus('Sold')}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                              detailCategoryStatus === 'Sold' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Terjual
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetailCategoryStatus('Open')}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                              detailCategoryStatus === 'Open' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Aktif
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetailCategoryStatus('Lunas')}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                              detailCategoryStatus === 'Lunas' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Lunas
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetailCategoryStatus('Belum Lunas')}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                              detailCategoryStatus === 'Belum Lunas' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Belum Lunas
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Table / Card List */}
                    <div className="divide-y divide-slate-100 overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100/60 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-4">{t('Unit & Spesifikasi')}</th>
                            <th className="py-3 px-4">{t('Kategori / Brand')}</th>
                            <th className="py-3 px-4">{t('Harga Awal')}</th>
                            <th className="py-3 px-4">{t('Penawaran Tertinggi / Pemenang')}</th>
                            <th className="py-3 px-4">{t('Status Lelang')}</th>
                            <th className="py-3 px-4">{t('Status Bayar')}</th>
                            <th className="py-3 px-4 text-right">{t('Aksi')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {filteredModalAssets.map(asset => {
                            const validBids = (asset.bids || []).map(b => Number(b.price) || 0);
                            const topBidPrice = validBids.length > 0 ? Math.max(...validBids) : Number(asset.startingPrice) || 0;
                            const topBid = (asset.bids || []).find(b => Number(b.price) === topBidPrice);

                            return (
                              <tr key={asset.id} className="hover:bg-blue-50/40 transition-colors">
                                <td className="py-3.5 px-4 min-w-[220px]">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={asset.imageUrl || 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=300&q=80'}
                                      alt={asset.name}
                                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                                    />
                                    <div>
                                      <p className="font-extrabold text-slate-900 leading-snug line-clamp-1">{asset.name}</p>
                                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                        {asset.plateNumber || asset.id} {asset.modelYear ? `• ${asset.modelYear}` : ''}
                                      </p>
                                      {asset.location && (
                                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{asset.location}</p>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <span className="font-bold text-slate-800 block">{asset.brand}</span>
                                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
                                    {asset.category}
                                  </span>
                                </td>

                                <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-600 font-bold">
                                  {formatIDR(asset.startingPrice)}
                                </td>

                                <td className="py-3.5 px-4 min-w-[180px]">
                                  <span className="font-mono font-black text-emerald-700 block text-sm">
                                    {formatIDR(topBidPrice)}
                                  </span>
                                  {topBid ? (
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-0.5">
                                      <span className="font-bold text-slate-800 truncate">{topBid.name}</span>
                                      <span className="text-[10px] text-slate-400 font-mono">({(asset.bids || []).length} bid)</span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">{t('Belum ada bid')}</span>
                                  )}
                                </td>

                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  {asset.status === 'Sold' ? (
                                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-full text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" />
                                      {t('Terjual')}
                                    </span>
                                  ) : asset.status === 'Open' ? (
                                    <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-extrabold rounded-full text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {t('Aktif')}
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-extrabold rounded-full text-[10px] uppercase tracking-wider">
                                      {asset.status}
                                    </span>
                                  )}
                                </td>

                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  {asset.status === 'Sold' ? (
                                    asset.paymentStatus === 'Lunas' ? (
                                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-lg text-[11px]">
                                        Lunas
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 font-bold rounded-lg text-[11px]">
                                        Belum Lunas
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">-</span>
                                  )}
                                </td>

                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {asset.status === 'Sold' && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedWinnerLetterAsset(asset)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                        title={t('Lihat Surat Keputusan')}
                                      >
                                        <FileText className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onSelectAsset(asset.id);
                                        setDetailedCategoryModal(null);
                                      }}
                                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                                    >
                                      <span>{t('Detail')}</span>
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {filteredModalAssets.length === 0 && (
                        <div className="text-center py-10 text-slate-400 text-xs">
                          {t('Tidak ada unit yang cocok dengan filter atau kata kunci pencarian.')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center shrink-0">
                <div className="text-xs text-slate-500">
                  {t('Menampilkan')} <strong className="text-slate-800">{catAssets.length}</strong> {t('unit total pada kategori')} <span className="font-bold text-blue-700">{activeCat === 'all' ? 'Semua' : activeCat}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailedCategoryModal(null)}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors border border-slate-300/40 cursor-pointer"
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
}
