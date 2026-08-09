import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Asset, Bid, MAIN_CATEGORIES, normalizeCategory } from '../types';
import { useLanguage } from './LanguageContext';
import { 
  Search, 
  Filter, 
  Tag, 
  MapPin, 
  Calendar, 
  Clock, 
  ChevronRight, 
  ChevronLeft,
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Truck,
  ArrowUpRight,
  ShieldAlert,
  Info,
  CalendarCheck,
  User,
  Mail,
  Phone,
  DollarSign,
  X,
  ZoomIn,
  ZoomOut,
  Lock,
  GripHorizontal
} from 'lucide-react';

interface CatalogViewProps {
  assets: Asset[];
  onPlaceBid: (assetId: string, bidData: Omit<Bid, 'id' | 'timestamp'>) => void;
  selectedAssetId?: string | null;
  onSelectAsset?: (assetId: string | null) => void;
  isUserLoggedIn?: boolean;
  onOpenLoginModal?: () => void;
  loggedInUserEmail?: string;
  loggedInUserName?: string;
  loggedInUserPhone?: string;
  canBid?: boolean;
  onOpenGuideModal?: (guide: 'ikut' | 'titip' | 'online') => void;
  navigationTabs?: React.ReactNode;
}

interface CatalogCardProps {
  key?: string | number;
  asset: Asset;
  onSelectAsset: (assetId: string) => void;
  formatIDR: (value: number) => string;
  onZoomImage?: (images: string[], index: number) => void;
  isUserLoggedIn?: boolean;
  onOpenLoginModal?: () => void;
  canBid?: boolean;
}

const stripMarkdown = (text: string) => {
  if (!text) return '';
  return text
    .replace(/^[\*\-\s#]+/gm, '')
    .replace(/\*\*+/g, '')
    .replace(/[\n\r]+/g, ' ')
    .trim();
};

function CountdownTimer({ targetDate, size = 'small' }: { targetDate: string; size?: 'small' | 'large' }) {
  const { t } = useLanguage();
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
      }
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isExpired: false
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.isExpired) {
    return (
      <span className={`font-bold text-rose-600 ${size === 'large' ? 'text-xs' : 'text-[10px]'}`}>
        {t('Close Bid')}
      </span>
    );
  }

  const parts = [];
  if (timeLeft.days > 0) parts.push(`${timeLeft.days}d`);
  if (timeLeft.hours > 0 || timeLeft.days > 0) parts.push(`${timeLeft.hours}h`);
  parts.push(`${timeLeft.minutes}m`);
  parts.push(`${timeLeft.seconds}s`);

  if (size === 'large') {
    return (
      <div className="flex items-center gap-1.5 font-mono">
        {timeLeft.days > 0 && (
          <div className="bg-amber-100/85 border border-amber-200 text-amber-950 px-2 py-1 rounded-xl text-center min-w-[32px]">
            <span className="text-sm font-bold block leading-none">{timeLeft.days}</span>
            <span className="text-[8px] font-extrabold uppercase text-amber-800 tracking-wider">Hari</span>
          </div>
        )}
        <div className="bg-amber-100/85 border border-amber-200 text-amber-950 px-2 py-1 rounded-xl text-center min-w-[32px]">
          <span className="text-sm font-bold block leading-none">{timeLeft.hours}</span>
          <span className="text-[8px] font-extrabold uppercase text-amber-800 tracking-wider">Jam</span>
        </div>
        <div className="bg-amber-100/85 border border-amber-200 text-amber-950 px-2 py-1 rounded-xl text-center min-w-[32px]">
          <span className="text-sm font-bold block leading-none">{timeLeft.minutes}</span>
          <span className="text-[8px] font-extrabold uppercase text-amber-800 tracking-wider">Menit</span>
        </div>
        <div className="bg-amber-100/85 border border-amber-200 text-amber-950 px-2 py-1 rounded-xl text-center min-w-[32px] animate-pulse">
          <span className="text-sm font-bold block leading-none text-rose-600">{timeLeft.seconds}</span>
          <span className="text-[8px] font-extrabold uppercase text-rose-500 tracking-wider">Detik</span>
        </div>
      </div>
    );
  }

  return (
    <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md font-mono text-[10px] border border-amber-200 shadow-2xs font-extrabold">
      {parts.join(' ')}
    </span>
  );
}

function CatalogCard({ asset, onSelectAsset, formatIDR, onZoomImage, isUserLoggedIn, onOpenLoginModal, canBid = true }: CatalogCardProps) {
  const { t } = useLanguage();
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const images = asset.imageUrls && asset.imageUrls.length > 0
    ? asset.imageUrls
    : (asset.imageUrl ? [asset.imageUrl] : []);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImgIdx(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImgIdx(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const highestOffer = Math.max(asset.startingPrice, ...(asset.bids || []).map(b => b.price));
  const isExpired = asset.closeBidDate ? new Date() > new Date(asset.closeBidDate) : false;

  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 border-l-[6px] border-l-slate-300 hover:border-blue-200 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
      <div className="relative h-48 bg-slate-50 overflow-hidden group/img-container">
        <img 
          src={images[activeImgIdx] || "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80"} 
          alt={`${asset.name} - ${activeImgIdx + 1}`} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-zoom-in" 
          referrerPolicy="no-referrer"
          onClick={(e) => {
            e.stopPropagation();
            if (onZoomImage) {
              onZoomImage(images, activeImgIdx);
            } else {
              if (isUserLoggedIn) {
                onSelectAsset(asset.id);
              } else {
                if (onOpenLoginModal) onOpenLoginModal();
              }
            }
          }}
          onError={(e) => {
            e.currentTarget.src = "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80";
          }}
        />

        {/* Navigation arrows overlay */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-7 h-7 rounded-full flex items-center justify-center transition-all opacity-0 group-hover/img-container:opacity-100 z-10 text-xs font-bold"
              title={t('Gambar Sebelumnya')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-7 h-7 rounded-full flex items-center justify-center transition-all opacity-0 group-hover/img-container:opacity-100 z-10 text-xs font-bold"
              title={t('Gambar Berikutnya')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Dotted indicators */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10 bg-black/40 backdrop-blur-xs px-2 py-1 rounded-full">
              {images.map((_, idx) => (
                <button
                   key={idx}
                   onClick={(e) => {
                     e.stopPropagation();
                     setActiveImgIdx(idx);
                   }}
                   className={`w-1.5 h-1.5 rounded-full transition-all ${idx === activeImgIdx ? 'bg-white scale-125' : 'bg-white/40'}`}
                />
              ))}
            </div>
          </>
        )}
        
        {/* Floating Info */}
        <div className="absolute top-3 left-3 z-10">
          <span className="text-[9px] font-mono font-bold bg-white/95 backdrop-blur-sm text-slate-800 px-2 py-1 rounded-md shadow-sm border border-slate-200">
            {asset.id}
          </span>
        </div>

        <div className="absolute top-3 right-3 z-10">
          {isExpired ? (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-600 text-white px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-rose-300 rounded-full"></span>
              {t('Close Bid')}
            </span>
          ) : (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-600 text-white px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>
              {t('Terbuka')}
            </span>
          )}
        </div>

        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg z-10">
          {asset.brand} • {asset.category}
        </div>
      </div>

      {/* Info Body */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          <h3 className="font-bold text-slate-800 text-base leading-snug group-hover:text-blue-700 transition-colors">
            {asset.name}
          </h3>
          
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {asset.location.split(',')[1] || asset.location}
            </span>
            <span>•</span>
            <span>{t('Kondisi')}: <strong>{t(asset.condition)}</strong></span>
            <span>•</span>
            <span>{t('Th')}: <strong>{asset.modelYear}</strong></span>
          </div>

          {asset.closeBidDate && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <div className="flex items-center gap-1 text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 w-fit">
                <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse-hover" />
                <span>{t('Tutup')}: {new Date(asset.closeBidDate).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
              <CountdownTimer targetDate={asset.closeBidDate} size="small" />
            </div>
          )}

          <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
            {stripMarkdown(asset.description)}
          </p>
        </div>

        {/* Price Status */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">{t('Harga Pembuka')}</span>
            <p className="text-xs font-semibold text-slate-800">{formatIDR(asset.startingPrice)}</p>
          </div>
          {isUserLoggedIn ? (
            <div className="text-right">
              <span className="text-[10px] text-blue-600 font-bold uppercase flex items-center justify-end gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> {t('Penawaran Tertinggi')}
              </span>
              <p className="text-base font-bold text-slate-900">{formatIDR(highestOffer)}</p>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenLoginModal) onOpenLoginModal();
              }}
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold text-xs bg-blue-50 px-2.5 py-1.5 rounded-xl border border-blue-100 hover:bg-blue-100 transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{t('Masuk Menawar')}</span>
            </button>
          )}
        </div>

        {/* CTA Actions */}
        <div className="flex items-center justify-between text-xs font-semibold pt-1">
          <span className="text-slate-500 font-medium">
            {isUserLoggedIn ? `${asset.bids.length} ${t('Penawaran Masuk')}` : `🔒 ${t('Gabung untuk menawar')}`}
          </span>
          <button
            disabled={isExpired}
            onClick={(e) => {
              if (isExpired) return;
              e.stopPropagation();
              if (isUserLoggedIn) {
                onSelectAsset(asset.id);
              } else {
                if (onOpenLoginModal) onOpenLoginModal();
              }
            }}
            className={`${
              isExpired
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-200'
                : canBid === false && isUserLoggedIn
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/10'
                : 'bg-blue-600 hover:bg-blue-700 text-white group-hover:shadow-md shadow-blue-500/10'
            } px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5`}
          >
            {canBid === false && isUserLoggedIn ? (
              <>
                <Lock className="w-3.5 h-3.5 shrink-0 text-amber-100" />
                <span>{t('Lihat Detail')}</span>
              </>
            ) : (
              <>
                <span>{t('Tawar Aset')}</span>
                <ArrowUpRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const parseInlineMarkdown = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-bold text-slate-800">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const renderDescription = (text: string) => {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-2 text-left not-italic text-slate-600 font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }
        
        // Check if it's a heading
        if (trimmed.startsWith('##') || trimmed.startsWith('*##') || trimmed.startsWith('###') || trimmed.startsWith('*###')) {
          const cleanHeading = trimmed.replace(/^[\*\-\s#]+/, '').replace(/\*\*+/g, '');
          return (
            <h4 key={idx} className="font-bold text-slate-800 text-xs mt-3 mb-1 border-b border-slate-100 pb-1">
              {cleanHeading}
            </h4>
          );
        }

        // Check if it's a bullet point
        if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
          const content = trimmed.replace(/^[\*\-\s]+/, '');
          return (
            <div key={idx} className="flex items-start gap-1.5 ml-2 text-[11px] leading-relaxed">
              <span className="text-blue-500 font-bold select-none">•</span>
              <span className="flex-1">{parseInlineMarkdown(content)}</span>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={idx} className="text-[11px] leading-relaxed">
            {parseInlineMarkdown(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

export default function CatalogView({ 
  assets, 
  onPlaceBid, 
  selectedAssetId: propSelectedAssetId, 
  onSelectAsset: propOnSelectAsset,
  isUserLoggedIn = false,
  onOpenLoginModal,
  loggedInUserEmail = '',
  loggedInUserName = '',
  loggedInUserPhone = '',
  canBid = true,
  onOpenGuideModal,
  navigationTabs
}: CatalogViewProps) {
  const { language, t } = useLanguage();
  const [internalSelectedAssetId, setInternalSelectedAssetId] = useState<string | null>(null);

  const selectedAssetId = propSelectedAssetId !== undefined ? propSelectedAssetId : internalSelectedAssetId;
  const setSelectedAssetId = propOnSelectAsset !== undefined ? propOnSelectAsset : setInternalSelectedAssetId;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showBiddingGuide, setShowBiddingGuide] = useState(true);
  
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Helper to scroll smoothly to the form card
  const scrollToForm = () => {
    const formElement = document.getElementById('bid-form-card');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  useEffect(() => {
    if (selectedAssetId) {
      setTimeout(() => {
        const scrollContainer = document.getElementById('bidding-modal-scroll-container');
        if (scrollContainer) {
          scrollContainer.scrollTop = 0;
        }
      }, 50);
    }
  }, [selectedAssetId]);

  // "Type to Focus" / "Ketik Langsung" feature
  useEffect(() => {
    if (!selectedAssetId) return;

    const handleTypeToFocus = (e: KeyboardEvent) => {
      // Ignore if user is already typing in an input, select, or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      // Ignore standard modifier keys
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Only handle printable single-character keys
      if (e.key.length === 1 && /[a-zA-Z0-9 ]/.test(e.key)) {
        scrollToForm();
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleTypeToFocus);
    return () => window.removeEventListener('keydown', handleTypeToFocus);
  }, [selectedAssetId]);

  // Bid form state
  const [bidForm, setBidForm] = useState({
    name: '',
    email: '',
    contact: '',
    price: '',
    requestSurvey: false,
    surveyDate: '',
    surveyTime: '09:00'
  });

  // Auto-populate bid form fields for logged-in external users
  useEffect(() => {
    if (isUserLoggedIn && loggedInUserEmail) {
      setBidForm(prev => ({
        ...prev,
        email: loggedInUserEmail,
        name: loggedInUserName || prev.name,
        contact: loggedInUserPhone || prev.contact,
      }));
    }
  }, [isUserLoggedIn, loggedInUserEmail, loggedInUserName, loggedInUserPhone]);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [isFormFocused, setIsFormFocused] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // States for modal image carousel and fullscreen lightbox
  const [modalImageIdx, setModalImageIdx] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const [showFullDesc, setShowFullDesc] = useState(false);

  useEffect(() => {
    setIsZoomed(false);
  }, [lightboxIndex]);

  useEffect(() => {
    setModalImageIdx(0);
    setShowFullDesc(false);
    setAgreedToTerms(false);
  }, [selectedAssetId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowRight' && lightboxIndex !== null && lightboxImages.length > 1) {
        setLightboxIndex(prev => (prev === null ? null : (prev === lightboxImages.length - 1 ? 0 : prev + 1)));
      } else if (e.key === 'ArrowLeft' && lightboxIndex !== null && lightboxImages.length > 1) {
        setLightboxIndex(prev => (prev === null ? null : (prev === 0 ? lightboxImages.length - 1 : prev - 1)));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, lightboxImages]);

  // We only show "Open" assets in the public catalog
  const openAssets = assets.filter(a => a.status === 'Open');

  // Filter logic
  const filteredAssets = openAssets.filter(asset => {
    const matchesBrand = selectedBrand === 'all' || asset.brand === selectedBrand;
    const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory;
    const matchesSearch = 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesBrand && matchesCategory && matchesSearch;
  });

  const uniqueBrands = Array.from(new Set(openAssets.map(a => a.brand)));
  const uniqueCategories = Array.from(new Set([...MAIN_CATEGORIES, ...openAssets.map(a => normalizeCategory(a.category))]));

  const selectedAsset = assets.find(a => a.id === selectedAssetId);
  const currentHighestBid = selectedAsset 
    ? Math.max(selectedAsset.startingPrice, ...(selectedAsset.bids || []).map(b => b.price))
    : 0;

  const formatIDR = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumberWithDots = (numStr: string) => {
    const clean = numStr.replace(/\D/g, '');
    if (!clean) return '';
    return new Intl.NumberFormat('id-ID').format(Number(clean));
  };

  const formatDateIndonesian = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const locale = language === 'en' ? 'en-US' : 'id-ID';
      return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const isTimeBooked = (time: string, date: string) => {
    if (!date) return false;
    return assets.some(asset => 
      asset.bids.some(b => 
        b.scheduleSurveyDate === date && 
        b.scheduleSurveyTime === time
      )
    );
  };

  const handleSelectAsset = (assetId: string) => {
    setSelectedAssetId(assetId);
    setFormError('');
    setFormSuccess(false);
    
    // Default bid price suggested is highest bid + 1,000,000 IDR
    const asset = assets.find(a => a.id === assetId);
    if (asset) {
      setBidForm({
        name: isUserLoggedIn ? loggedInUserName : '',
        email: isUserLoggedIn ? loggedInUserEmail : '',
        contact: isUserLoggedIn ? loggedInUserPhone : '',
        price: '',
        requestSurvey: false,
        surveyDate: '',
        surveyTime: '09:00'
      });
      setAgreedToTerms(false);
    }
  };

  const isAuctionClosed = selectedAsset?.closeBidDate 
    ? new Date() > new Date(selectedAsset.closeBidDate) 
    : false;

  const handleBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess(false);

    if (!selectedAssetId || !selectedAsset) return;

    if (isAuctionClosed) {
      setFormError(t('Maaf, lelang untuk unit ini sudah ditutup karena telah melewati batas waktu penutupan.'));
      return;
    }

    const bidPriceNum = Number(bidForm.price);

    // 1. Validation
    if (!bidForm.name || !bidForm.email || !bidForm.contact || !bidForm.price || isNaN(bidPriceNum) || bidPriceNum <= 0) {
      setFormError(t('Mohon lengkapi semua data dan masukkan nominal penawaran (bid) yang valid.'));
      return;
    }

    if (!agreedToTerms) {
      setFormError(t('Anda wajib membaca dan menyetujui Syarat & Ketentuan Lelang.'));
      return;
    }

    // Survey Validation if checked
    if (bidForm.requestSurvey) {
      if (!bidForm.surveyDate) {
        setFormError(t('Mohon tentukan tanggal rencana survei fisik.'));
        return;
      }
      if (isTimeBooked(bidForm.surveyTime, bidForm.surveyDate)) {
        setFormError(t('Jadwal survei pada tanggal dan jam tersebut sudah di-booking oleh calon pembeli lain. Mohon pilih waktu atau hari lain.'));
        return;
      }
    }

    // 2. Submit
    onPlaceBid(selectedAssetId, {
      name: bidForm.name,
      email: bidForm.email,
      contact: bidForm.contact,
      price: bidPriceNum,
      scheduleSurveyDate: bidForm.requestSurvey ? bidForm.surveyDate : undefined,
      scheduleSurveyTime: bidForm.requestSurvey ? bidForm.surveyTime : undefined,
    });

    setFormSuccess(true);
    setFormError('');

    // Reset bid form fields but keep values for success display
    setTimeout(() => {
      setSelectedAssetId(null);
      setFormSuccess(false);
    }, 4500);
  };

  return (
    <div className="space-y-8 animate-fade-in" id="public-catalog-container">
      

      {/* Premium Hero Banner for Public Bidders */}
      <div className="relative w-full overflow-hidden bg-slate-950 text-white border-t border-slate-800 pt-8 md:pt-12 pb-16 md:pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-950/70 to-slate-950/80 opacity-80 z-0"></div>
        
        {/* Banner Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-75 md:opacity-65 z-0"
          style={{ 
            backgroundImage: "url('https://lh3.googleusercontent.com/d/1QsGItLvspUKwE2au0ayEtT86r1sR-FX4')",
          }}
        ></div>

        {/* Traditional Botanical Batik Wallpaper Background Accent Overlay */}
        <div className="absolute inset-0 opacity-[0.20] pointer-events-none z-0 select-none overflow-hidden mix-blend-overlay">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="batikBotanicalCatalog" width="160" height="160" patternUnits="userSpaceOnUse">
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
            <rect width="100%" height="100%" fill="url(#batikBotanicalCatalog)" />
          </svg>
        </div>

        {/* Soft white gradient fade overlay at the bottom to merge seamlessly with the page background */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-50 via-slate-50/30 to-transparent pointer-events-none z-5"></div>

        {/* Navigation Tabs (Overlayed inside the hero background) */}
        {navigationTabs ? (
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 relative z-20 mb-8 md:mb-10">
            {navigationTabs}
          </div>
        ) : (
          /* Empty spacer to maintain identical banner size/height and background image layout before login */
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 relative z-20 mb-8 md:mb-10 h-[46px]"></div>
        )}

        {/* Content Container (Centered to match the site width) */}
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="space-y-4 lg:max-w-xl xl:max-w-2xl">
            <span className="text-[10px] uppercase tracking-wider bg-blue-500/20 text-blue-300 font-bold px-3 py-1.5 rounded-full border border-blue-500/30">
              {t('Portal Penawaran Umum (External)')}
            </span>
            <h1 className="text-2xl md:text-3xl xl:text-4xl font-bold tracking-tight leading-tight text-white flex flex-col gap-1">
              <span className="flex items-center gap-2">
                <span className="bg-gradient-to-r from-slate-100 via-slate-300 to-slate-100 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(255,255,255,0.55)] font-black">PLATINUM</span>
              </span>
              <span className="text-xs md:text-sm font-semibold text-slate-300 tracking-wide mt-0.5 opacity-90 leading-normal max-w-lg block">
                ( Pancaran Lelang Angkutan Truk, Industri, & Niaga Utama Modern )
              </span>
              <span className="bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">
                {t('Truck & Heavy Equipment')}
              </span>
            </h1>
            <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
              {t('Dapatkan truk tangki, wingbox, trailer, cargo van, dan alat berat kualitas terbaik langsung dari ekosistem operasional Pancaran Logistics. Transparan, terpercaya, dan aman dengan jadwal survei fisik mandiri.')}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-300 font-medium">
              <span className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> {t('KIR & STNK Lengkap')}
              </span>
              <span className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                <CalendarCheck className="w-4 h-4 text-blue-400" /> {t('Bebas Atur Waktu Inspeksi')}
              </span>
            </div>
          </div>

          {/* Right Side: How It Works & Cara Ikut Lelang Side-by-Side */}
          <div className="flex flex-col sm:flex-row items-stretch gap-4 shrink-0 w-full lg:w-auto lg:absolute lg:top-1/2 lg:-translate-y-1/2 lg:right-8 lg:z-20 lg:bottom-auto">
            {/* Box 2: Cara Ikut Lelang Card - Only visible for Digital Solution account when logged in */}
            {(() => {
              const isDigitalSolutionAccount = Boolean(
                isUserLoggedIn && (
                  (loggedInUserEmail && (
                    loggedInUserEmail.toLowerCase().includes('digital.solution') ||
                    loggedInUserEmail.toLowerCase().includes('digitalsolution') ||
                    loggedInUserEmail.toLowerCase().includes('digital_solution')
                  )) ||
                  (loggedInUserName && (
                    loggedInUserName.toLowerCase().includes('digital solution') ||
                    loggedInUserName.toLowerCase().includes('digital.solution') ||
                    loggedInUserName.toLowerCase().includes('digitalsolution')
                  ))
                )
              );

              if (!isUserLoggedIn || !isDigitalSolutionAccount) return null;

              if (!showBiddingGuide) {
                return (
                  <motion.button
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={() => setShowBiddingGuide(true)}
                    className="bg-blue-600/95 hover:bg-blue-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-full shadow-lg border border-blue-500/40 flex items-center gap-2 transition-all hover:scale-105 z-30 self-center sm:self-end"
                    id="reopen-bidding-guide-btn"
                  >
                    <span>📋</span> {t('Syarat & Ketentuan Akses Bidding')}
                  </motion.button>
                );
              }

              return (
                <motion.div 
                  drag
                  dragMomentum={false}
                  onTap={() => onOpenGuideModal?.('ikut')}
                  className="bg-white/95 backdrop-blur-md text-slate-900 rounded-3xl shadow-2xl border-2 border-blue-500/40 overflow-hidden flex-1 w-full sm:w-64 md:w-72 flex flex-col items-center pt-3 pb-4 cursor-grab active:cursor-grabbing hover:bg-white transition-colors duration-300 select-none z-30 touch-none relative group"
                  id="draggable-bidding-guide-card"
                  style={{ touchAction: 'none' }}
                >
                  {/* Close button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBiddingGuide(false);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/50 transition-colors z-40 shadow-xs"
                    title={t('Tutup')}
                    id="close-bidding-guide-btn"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Premium Drag Indicator Handle */}
                  <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-blue-50 px-3 py-1 rounded-full mb-2 transition-colors border border-slate-200/50">
                    <GripHorizontal className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                    <span className="text-[9px] font-extrabold text-slate-500 group-hover:text-blue-600 uppercase tracking-widest font-sans">
                      {t('Tarik / Geser')}
                    </span>
                  </div>

                  <h3 className="text-blue-950 font-extrabold text-xs sm:text-sm md:text-base tracking-tight text-center px-4 mb-2">
                    {t('Syarat & Ketentuan Akses Bidding')}
                  </h3>
                  <div className="w-full h-36 sm:h-40 bg-slate-50 overflow-hidden flex items-center justify-center border-y border-slate-100 pointer-events-none select-none">
                    <img 
                      src="https://lh3.googleusercontent.com/d/19rthCmJjo1yZlT94ce5xY_mcwGnyaqjN" 
                      alt={t('Syarat & Ketentuan Akses Bidding')}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 pointer-events-none select-none"
                      referrerPolicy="no-referrer"
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                    />
                  </div>
                  <p className="text-blue-950 font-semibold text-[10px] sm:text-xs leading-relaxed pt-3 px-4 text-center">
                    {t('Sebelum mengikuti lelang, Anda diwajibkan membaca dan memahami peraturan serta tata cara lelang.')}
                  </p>
                </motion.div>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Public Catalog Grid */}
        <div className="space-y-6 lg:col-span-3" id="public-catalog-catalog-col">
          
          {/* Public Filters Header */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 border-l-[6px] border-l-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">{t('Katalog Armada Tersedia')} ({filteredAssets.length})</h2>
              <p className="text-xs text-slate-500 mt-0.5">{t('Semua armada di bawah siap dilepas dengan penawaran harga terbaik.')}</p>
            </div>

            {/* Quick Filter Controls */}
            <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
              {/* Search */}
              <div className="relative flex-1 md:w-52 md:flex-initial">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('Cari armada...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                />
              </div>

              {/* Brand Select */}
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">{t('Semua Brand')}</option>
                {uniqueBrands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              {/* Category Select */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">{t('Semua Kategori')}</option>
                {uniqueCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Catalog Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset) => (
              <CatalogCard
                key={asset.id}
                asset={asset}
                onSelectAsset={handleSelectAsset}
                formatIDR={formatIDR}
                onZoomImage={(imgs, idx) => {
                  setLightboxImages(imgs);
                  setLightboxIndex(idx);
                }}
                isUserLoggedIn={isUserLoggedIn}
                onOpenLoginModal={onOpenLoginModal}
                canBid={canBid}
              />
            ))}

            {filteredAssets.length === 0 && (
              <div className="col-span-full text-center py-16 bg-white border border-slate-100 rounded-3xl space-y-4 px-6 max-w-lg mx-auto shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto text-blue-600">
                  <Info className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
                    {t('Belum Ada Unit Tersedia')}
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed max-w-sm mx-auto font-medium">
                    {t('Saat ini Pancaran Lelang belum memiliki aset yang sedang dilelang. Nantikan pembaharuan unit terbaru kami dalam waktu dekat. Terima kasih atas perhatian Anda! 👋')}
                  </p>
                </div>
                {openAssets.length > 0 && (
                  <div className="pt-2">
                    <button 
                      onClick={() => { setSelectedBrand('all'); setSelectedCategory('all'); setSearchQuery(''); }}
                      className="inline-flex items-center justify-center px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-xs text-blue-600 hover:text-blue-700 font-bold rounded-xl transition duration-150 cursor-pointer"
                    >
                      {t('Lihat Semua Koleksi')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Right Side Overlay: OLX-inspired Beautiful Detail Page View */}
      {selectedAsset && (
        <>
          <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-2 md:p-4 overflow-y-auto"
          id="bidding-modal-overlay"
          onClick={() => setSelectedAssetId(null)}
        >
          <div 
            className="bg-slate-50 rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-5xl overflow-hidden relative animate-zoom-in my-auto max-h-[92vh] flex flex-col focus:outline-none transition-all duration-300"
            id="bidding-survey-panel"
            onClick={(e) => e.stopPropagation()}
          >
            
             {/* Scrollable Container */}
             <div id="bidding-modal-scroll-container" className="overflow-y-auto flex-1 custom-scrollbar relative">
               
               {/* Focus mode background dim overlay */}
               {isFormFocused && (
                 <div 
                   className="absolute inset-0 bg-slate-950/30 backdrop-blur-[0.5px] z-30 transition-all duration-300 cursor-pointer"
                   onClick={() => {
                     if (document.activeElement instanceof HTMLElement) {
                       document.activeElement.blur();
                     }
                     setIsFormFocused(false);
                   }}
                 />
               )}
              
              {/* Top Section: Immersive Dark Image Carousel */}
              {(() => {
                const detailImages = selectedAsset.imageUrls && selectedAsset.imageUrls.length > 0 
                  ? selectedAsset.imageUrls 
                  : (selectedAsset.imageUrl ? [selectedAsset.imageUrl] : []);
                
                return (
                  <div className="relative bg-slate-950 h-[300px] md:h-[400px] flex items-center justify-center group/modal-img border-b border-slate-800">
                    {/* Absolute Back & Close Buttons */}
                    <button 
                      onClick={() => setSelectedAssetId(null)}
                      className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm hover:bg-white text-slate-800 px-4 py-2 rounded-full text-xs font-bold shadow-md transition-all cursor-pointer border border-slate-200/50"
                      title={t('Kembali ke Katalog')}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>{t('Kembali')}</span>
                    </button>

                    <button 
                      onClick={() => setSelectedAssetId(null)}
                      className="absolute top-4 right-4 z-20 flex items-center justify-center bg-white/95 backdrop-blur-sm hover:bg-white text-slate-600 hover:text-slate-900 w-10 h-10 rounded-full shadow-md transition-all cursor-pointer border border-slate-200/50"
                      title={t('Tutup')}
                    >
                      <X className="w-5 h-5" />
                    </button>

                    {detailImages.length > 0 ? (
                      <img 
                        src={detailImages[modalImageIdx] || "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80"} 
                        alt={`${selectedAsset.name} - ${modalImageIdx + 1}`} 
                        className="h-full w-auto max-w-full object-contain cursor-zoom-in hover:scale-[1.01] transition-transform duration-300" 
                        referrerPolicy="no-referrer"
                        onClick={() => {
                          setLightboxImages(detailImages);
                          setLightboxIndex(modalImageIdx);
                        }}
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80";
                        }}
                      />
                    ) : (
                      <div className="text-slate-500 text-xs font-mono">{t('Tidak ada foto')}</div>
                    )}
                    
                    {/* Zoom overlay button to see the image full */}
                    {detailImages.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxImages(detailImages);
                          setLightboxIndex(modalImageIdx);
                        }}
                        className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-black/60 hover:bg-black/85 text-white px-3.5 py-2 rounded-xl text-xs font-bold border border-white/10 transition-all cursor-pointer shadow-lg hover:scale-105"
                        title={t('Lihat Gambar Full')}
                      >
                        <ZoomIn className="w-4 h-4" />
                        <span>{t('Lihat Gambar Full')}</span>
                      </button>
                    )}

                    {/* Prev/Next Overlay buttons */}
                    {detailImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalImageIdx(prev => (prev === 0 ? detailImages.length - 1 : prev - 1));
                          }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/85 text-white p-2.5 rounded-full transition-all group-hover/modal-img:scale-105 flex items-center justify-center w-10 h-10"
                          title={t('Sebelumnya')}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalImageIdx(prev => (prev === detailImages.length - 1 ? 0 : prev + 1));
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/85 text-white p-2.5 rounded-full transition-all group-hover/modal-img:scale-105 flex items-center justify-center w-10 h-10"
                          title={t('Berikutnya')}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        
                        {/* Image position label */}
                        <span className="absolute bottom-4 right-4 bg-black/75 backdrop-blur-xs text-white text-[11px] px-3 py-1.5 rounded-lg font-mono font-bold border border-white/10">
                          {modalImageIdx + 1} / {detailImages.length}
                        </span>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Bottom Layout: Two-Column Responsive Grid */}
              <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
                
                {/* Left Side Content (lg:col-span-2) */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Title & Badge card */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 border-l-[6px] border-l-slate-300 shadow-xs space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-amber-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-md shadow-xs tracking-wider uppercase">
                        ⭐ {t('UNIT PILIHAN')}
                      </span>
                      <span className="bg-emerald-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-md shadow-xs tracking-wider uppercase">
                        {t('BOOKING AMAN')}
                      </span>
                      <span className="bg-blue-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-md shadow-xs tracking-wider uppercase">
                        {t('VERIFIED SELLER')}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h1 className="text-2xl font-bold text-slate-800 tracking-tight leading-snug">
                        {selectedAsset.name}
                      </h1>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                        {selectedAsset.brand} • {selectedAsset.category} • {t('Tahun')} {selectedAsset.modelYear}
                      </p>
                    </div>

                    {selectedAsset.closeBidDate && (
                      isAuctionClosed ? (
                        <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 p-3.5 rounded-2xl text-rose-800">
                          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                          <div className="text-xs font-semibold">
                            <p className="font-bold uppercase tracking-wide text-rose-600 text-[10px]">{t('Lelang Ditutup')}</p>
                            <p>{t('Lelang untuk unit ini telah resmi ditutup pada')} {new Date(selectedAsset.closeBidDate).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-2xl text-amber-900">
                          <div className="flex items-start gap-2.5">
                            <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse-hover" />
                            <div className="text-xs font-semibold">
                              <p className="font-bold uppercase tracking-wide text-amber-800 text-[10px]">{t('Batas Waktu Bidding')}</p>
                              <p className="leading-relaxed">{t('Lelang ini akan ditutup secara otomatis pada')} {new Date(selectedAsset.closeBidDate).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-start sm:items-end shrink-0 pl-7 sm:pl-0">
                            <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider mb-1 block">{t('Sisa Waktu')}</span>
                            <CountdownTimer targetDate={selectedAsset.closeBidDate} size="large" />
                          </div>
                        </div>
                      )
                    )}

                    <div className="border-t border-slate-100 pt-4 grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      <div className="flex items-center gap-2.5 text-slate-600">
                        <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
                          <Tag className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-xs font-semibold">
                          <p className="text-slate-400 text-[9px] uppercase tracking-wide">{t('Bahan Bakar')}</p>
                          <p className="text-slate-700">SOLAR / DIESEL</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 text-slate-600">
                        <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
                          <Truck className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-xs font-semibold">
                          <p className="text-slate-400 text-[9px] uppercase tracking-wide">{t('No. Polisi')}</p>
                          <p className="text-slate-700 font-mono uppercase">{selectedAsset.plateNumber}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 text-slate-600">
                        <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
                          <MapPin className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-xs font-semibold">
                          <p className="text-slate-400 text-[9px] uppercase tracking-wide">{t('Lokasi Pool')}</p>
                          <p className="text-slate-700 line-clamp-1">{selectedAsset.location.split(',')[0]}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ikhtisar Card */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 border-l-[6px] border-l-slate-300 shadow-xs space-y-5">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                      <Info className="w-4 h-4 text-blue-600" />
                      <span>{t('Ikhtisar Spesifikasi')}</span>
                    </h3>
                    
                    {/* Part A: Main Specifications */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('Spesifikasi Utama')}</h4>
                      <div className="grid grid-cols-3 gap-3 text-xs font-semibold">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                          <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Merek / Brand')}</span>
                          <strong className="text-slate-900 font-bold text-sm">{selectedAsset.brand}</strong>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                          <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Kategori')}</span>
                          <strong className="text-slate-900 font-bold text-sm">{selectedAsset.category}</strong>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                          <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Tahun Registrasi')}</span>
                          <strong className="text-slate-900 font-bold text-sm">{selectedAsset.modelYear}</strong>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                          <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('No Polisi')}</span>
                          <strong className="text-slate-900 font-bold text-sm font-mono uppercase">{selectedAsset.plateNumber || '-'}</strong>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                          <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Kondisi Fisik')}</span>
                          <strong className="text-slate-900 font-bold text-sm">{t(selectedAsset.condition)}</strong>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                          <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Lokasi Detail')}</span>
                          <strong className="text-slate-900 font-bold text-sm line-clamp-1">{selectedAsset.location}</strong>
                        </div>
                        
                        {/* Property specifications fields */}
                        {selectedAsset.propertyType && (
                          <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100/80">
                            <span className="text-blue-600 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Tipe Properti')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{selectedAsset.propertyType}</strong>
                          </div>
                        )}
                        {selectedAsset.auctionType && (
                          <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100/80">
                            <span className="text-blue-600 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Tipe Lelang')}</span>
                            <strong className="text-blue-700 font-bold text-sm">{selectedAsset.auctionType}</strong>
                          </div>
                        )}
                        {selectedAsset.landArea && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Luas Tanah')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{selectedAsset.landArea}</strong>
                          </div>
                        )}
                        {selectedAsset.buildingArea && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Luas Bangunan')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{selectedAsset.buildingArea}</strong>
                          </div>
                        )}

                        {/* Used Part Specifics */}
                        {selectedAsset.usedPartCategory && (
                          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200/70">
                            <span className="text-amber-800 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Sub-Kategori Used Part')}</span>
                            <strong className="text-amber-950 font-bold text-sm">{selectedAsset.usedPartCategory}</strong>
                          </div>
                        )}
                        {selectedAsset.quantity && (
                          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200/70">
                            <span className="text-amber-800 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Kuantitas / Jumlah')}</span>
                            <strong className="text-amber-950 font-bold text-sm">{selectedAsset.quantity}</strong>
                          </div>
                        )}
                        {selectedAsset.salesSystem && (
                          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200/70">
                            <span className="text-amber-800 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Sistem Penjualan')}</span>
                            <strong className="text-amber-950 font-bold text-sm">{selectedAsset.salesSystem}</strong>
                          </div>
                        )}
                        {selectedAsset.openHouseSchedule && (
                          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200/70 col-span-1 sm:col-span-2">
                            <span className="text-amber-800 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Jadwal Open House')}</span>
                            <strong className="text-amber-950 font-bold text-sm">{selectedAsset.openHouseSchedule}</strong>
                          </div>
                        )}

                        {/* Ban Specs */}
                        {selectedAsset.tireBrand && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Merek Ban')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{selectedAsset.tireBrand}</strong>
                          </div>
                        )}
                        {selectedAsset.tireSize && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Ukuran Ban')}</span>
                            <strong className="text-slate-900 font-bold text-sm font-mono">{selectedAsset.tireSize}</strong>
                          </div>
                        )}
                        {selectedAsset.tireType && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Jenis Ban')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{selectedAsset.tireType}</strong>
                          </div>
                        )}
                        {selectedAsset.tireTreadDepth && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Ketebalan Kembang')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{selectedAsset.tireTreadDepth}</strong>
                          </div>
                        )}
                        {selectedAsset.tireCondition && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Kondisi Ban')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{selectedAsset.tireCondition}</strong>
                          </div>
                        )}
                        {selectedAsset.tireDotCode && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('DOT Code (Tahun)')}</span>
                            <strong className="text-slate-900 font-bold text-sm font-mono">{selectedAsset.tireDotCode}</strong>
                          </div>
                        )}

                        {/* Aki Specs */}
                        {selectedAsset.batteryBrand && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Merek Aki')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{selectedAsset.batteryBrand}</strong>
                          </div>
                        )}
                        {selectedAsset.batteryTypeCode && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Kode Aki')}</span>
                            <strong className="text-slate-900 font-bold text-sm font-mono">{selectedAsset.batteryTypeCode}</strong>
                          </div>
                        )}
                        {selectedAsset.batteryCapacity && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Kapasitas Aki')}</span>
                            <strong className="text-slate-900 font-bold text-sm font-mono">{selectedAsset.batteryCapacity}</strong>
                          </div>
                        )}
                        {selectedAsset.batteryType && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Jenis Aki')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{selectedAsset.batteryType}</strong>
                          </div>
                        )}
                        {selectedAsset.batteryCondition && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Kondisi Aki')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{selectedAsset.batteryCondition}</strong>
                          </div>
                        )}
                        {selectedAsset.batteryElectrolyteStatus && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Air Aki')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{selectedAsset.batteryElectrolyteStatus}</strong>
                          </div>
                        )}

                        {/* Besi Specs */}
                        {selectedAsset.metalType && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Jenis Besi / Logam')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{selectedAsset.metalType}</strong>
                          </div>
                        )}
                        {selectedAsset.metalSalesMethod && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Metode Penjualan')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{selectedAsset.metalSalesMethod}</strong>
                          </div>
                        )}
                        {selectedAsset.metalEstimatedWeight && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Estimasi Berat')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{selectedAsset.metalEstimatedWeight}</strong>
                          </div>
                        )}
                        {selectedAsset.metalCondition && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Kondisi Besi')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{selectedAsset.metalCondition}</strong>
                          </div>
                        )}
                        {selectedAsset.metalHandlingFacility && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85 col-span-1 sm:col-span-2">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Pemotongan & Pengangkutan')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{selectedAsset.metalHandlingFacility}</strong>
                          </div>
                        )}

                        {/* New specifications fields */}
                        {selectedAsset.model && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Model')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{selectedAsset.model}</strong>
                          </div>
                        )}
                        {selectedAsset.series && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Series')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{selectedAsset.series}</strong>
                          </div>
                        )}
                        {selectedAsset.axels && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Axels')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{selectedAsset.axels}</strong>
                          </div>
                        )}
                        {selectedAsset.vehicleColour && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Warna')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{t(selectedAsset.vehicleColour)}</strong>
                          </div>
                        )}
                        {selectedAsset.fuelType && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Bahan Bakar')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{t(selectedAsset.fuelType)}</strong>
                          </div>
                        )}
                        {selectedAsset.horsepower && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Horsepower (HP)')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{selectedAsset.horsepower}</strong>
                          </div>
                        )}
                        {selectedAsset.odometer && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('KM Spidometer')}</span>
                            <strong className="text-slate-900 font-bold text-sm">{selectedAsset.odometer}</strong>
                          </div>
                        )}
                        {selectedAsset.dimensions && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/85">
                            <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Dimensi Unit')}</span>
                            <strong className="text-slate-900 font-bold text-sm font-mono">{selectedAsset.dimensions}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Part A.5: Documents & Legality */}
                    {(selectedAsset.keurValidUntil || selectedAsset.stnkPlateValidUntil || selectedAsset.stnkTaxValidUntil) && (
                      <div className="space-y-2 pt-3 border-t border-slate-100">
                        <h4 className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">{t('Dokumen & Legalitas')}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold">
                          {selectedAsset.keurValidUntil && (
                            <div className="bg-teal-50/40 p-3 rounded-xl border border-teal-100/60">
                              <span className="text-teal-600 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('KEUR Berlaku Hingga')}</span>
                              <strong className="text-slate-900 font-bold text-sm">{formatDateIndonesian(selectedAsset.keurValidUntil)}</strong>
                            </div>
                          )}
                          {selectedAsset.stnkPlateValidUntil && (
                            <div className="bg-teal-50/40 p-3 rounded-xl border border-teal-100/60">
                              <span className="text-teal-600 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Plat STNK Berlaku Hingga')}</span>
                              <strong className="text-slate-900 font-bold text-sm">{formatDateIndonesian(selectedAsset.stnkPlateValidUntil)}</strong>
                            </div>
                          )}
                          {selectedAsset.stnkTaxValidUntil && (
                            <div className="bg-teal-50/40 p-3 rounded-xl border border-teal-100/60">
                              <span className="text-teal-600 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Pajak STNK Berlaku Hingga')}</span>
                              <strong className="text-slate-900 font-bold text-sm">{formatDateIndonesian(selectedAsset.stnkTaxValidUntil)}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Part B: Attachment Specifications */}
                    {selectedAsset.haveAttachment && (
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{t('Spesifikasi Attachment')}</h4>
                          <span className="bg-indigo-50 text-indigo-700 text-[8px] font-bold px-2 py-0.5 rounded-md border border-indigo-100 uppercase">
                            {selectedAsset.attachmentCategory || 'Trailer'}
                          </span>
                        </div>

                        {/* Attachment Photo Display if available */}
                        {((selectedAsset.attachmentImageUrls && selectedAsset.attachmentImageUrls.length > 0) || selectedAsset.attachmentImageUrl) && (
                          <div className="flex gap-2 pb-2 overflow-x-auto">
                            {(selectedAsset.attachmentImageUrls || (selectedAsset.attachmentImageUrl ? [selectedAsset.attachmentImageUrl] : [])).map((imgUrl, idx) => (
                              <div key={idx} className="relative w-28 h-20 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                                <img
                                  src={imgUrl}
                                  alt={`${t('Attachment Photo')} ${idx + 1}`}
                                  className="w-full h-full object-cover cursor-zoom-in hover:opacity-90 transition"
                                  referrerPolicy="no-referrer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const attImages = selectedAsset.attachmentImageUrls || [selectedAsset.attachmentImageUrl || ''];
                                    setLightboxImages(attImages);
                                    setLightboxIndex(idx);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-3 text-xs font-semibold bg-indigo-50/20 p-4 rounded-xl border border-indigo-100/30">
                          {selectedAsset.attachmentType && (
                            <div className="bg-white p-3 rounded-xl border border-slate-100/85">
                              <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Tipe')}</span>
                              <strong className="text-slate-900 font-bold text-sm">{selectedAsset.attachmentType}</strong>
                            </div>
                          )}
                          {selectedAsset.attachmentAxels && (
                            <div className="bg-white p-3 rounded-xl border border-slate-100/85">
                              <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Axels')}</span>
                              <strong className="text-slate-900 font-bold text-sm">{selectedAsset.attachmentAxels}</strong>
                            </div>
                          )}
                          {selectedAsset.attachmentYearBuilt && (
                            <div className="bg-white p-3 rounded-xl border border-slate-100/85">
                              <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Tahun Produksi')}</span>
                              <strong className="text-slate-900 font-bold text-sm">{selectedAsset.attachmentYearBuilt}</strong>
                            </div>
                          )}
                          {selectedAsset.attachmentValidUntil && (
                            <div className="bg-white p-3 rounded-xl border border-slate-100/85">
                              <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('KEUR BERLAKU HINGGA')}</span>
                              <strong className="text-slate-900 font-bold text-sm">{formatDateIndonesian(selectedAsset.attachmentValidUntil)}</strong>
                            </div>
                          )}

                          {/* Attachment Dimensions */}
                          {(selectedAsset.attachmentLength || selectedAsset.attachmentWidth || selectedAsset.attachmentHeight) && (
                            <div className="col-span-3 mt-1 pt-2 border-t border-indigo-100/40">
                              <span className="text-slate-400 text-[9px] block uppercase mb-1.5 font-bold tracking-wider">{t('Dimensi Attachment')}</span>
                              <div className="grid grid-cols-3 gap-2">
                                {selectedAsset.attachmentLength && (
                                  <div className="bg-white p-3 rounded-xl border border-slate-100/85">
                                    <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Panjang Total')}</span>
                                    <strong className="text-slate-900 font-bold text-sm font-mono">{selectedAsset.attachmentLength}</strong>
                                  </div>
                                )}
                                {selectedAsset.attachmentWidth && (
                                  <div className="bg-white p-3 rounded-xl border border-slate-100/85">
                                    <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Lebar Total')}</span>
                                    <strong className="text-slate-900 font-bold text-sm font-mono">{selectedAsset.attachmentWidth}</strong>
                                  </div>
                                )}
                                {selectedAsset.attachmentHeight && (
                                  <div className="bg-white p-3 rounded-xl border border-slate-100/85">
                                    <span className="text-slate-400 text-[9px] block uppercase mb-0.5 font-bold tracking-wider">{t('Tinggi Total')}</span>
                                    <strong className="text-slate-900 font-bold text-sm font-mono">{selectedAsset.attachmentHeight}</strong>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Deskripsi (OLX-style Truncated preview + "Selengkapnya" modal link) */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 border-l-[6px] border-l-slate-300 shadow-xs space-y-4">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                      <Info className="w-4 h-4 text-blue-600" />
                      <span>{t('Deskripsi Lengkap')}</span>
                    </h3>
                    <div className="text-xs leading-relaxed text-slate-600 space-y-2 relative">
                      <div className="line-clamp-3 overflow-hidden text-slate-600 font-sans">
                        {stripMarkdown(selectedAsset.description)}
                      </div>
                      
                      <div className="pt-2">
                        <button 
                          type="button" 
                          onClick={() => setShowFullDesc(true)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-bold hover:underline inline-flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span>{t('Selengkapnya')}</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Side Content (sticky info + pricing + buttons + interactive booking form) */}
                <div className="space-y-6">
                  
                  {/* Price & CTA Trigger Card */}
                  {isUserLoggedIn ? (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 border-l-[6px] border-l-slate-300 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{t('Detail Harga')}</span>
                        <span className="bg-blue-50 text-blue-700 text-[9px] font-extrabold px-2 py-0.5 rounded-md border border-blue-100 uppercase">
                          {(selectedAsset.bids || []).length} {t('Penawaran Masuk')}
                        </span>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{t('Penawaran Tertinggi')}</p>
                          <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
                            {formatIDR(currentHighestBid)}
                          </h2>
                        </div>
                        
                        <div className="border-t border-slate-100 pt-3 space-y-1">
                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{t('Harga Awal')}</p>
                          <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
                            {formatIDR(selectedAsset.startingPrice)}
                          </h2>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 border-l-[6px] border-l-slate-300 shadow-xs space-y-4">
                      <div className="space-y-1 pb-2 border-b border-slate-100">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{t('Harga Awal')}</p>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                          {formatIDR(selectedAsset.startingPrice)}
                        </h2>
                      </div>
                      <div className="flex flex-col items-center py-2 text-center space-y-2">
                        <Lock className="w-6 h-6 text-amber-500 animate-pulse" />
                        <h4 className="font-bold text-slate-800 text-sm">{t('Gabung untuk Menawar')}</h4>
                        <p className="text-xs text-slate-500 max-w-[240px] leading-relaxed">
                          {t('Silakan masuk atau daftar akun baru untuk mengajukan penawaran lelang unit ini.')}
                        </p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => { if (onOpenLoginModal) onOpenLoginModal(); }}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/25 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>{t('Masuk / Daftar Sekarang')}</span>
                      </button>
                    </div>
                  )}

                  {/* Interactive Bidding & Survey Scheduler Form */}
                  <div 
                    id="bid-form-card"
                    className={`bg-white p-6 rounded-2xl border border-l-[6px] border-l-slate-300 transition-all duration-300 space-y-4 cursor-pointer ${
                      isFormFocused 
                        ? 'relative z-40 border-blue-500 shadow-2xl ring-2 ring-blue-500/20 scale-[1.02] bg-white cursor-default' 
                        : 'relative z-10 border-slate-200/80 shadow-xs hover:border-blue-300'
                    }`}
                    onClick={(e) => {
                      if (!isFormFocused) {
                        setIsFormFocused(true);
                        if (nameInputRef.current) {
                          nameInputRef.current.focus();
                        }
                      }
                    }}
                  >
                    {!isUserLoggedIn ? (
                      <div className="py-6 text-center space-y-3.5">
                        <Lock className="w-8 h-8 text-amber-500 mx-auto animate-bounce" />
                        <h4 className="font-bold text-slate-800 text-sm">{t('Formulir Penawaran Terkunci')}</h4>
                        <p className="text-xs text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                          {t('Silakan masuk atau daftar menggunakan akun lelang terverifikasi Anda untuk mengajukan penawaran lelang.')}
                        </p>
                        <button
                          type="button"
                          onClick={() => { if (onOpenLoginModal) onOpenLoginModal(); }}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/25 cursor-pointer uppercase tracking-wider"
                        >
                          {t('Masuk / Daftar Sekarang')}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="border-b border-slate-100 pb-3">
                          <span className="text-[9px] font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100 uppercase">
                            {t('FORM PENAWARAN')}
                          </span>
                          <h3 className="font-bold text-slate-800 text-sm mt-1.5">
                            {bidForm.requestSurvey ? t('Ajukan Tawaran & Survei') : t('Kirim Penawaran')}
                          </h3>
                        </div>

                    {isAuctionClosed ? (
                      <div className="py-6 text-center space-y-3.5">
                        <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto text-rose-500">
                          <AlertCircle className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">{t('Lelang Ditutup')}</h4>
                        <p className="text-xs text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                          {t('Penawaran untuk unit ini telah ditutup karena melewati batas waktu penutupan lelang.')}
                        </p>
                      </div>
                    ) : canBid === false ? (
                      <div className="py-6 text-center space-y-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/80 p-5 shadow-2xs">
                        <div className="w-12 h-12 bg-amber-100 border border-amber-200/80 rounded-2xl flex items-center justify-center mx-auto text-amber-700 shadow-2xs">
                          <Lock className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold bg-amber-200/80 text-amber-900 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-300/60">
                            {t('Mode Hanya Lihat')}
                          </span>
                          <h4 className="font-bold text-slate-800 text-sm mt-2">{t('Akses Bidding Nonaktif')}</h4>
                        </div>
                        <p className="text-xs text-slate-600 max-w-[260px] mx-auto leading-relaxed">
                          {t('Akun Anda saat ini diatur sebagai "Hanya Lihat". Anda dapat melihat spesifikasi lengkap unit, namun tidak dapat melakukan penawaran lelang.')}
                        </p>
                        <div className="pt-2 text-[11px] text-amber-800/80 font-medium border-t border-amber-200/60">
                          {t('Hubungi Administrator jika membutuhkan akses menawar.')}
                        </div>
                      </div>
                    ) : !formSuccess ? (
                      <form 
                        onSubmit={handleBidSubmit}
                        onFocusCapture={() => setIsFormFocused(true)}
                        onBlurCapture={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setIsFormFocused(false);
                          }
                        }}
                        className="space-y-4"
                      >
                        {formError && (
                          <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-semibold flex items-start gap-2 animate-shake">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{formError}</span>
                          </div>
                        )}

                        {/* Name */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">{t('Nama Lengkap Anda *')}</label>
                          <div className="relative">
                            <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                            <input
                              type="text"
                              ref={nameInputRef}
                              required
                              placeholder={t('Contoh: PT Samudera Transport')}
                              value={bidForm.name}
                              onChange={(e) => setBidForm(prev => ({ ...prev, name: e.target.value }))}
                              onFocus={(e) => {
                                setIsFormFocused(true);
                                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }}
                              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                            />
                          </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">{t('Alamat Email Kontak *')}</label>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                            <input
                              type="email"
                              required
                              placeholder="name@company.co.id"
                              value={bidForm.email}
                              onChange={(e) => setBidForm(prev => ({ ...prev, email: e.target.value }))}
                              onFocus={(e) => {
                                setIsFormFocused(true);
                                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }}
                              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-medium"
                            />
                          </div>
                        </div>

                        {/* Contact (Phone) */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">{t('No. Handphone / WhatsApp *')}</label>
                          <div className="relative">
                            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                            <input
                              type="tel"
                              required
                              placeholder={t('Contoh: 0812XXXXXXXX')}
                              value={bidForm.contact}
                              onChange={(e) => setBidForm(prev => ({ ...prev, contact: e.target.value }))}
                              onFocus={(e) => {
                                setIsFormFocused(true);
                                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }}
                              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                            />
                          </div>
                        </div>

                        {/* Bid Price */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">{t('Harga Bid Anda (IDR) *')}</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 font-bold text-xs text-slate-400">Rp</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              required
                              placeholder={formatNumberWithDots(String(currentHighestBid + 5000000))}
                              value={formatNumberWithDots(bidForm.price)}
                              onChange={(e) => {
                                let raw = e.target.value.replace(/\D/g, '');
                                if (raw.length > 1 && raw.startsWith('0')) {
                                  raw = raw.replace(/^0+/, '');
                                }
                                setBidForm(prev => ({ ...prev, price: raw }));
                              }}
                              onFocus={(e) => {
                                setIsFormFocused(true);
                                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }}
                              className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-[10px] text-slate-400">
                              {t('Penawaran Tertinggi:')} <strong className="text-slate-600">{formatIDR(currentHighestBid)}</strong>
                            </p>
                            <button
                              type="button"
                              onClick={() => setBidForm(prev => ({ ...prev, price: String(currentHighestBid) }))}
                              className="text-[9px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                            >
                              {t('Gunakan')}
                            </button>
                          </div>
                        </div>

                        {/* Request Survey Toggle */}
                        <div className="pt-2 border-t border-slate-100">
                          <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={bidForm.requestSurvey}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                const todayStr = new Date().toISOString().split('T')[0];
                                setBidForm(prev => ({
                                  ...prev,
                                  requestSurvey: isChecked,
                                  surveyDate: isChecked && !prev.surveyDate ? todayStr : prev.surveyDate
                                }));
                                if (isChecked) {
                                  setTimeout(() => {
                                    const grid = document.getElementById('visit-sessions-grid');
                                    if (grid) {
                                      grid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                    }
                                  }, 150);
                                }
                              }}
                              className="w-4.5 h-4.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <div className="text-xs">
                              <p className="font-bold text-slate-800">{t('Booking Jadwal Survei Fisik')}</p>
                              <p className="text-slate-400 text-[10px]">{t('Ingin cek kondisi mesin langsung di Pool?')}</p>
                            </div>
                          </label>
                        </div>

                        {/* Survey Scheduler Details */}
                        {bidForm.requestSurvey && (
                          <div className="p-4 bg-gradient-to-br from-blue-50/60 to-indigo-50/20 rounded-2xl border border-blue-100/80 space-y-3.5 relative overflow-hidden shadow-xs">
                            <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5 relative z-10">
                              <CalendarCheck className="w-4 h-4 text-blue-600" /> {t('Tentukan Waktu Kunjungan Pool')}
                            </p>
                            
                            <div className="space-y-3 relative z-10">
                              {/* Select Date */}
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">{t('Pilih Tanggal Kunjungan')}</label>
                                <input
                                  type="date"
                                  min={new Date().toISOString().split('T')[0]}
                                  value={bidForm.surveyDate}
                                  onChange={(e) => {
                                    const newDate = e.target.value;
                                    setBidForm(prev => {
                                      let nextTime = prev.surveyTime;
                                      if (isTimeBooked(nextTime, newDate)) {
                                        const slots = ["09:00", "11:00", "13:30", "15:30"];
                                        const available = slots.find(slot => !isTimeBooked(slot, newDate));
                                        if (available) {
                                          nextTime = available;
                                        }
                                      }
                                      return { ...prev, surveyDate: newDate, surveyTime: nextTime };
                                    });
                                  }}
                                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-700"
                                  required={bidForm.requestSurvey}
                                />
                              </div>

                              {/* Sesi Jam list */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">{t('Pilih Sesi Jam Kunjungan')}</label>
                                </div>

                                <div className="grid grid-cols-1 gap-2" id="visit-sessions-grid">
                                  {[
                                    { id: "09:00", label: t('Pagi Sesi 1 (09:00 WIB)'), time: "09:00 WIB", desc: t('Sesi Pagi I') },
                                    { id: "11:00", label: t('Pagi Sesi 2 (11:00 WIB)'), time: "11:00 WIB", desc: t('Sesi Pagi II') },
                                    { id: "13:30", label: t('Siang Sesi 1 (13:30 WIB)'), time: "13:30 WIB", desc: t('Sesi Siang I') },
                                    { id: "15:30", label: t('Sore Sesi 2 (15:30 WIB)'), time: "15:30 WIB", desc: t('Sesi Sore II') }
                                  ].map((session) => {
                                    const booked = isTimeBooked(session.id, bidForm.surveyDate);
                                    const selected = bidForm.surveyTime === session.id;

                                    return (
                                      <button
                                        key={session.id}
                                        type="button"
                                        disabled={booked}
                                        onClick={() => setBidForm(prev => ({ ...prev, surveyTime: session.id }))}
                                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all relative ${
                                          booked
                                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                            : selected
                                            ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/10 text-blue-950'
                                            : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                      >
                                        <div className="flex justify-between items-center w-full">
                                          <span className="text-[11px] font-bold">
                                            {session.time}
                                          </span>
                                          {booked ? (
                                            <span className="bg-red-50 text-red-500 border border-red-100 text-[8px] font-extrabold px-1 py-0.5 rounded tracking-wide uppercase">
                                              {t('Booked')}
                                            </span>
                                          ) : (
                                            <span className={`text-[8px] font-extrabold px-1 py-0.5 rounded tracking-wide uppercase ${
                                              selected ? 'bg-blue-600 text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                            }`}>
                                              {selected ? t('Selected') : t('Ready')}
                                            </span>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Terms and Conditions (Syarat dan Ketentuan) */}
                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                            {t('Syarat & Ketentuan Lelang *')}
                          </label>
                          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 max-h-[120px] overflow-y-auto text-[10px] text-slate-500 leading-relaxed custom-scrollbar whitespace-pre-wrap">
                            {selectedAsset.tnc ? (
                              selectedAsset.tnc
                            ) : (
                              <span className="italic text-slate-400">{t('Tidak ada Syarat & Ketentuan khusus (Kosong)')}</span>
                            )}
                          </div>
                          
                          <label className="flex items-start gap-2.5 cursor-pointer select-none py-1">
                            <input
                              type="checkbox"
                              required
                              checked={agreedToTerms}
                              onChange={(e) => setAgreedToTerms(e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 mt-0.5 cursor-pointer"
                            />
                            <span className="text-[11px] text-slate-600 leading-normal">
                              {t('Saya telah membaca, memahami, dan menyetujui seluruh Syarat dan Ketentuan Lelang yang berlaku.')}
                            </span>
                          </label>
                        </div>

                        {/* Submit Bid Button */}
                        <button
                          type="submit"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-bold shadow-md shadow-blue-500/15 hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                          <span>{bidForm.requestSurvey ? t('Kirim Penawaran & Booking') : t('Kirim Penawaran')}</span>
                        </button>
                      </form>
                    ) : (
                      // Success feedback panel
                      <div className="py-6 text-center space-y-4 animate-fade-in" id="bid-success-panel">
                        <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
                          <CheckCircle className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-bold text-slate-800 text-sm">{t('Penawaran Berhasil!')}</h3>
                          <p className="text-[10px] text-slate-400">{t('Harga penawaran Anda telah dicatat.')}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-left space-y-1.5 font-medium font-sans">
                          <div className="flex justify-between">
                            <span className="text-slate-400">{t('Armada:')}</span>
                            <span className="text-slate-800 font-bold text-[11px] line-clamp-1">{selectedAsset.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">{t('Harga Bid:')}</span>
                            <span className="text-blue-700 font-bold">{formatIDR(Number(bidForm.price))}</span>
                          </div>
                          {bidForm.requestSurvey && (
                            <div className="flex justify-between border-t border-dashed border-slate-200 pt-1.5 mt-1.5 text-blue-700">
                              <span className="flex items-center gap-1 font-bold">
                                <Calendar className="w-3.5 h-3.5" /> {t('Survei:')}
                              </span>
                              <span className="font-bold">{bidForm.surveyDate} @ {bidForm.surveyTime} WIB</span>
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 italic">{t('Menutup halaman...')}</p>
                      </div>
                    )}

                    {/* Shield / Safety warning */}
                    <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-[10px] text-slate-400 leading-normal">
                      <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        {t('Setiap pengiriman penawaran dijamin aman & tunduk pada Syarat Ketentuan Lelang Pancaran.')}
                      </span>
                    </div>
                  </>
                )}

                    {/* Extra mobile focus bottom spacer inside form card to prevent virtual keyboard occlusion */}
                    {isFormFocused && (
                      <div className="h-[20vh] md:hidden" />
                    )}
                  </div>

                  {/* Extra mobile padding inside the scrollable container layout */}
                  {isFormFocused && (
                    <div className="h-[25vh] md:hidden" />
                  )}

                </div>

              </div>

            </div>

            {/* Mobile Floating Action Button to jump directly to form when scrolled away */}
            {!formSuccess && !isFormFocused && (
              <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[55] animate-bounce">
                <button
                  type="button"
                  onClick={() => {
                    const formElement = document.getElementById('bid-form-card');
                    if (formElement) {
                      formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    if (nameInputRef.current) {
                      nameInputRef.current.focus();
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-5 py-3.5 rounded-full shadow-2xl border border-blue-500/20 flex items-center gap-2 uppercase tracking-wider whitespace-nowrap cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>{t('Tulis Penawaran')}</span>
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Focused Description Overlay Modal - Dark dimmed background */}
        {showFullDesc && (
          <div 
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fade-in"
            id="full-description-overlay"
            onClick={() => setShowFullDesc(false)}
          >
            <div 
              className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-2xl overflow-hidden relative animate-zoom-in my-auto max-h-[85vh] flex flex-col focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                    {t('Detail Deskripsi')}
                  </span>
                  <h3 className="font-bold text-slate-800 text-base mt-2">{selectedAsset.name}</h3>
                </div>
                <button 
                  onClick={() => setShowFullDesc(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 p-2 rounded-full transition-all cursor-pointer flex items-center justify-center"
                  title={t('Tutup')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Description Container */}
              <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar space-y-4">
                <div className="text-sm leading-relaxed text-slate-600 font-sans">
                  {renderDescription(selectedAsset.description)}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  onClick={() => setShowFullDesc(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 hover:shadow-blue-500/25 cursor-pointer uppercase tracking-wider"
                >
                  {t('Selesai')}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )}

      {/* Immersive Fullscreen Lightbox Zoom Overlay */}
      {lightboxIndex !== null && lightboxImages.length > 0 && (
        <div 
          className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4 md:p-8 select-none animate-fade-in"
          id="image-lightbox-overlay"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Controls Bar */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-[110]">
            {/* Zoom Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomed(prev => !prev);
              }}
              className="bg-slate-900/80 hover:bg-slate-800 text-white p-2.5 rounded-full border border-slate-800 hover:border-slate-700 hover:scale-105 transition-all shadow-xl flex items-center justify-center cursor-pointer"
              title={isZoomed ? t('Zoom Out') : t('Zoom In')}
            >
              {isZoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
            </button>

            {/* Close button */}
            <button
              onClick={() => setLightboxIndex(null)}
              className="bg-slate-900/80 hover:bg-slate-800 text-white p-2.5 rounded-full border border-slate-800 hover:border-slate-700 hover:scale-105 transition-all shadow-xl flex items-center justify-center cursor-pointer"
              title={t('Tutup')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Prev button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(prev => (prev === null ? 0 : (prev === 0 ? lightboxImages.length - 1 : prev - 1)));
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-slate-800 text-white p-3 rounded-full border border-slate-800 hover:border-slate-700 hover:scale-105 transition-all shadow-xl z-[110] flex items-center justify-center w-12 h-12 cursor-pointer"
              title={t('Sebelumnya')}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(prev => (prev === null ? 0 : (prev === lightboxImages.length - 1 ? 0 : prev + 1)));
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-slate-800 text-white p-3 rounded-full border border-slate-800 hover:border-slate-700 hover:scale-105 transition-all shadow-xl z-[110] flex items-center justify-center w-12 h-12 cursor-pointer"
              title={t('Berikutnya')}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Image Container with Smooth Animation & Zoom Scroll Support */}
          <div 
            className={`relative w-full max-w-6xl max-h-[85vh] flex items-center justify-center animate-zoom-in transition-all duration-300 ${
              isZoomed ? "overflow-auto cursor-zoom-out p-4 justify-start items-start bg-slate-950/40 rounded-2xl border border-slate-900" : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (isZoomed) {
                setIsZoomed(false);
              }
            }}
          >
            <img
              src={lightboxImages[lightboxIndex] || "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80"}
              alt={`Zoomed Asset - ${lightboxIndex + 1}`}
              className={`select-none transition-all duration-300 ${
                isZoomed 
                  ? "w-[200%] md:w-[150%] max-w-none max-h-none object-contain cursor-zoom-out rounded-lg shadow-2xl" 
                  : "w-full max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-slate-800 cursor-zoom-in hover:scale-[1.01]"
              }`}
              referrerPolicy="no-referrer"
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomed(prev => !prev);
              }}
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80";
              }}
            />
          </div>

          {/* Position indicator & Close hint */}
          <div className="mt-4 flex flex-col items-center gap-1.5 text-center">
            {lightboxImages.length > 1 && (
              <span className="text-xs text-slate-300 font-mono font-bold bg-slate-900/60 px-3 py-1 rounded-full border border-slate-800">
                {lightboxIndex + 1} / {lightboxImages.length}
              </span>
            )}
            <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-1">
              {isZoomed 
                ? t('Klik gambar untuk memperkecil • Geser untuk menjelajah detail') 
                : t('Klik gambar untuk memperbesar • Klik di luar untuk kembali')}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
