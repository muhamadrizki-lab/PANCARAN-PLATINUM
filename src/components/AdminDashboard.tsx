import React, { useState, useEffect } from 'react';
import { Asset, Bid, AdminUser, RegisteredUser } from '../types';
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
  FileText
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

  // 1. Metric calculations
  const totalAssets = assets.length;
  const soldAssets = assets.filter(a => a.status === 'Sold');
  const totalSold = soldAssets.length;
  const totalOpen = assets.filter(a => a.status === 'Open').length;

  const totalOmzet = soldAssets.reduce((sum, asset) => {
    const highestVal = asset.bids && asset.bids.length > 0 ? Math.max(...asset.bids.map(b => Number(b.price) || 0)) : (Number(asset.startingPrice) || 0);
    return sum + (Number(highestVal) || 0);
  }, 0);

  const lunasCount = soldAssets.filter(a => a.paymentStatus === 'Lunas').length;
  const belumLunasCount = soldAssets.filter(a => a.paymentStatus !== 'Lunas').length;

  // Highest price calculation (from starting prices or bids)
  const maxPrice = assets.reduce((max, asset) => {
    const validBids = (asset.bids || []).map(b => Number(b.price) || 0);
    const highestVal = Math.max(Number(asset.startingPrice) || 0, Number(asset.highestBid) || 0, ...validBids, 0);
    return highestVal > max ? highestVal : max;
  }, 0);

  // Total unique bidders based on emails/names across all bids
  const uniqueBidders = new Set<string>();
  assets.forEach(asset => {
    asset.bids.forEach(bid => {
      uniqueBidders.add(bid.email.toLowerCase());
    });
  });
  const totalBidders = uniqueBidders.size;

  // 2. Total assets per brand calculations
  const brandCounts: { [key: string]: number } = {};
  assets.forEach(asset => {
    brandCounts[asset.brand] = (brandCounts[asset.brand] || 0) + 1;
  });

  const brandData = Object.entries(brandCounts).map(([brand, count]) => ({
    brand,
    count,
    percentage: Math.round((count / totalAssets) * 100)
  })).sort((a, b) => b.count - a.count);

  // 3. Extract all scheduled surveys
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
  assets.forEach(asset => {
    asset.bids.forEach(bid => {
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
            <div className="relative md:col-span-7">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder={t('Cari nama bidder, brand, atau armada...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
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

      <AssetTypeGuide assets={assets} />

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
        // Prepare bidders data
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

        assets.forEach(asset => {
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
          contentList = assets.filter(asset => 
            asset.name.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            asset.brand.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            asset.category.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            (asset.plateNumber || '').toLowerCase().includes(metricSearchQuery.toLowerCase())
          );
        } else if (activeMetricModal === 'sold') {
          modalTitle = t('Daftar Aset Terjual');
          modalColorClass = 'bg-emerald-600';
          modalIcon = <CheckCircle className="w-5 h-5 text-emerald-100" />;
          contentList = assets.filter(asset => asset.status === 'Sold').filter(asset => 
            asset.name.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            asset.brand.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            asset.category.toLowerCase().includes(metricSearchQuery.toLowerCase()) ||
            (asset.plateNumber || '').toLowerCase().includes(metricSearchQuery.toLowerCase())
          );
        } else if (activeMetricModal === 'open') {
          modalTitle = t('Daftar Aset Aktif');
          modalColorClass = 'bg-blue-500';
          modalIcon = <Clock className="w-5 h-5 text-blue-100" />;
          contentList = assets.filter(asset => asset.status === 'Open').filter(asset => 
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
    </div>
  );
}
