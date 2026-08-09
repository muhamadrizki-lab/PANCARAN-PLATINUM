import React, { useState, useEffect } from 'react';
import { Asset, AssetStatus, Bid, Brand, Category, Condition, Series, VehicleColour, FuelType, AttachmentCategory, AttachmentType, MAIN_CATEGORIES, normalizeCategory } from '../types';
import { useLanguage } from './LanguageContext';
import { OfficialWinnerLetterModal } from './OfficialWinnerLetterModal';
import { 
  addBrandToDb, 
  deleteBrandFromDb,
  addCategoryToDb,
  deleteCategoryFromDb,
  addConditionToDb,
  deleteConditionFromDb,
  addSeriesToDb,
  deleteSeriesFromDb,
  addVehicleColourToDb,
  deleteVehicleColourFromDb,
  addFuelTypeToDb,
  deleteFuelTypeFromDb,
  addAttachmentCategoryToDb,
  deleteAttachmentCategoryFromDb,
  addAttachmentTypeToDb,
  deleteAttachmentTypeFromDb
} from '../firebase';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  Check, 
  X, 
  ExternalLink,
  Calendar,
  DollarSign,
  Tag,
  AlertTriangle,
  FileText,
  MapPin,
  Clock,
  Sparkles,
  Upload,
  Trophy,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Settings,
  Mail,
  Phone,
  Copy,
  Truck,
  Wrench,
  Building2,
  Package,
  Disc,
  BatteryCharging,
  Layers
} from 'lucide-react';

interface AdminAssetsProps {
  assets: Asset[];
  brands?: Brand[];
  categories?: Category[];
  conditions?: Condition[];
  seriesList?: Series[];
  vehicleColours?: VehicleColour[];
  fuelTypes?: FuelType[];
  attachmentCategories?: AttachmentCategory[];
  attachmentTypes?: AttachmentType[];
  selectedAssetId: string | null;
  onSelectAsset: (assetId: string | null) => void;
  onAddAsset: (newAsset: Omit<Asset, 'id' | 'bids' | 'highestBid'>) => void;
  onUpdateAsset: (assetId: string, updatedAsset: Partial<Asset>) => void;
  onUpdateAssetStatus: (assetId: string, status: AssetStatus) => void;
  onDeleteAsset: (assetId: string) => void;
}

const compressImage = (file: File, maxWidth: number = 800, maxHeight: number = 600, quality: number = 0.75): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions keeping aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string); // Fallback to original base64 if context is not available
          return;
        }

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get compressed base64 string
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        reject(new Error('Gagal memuat gambar untuk kompresi.'));
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Gagal membaca file gambar.'));
    };
    reader.readAsDataURL(file);
  });
};

const VEHICLE_TEMPLATES = [
  { name: 'Hino Wingbox Heavy-Duty', brand: 'Hino', category: 'Vehicle', url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80' },
  { name: 'Isuzu Giga Box Besi', brand: 'Isuzu', category: 'Vehicle', url: 'https://images.unsplash.com/photo-1516576885502-d5334430e52b?auto=format&fit=crop&w=800&q=80' },
  { name: 'Fuso Colt Dump Truck', brand: 'Fuso', category: 'Vehicle', url: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80' },
  { name: 'Scania Premium Head Container', brand: 'Scania', category: 'Vehicle', url: 'https://images.unsplash.com/photo-1592838064575-70ed626d3a44?auto=format&fit=crop&w=800&q=80' },
  { name: 'Toyota Hilux Single Cabin', brand: 'Toyota', category: 'Vehicle', url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80' },
  { name: 'Caterpillar Forklift Diesel', brand: 'Caterpillar', category: 'Vehicle', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80' },
];

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


export default function AdminAssets({
  assets,
  brands = [],
  categories = [],
  conditions = [],
  seriesList = [],
  vehicleColours = [],
  fuelTypes = [],
  attachmentCategories = [],
  attachmentTypes = [],
  selectedAssetId,
  onSelectAsset,
  onAddAsset,
  onUpdateAsset,
  onUpdateAssetStatus,
  onDeleteAsset
}: AdminAssetsProps) {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'all' | 'Open' | 'Sold'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [selectedWinnerLetterAsset, setSelectedWinnerLetterAsset] = useState<Asset | null>(null);

  // Master Brand Management State
  const [isBrandMasterOpen, setIsBrandMasterOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [brandError, setBrandError] = useState('');

  // Master Category Management State
  const [isCategoryMasterOpen, setIsCategoryMasterOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');

  // Master Physical Condition Management State
  const [isConditionMasterOpen, setIsConditionMasterOpen] = useState(false);
  const [newConditionName, setNewConditionName] = useState('');
  const [conditionError, setConditionError] = useState('');

  // Master Series Management State
  const [isSeriesMasterOpen, setIsSeriesMasterOpen] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [seriesError, setSeriesError] = useState('');

  // Master Vehicle Colour Management State
  const [isColourMasterOpen, setIsColourMasterOpen] = useState(false);
  const [newColourName, setNewColourName] = useState('');
  const [colourError, setColourError] = useState('');

  // Master Fuel Type Management State
  const [isFuelMasterOpen, setIsFuelMasterOpen] = useState(false);
  const [newFuelName, setNewFuelName] = useState('');
  const [fuelError, setFuelError] = useState('');

  // Master Attachment Category Management State
  const [isAttachmentMasterOpen, setIsAttachmentMasterOpen] = useState(false);
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [attachmentError, setAttachmentError] = useState('');

  // Master Attachment Type Management State
  const [isAttachmentTypeMasterOpen, setIsAttachmentTypeMasterOpen] = useState(false);
  const [newAttachmentTypeName, setNewAttachmentTypeName] = useState('');
  const [attachmentTypeError, setAttachmentTypeError] = useState('');
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormFocused, setIsFormFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isAttachmentDragging, setIsAttachmentDragging] = useState(false);
  const [editAssetId, setEditAssetId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bidDeleteConfirmId, setBidDeleteConfirmId] = useState<string | null>(null);
  const [surveyCancelConfirmId, setSurveyCancelConfirmId] = useState<string | null>(null);
  const [detailImageIdx, setDetailImageIdx] = useState(0);

  // Bid rescheduling state
  const [editingBidId, setEditingBidId] = useState<string | null>(null);
  const [newSurveyDate, setNewSurveyDate] = useState('');
  const [newSurveyTime, setNewSurveyTime] = useState('');
  const [focusedBid, setFocusedBid] = useState<Bid | null>(null);
  const [copiedState, setCopiedState] = useState(false);

  // States for fullscreen image lightbox
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    setIsZoomed(false);
  }, [lightboxIndex]);

  useEffect(() => {
    setDetailImageIdx(0);
  }, [selectedAssetId]);

  const handleAddNewBrand = async () => {
    const trimmed = newBrandName.trim();
    if (!trimmed) {
      setBrandError(t('Nama merek tidak boleh kosong.'));
      return;
    }
    
    // Check duplication (case-insensitive)
    const duplicate = brands.some(b => b.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      setBrandError(t('Merek tersebut sudah terdaftar.'));
      return;
    }

    try {
      const brandId = trimmed.toLowerCase().replace(/\s+/g, '-');
      await addBrandToDb({
        id: brandId,
        name: trimmed,
        createdAt: new Date().toISOString()
      });
      setNewBrandName('');
      setBrandError('');
    } catch (err) {
      console.error("Failed to add brand", err);
      setBrandError(t('Gagal menambahkan merek.'));
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    try {
      await deleteBrandFromDb(brandId);
    } catch (err) {
      console.error("Failed to delete brand", err);
    }
  };

  const handleAddNewCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setCategoryError(t('Nama kategori tidak boleh kosong.'));
      return;
    }
    
    // Check duplication (case-insensitive)
    const duplicate = categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      setCategoryError(t('Kategori tersebut sudah terdaftar.'));
      return;
    }

    try {
      const catId = trimmed.toLowerCase().replace(/\s+/g, '-');
      await addCategoryToDb({
        id: catId,
        name: trimmed,
        createdAt: new Date().toISOString()
      });
      setNewCategoryName('');
      setCategoryError('');
    } catch (err) {
      console.error("Failed to add category", err);
      setCategoryError(t('Gagal menambahkan kategori.'));
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    try {
      await deleteCategoryFromDb(catId);
    } catch (err) {
      console.error("Failed to delete category", err);
    }
  };

  const handleAddNewCondition = async () => {
    const trimmed = newConditionName.trim();
    if (!trimmed) {
      setConditionError(t('Nama kondisi tidak boleh kosong.'));
      return;
    }
    
    // Check duplication (case-insensitive)
    const duplicate = conditions.some(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      setConditionError(t('Kondisi tersebut sudah terdaftar.'));
      return;
    }

    try {
      const condId = trimmed.toLowerCase().replace(/\s+/g, '-');
      await addConditionToDb({
        id: condId,
        name: trimmed,
        createdAt: new Date().toISOString()
      });
      setNewConditionName('');
      setConditionError('');
    } catch (err) {
      console.error("Failed to add condition", err);
      setConditionError(t('Gagal menambahkan kondisi.'));
    }
  };

  const handleDeleteCondition = async (condId: string) => {
    try {
      await deleteConditionFromDb(condId);
    } catch (err) {
      console.error("Failed to delete condition", err);
    }
  };

  const handleAddNewSeries = async () => {
    const trimmed = newSeriesName.trim();
    if (!trimmed) {
      setSeriesError(t('Nama seri tidak boleh kosong.'));
      return;
    }
    const duplicate = seriesList.some(s => s.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      setSeriesError(t('Seri tersebut sudah terdaftar.'));
      return;
    }
    try {
      const sId = trimmed.toLowerCase().replace(/\s+/g, '-');
      await addSeriesToDb({
        id: sId,
        name: trimmed,
        createdAt: new Date().toISOString()
      });
      setNewSeriesName('');
      setSeriesError('');
    } catch (err) {
      console.error("Failed to add series", err);
      setSeriesError(t('Gagal menambahkan seri.'));
    }
  };

  const handleDeleteSeries = async (sId: string) => {
    try {
      await deleteSeriesFromDb(sId);
    } catch (err) {
      console.error("Failed to delete series", err);
    }
  };

  const handleAddNewColour = async () => {
    const trimmed = newColourName.trim();
    if (!trimmed) {
      setColourError(t('Warna tidak boleh kosong.'));
      return;
    }
    const duplicate = vehicleColours.some(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      setColourError(t('Warna tersebut sudah terdaftar.'));
      return;
    }
    try {
      const cId = trimmed.toLowerCase().replace(/\s+/g, '-');
      await addVehicleColourToDb({
        id: cId,
        name: trimmed,
        createdAt: new Date().toISOString()
      });
      setNewColourName('');
      setColourError('');
    } catch (err) {
      console.error("Failed to add colour", err);
      setColourError(t('Gagal menambahkan warna.'));
    }
  };

  const handleDeleteColour = async (cId: string) => {
    try {
      await deleteVehicleColourFromDb(cId);
    } catch (err) {
      console.error("Failed to delete colour", err);
    }
  };

  const handleAddNewFuel = async () => {
    const trimmed = newFuelName.trim();
    if (!trimmed) {
      setFuelError(t('Bahan bakar tidak boleh kosong.'));
      return;
    }
    const duplicate = fuelTypes.some(f => f.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      setFuelError(t('Bahan bakar tersebut sudah terdaftar.'));
      return;
    }
    try {
      const fId = trimmed.toLowerCase().replace(/\s+/g, '-');
      await addFuelTypeToDb({
        id: fId,
        name: trimmed,
        createdAt: new Date().toISOString()
      });
      setNewFuelName('');
      setFuelError('');
    } catch (err) {
      console.error("Failed to add fuel type", err);
      setFuelError(t('Gagal menambahkan bahan bakar.'));
    }
  };

  const handleDeleteFuel = async (fId: string) => {
    try {
      await deleteFuelTypeFromDb(fId);
    } catch (err) {
      console.error("Failed to delete fuel type", err);
    }
  };

  const handleAddNewAttachment = async () => {
    const trimmed = newAttachmentName.trim();
    if (!trimmed) {
      setAttachmentError(t('Nama jenis gandengan tidak boleh kosong.'));
      return;
    }
    const duplicate = attachmentCategories.some(a => a.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      setAttachmentError(t('Jenis gandengan tersebut sudah terdaftar.'));
      return;
    }
    try {
      const aId = trimmed.toLowerCase().replace(/\s+/g, '-');
      await addAttachmentCategoryToDb({
        id: aId,
        name: trimmed,
        createdAt: new Date().toISOString()
      });
      setNewAttachmentName('');
      setAttachmentError('');
    } catch (err) {
      console.error("Failed to add attachment category", err);
      setAttachmentError(t('Gagal menambahkan jenis gandengan.'));
    }
  };

  const handleDeleteAttachment = async (aId: string) => {
    try {
      await deleteAttachmentCategoryFromDb(aId);
    } catch (err) {
      console.error("Failed to delete attachment category", err);
    }
  };

  const handleAddNewAttachmentType = async () => {
    const trimmed = newAttachmentTypeName.trim();
    if (!trimmed) {
      setAttachmentTypeError(t('Tipe gandengan tidak boleh kosong.'));
      return;
    }
    const duplicate = attachmentTypes.some(at => at.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      setAttachmentTypeError(t('Tipe gandengan tersebut sudah terdaftar.'));
      return;
    }
    try {
      const atId = trimmed.toLowerCase().replace(/\s+/g, '-');
      await addAttachmentTypeToDb({
        id: atId,
        name: trimmed,
        createdAt: new Date().toISOString()
      });
      setNewAttachmentTypeName('');
      setAttachmentTypeError('');
    } catch (err) {
      console.error("Failed to add attachment type", err);
      setAttachmentTypeError(t('Gagal menambahkan tipe gandengan.'));
    }
  };

  const handleDeleteAttachmentType = async (atId: string) => {
    try {
      await deleteAttachmentTypeFromDb(atId);
    } catch (err) {
      console.error("Failed to delete attachment type", err);
    }
  };

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

  useEffect(() => {
    if (!isFormOpen) {
      setIsFormFocused(false);
    }
  }, [isFormOpen]);

  const [formData, setFormData] = useState({
    name: '',
    brand: 'Hino',
    category: '',
    modelYear: 2022 as number | string,
    plateNumber: '',
    condition: 'Baik' as Asset['condition'],
    location: '',
    description: '',
    startingPrice: '',
    imageUrl: '',
    imageUrls: [] as string[],
    dimensions: '',
    propertyType: 'Gudang',
    auctionType: 'Jual',
    landArea: '',
    buildingArea: '',
    // Used Part fields
    usedPartCategory: 'Ban',
    quantity: '',
    salesSystem: 'Satuan',
    openHouseSchedule: '',
    tireBrand: '',
    tireSize: '',
    tireType: 'Ban Luar',
    tireTreadDepth: '',
    tireCondition: 'Masih Layak Pakai (Tubeless/Pakai Ban Dalam)',
    tireDotCode: '',
    batteryBrand: '',
    batteryTypeCode: '',
    batteryCapacity: '',
    batteryType: 'Aki Basah',
    batteryCondition: 'Masih Fungsi (Hanya Perlu Cas)',
    batteryElectrolyteStatus: 'Masih Terisi Air Aki',
    metalType: 'Besi Berat / H-Beam / I-Beam / Plate',
    metalSalesMethod: 'Penimbangan',
    metalEstimatedWeight: '',
    metalCondition: '',
    metalHandlingFacility: 'Pemenang Lelang wajib potong dan angkut sendiri',
    model: '',
    series: '',
    axels: '',
    vehicleColour: 'White',
    fuelType: 'Solar',
    horsepower: '',
    odometer: '',
    keurValidUntil: '',
    stnkPlateValidUntil: '',
    stnkTaxValidUntil: '',
    haveAttachment: false,
    attachmentCategory: 'Trailer',
    attachmentImageUrl: '',
    attachmentImageUrls: [] as string[],
    attachmentType: '',
    attachmentAxels: '',
    attachmentYearBuilt: '',
    attachmentKeurNo: '',
    attachmentValidUntil: '',
    attachmentLength: '',
    attachmentWidth: '',
    attachmentHeight: '',
    attachmentExtension: '',
    tnc: '',
    closeBidDate: ''
  });

  const descriptionRef = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isFormOpen && descriptionRef.current) {
      descriptionRef.current.style.height = 'auto';
      descriptionRef.current.style.height = `${Math.max(descriptionRef.current.scrollHeight, 100)}px`;
    }
  }, [formData.description, isFormOpen]);

  const openNewAssetForm = () => {
    setEditAssetId(null);
    setFormData({
      name: '',
      brand: 'Hino',
      category: 'Vehicle',
      modelYear: 2022,
      plateNumber: '',
      condition: 'Baik',
      location: '',
      description: '',
      startingPrice: '',
      imageUrl: '',
      imageUrls: [],
      dimensions: '',
      propertyType: 'Gudang',
      auctionType: 'Jual',
      landArea: '',
      buildingArea: '',
      usedPartCategory: 'Ban',
      quantity: '',
      salesSystem: 'Satuan',
      openHouseSchedule: '',
      tireBrand: '',
      tireSize: '',
      tireType: 'Ban Luar',
      tireTreadDepth: '',
      tireCondition: 'Masih Layak Pakai (Tubeless/Pakai Ban Dalam)',
      tireDotCode: '',
      batteryBrand: '',
      batteryTypeCode: '',
      batteryCapacity: '',
      batteryType: 'Aki Basah',
      batteryCondition: 'Masih Fungsi (Hanya Perlu Cas)',
      batteryElectrolyteStatus: 'Masih Terisi Air Aki',
      metalType: 'Besi Berat / H-Beam / I-Beam / Plate',
      metalSalesMethod: 'Penimbangan',
      metalEstimatedWeight: '',
      metalCondition: '',
      metalHandlingFacility: 'Pemenang Lelang wajib potong dan angkut sendiri',
      model: '',
      series: '440',
      axels: '',
      vehicleColour: 'White',
      fuelType: 'Solar',
      horsepower: '',
      odometer: '',
      keurValidUntil: '',
      stnkPlateValidUntil: '',
      stnkTaxValidUntil: '',
      haveAttachment: false,
      attachmentCategory: 'Trailer',
      attachmentImageUrl: '',
      attachmentImageUrls: [],
      attachmentType: 'Highbed 40',
      attachmentAxels: '',
      attachmentYearBuilt: '',
      attachmentKeurNo: '',
      attachmentValidUntil: '',
      attachmentLength: '',
      attachmentWidth: '',
      attachmentHeight: '',
      attachmentExtension: '',
      tnc: '',
      closeBidDate: ''
    });
    setIsFormOpen(true);
  };

  const handleEditClick = (asset: Asset) => {
    setEditAssetId(asset.id);
    const resolvedUrls = asset.imageUrls && asset.imageUrls.length > 0 
      ? asset.imageUrls 
      : (asset.imageUrl ? [asset.imageUrl] : []);
    setFormData({
      name: asset.name,
      brand: asset.brand,
      category: normalizeCategory(asset.category),
      modelYear: asset.modelYear,
      plateNumber: asset.plateNumber === 'N/A' ? '' : asset.plateNumber,
      condition: asset.condition,
      location: asset.location,
      description: asset.description,
      startingPrice: String(asset.startingPrice),
      imageUrl: asset.imageUrl || (resolvedUrls[0] || ''),
      imageUrls: resolvedUrls,
      dimensions: asset.dimensions || '',
      propertyType: asset.propertyType || 'Gudang',
      auctionType: asset.auctionType || 'Jual',
      landArea: asset.landArea || '',
      buildingArea: asset.buildingArea || '',
      usedPartCategory: asset.usedPartCategory || 'Ban',
      quantity: asset.quantity || '',
      salesSystem: asset.salesSystem || 'Satuan',
      openHouseSchedule: asset.openHouseSchedule || '',
      tireBrand: asset.tireBrand || '',
      tireSize: asset.tireSize || '',
      tireType: asset.tireType || 'Ban Luar',
      tireTreadDepth: asset.tireTreadDepth || '',
      tireCondition: asset.tireCondition || 'Masih Layak Pakai (Tubeless/Pakai Ban Dalam)',
      tireDotCode: asset.tireDotCode || '',
      batteryBrand: asset.batteryBrand || '',
      batteryTypeCode: asset.batteryTypeCode || '',
      batteryCapacity: asset.batteryCapacity || '',
      batteryType: asset.batteryType || 'Aki Basah',
      batteryCondition: asset.batteryCondition || 'Masih Fungsi (Hanya Perlu Cas)',
      batteryElectrolyteStatus: asset.batteryElectrolyteStatus || 'Masih Terisi Air Aki',
      metalType: asset.metalType || 'Besi Berat / H-Beam / I-Beam / Plate',
      metalSalesMethod: asset.metalSalesMethod || 'Penimbangan',
      metalEstimatedWeight: asset.metalEstimatedWeight || '',
      metalCondition: asset.metalCondition || '',
      metalHandlingFacility: asset.metalHandlingFacility || 'Pemenang Lelang wajib potong dan angkut sendiri',
      model: asset.model || asset.name || '',
      series: asset.series || '440',
      axels: asset.axels || '',
      vehicleColour: asset.vehicleColour || 'White',
      fuelType: asset.fuelType || 'Solar',
      horsepower: asset.horsepower || '',
      odometer: asset.odometer || '',
      keurValidUntil: asset.keurValidUntil || '',
      stnkPlateValidUntil: asset.stnkPlateValidUntil || '',
      stnkTaxValidUntil: asset.stnkTaxValidUntil || '',
      haveAttachment: !!asset.haveAttachment,
      attachmentCategory: asset.attachmentCategory || 'Trailer',
      attachmentImageUrl: asset.attachmentImageUrl || '',
      attachmentImageUrls: asset.attachmentImageUrls || [],
      attachmentType: asset.attachmentType || 'Highbed 40',
      attachmentAxels: asset.attachmentAxels || '',
      attachmentYearBuilt: asset.attachmentYearBuilt || '',
      attachmentKeurNo: asset.attachmentKeurNo || '',
      attachmentValidUntil: asset.attachmentValidUntil || '',
      attachmentLength: asset.attachmentLength || '',
      attachmentWidth: asset.attachmentWidth || '',
      attachmentHeight: asset.attachmentHeight || '',
      attachmentExtension: asset.attachmentExtension || '',
      tnc: asset.tnc || '',
      closeBidDate: asset.closeBidDate || ''
    });
    setIsFormOpen(true);
  };

  const handleFilesChange = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    
    const newImageUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        alert('Hanya file gambar yang diperbolehkan.');
        continue;
      }
      
      try {
        const compressedBase64 = await compressImage(file, 800, 600, 0.75);
        newImageUrls.push(compressedBase64);
      } catch (err) {
        console.error('Gagal mengompresi gambar:', err);
        // Fallback
        const readerStr = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string || '');
          reader.readAsDataURL(file);
        });
        if (readerStr) {
          newImageUrls.push(readerStr);
        }
      }
    }

    if (newImageUrls.length > 0) {
      setFormData(prev => {
        const currentUrls = prev.imageUrls || [];
        const merged = [...currentUrls, ...newImageUrls];
        return {
          ...prev,
          imageUrls: merged,
          imageUrl: merged[0] || prev.imageUrl
        };
      });
    }
  };

  const handleAttachmentFilesChange = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    
    const newImageUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        alert('Hanya file gambar yang diperbolehkan.');
        continue;
      }
      
      try {
        const compressedBase64 = await compressImage(file, 800, 600, 0.75);
        newImageUrls.push(compressedBase64);
      } catch (err) {
        console.error('Gagal mengompresi gambar:', err);
        const readerStr = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string || '');
          reader.readAsDataURL(file);
        });
        if (readerStr) {
          newImageUrls.push(readerStr);
        }
      }
    }

    if (newImageUrls.length > 0) {
      setFormData(prev => {
        const currentUrls = prev.attachmentImageUrls || [];
        const merged = [...currentUrls, ...newImageUrls];
        return {
          ...prev,
          attachmentImageUrls: merged,
          attachmentImageUrl: merged[0] || prev.attachmentImageUrl
        };
      });
    }
  };

  const selectedAsset = assets.find(a => a.id === selectedAssetId);

  // Filter logic
  const filteredAssets = assets.filter(asset => {
    const matchesTab = activeTab === 'all' || asset.status === activeTab;
    const matchesBrand = brandFilter === 'all' || asset.brand === brandFilter;
    const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter;
    const matchesCondition = conditionFilter === 'all' || asset.condition === conditionFilter;
    const matchesSearch = 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.brand.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesBrand && matchesCategory && matchesCondition && matchesSearch;
  });

  // Master brands list to display in filter options and forms
  const displayBrandsList = brands.length > 0
    ? brands.map(b => b.name)
    : Array.from(new Set(['Hino', 'Isuzu', 'Fuso', 'Scania', 'Toyota', 'Caterpillar', 'Komatsu', 'Lainnya', ...assets.map(a => a.brand)]));

  // Master categories list to display in forms
  const displayCategoriesList = categories.length > 0
    ? Array.from(new Set([...categories.map(c => c.name), ...MAIN_CATEGORIES]))
    : [...MAIN_CATEGORIES];

  // Master conditions list to display in forms
  const displayConditionsList = conditions.length > 0
    ? conditions.map(c => c.name)
    : Array.from(new Set(['Sangat Baik', 'Baik', 'Cukup', 'Butuh Perbaikan', ...assets.map(a => a.condition)]));

  // Master series list to display in forms and filters
  const displaySeriesList = seriesList.length > 0
    ? seriesList.map(s => s.name)
    : Array.from(new Set(['440', '500', '320', '260', 'FL 260', 'GIGA', 'Lainnya', ...assets.map(a => a.series).filter((x): x is string => !!x)]));

  // Master colours list to display in forms and filters
  const displayColoursList = vehicleColours.length > 0
    ? vehicleColours.map(c => c.name)
    : Array.from(new Set(['White', 'Yellow', 'Red', 'Blue', 'Green', 'Grey', 'Black', 'Lainnya', ...assets.map(a => a.vehicleColour).filter((x): x is string => !!x)]));

  // Master fuel list to display in forms and filters
  const displayFuelsList = fuelTypes.length > 0
    ? fuelTypes.map(f => f.name)
    : Array.from(new Set(['Solar', 'Diesel', 'Bensin', 'Listrik', ...assets.map(a => a.fuelType).filter((x): x is string => !!x)]));

  // Master attachment category list to display in forms and filters
  const displayAttachmentCategoriesList = attachmentCategories.length > 0
    ? attachmentCategories.map(ac => ac.name)
    : Array.from(new Set(['Trailer', 'Box', 'Dump Body', 'Flatbed', 'Lainnya', ...assets.map(a => a.attachmentCategory).filter((x): x is string => !!x)]));

  // Master attachment type list to display in forms and filters
  const displayAttachmentTypesList = attachmentTypes.length > 0
    ? attachmentTypes.map(at => at.name)
    : Array.from(new Set(['Highbed 40', 'Highbed 20', 'Flatbed 40', 'Flatbed 20', 'Skeleton 40', 'Skeleton 20', 'Lowbed', 'Dolly', 'Lainnya', ...assets.map(a => a.attachmentType).filter((x): x is string => !!x)]));

  // Unique brands for filter
  const uniqueBrands = displayBrandsList;

  const handleTemplateClick = (template: typeof VEHICLE_TEMPLATES[0]) => {
    setFormData(prev => ({
      ...prev,
      name: `${template.name} - New`,
      brand: template.brand,
      category: template.category,
      imageUrl: template.url,
      imageUrls: [template.url]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get final asset name (automatically follows model / spec, with brand prefix if applicable)
    let finalName = '';
    const trimmedModel = (formData.model || '').trim();
    const trimmedBrand = (formData.brand || '').trim();

    if (trimmedModel) {
      if (trimmedBrand && trimmedBrand !== 'Lainnya' && trimmedBrand !== 'Tanpa Merek' && !trimmedModel.toLowerCase().includes(trimmedBrand.toLowerCase())) {
        finalName = `${trimmedBrand} ${trimmedModel}`;
      } else {
        finalName = trimmedModel;
      }
    } else if (formData.name && formData.name.trim()) {
      finalName = formData.name.trim();
    } else if (trimmedBrand && trimmedBrand !== 'Lainnya') {
      finalName = trimmedBrand;
    } else {
      finalName = formData.category || 'Unit Lelang';
    }

    if (!finalName || !formData.startingPrice || !formData.location || !formData.category) {
      alert(t('Mohon lengkapi data harga awal, lokasi, dan kategori.'));
      return;
    }

    const resolvedUrls = formData.imageUrls && formData.imageUrls.length > 0
      ? formData.imageUrls
      : (formData.imageUrl ? [formData.imageUrl] : []);

    const assetData = {
      name: finalName,
      brand: formData.brand,
      category: formData.category,
      modelYear: isNaN(Number(formData.modelYear)) || String(formData.modelYear).trim() === '' ? formData.modelYear : Number(formData.modelYear),
      plateNumber: formData.plateNumber || 'N/A',
      condition: formData.condition,
      location: formData.location,
      description: formData.description || 'Tidak ada deskripsi tambahan.',
      startingPrice: Number(formData.startingPrice),
      imageUrl: formData.imageUrl || (resolvedUrls[0] || ''),
      imageUrls: resolvedUrls,
      dimensions: formData.dimensions || '',
      propertyType: formData.propertyType || '',
      auctionType: formData.auctionType || '',
      landArea: formData.landArea || '',
      buildingArea: formData.buildingArea || '',
      usedPartCategory: formData.usedPartCategory || '',
      quantity: formData.quantity || '',
      salesSystem: formData.salesSystem || '',
      openHouseSchedule: formData.openHouseSchedule || '',
      tireBrand: formData.tireBrand || '',
      tireSize: formData.tireSize || '',
      tireType: formData.tireType || '',
      tireTreadDepth: formData.tireTreadDepth || '',
      tireCondition: formData.tireCondition || '',
      tireDotCode: formData.tireDotCode || '',
      batteryBrand: formData.batteryBrand || '',
      batteryTypeCode: formData.batteryTypeCode || '',
      batteryCapacity: formData.batteryCapacity || '',
      batteryType: formData.batteryType || '',
      batteryCondition: formData.batteryCondition || '',
      batteryElectrolyteStatus: formData.batteryElectrolyteStatus || '',
      metalType: formData.metalType || '',
      metalSalesMethod: formData.metalSalesMethod || '',
      metalEstimatedWeight: formData.metalEstimatedWeight || '',
      metalCondition: formData.metalCondition || '',
      metalHandlingFacility: formData.metalHandlingFacility || '',
      model: formData.model || '',
      series: formData.series || '',
      axels: formData.axels || '',
      vehicleColour: formData.vehicleColour || 'White',
      fuelType: formData.fuelType || 'Solar',
      horsepower: formData.horsepower || '',
      odometer: formData.odometer || '',
      keurValidUntil: formData.keurValidUntil || '',
      stnkPlateValidUntil: formData.stnkPlateValidUntil || '',
      stnkTaxValidUntil: formData.stnkTaxValidUntil || '',
      haveAttachment: formData.haveAttachment,
      attachmentCategory: formData.attachmentCategory || 'Trailer',
      attachmentImageUrl: formData.attachmentImageUrl || '',
      attachmentImageUrls: formData.attachmentImageUrls || [],
      attachmentType: formData.attachmentType || '',
      attachmentAxels: formData.attachmentAxels || '',
      attachmentYearBuilt: formData.attachmentYearBuilt || '',
      attachmentKeurNo: formData.attachmentKeurNo || '',
      attachmentValidUntil: formData.attachmentValidUntil || '',
      attachmentLength: formData.attachmentLength || '',
      attachmentWidth: formData.attachmentWidth || '',
      attachmentHeight: formData.attachmentHeight || '',
      attachmentExtension: formData.attachmentExtension || '',
      tnc: formData.tnc || '',
      closeBidDate: formData.closeBidDate || ''
    };

    if (editAssetId) {
      onUpdateAsset(editAssetId, assetData);
      setEditAssetId(null);
    } else {
      onAddAsset({
        ...assetData,
        status: 'Open'
      });
    }

    // Reset Form
    setFormData({
      name: '',
      brand: 'Hino',
      category: '',
      modelYear: 2022,
      plateNumber: '',
      condition: 'Baik',
      location: '',
      description: '',
      startingPrice: '',
      imageUrl: '',
      imageUrls: [],
      dimensions: '',
      model: '',
      series: '440',
      axels: '',
      vehicleColour: 'White',
      fuelType: 'Solar',
      horsepower: '',
      odometer: '',
      keurValidUntil: '',
      stnkPlateValidUntil: '',
      stnkTaxValidUntil: '',
      haveAttachment: false,
      attachmentCategory: 'Trailer',
      attachmentImageUrl: '',
      attachmentImageUrls: [],
      attachmentType: 'Highbed 40',
      attachmentAxels: '',
      attachmentYearBuilt: '',
      attachmentKeurNo: '',
      attachmentValidUntil: '',
      attachmentLength: '',
      attachmentWidth: '',
      attachmentHeight: '',
      attachmentExtension: '',
      tnc: '',
      closeBidDate: ''
    });
    setIsFormOpen(false);
  };

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

  const handleCopyDetails = (bid: Bid, assetName: string) => {
    const textToCopy = `Detail Penawaran Harga:
----------------------------------
Nama Unit: ${assetName}
Nama Penawar: ${bid.name}
Nilai Bid: ${formatIDR(bid.price)}
Nomor Telepon: ${bid.contact}
Email: ${bid.email}
Jadwal Survei: ${bid.scheduleSurveyDate ? `${bid.scheduleSurveyDate} @ ${bid.scheduleSurveyTime || 'N/A'} WIB` : 'Belum dijadwalkan'}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          setCopiedState(true);
          setTimeout(() => setCopiedState(false), 2000);
        })
        .catch(() => {});
    }
  };

  return (
    <div className="space-y-8 animate-fade-in" id="admin-assets-view">
      
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{t('Kelola Aset Lelang')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('Daftarkan armada logistik baru, pantau status lelang, dan verifikasi riwayat penawaran.')}</p>
        </div>
        <button
          onClick={openNewAssetForm}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm shadow-blue-600/10 hover:shadow-blue-600/20 active:scale-95 transition-all self-stretch sm:self-auto"
          id="btn-add-new-asset"
        >
          <Plus className="w-5 h-5" />
          <span>{t('Tambah Aset Baru')}</span>
        </button>
      </div>

      {/* Main Assets Grid & Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Table & Filters (2-cols on desktop if details open, otherwise full width?) 
            Actually, let's keep it beautifully split or dynamic! If an asset is selected, let's show list on 2 columns and details on 1 column. If nothing selected, show list on 3 columns.
        */}
        <div className={`space-y-6 transition-all duration-300 ${selectedAssetId ? 'lg:col-span-2' : 'lg:col-span-3'}`} id="assets-list-container">
          
          {/* Filters & Search Row */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 border-l-[6px] border-l-slate-300 shadow-sm space-y-4">
            
            {/* Search and Filters */}
            <div className="flex flex-col xl:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('Cari berdasarkan nama aset, plat, kategori...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full xl:w-auto xl:min-w-[520px]">
                {/* Brand Filter */}
                <div className="flex gap-1.5 items-center">
                  <div className="relative flex-1">
                    <select
                      value={brandFilter}
                      onChange={(e) => setBrandFilter(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-semibold text-slate-700"
                    >
                      <option value="all">{t('Semua Brand')}</option>
                      {uniqueBrands.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <Filter className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBrandMasterOpen(true)}
                    className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl transition shadow-sm flex items-center justify-center shrink-0"
                    title={t('Kelola Master Merek')}
                  >
                    <Settings className="w-4 h-4 animate-spin-hover" />
                  </button>
                </div>

                {/* Category Filter */}
                <div className="flex gap-1.5 items-center">
                  <div className="relative flex-1">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-semibold text-slate-700"
                    >
                      <option value="all">{t('Semua Kategori')}</option>
                      {displayCategoriesList.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <Filter className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCategoryMasterOpen(true)}
                    className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl transition shadow-sm flex items-center justify-center shrink-0"
                    title={t('Kelola Master Kategori')}
                  >
                    <Settings className="w-4 h-4 animate-spin-hover" />
                  </button>
                </div>

                {/* Condition Filter */}
                <div className="flex gap-1.5 items-center">
                  <div className="relative flex-1">
                    <select
                      value={conditionFilter}
                      onChange={(e) => setConditionFilter(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-semibold text-slate-700"
                    >
                      <option value="all">{t('Semua Kondisi')}</option>
                      {displayConditionsList.map(c => (
                        <option key={c} value={t(c)}>{t(c)}</option>
                      ))}
                    </select>
                    <Filter className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsConditionMasterOpen(true)}
                    className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl transition shadow-sm flex items-center justify-center shrink-0"
                    title={t('Kelola Master Kondisi')}
                  >
                    <Settings className="w-4 h-4 animate-spin-hover" />
                  </button>
                </div>
              </div>
            </div>

            {/* Status Tabs */}
            <div className="flex border-b border-slate-100 pt-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'all'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('Semua Aset')} ({assets.length})
              </button>
              <button
                onClick={() => setActiveTab('Open')}
                className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'Open'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('Aktif / Open')} ({assets.filter(a => a.status === 'Open').length})
              </button>
              <button
                onClick={() => setActiveTab('Sold')}
                className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'Sold'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('Terjual / Sold')} ({assets.filter(a => a.status === 'Sold').length})
              </button>
            </div>

          </div>

          {/* Cards List Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredAssets.map((asset) => {
              const isSelected = asset.id === selectedAssetId;
              const highestOffer = Math.max(asset.startingPrice, ...(asset.bids || []).map(b => b.price));
              
              return (
                <div
                  key={asset.id}
                  onClick={() => onSelectAsset(isSelected ? null : asset.id)}
                  className={`cursor-pointer group relative bg-white rounded-2xl overflow-hidden border border-l-[6px] border-l-slate-300 transition-all duration-300 flex flex-col justify-between ${
                    isSelected 
                      ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-lg scale-[1.01] z-10' 
                      : selectedAssetId 
                        ? 'border-slate-200 opacity-30 brightness-[0.75] saturate-50 hover:opacity-95 hover:brightness-100 hover:saturate-100'
                        : 'border-slate-200 hover:border-blue-200 hover:shadow-md'
                  }`}
                >
                  {/* Visual Status Tag on Image */}
                  <div className="relative h-44 bg-slate-100 overflow-hidden">
                    <img 
                      src={asset.imageUrl || "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80"} 
                      alt={asset.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-zoom-in"
                      referrerPolicy="no-referrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        const imgs = asset.imageUrls && asset.imageUrls.length > 0 
                          ? asset.imageUrls 
                          : [asset.imageUrl];
                        setLightboxImages(imgs);
                        setLightboxIndex(0);
                      }}
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80";
                      }}
                    />
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono font-bold bg-white/90 backdrop-blur text-slate-800 px-2.5 py-1 rounded-lg shadow-sm border border-slate-200">
                        {asset.id}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm ${
                        asset.status === 'Open' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {asset.status === 'Open' ? t('Menerima Bid') : t('Terjual')}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] text-white font-semibold flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      {asset.brand} • {asset.category}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-800 text-base leading-snug line-clamp-2">
                        {asset.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                        <span>{t('Tahun')} {asset.modelYear}</span>
                        <span>•</span>
                        <span>{t('Plat')}: {asset.plateNumber}</span>
                      </div>
                      {asset.closeBidDate && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <div className="flex items-center gap-1 text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 w-fit">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span>{t('Tutup')}: {new Date(asset.closeBidDate).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                          <CountdownTimer targetDate={asset.closeBidDate} size="small" />
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{t('Harga Awal')}</p>
                        <p className="text-sm font-semibold text-slate-500">{formatIDR(asset.startingPrice)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-blue-500 font-bold uppercase">{t('Penawaran Tertinggi')}</p>
                        <p className="text-base font-bold text-blue-700">{formatIDR(highestOffer)}</p>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs text-slate-500 font-medium bg-slate-50 -mx-5 -mb-5 px-5 py-3 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        {asset.bids.length} {t('Penawaran')}
                      </span>
                      <span className="text-blue-600 font-bold group-hover:underline flex items-center gap-0.5">
                        {t('Lihat Detail')} <Eye className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredAssets.length === 0 && (
              <div className="col-span-full py-16 bg-white border border-dashed border-slate-200 rounded-3xl text-center space-y-3">
                <p className="text-slate-400 font-medium">{t('Tidak ada aset lelang yang cocok dengan kriteria pencarian.')}</p>
                <button 
                  onClick={() => { setSearchQuery(''); setBrandFilter('all'); setActiveTab('all'); }} 
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  {t('Reset Semua Filter')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Detail Drawer / Panel (Shown if an asset is selected) */}
        {selectedAsset && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg space-y-6 lg:col-span-1 sticky top-6 animate-slide-in" id="asset-detail-drawer">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  {selectedAsset.id}
                </span>
                <h2 className="text-lg font-bold text-slate-800 mt-1">{t('Detail Spesifikasi')}</h2>
              </div>
              <button
                onClick={() => onSelectAsset(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                title={t('Tutup Detail')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Asset quick status switcher */}
            <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-200">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">{t('Status Lelang Saat Ini:')}</span>
                <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                  selectedAsset.status === 'Open' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {selectedAsset.status === 'Open' ? t('Menerima Bid') : t('Terjual')}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdateAssetStatus(selectedAsset.id, 'Open')}
                  disabled={selectedAsset.status === 'Open'}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                    selectedAsset.status === 'Open' 
                      ? 'bg-blue-600 text-white cursor-not-allowed' 
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" /> {t('Buka Bid')}
                </button>
                <button
                  onClick={() => onUpdateAssetStatus(selectedAsset.id, 'Sold')}
                  disabled={selectedAsset.status === 'Sold'}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                    selectedAsset.status === 'Sold' 
                      ? 'bg-emerald-600 text-white cursor-not-allowed' 
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" /> {t('Set Terjual')}
                </button>
              </div>
            </div>

            {/* Winner Section for Sold Units */}
            {selectedAsset.status === 'Sold' && (() => {
              const winnerBid = selectedAsset.bids.length > 0
                ? [...selectedAsset.bids].sort((a, b) => b.price - a.price)[0]
                : null;
              return (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4.5 space-y-3 shadow-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                    <Trophy className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t('Pemenang Lelang')}</span>
                  </div>
                  {winnerBid ? (
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center border-b border-emerald-100/70 pb-2">
                        <span className="text-emerald-600 font-medium">{t('Pemenang')}:</span>
                        <span className="font-bold text-emerald-900 text-sm">{winnerBid.name}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-emerald-100/70 pb-2">
                        <span className="text-emerald-600 font-medium">{t('Penawaran Pemenang')}:</span>
                        <span className="font-bold text-emerald-900 font-mono text-sm">{formatIDR(winnerBid.price)}</span>
                      </div>
                      <div className="space-y-1 pt-1 text-slate-700 bg-white/50 p-2.5 rounded-xl border border-emerald-100/30">
                        <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mb-1.5">{t('Kontak Pemenang')}</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-1.5 font-medium">
                            <span className="flex items-center gap-1.5">
                              <span className="text-slate-400">📱</span> {winnerBid.contact}
                            </span>
                            {winnerBid.contact && (
                              <a
                                href={`https://wa.me/${winnerBid.contact.replace(/\D/g, '').startsWith('0') ? '62' + winnerBid.contact.replace(/\D/g, '').slice(1) : winnerBid.contact.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer"
                                title={t('Hubungi via WhatsApp')}
                              >
                                <Phone className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-1.5 font-medium">
                            <span className="flex items-center gap-1.5">
                              <span className="text-slate-400">✉️</span> {winnerBid.email}
                            </span>
                            {winnerBid.email && (
                              <a
                                href={`mailto:${winnerBid.email}`}
                                className="p-1 bg-white hover:bg-blue-50 text-blue-600 border border-slate-200/60 rounded-lg hover:border-blue-200 transition-all shrink-0"
                                title={t('Kirim Email')}
                              >
                                <Mail className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                        {winnerBid.scheduleSurveyDate && (
                          <div className="text-[10px] text-emerald-800 bg-emerald-100/70 px-2.5 py-1.5 rounded-lg mt-2 font-semibold flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{t('Jadwal Survei')}: {winnerBid.scheduleSurveyDate} @ {winnerBid.scheduleSurveyTime || 'N/A'} WIB</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedWinnerLetterAsset(selectedAsset)}
                          className="w-full mt-2.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                          <span>{t('Lihat Surat Pemenang Resmi (PDF)')}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic bg-white/40 p-3 rounded-xl border border-dashed border-slate-200 text-center">
                      {t('Belum ada penawar')}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Spec Details */}
            <div className="space-y-4 text-sm">
              {/* Image Carousel / Gallery */}
              <div className="space-y-2">
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 relative group/detail">
                  <img 
                    src={(selectedAsset.imageUrls && selectedAsset.imageUrls.length > 0 ? selectedAsset.imageUrls[detailImageIdx] : selectedAsset.imageUrl) || "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80"} 
                    alt={`${selectedAsset.name} - ${detailImageIdx + 1}`} 
                    className="w-full h-full object-cover cursor-zoom-in transition-all duration-300 hover:scale-102" 
                    referrerPolicy="no-referrer"
                    onClick={() => {
                      const imgs = selectedAsset.imageUrls && selectedAsset.imageUrls.length > 0 
                        ? selectedAsset.imageUrls 
                        : [selectedAsset.imageUrl];
                      setLightboxImages(imgs);
                      setLightboxIndex(detailImageIdx);
                    }}
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80";
                    }}
                  />
                  
                  {/* Prev/Next Overlay buttons */}
                  {selectedAsset.imageUrls && selectedAsset.imageUrls.length > 1 && (
                    <>
                      <button
                        onClick={() => setDetailImageIdx(prev => (prev === 0 ? selectedAsset.imageUrls!.length - 1 : prev - 1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-all opacity-0 group-hover/detail:opacity-100 flex items-center justify-center w-6 h-6 text-xs font-bold"
                        title={t('Sebelumnya')}
                      >
                        ◀
                      </button>
                      <button
                        onClick={() => setDetailImageIdx(prev => (prev === selectedAsset.imageUrls!.length - 1 ? 0 : prev + 1))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-all opacity-0 group-hover/detail:opacity-100 flex items-center justify-center w-6 h-6 text-xs font-bold"
                        title={t('Berikutnya')}
                      >
                        ▶
                      </button>
                      
                      {/* Image position label */}
                      <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md font-mono">
                        {detailImageIdx + 1} / {selectedAsset.imageUrls.length}
                      </span>
                    </>
                  )}
                </div>

                {/* Thumbnails list */}
                {selectedAsset.imageUrls && selectedAsset.imageUrls.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200">
                    {selectedAsset.imageUrls.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => setDetailImageIdx(idx)}
                        className={`w-14 h-10 rounded-lg overflow-hidden border shrink-0 transition-all ${idx === detailImageIdx ? 'border-blue-600 ring-2 ring-blue-500/15' : 'border-slate-200 opacity-60 hover:opacity-100'}`}
                      >
                        <img src={url || "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80"} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-bold text-slate-800 text-base">{selectedAsset.name}</h3>
                <p className="text-xs text-blue-600 font-medium mt-0.5">{selectedAsset.brand} • {selectedAsset.category}</p>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-2 border-t border-slate-50">
                <div>
                  <span className="text-[11px] text-slate-400 font-bold block">{t('PLAT NOMOR')}</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedAsset.plateNumber}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-bold block">{t('TAHUN PRODUKSI')}</span>
                  <span className="font-semibold text-slate-800">{selectedAsset.modelYear}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-bold block">{t('KONDISI FISIK')}</span>
                  <span className="font-semibold text-slate-800">{t(selectedAsset.condition)}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-bold block">{t('LOKASI SEEDING')}</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-0.5 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate" title={selectedAsset.location}>{selectedAsset.location}</span>
                  </span>
                </div>
                {selectedAsset.closeBidDate && (
                  <div className="col-span-2 bg-amber-50/50 border border-amber-100 p-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <span className="text-[10px] text-amber-800 font-bold uppercase block leading-none">{t('Tanggal Penutupan Bid')}</span>
                        <span className="text-xs font-semibold text-amber-950 mt-1 block">
                          {new Date(selectedAsset.closeBidDate).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-start sm:items-end shrink-0 pl-6 sm:pl-0">
                      <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider mb-1 block">{t('Sisa Waktu')}</span>
                      <CountdownTimer targetDate={selectedAsset.closeBidDate} size="small" />
                    </div>
                  </div>
                )}
                {selectedAsset.propertyType && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('TIPE PROPERTI')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.propertyType}</span>
                  </div>
                )}
                {selectedAsset.auctionType && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('TIPE LELANG')}</span>
                    <span className="font-semibold text-blue-700 text-xs font-bold">{selectedAsset.auctionType}</span>
                  </div>
                )}
                {selectedAsset.landArea && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('LUAS TANAH')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.landArea}</span>
                  </div>
                )}
                {selectedAsset.buildingArea && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('LUAS BANGUNAN')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.buildingArea}</span>
                  </div>
                )}

                {/* Used Part specifics display */}
                {selectedAsset.usedPartCategory && (
                  <div>
                    <span className="text-[11px] text-amber-600 font-bold block">{t('SUB-KATEGORI USED PART')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.usedPartCategory}</span>
                  </div>
                )}
                {selectedAsset.quantity && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('JUMLAH / KUANTITAS')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.quantity}</span>
                  </div>
                )}
                {selectedAsset.salesSystem && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('SISTEM PENJUALAN')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.salesSystem}</span>
                  </div>
                )}
                {selectedAsset.openHouseSchedule && (
                  <div className="col-span-2">
                    <span className="text-[11px] text-slate-400 font-bold block">{t('JADWAL OPEN HOUSE')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.openHouseSchedule}</span>
                  </div>
                )}

                {/* Ban fields */}
                {selectedAsset.tireBrand && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('MEREK BAN')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.tireBrand}</span>
                  </div>
                )}
                {selectedAsset.tireSize && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('UKURAN BAN')}</span>
                    <span className="font-semibold text-slate-800 text-xs font-mono">{selectedAsset.tireSize}</span>
                  </div>
                )}
                {selectedAsset.tireType && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('JENIS BAN')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.tireType}</span>
                  </div>
                )}
                {selectedAsset.tireTreadDepth && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('KETEBALAN KEMBANG')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.tireTreadDepth}</span>
                  </div>
                )}
                {selectedAsset.tireCondition && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('KONDISI BAN')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.tireCondition}</span>
                  </div>
                )}
                {selectedAsset.tireDotCode && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('DOT CODE (TAHUN)')}</span>
                    <span className="font-semibold text-slate-800 text-xs font-mono">{selectedAsset.tireDotCode}</span>
                  </div>
                )}

                {/* Aki fields */}
                {selectedAsset.batteryBrand && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('MEREK AKI')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.batteryBrand}</span>
                  </div>
                )}
                {selectedAsset.batteryTypeCode && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('TIPE / KODE AKI')}</span>
                    <span className="font-semibold text-slate-800 text-xs font-mono">{selectedAsset.batteryTypeCode}</span>
                  </div>
                )}
                {selectedAsset.batteryCapacity && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('KAPASITAS AKI')}</span>
                    <span className="font-semibold text-slate-800 text-xs font-mono">{selectedAsset.batteryCapacity}</span>
                  </div>
                )}
                {selectedAsset.batteryType && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('JENIS AKI')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.batteryType}</span>
                  </div>
                )}
                {selectedAsset.batteryCondition && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('KONDISI AKI')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.batteryCondition}</span>
                  </div>
                )}
                {selectedAsset.batteryElectrolyteStatus && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('AIR AKI')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.batteryElectrolyteStatus}</span>
                  </div>
                )}

                {/* Besi fields */}
                {selectedAsset.metalType && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('JENIS BESI / LOGAM')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.metalType}</span>
                  </div>
                )}
                {selectedAsset.metalSalesMethod && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('METODE PENJUALAN')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.metalSalesMethod}</span>
                  </div>
                )}
                {selectedAsset.metalEstimatedWeight && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('ESTIMASI BERAT')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.metalEstimatedWeight}</span>
                  </div>
                )}
                {selectedAsset.metalCondition && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('KONDISI BESI')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.metalCondition}</span>
                  </div>
                )}
                {selectedAsset.metalHandlingFacility && (
                  <div className="col-span-2">
                    <span className="text-[11px] text-slate-400 font-bold block">{t('PEMOTONGAN & PENGANGKUTAN')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.metalHandlingFacility}</span>
                  </div>
                )}
                {selectedAsset.dimensions && (
                  <div className="col-span-2 border-t border-slate-50/50 pt-2">
                    <span className="text-[11px] text-slate-400 font-bold block">{t('Dimensi / Ringkasan Luas')}</span>
                    <span className="font-semibold text-slate-800 font-mono text-xs">{selectedAsset.dimensions}</span>
                  </div>
                )}
                {selectedAsset.model && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('MODEL')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.model}</span>
                  </div>
                )}
                {selectedAsset.series && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('SERIES')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.series}</span>
                  </div>
                )}
                {selectedAsset.axels && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('AXELS')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.axels}</span>
                  </div>
                )}
                {selectedAsset.vehicleColour && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('WARNA')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{t(selectedAsset.vehicleColour)}</span>
                  </div>
                )}
                {selectedAsset.fuelType && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('BAHAN BAKAR')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{t(selectedAsset.fuelType)}</span>
                  </div>
                )}
                {selectedAsset.horsepower && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('Horsepower (HP)')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.horsepower}</span>
                  </div>
                )}
                {selectedAsset.odometer && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">{t('KM Spidometer')}</span>
                    <span className="font-semibold text-slate-800 text-xs">{selectedAsset.odometer}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-50">
                <span className="text-[11px] text-slate-400 font-bold block">{t('DESKRIPSI INTERNAL')}</span>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 max-h-24 overflow-y-auto">
                  {selectedAsset.description}
                </p>
              </div>
            </div>

            {/* Bids List ("list bid price" from flowchart) */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1">
                  <FileText className="w-4 h-4 text-blue-600" /> {t('Histori Penawaran')} ({selectedAsset.bids.length})
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">{t('Bids Tertinggi Pertama')}</span>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {selectedAsset.bids
                  .sort((a, b) => b.price - a.price)
                  .map((bid, i) => (
                    <div 
                      key={bid.id} 
                      onClick={() => setFocusedBid(bid)}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-white transition-all cursor-pointer space-y-1.5 text-xs relative group shadow-xs hover:shadow-md"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-slate-700 block truncate">{bid.name}</span>
                          <span className="font-mono font-bold text-blue-600 mt-0.5 block">{formatIDR(bid.price)}</span>
                        </div>
                        {bidDeleteConfirmId === bid.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-100 shrink-0">
                            <span className="text-[9px] font-bold text-rose-700 shrink-0">{t('Hapus?')}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBidDeleteConfirmId(null);
                              }}
                              className="px-1.5 py-0.5 bg-white text-slate-600 border border-slate-200 rounded text-[9px] font-bold hover:bg-slate-50 cursor-pointer"
                            >
                              {t('Batal')}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updatedBids = selectedAsset.bids.filter(b => b.id !== bid.id);
                                const highestBid = updatedBids.length > 0
                                  ? Math.max(...updatedBids.map(b => b.price), selectedAsset.startingPrice)
                                  : selectedAsset.startingPrice;
                                onUpdateAsset(selectedAsset.id, { 
                                  bids: updatedBids,
                                  highestBid: highestBid
                                });
                                setBidDeleteConfirmId(null);
                              }}
                              className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-bold cursor-pointer"
                            >
                              {t('Ya')}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBidDeleteConfirmId(bid.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer shrink-0"
                            title={t('Hapus Penawaran')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="text-slate-500 flex flex-col gap-0.5">
                        <span>{t('Hubungi')}: {bid.contact}</span>
                        <span>Email: {bid.email}</span>
                      </div>
                      
                      {/* Survey date if requested, or inline rescheduling */}
                      {editingBidId === bid.id ? (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="mt-2.5 pt-2 border-t border-dashed border-slate-200 space-y-2.5 bg-blue-50/40 p-2.5 rounded-xl border border-blue-100"
                        >
                          <p className="font-bold text-blue-800 text-[10px] uppercase tracking-wide">{t('Atur Jadwal Baru')}</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-0.5">
                              <label className="text-[9px] text-slate-400 font-bold uppercase">{t('Tanggal')}</label>
                              <input
                                type="date"
                                min={new Date().toISOString().split('T')[0]}
                                value={newSurveyDate}
                                onChange={(e) => setNewSurveyDate(e.target.value)}
                                className="w-full p-1.5 border border-slate-200 rounded-lg text-[10px] font-medium bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[9px] text-slate-400 font-bold uppercase">{t('Sesi Jam')}</label>
                              <select
                                value={newSurveyTime}
                                onChange={(e) => setNewSurveyTime(e.target.value)}
                                className="w-full p-1.5 border border-slate-200 rounded-lg text-[10px] font-medium bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="09:00">09:00 WIB</option>
                                <option value="11:00">11:00 WIB</option>
                                <option value="13:30">13:30 WIB</option>
                                <option value="15:30">15:30 WIB</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingBidId(null);
                              }}
                              className="flex-1 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              {t('Batal')}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Find bid and update it
                                const updatedBids = selectedAsset.bids.map(b => {
                                  if (b.id === bid.id) {
                                    return {
                                      ...b,
                                      scheduleSurveyDate: newSurveyDate,
                                      scheduleSurveyTime: newSurveyTime
                                    };
                                  }
                                  return b;
                                });
                                const highestBid = updatedBids.length > 0
                                  ? Math.max(...updatedBids.map(b => b.price), selectedAsset.startingPrice)
                                  : selectedAsset.startingPrice;
                                onUpdateAsset(selectedAsset.id, { 
                                  bids: updatedBids,
                                  highestBid: highestBid
                                });
                                setEditingBidId(null);
                              }}
                              className="flex-1 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold transition-colors shadow-xs cursor-pointer"
                            >
                              {t('Simpan')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1.5 pt-1.5 border-t border-dashed border-slate-200 flex flex-col gap-1.5">
                          {bid.scheduleSurveyDate ? (
                            surveyCancelConfirmId === bid.id ? (
                              <div 
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center justify-between text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-1 rounded gap-1.5 border border-rose-100 animate-fade-in"
                              >
                                <span className="font-bold truncate flex-1">{t('Batalkan survei ini?')}</span>
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSurveyCancelConfirmId(null);
                                    }}
                                    className="px-1.5 py-0.5 bg-white text-slate-600 border border-slate-200 rounded text-[9px] font-bold hover:bg-slate-50 cursor-pointer"
                                  >
                                    {t('Batal')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const updatedBids = selectedAsset.bids.map(b => {
                                        if (b.id === bid.id) {
                                          const updatedBid = { ...b };
                                          delete updatedBid.scheduleSurveyDate;
                                          delete updatedBid.scheduleSurveyTime;
                                          return updatedBid;
                                        }
                                        return b;
                                      });
                                      const highestBid = updatedBids.length > 0
                                        ? Math.max(...updatedBids.map(b => b.price), selectedAsset.startingPrice)
                                        : selectedAsset.startingPrice;
                                      onUpdateAsset(selectedAsset.id, { 
                                        bids: updatedBids,
                                        highestBid: highestBid
                                      });
                                      setSurveyCancelConfirmId(null);
                                    }}
                                    className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-bold cursor-pointer"
                                  >
                                    {t('Ya')}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between text-[10px] font-semibold text-blue-600 bg-blue-50/50 px-2 py-1 rounded gap-1.5">
                                <span className="flex items-center gap-1 min-w-0 flex-1">
                                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{bid.scheduleSurveyDate} @ {bid.scheduleSurveyTime || 'N/A'} WIB</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSurveyCancelConfirmId(bid.id);
                                  }}
                                  className="p-0.5 text-blue-400 hover:text-rose-500 rounded transition-colors cursor-pointer shrink-0"
                                  title={t('Batalkan Booking')}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )
                          ) : (
                            <div className="text-[9px] text-slate-400 font-medium italic">
                              {t('Belum ada jadwal survei.')}
                            </div>
                          )}
                          
                          {selectedAsset.status !== 'Sold' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingBidId(bid.id);
                                setNewSurveyDate(bid.scheduleSurveyDate || new Date().toISOString().split('T')[0]);
                                setNewSurveyTime(bid.scheduleSurveyTime || '09:00');
                              }}
                              className="text-left text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-0.5 cursor-pointer"
                            >
                              <Calendar className="w-3 h-3" />
                              <span>{bid.scheduleSurveyDate ? t('Ubah Jadwal') : t('Atur Jadwal Kunjungan')}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                {selectedAsset.bids.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    {t('Belum ada penawaran harga masuk untuk aset ini.')}
                  </div>
                )}
              </div>
            </div>

            {/* Actions: Edit & Delete */}
            {selectedAsset.status !== 'Sold' && (
              deleteConfirmId === selectedAsset.id ? (
                <div className="pt-4 border-t border-rose-100 bg-rose-50/70 p-4 rounded-xl space-y-3 animate-fade-in">
                  <div className="flex gap-2 text-rose-800 text-xs font-semibold items-start">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-900">{t('Konfirmasi Hapus Unit')}</p>
                      <p className="text-rose-700 font-normal mt-1 leading-relaxed">
                        {t('Apakah Anda yakin ingin menghapus {name} secara permanen? Data historis penawaran juga akan ikut terhapus.').replace('{name}', selectedAsset.name)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="flex-1 bg-white hover:bg-slate-100 text-slate-700 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 transition-colors"
                    >
                      {t('Batal')}
                    </button>
                    <button
                      onClick={() => {
                        onDeleteAsset(selectedAsset.id);
                        setDeleteConfirmId(null);
                      }}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-1.5 rounded-lg text-[11px] font-bold shadow-sm transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {t('Ya, Hapus')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-4 border-t border-slate-100 flex gap-3">
                  <button
                    onClick={() => handleEditClick(selectedAsset)}
                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-blue-200 transition-colors"
                  >
                    <FileText className="w-4 h-4" /> {t('Edit Unit Aset')}
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(selectedAsset.id)}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-rose-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> {t('Hapus Unit Aset')}
                  </button>
                </div>
              )
            )}

          </div>
        )}

      </div>

      {/* Input Asset Modal/Dialog Form */}
      {isFormOpen && (
        <div className={`fixed inset-0 transition-all duration-300 z-50 flex items-center justify-center p-4 ${
          isFormFocused ? 'bg-slate-950/92 backdrop-blur-md' : 'bg-slate-900/60 backdrop-blur-sm'
        }`}>
          <div className={`bg-white rounded-3xl shadow-xl w-full max-w-4xl overflow-hidden animate-zoom-in max-h-[90vh] flex flex-col transition-all duration-300 ${
            isFormFocused ? 'ring-4 ring-blue-500/10' : ''
          }`}>
            
            {/* Modal Header */}
            <div className={`p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 transition-all duration-300 ${
              isFormFocused ? 'opacity-30 blur-[0.5px] pointer-events-none' : ''
            }`}>
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {editAssetId ? `${t('Ubah Detail Unit')}: ${editAssetId}` : t('Daftarkan Aset Lelang Baru')}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {editAssetId ? t('Perbarui spesifikasi teknis dan kelengkapan dokumen kendaraan lelang.') : t('Lengkapi spesifikasi teknis dan detail dokumen kendaraan di bawah.')}
                </p>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Scrollable Form */}
            <form 
              onSubmit={handleSubmit}
              onFocusCapture={() => setIsFormFocused(true)}
              onBlurCapture={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setIsFormFocused(false);
                }
              }}
              className="flex-1 overflow-y-auto p-6 space-y-8"
            >
              
              {/* Image Upload Component */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">{t('Foto / Gambar Unit * (Bisa Unggah Banyak)')}</label>
                
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) handleFilesChange(files);
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer relative ${
                    isDragging 
                      ? 'border-blue-500 bg-blue-50/50 animate-pulse' 
                      : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50/50'
                  }`}
                  onClick={() => document.getElementById('file-upload-input')?.click()}
                >
                  <input
                    id="file-upload-input"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) handleFilesChange(files);
                    }}
                  />
                  
                  <div className="py-2 space-y-2">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{t('Pilih atau Seret Foto-Foto Armada')}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{t('Mendukung format PNG, JPG, JPEG (Bisa pilih banyak sekaligus, Max 5MB per file)')}</p>
                    </div>
                  </div>
                </div>

                {/* List of uploaded images with custom preview and delete/cover buttons */}
                {formData.imageUrls && formData.imageUrls.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('Koleksi Foto Terunggah ({count})').replace('{count}', String(formData.imageUrls.length))}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {formData.imageUrls.map((url, idx) => {
                        const isCover = url === formData.imageUrl;
                        return (
                          <div key={idx} className={`relative group/img rounded-xl overflow-hidden border bg-slate-50 flex flex-col justify-between ${isCover ? 'border-blue-500 ring-2 ring-blue-500/15' : 'border-slate-200'}`}>
                            <div className="aspect-video w-full relative overflow-hidden">
                              <img 
                                src={url || "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80"} 
                                alt={`Preview ${idx + 1}`} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.src = "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80";
                                }}
                              />
                              {isCover && (
                                <span className="absolute top-1 left-1 bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                                  {t('Cover Utama')}
                                </span>
                              )}
                              
                              {/* Overlay actions on hover */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFormData(prev => ({
                                      ...prev,
                                      imageUrl: url
                                    }));
                                  }}
                                  className="bg-white hover:bg-blue-600 hover:text-white text-slate-800 text-[9px] font-bold px-2 py-1 rounded shadow-md transition-all active:scale-95"
                                  title={t('Jadikan Cover Utama')}
                                >
                                  Cover
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFormData(prev => {
                                      const filtered = (prev.imageUrls || []).filter((_, i) => i !== idx);
                                      return {
                                        ...prev,
                                        imageUrls: filtered,
                                        imageUrl: prev.imageUrl === url ? (filtered[0] || '') : prev.imageUrl
                                      };
                                    });
                                  }}
                                  className="bg-rose-500 hover:bg-rose-600 text-white p-1 rounded shadow-md transition-all active:scale-95 flex items-center justify-center"
                                  title={t('Hapus gambar')}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="p-1 bg-white border-t border-slate-100 text-[10px] text-slate-500 text-center font-mono truncate">
                              {t('Foto')} {idx + 1}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Fallback URL Option */}
                <div className="pt-1">
                  <details className="group">
                    <summary className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer select-none flex items-center gap-1">
                      <span className="transition-transform group-open:rotate-90">▶</span>
                      {t('Tambah Foto via Tautan Gambar (URL)')}
                    </summary>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="url"
                        id="url-photo-input"
                        placeholder={t('Masukkan link gambar (https://...)')}
                        className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = e.currentTarget.value.trim();
                            if (val) {
                              setFormData(prev => {
                                const list = [...(prev.imageUrls || []), val];
                                return {
                                  ...prev,
                                  imageUrls: list,
                                  imageUrl: prev.imageUrl || val
                                };
                              });
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('url-photo-input') as HTMLInputElement;
                          const val = input?.value.trim();
                          if (val) {
                            setFormData(prev => {
                              const list = [...(prev.imageUrls || []), val];
                              return {
                                ...prev,
                                imageUrls: list,
                                imageUrl: prev.imageUrl || val
                              };
                            });
                            if (input) input.value = '';
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded-xl font-bold"
                      >
                        {t('Tambah')}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {t('Ketik atau tempel tautan gambar, lalu tekan tombol "Tambah" atau Enter untuk memasukkan ke galeri unit lelang ini.')}
                    </p>
                  </details>
                </div>
              </div>

              {/* CATEGORY HELPER CONSTANTS & SELECTOR */}
              {(() => {
                const isVehicle = normalizeCategory(formData.category) === 'Vehicle';
                const isUsedPart = normalizeCategory(formData.category) === 'Used part';
                const isProperty = normalizeCategory(formData.category) === 'Property';
                const isMisc = normalizeCategory(formData.category) === 'Miscellaneous';

                return (
                  <>
                    {/* CATEGORY SELECTION CARDS */}
                    <div className="space-y-2.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                          {t('Pilih Kategori Aset Lelang *')}
                        </label>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          {t('Pilih salah satu kategori aset di bawah')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                          { 
                            id: 'Vehicle', 
                            label: 'Vehicle', 
                            subLabel: 'Kendaraan & Armada', 
                            icon: Truck, 
                            color: 'blue' 
                          },
                          { 
                            id: 'Used part', 
                            label: 'Used part', 
                            subLabel: 'Suku Cadang / Sparepart', 
                            icon: Wrench, 
                            color: 'amber' 
                          },
                          { 
                            id: 'Property', 
                            label: 'Property', 
                            subLabel: 'Tanah & Properti', 
                            icon: Building2, 
                            color: 'emerald' 
                          },
                          { 
                            id: 'Miscellaneous', 
                            label: 'Miscellaneous', 
                            subLabel: 'Aset Lain-lain / Peralatan', 
                            icon: Package, 
                            color: 'purple' 
                          },
                        ].map((catItem) => {
                          const isSelected = normalizeCategory(formData.category) === normalizeCategory(catItem.id);
                          const IconComp = catItem.icon;
                          return (
                            <button
                              key={catItem.id}
                              type="button"
                              onClick={() => setFormData(prev => {
                                const normId = normalizeCategory(catItem.id);
                                let nextYear = prev.modelYear;
                                if (normId === 'Used part' || normId === 'Property' || normId === 'Miscellaneous') {
                                  if (prev.modelYear === 2022 || prev.modelYear === '2022') {
                                    nextYear = '';
                                  }
                                } else if (normId === 'Vehicle') {
                                  if (prev.modelYear === '') {
                                    nextYear = 2022;
                                  }
                                }
                                return { ...prev, category: catItem.id, modelYear: nextYear };
                              })}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 relative overflow-hidden ${
                                isSelected
                                  ? 'border-blue-600 bg-white text-blue-900 ring-2 ring-blue-500/30 shadow-xs'
                                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100/70 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className={`p-1.5 rounded-lg ${
                                  isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  <IconComp className="w-4 h-4" />
                                </div>
                                {isSelected && (
                                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200 animate-pulse"></span>
                                )}
                              </div>
                              <div>
                                <p className="font-extrabold text-xs capitalize leading-snug text-slate-800">{catItem.label}</p>
                                <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">{catItem.subLabel}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* GROUP 1: MAIN INFORMATION */}
                    <div className="space-y-4">
                      <div className="border-b border-slate-100 pb-2">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <span className="w-1.5 h-4 bg-slate-400 rounded-full"></span>
                          {t('INFORMASI UTAMA (MAIN INFORMATION)')}
                        </h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Brand (Only for Vehicle / non-UsedPart, non-Property, non-Misc) */}
                        {!isProperty && !isUsedPart && !isMisc && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-600 uppercase">
                                {t('Merek (Brand) *')}
                              </label>
                              <button
                                type="button"
                                onClick={() => setIsBrandMasterOpen(true)}
                                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold transition"
                                title={t('Kelola Master Merek')}
                              >
                                <Settings className="w-3.5 h-3.5 animate-spin-hover" />
                              </button>
                            </div>
                            <select
                              value={formData.brand}
                              onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            >
                              {displayBrandsList.map(bName => (
                                <option key={bName} value={bName}>{bName}</option>
                              ))}
                              {formData.brand && !displayBrandsList.includes(formData.brand) && (
                                <option value={formData.brand}>{formData.brand}</option>
                              )}
                            </select>
                          </div>
                        )}

                        {/* Model / Type / Spec / Title */}
                        <div className={`space-y-1.5 ${isProperty || isUsedPart || isMisc ? 'md:col-span-2' : ''}`}>
                          <label className="text-xs font-bold text-slate-600 uppercase">
                            {isVehicle ? `${t('Model')} *` : isProperty ? `${t('Nama / Judul / Spec Properti')} *` : `${t('Model / Tipe / Spec')} *`}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={
                              isVehicle ? t('Contoh: FMX, Ranger, Giga, 440') :
                              isUsedPart ? t('Contoh: Engine Assy Hino E13C 440HP / Transmission ZF') :
                              isProperty ? t('Contoh: Gudang & Lahan Depo Marunda 1.200 m²') :
                              t('Contoh: Genset Caterpillar 500 kVA / Heavy Equipment Tool')
                            }
                            value={formData.model}
                            onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800"
                          />
                        </div>

                        {/* Model Year */}
                        {!isProperty && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase">
                              {t('Tahun Produksi / Pembuatan *')}
                            </label>
                            {isUsedPart || isMisc ? (
                              <input
                                type="text"
                                required
                                placeholder={
                                  isUsedPart ? t('Contoh: 2021 (DOT 1221) / Baru / 2018') :
                                  t('Contoh: Pembelian 2020 / Produksi 2019 / N/A')
                                }
                                value={formData.modelYear}
                                onChange={(e) => setFormData(prev => ({ ...prev, modelYear: e.target.value }))}
                                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 bg-white"
                              />
                            ) : (
                              <input
                                type="number"
                                min="1950"
                                max="2027"
                                required
                                value={formData.modelYear}
                                onChange={(e) => setFormData(prev => ({ ...prev, modelYear: e.target.value ? Number(e.target.value) : '' }))}
                                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 bg-white"
                              />
                            )}
                          </div>
                        )}

                        {/* Plate / Reg Number */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 uppercase">
                            {isVehicle ? t('No. Registrasi / Plat Nomor') :
                             isProperty ? t('No. Sertifikat / IMB / HGB / NOP') :
                             isUsedPart ? t('No. Part / S/N / Seri') :
                             t('No. Seri / Inventaris')}
                          </label>
                          <input
                            type="text"
                            placeholder={
                              isVehicle ? t('Contoh: B 9912 PXT (kosongkan jika alat berat)') :
                              isProperty ? t('Contoh: SHM No. 1234/Marunda') :
                              t('Contoh: S/N 882190-X')
                            }
                            value={formData.plateNumber}
                            onChange={(e) => setFormData(prev => ({ ...prev, plateNumber: e.target.value }))}
                            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-mono"
                          />
                        </div>

                        {/* Property Specific Details Block */}
                        {isProperty && (
                          <div className="md:col-span-2 bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 space-y-4 my-1">
                            <div className="flex items-center gap-2 border-b border-blue-200/60 pb-2.5">
                              <Building2 className="w-4 h-4 text-blue-600" />
                              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">{t('Spesifikasi Utama Properti')}</h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Tipe Properti */}
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase">{t('Tipe Properti *')}</label>
                                <select
                                  value={formData.propertyType || 'Gudang'}
                                  onChange={(e) => setFormData(prev => ({ ...prev, propertyType: e.target.value }))}
                                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                                >
                                  <option value="Tanah">Tanah</option>
                                  <option value="Gudang">Gudang</option>
                                  <option value="Kantor">Kantor</option>
                                  <option value="Ruko">Ruko</option>
                                  <option value="Rumah">Rumah</option>
                                  <option value="Lahan Depo / Pool">Lahan Depo / Pool</option>
                                  <option value="Gudang & Kantor">Gudang & Kantor</option>
                                  <option value="Lainnya">Lainnya</option>
                                </select>
                              </div>

                              {/* Tipe Lelang */}
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase">{t('Tipe Lelang *')}</label>
                                <select
                                  value={formData.auctionType || 'Jual'}
                                  onChange={(e) => setFormData(prev => ({ ...prev, auctionType: e.target.value }))}
                                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                                >
                                  <option value="Jual">Jual (Penjualan)</option>
                                  <option value="Sewa">Sewa (Penyewaan)</option>
                                  <option value="Jual & Sewa">Jual & Sewa</option>
                                </select>
                              </div>

                              {/* Luas Tanah */}
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase">{t('Luas Tanah (m²)')}</label>
                                <input
                                  type="text"
                                  placeholder={t('Contoh: 1.200 m²')}
                                  value={formData.landArea}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData(prev => {
                                      const updatedLand = val;
                                      const combinedDim = updatedLand || prev.buildingArea 
                                        ? `LT ${updatedLand || '-'}, LB ${prev.buildingArea || '-'}` 
                                        : prev.dimensions;
                                      return { ...prev, landArea: updatedLand, dimensions: combinedDim };
                                    });
                                  }}
                                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                                />
                              </div>

                              {/* Luas Bangunan */}
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase">{t('Luas Bangunan (m²)')}</label>
                                <input
                                  type="text"
                                  placeholder={t('Contoh: 600 m²')}
                                  value={formData.buildingArea}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData(prev => {
                                      const updatedBldg = val;
                                      const combinedDim = prev.landArea || updatedBldg 
                                        ? `LT ${prev.landArea || '-'}, LB ${updatedBldg || '-'}` 
                                        : prev.dimensions;
                                      return { ...prev, buildingArea: updatedBldg, dimensions: combinedDim };
                                    });
                                  }}
                                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Used Part Specific Details Block */}
                        {isUsedPart && (
                          <div className="md:col-span-2 bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 space-y-4 my-1 shadow-sm">
                            <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
                              <div className="flex items-center gap-2">
                                <Wrench className="w-4 h-4 text-amber-700" />
                                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">{t('Detail Spesifikasi Suku Cadang (Used Part)')}</h4>
                              </div>
                              <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-200">
                                {formData.usedPartCategory || 'Ban'}
                              </span>
                            </div>

                            {/* Sub-Category Selection Pills */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-amber-900 uppercase block">{t('Pilih Sub-Kategori Barang *')}</label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                  { id: 'Ban', label: t('Ban (Tyre)'), icon: Disc },
                                  { id: 'Aki', label: t('Aki (Battery)'), icon: BatteryCharging },
                                  { id: 'Besi', label: t('Besi (Scrap Metal)'), icon: Layers },
                                  { id: 'Lainnya', label: t('Sparepart Lain'), icon: Wrench },
                                ].map((subCat) => {
                                  const isSelected = (formData.usedPartCategory || 'Ban') === subCat.id;
                                  const IconComp = subCat.icon;
                                  return (
                                    <button
                                      key={subCat.id}
                                      type="button"
                                      onClick={() => setFormData(prev => ({ ...prev, usedPartCategory: subCat.id }))}
                                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                                        isSelected
                                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-500/30'
                                          : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                                      }`}
                                    >
                                      <IconComp className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-amber-600'}`} />
                                      <span>{subCat.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Informasi Umum Lelang Used Part */}
                            <div className="pt-2 border-t border-amber-200/60 grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Jumlah / Kuantitas */}
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 uppercase">{t('Jumlah / Kuantitas *')}</label>
                                <input
                                  type="text"
                                  placeholder={t('Contoh: 10 Pcs / 2 Set / 5 Ton')}
                                  value={formData.quantity}
                                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                                />
                              </div>

                              {/* Sistem Penjualan */}
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 uppercase">{t('Sistem Penjualan *')}</label>
                                <select
                                  value={formData.salesSystem || 'Satuan'}
                                  onChange={(e) => setFormData(prev => ({ ...prev, salesSystem: e.target.value }))}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                                >
                                  <option value="Satuan">{t('Satuan')}</option>
                                  <option value="Borongan">{t('Borongan (1 Lot)')}</option>
                                  <option value="Timbangan">{t('Timbangan (Per Kg / Ton)')}</option>
                                </select>
                              </div>
                            </div>

                            {/* Form Spesifik Berdasarkan Sub-Kategori */}
                            {/* A. BAN (TYRE) */}
                            {(formData.usedPartCategory === 'Ban' || !formData.usedPartCategory) && (
                              <div className="bg-white/90 rounded-xl p-3.5 border border-amber-200/80 space-y-3.5">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 border-b border-slate-100 pb-2">
                                  <Disc className="w-4 h-4 text-amber-600" />
                                  <span>{t('A. Spesifikasi Lelang Ban (Tyre)')}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                  {/* Merek Ban */}
                                  <div className="space-y-1">
                                    <label className="font-bold text-slate-700 uppercase">{t('Merek Ban')}</label>
                                    <input
                                      type="text"
                                      placeholder={t('Contoh: Bridgestone, Michelin, Giti, GT Radial')}
                                      value={formData.tireBrand}
                                      onChange={(e) => setFormData(prev => ({ ...prev, tireBrand: e.target.value }))}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                                    />
                                  </div>

                                  {/* Ukuran Ban */}
                                  <div className="space-y-1">
                                    <label className="font-bold text-slate-700 uppercase">{t('Ukuran Ban')}</label>
                                    <input
                                      type="text"
                                      placeholder={t('Contoh: 11.00 R20, 205/55 R16, 10.00 R20')}
                                      value={formData.tireSize}
                                      onChange={(e) => setFormData(prev => ({ ...prev, tireSize: e.target.value }))}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-mono"
                                    />
                                  </div>

                                  {/* Jenis Ban */}
                                  <div className="space-y-1">
                                    <label className="font-bold text-slate-700 uppercase">{t('Jenis Ban')}</label>
                                    <select
                                      value={formData.tireType || 'Ban Luar'}
                                      onChange={(e) => setFormData(prev => ({ ...prev, tireType: e.target.value }))}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                                    >
                                      <option value="Ban Luar">{t('Ban Luar')}</option>
                                      <option value="Ban Dalam">{t('Ban Dalam')}</option>
                                      <option value="Flap">{t('Flap')}</option>
                                      <option value="Set (Ban Luar + Dalam + Flap)">{t('Set (Ban Luar + Dalam + Flap)')}</option>
                                    </select>
                                  </div>

                                  {/* Estimasi Ketebalan Kembang (%) */}
                                  <div className="space-y-1">
                                    <label className="font-bold text-slate-700 uppercase">{t('Estimasi Ketebalan Kembang (%)')}</label>
                                    <input
                                      type="text"
                                      placeholder={t('Contoh: 70%, 50%, Gunting/Vulkanisir')}
                                      value={formData.tireTreadDepth}
                                      onChange={(e) => setFormData(prev => ({ ...prev, tireTreadDepth: e.target.value }))}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                                    />
                                  </div>

                                  {/* Kondisi Ban */}
                                  <div className="space-y-1">
                                    <label className="font-bold text-slate-700 uppercase">{t('Kondisi Ban')}</label>
                                    <select
                                      value={formData.tireCondition || 'Masih Layak Pakai (Tubeless/Pakai Ban Dalam)'}
                                      onChange={(e) => setFormData(prev => ({ ...prev, tireCondition: e.target.value }))}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                                    >
                                      <option value="Masih Layak Pakai (Tubeless/Pakai Ban Dalam)">{t('Masih Layak Pakai (Tubeless/Pakai Ban Dalam)')}</option>
                                      <option value="Perlu Vulkanisir">{t('Perlu Vulkanisir')}</option>
                                      <option value="Rusak / Avaf (Hanya untuk Olahan Karet)">{t('Rusak / Avaf (Hanya untuk Olahan Karet)')}</option>
                                    </select>
                                  </div>

                                  {/* Tahun Pembuatan (DOT Code) */}
                                  <div className="space-y-1">
                                    <label className="font-bold text-slate-700 uppercase">{t('Tahun Pembuatan (DOT Code)')}</label>
                                    <input
                                      type="text"
                                      placeholder={t('Contoh: 2422 / 2022')}
                                      value={formData.tireDotCode}
                                      onChange={(e) => setFormData(prev => ({ ...prev, tireDotCode: e.target.value }))}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-mono"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* B. AKI (BATTERY) */}
                            {formData.usedPartCategory === 'Aki' && (
                              <div className="bg-white/90 rounded-xl p-3.5 border border-amber-200/80 space-y-3.5">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 border-b border-slate-100 pb-2">
                                  <BatteryCharging className="w-4 h-4 text-amber-600" />
                                  <span>{t('B. Spesifikasi Lelang Aki (Battery)')}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                  {/* Merek Aki */}
                                  <div className="space-y-1">
                                    <label className="font-bold text-slate-700 uppercase">{t('Merek Aki')}</label>
                                    <input
                                      type="text"
                                      placeholder={t('Contoh: GS Astra, Yuasa, Incoe, Rocket')}
                                      value={formData.batteryBrand}
                                      onChange={(e) => setFormData(prev => ({ ...prev, batteryBrand: e.target.value }))}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                                    />
                                  </div>

                                  {/* Tipe / Kode Aki */}
                                  <div className="space-y-1">
                                    <label className="font-bold text-slate-700 uppercase">{t('Tipe / Kode Aki')}</label>
                                    <input
                                      type="text"
                                      placeholder={t('Contoh: N70, 55D23L, DIN 100, N150')}
                                      value={formData.batteryTypeCode}
                                      onChange={(e) => setFormData(prev => ({ ...prev, batteryTypeCode: e.target.value }))}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-mono"
                                    />
                                  </div>

                                  {/* Kapasitas (Amper/Ah & Volt) */}
                                  <div className="space-y-1">
                                    <label className="font-bold text-slate-700 uppercase">{t('Kapasitas (Amper/Ah & Volt)')}</label>
                                    <input
                                      type="text"
                                      placeholder={t('Contoh: 12V 70Ah, 24V 100Ah')}
                                      value={formData.batteryCapacity}
                                      onChange={(e) => setFormData(prev => ({ ...prev, batteryCapacity: e.target.value }))}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-mono"
                                    />
                                  </div>

                                  {/* Jenis Aki */}
                                  <div className="space-y-1">
                                    <label className="font-bold text-slate-700 uppercase">{t('Jenis Aki')}</label>
                                    <select
                                      value={formData.batteryType || 'Aki Basah'}
                                      onChange={(e) => setFormData(prev => ({ ...prev, batteryType: e.target.value }))}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                                    >
                                      <option value="Aki Basah (Conventional)">Aki Basah (Conventional)</option>
                                      <option value="Aki Kering (MF / Maintenance Free)">Aki Kering (MF / Maintenance Free)</option>
                                      <option value="Gel / AGM">Gel / AGM</option>
                                    </select>
                                  </div>

                                  {/* Kondisi Fisik & Fungsi */}
                                  <div className="space-y-1">
                                    <label className="font-bold text-slate-700 uppercase">{t('Kondisi Fisik & Fungsi')}</label>
                                    <select
                                      value={formData.batteryCondition || 'Masih Fungsi (Hanya Perlu Cas)'}
                                      onChange={(e) => setFormData(prev => ({ ...prev, batteryCondition: e.target.value }))}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                                    >
                                      <option value="Masih Fungsi (Hanya Perlu Cas)">Masih Fungsi (Hanya Perlu Cas)</option>
                                      <option value="Soak / Mati Total (Scrap)">Soak / Mati Total (Scrap)</option>
                                      <option value="Fisik Utuh (Tidak Bocor/Retak)">Fisik Utuh (Tidak Bocor/Retak)</option>
                                      <option value="Fisik Bocor / Pecah">Fisik Bocor / Pecah</option>
                                    </select>
                                  </div>

                                  {/* Keberadaan Air Aki */}
                                  <div className="space-y-1">
                                    <label className="font-bold text-slate-700 uppercase">{t('Keberadaan Air Aki')}</label>
                                    <select
                                      value={formData.batteryElectrolyteStatus || 'Masih Terisi Air Aki'}
                                      onChange={(e) => setFormData(prev => ({ ...prev, batteryElectrolyteStatus: e.target.value }))}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                                    >
                                      <option value="Masih Terisi Air Aki">Masih Terisi Air Aki</option>
                                      <option value="Sudah Dikosongkan">Sudah Dikosongkan</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* C. BESI (SCRAP METAL) */}
                            {formData.usedPartCategory === 'Besi' && (
                              <div className="bg-white/90 rounded-xl p-3.5 border border-amber-200/80 space-y-3.5">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 border-b border-slate-100 pb-2">
                                  <Layers className="w-4 h-4 text-amber-600" />
                                  <span>{t('C. Spesifikasi Lelang Besi (Scrap Metal)')}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                  {/* Jenis Besi / Logam */}
                                  <div className="space-y-1">
                                    <label className="font-bold text-slate-700 uppercase">{t('Jenis Besi / Logam')}</label>
                                    <select
                                      value={formData.metalType || 'Besi Berat / H-Beam / I-Beam / Plate'}
                                      onChange={(e) => setFormData(prev => ({ ...prev, metalType: e.target.value }))}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                                    >
                                      <option value="Besi Berat / H-Beam / I-Beam / Plate">Besi Berat / H-Beam / I-Beam / Plate</option>
                                      <option value="Besi Siku / Pipa / Hollow">Besi Siku / Pipa / Hollow</option>
                                      <option value="Besi Tipis / Seng / Body Part">Besi Tipis / Seng / Body Part</option>
                                      <option value="Besi Campur / Scrap Variasi">Besi Campur / Scrap Variasi</option>
                                      <option value="Logam Lain (Tembaga / Kuningan / Aluminium)">Logam Lain (Tembaga / Kuningan / Aluminium)</option>
                                    </select>
                                  </div>

                                  {/* Metode Penjualan */}
                                  <div className="space-y-1">
                                    <label className="font-bold text-slate-700 uppercase">{t('Metode Penjualan')}</label>
                                    <select
                                      value={formData.metalSalesMethod || 'Penimbangan'}
                                      onChange={(e) => setFormData(prev => ({ ...prev, metalSalesMethod: e.target.value }))}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                                    >
                                      <option value="Penimbangan (Harga per Kg / Ton)">Penimbangan (Harga per Kg / Ton)</option>
                                      <option value="Taksiran / Borongan (Harga langsung 1 Lot)">Taksiran / Borongan (Harga langsung 1 Lot)</option>
                                    </select>
                                  </div>

                                  {/* Estimasi Total Berat */}
                                  <div className="space-y-1">
                                    <label className="font-bold text-slate-700 uppercase">{t('Estimasi Total Berat')}</label>
                                    <input
                                      type="text"
                                      placeholder={t('Contoh: ± 5 Ton atau ± 500 Kg')}
                                      value={formData.metalEstimatedWeight}
                                      onChange={(e) => setFormData(prev => ({ ...prev, metalEstimatedWeight: e.target.value }))}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                                    />
                                  </div>

                                  {/* Kondisi Besi */}
                                  <div className="space-y-1">
                                    <label className="font-bold text-slate-700 uppercase">{t('Kondisi Besi')}</label>
                                    <input
                                      type="text"
                                      placeholder={t('Contoh: Berkarat Ringan, Potongan 1 - 2 meter')}
                                      value={formData.metalCondition}
                                      onChange={(e) => setFormData(prev => ({ ...prev, metalCondition: e.target.value }))}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                                    />
                                  </div>

                                  {/* Fasilitas Pemotongan & Pengangkutan */}
                                  <div className="space-y-1 md:col-span-2">
                                    <label className="font-bold text-slate-700 uppercase">{t('Fasilitas Pemotongan & Pengangkutan')}</label>
                                    <select
                                      value={formData.metalHandlingFacility || 'Pemenang Lelang wajib potong dan angkut sendiri'}
                                      onChange={(e) => setFormData(prev => ({ ...prev, metalHandlingFacility: e.target.value }))}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                                    >
                                      <option value="Penyedia Lelang menyiapkan alat angkut">Penyedia Lelang menyiapkan alat angkut</option>
                                      <option value="Pemenang Lelang wajib potong dan angkut sendiri">Pemenang Lelang wajib potong dan angkut sendiri</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Dimensi Unit / Catatan Luas Opsional */}
                        {!isProperty && !isUsedPart && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase">
                              {t('Dimensi Unit (Opsional)')}
                            </label>
                            <input
                              type="text"
                              placeholder={t('Contoh: 12.0 x 2.5 x 3.7 m')}
                              value={formData.dimensions}
                              onChange={(e) => setFormData(prev => ({ ...prev, dimensions: e.target.value }))}
                              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                            />
                          </div>
                        )}

                        {/* Condition */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-600 uppercase">{t('Kondisi Fisik Unit *')}</label>
                            <button
                              type="button"
                              onClick={() => setIsConditionMasterOpen(true)}
                              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold transition"
                              title={t('Kelola Master Kondisi')}
                            >
                              <Settings className="w-3.5 h-3.5 animate-spin-hover" />
                            </button>
                          </div>
                          <select
                            value={formData.condition}
                            onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value }))}
                            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          >
                            {displayConditionsList.map(condName => (
                              <option key={condName} value={condName}>{condName}</option>
                            ))}
                            {formData.condition && !displayConditionsList.includes(formData.condition) && (
                              <option value={formData.condition}>{formData.condition}</option>
                            )}
                          </select>
                        </div>

                        {/* Starting Price */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 uppercase">{t('Harga Awal Lelang (IDR) *')}</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            required
                            placeholder={t('Contoh: 150.000.000')}
                            value={formatNumberWithDots(formData.startingPrice)}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '');
                              setFormData(prev => ({ ...prev, startingPrice: raw }));
                            }}
                            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>

                        {/* Location */}
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-xs font-bold text-slate-600 uppercase">
                            {isProperty ? t('Alamat Lengkap Properti *') : t('Lokasi Pool / Depo Unit *')}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={
                              isProperty ? t('Contoh: Jl. Raya Marunda No. 88, Cilincing, Jakarta Utara') :
                              t('Contoh: Pool Marunda Blok C, Jakut')
                            }
                            value={formData.location}
                            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>

                        {/* Close Bid Date & Time */}
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-xs font-bold text-slate-600 uppercase">
                            {t('Tanggal & Waktu Penutupan Bid (Close Bid Date & Time)')}
                          </label>
                          <input
                            type="datetime-local"
                            value={formData.closeBidDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, closeBidDate: e.target.value }))}
                            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-700"
                          />
                          <p className="text-[10px] text-slate-400">
                            {t('Kosongkan jika lelang tidak memiliki batas waktu penutupan otomatis.')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* VEHICLE SPECIFIC GROUPS (Shown ONLY if Category is Vehicle) */}
                    {isVehicle && (
                      <>

              {/* GROUP 2: VEHICLE SPECIFICATION DETAILS */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-slate-400 rounded-full"></span>
                    {t('DETAIL SPESIFIKASI KENDARAAN (VEHICLE SPECIFICATION DETAILS)')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Series */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-600 uppercase">{t('Series')}</label>
                      <button
                        type="button"
                        onClick={() => setIsSeriesMasterOpen(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold transition"
                        title={t('Kelola Master Seri')}
                      >
                        <Settings className="w-3.5 h-3.5 animate-spin-hover" />
                      </button>
                    </div>
                    <select
                      value={formData.series}
                      onChange={(e) => setFormData(prev => ({ ...prev, series: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      {displaySeriesList.map(sName => (
                        <option key={sName} value={sName}>{sName}</option>
                      ))}
                      {formData.series && !displaySeriesList.includes(formData.series) && (
                        <option value={formData.series}>{formData.series}</option>
                      )}
                    </select>
                  </div>

                  {/* Axels */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase">{t('Axels')}</label>
                    <input
                      type="text"
                      placeholder={t('Contoh: 6x4, 4x2')}
                      value={formData.axels}
                      onChange={(e) => setFormData(prev => ({ ...prev, axels: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* Vehicle Colour */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-600 uppercase">{t('Warna Kendaraan')}</label>
                      <button
                        type="button"
                        onClick={() => setIsColourMasterOpen(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold transition"
                        title={t('Kelola Master Warna')}
                      >
                        <Settings className="w-3.5 h-3.5 animate-spin-hover" />
                      </button>
                    </div>
                    <select
                      value={formData.vehicleColour}
                      onChange={(e) => setFormData(prev => ({ ...prev, vehicleColour: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      {displayColoursList.map(cName => (
                        <option key={cName} value={cName}>{cName}</option>
                      ))}
                      {formData.vehicleColour && !displayColoursList.includes(formData.vehicleColour) && (
                        <option value={formData.vehicleColour}>{formData.vehicleColour}</option>
                      )}
                    </select>
                  </div>

                  {/* Fuel Type */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-600 uppercase">{t('Bahan Bakar')}</label>
                      <button
                        type="button"
                        onClick={() => setIsFuelMasterOpen(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold transition"
                        title={t('Kelola Master Bahan Bakar')}
                      >
                        <Settings className="w-3.5 h-3.5 animate-spin-hover" />
                      </button>
                    </div>
                    <select
                      value={formData.fuelType}
                      onChange={(e) => setFormData(prev => ({ ...prev, fuelType: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      {displayFuelsList.map(fName => (
                        <option key={fName} value={fName}>{fName}</option>
                      ))}
                      {formData.fuelType && !displayFuelsList.includes(formData.fuelType) && (
                        <option value={formData.fuelType}>{formData.fuelType}</option>
                      )}
                    </select>
                  </div>

                  {/* Horsepower */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase">{t('Horsepower (HP)')}</label>
                    <input
                      type="text"
                      placeholder={t('Contoh: 280 HP atau 340')}
                      value={formData.horsepower}
                      onChange={(e) => setFormData(prev => ({ ...prev, horsepower: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* KM Spidometer */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-600 uppercase">{t('KM Spidometer')}</label>
                    <input
                      type="text"
                      placeholder={t('Contoh: 150.000 atau 75.000')}
                      value={formData.odometer}
                      onChange={(e) => setFormData(prev => ({ ...prev, odometer: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* GROUP 2.5: VEHICLE DOCUMENTS & LEGALITY */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-slate-400 rounded-full"></span>
                    {t('DOKUMEN & LEGALITAS KENDARAAN (VEHICLE DOCUMENTS & LEGALITY)')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* KEUR Berlaku Hingga */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase">{t('KEUR BERLAKU HINGGA')}</label>
                    <input
                      type="date"
                      value={formData.keurValidUntil}
                      onChange={(e) => setFormData(prev => ({ ...prev, keurValidUntil: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* STNK Plat Berlaku Hingga */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase">{t('PLAT STNK BERLAKU HINGGA')}</label>
                    <input
                      type="date"
                      value={formData.stnkPlateValidUntil}
                      onChange={(e) => setFormData(prev => ({ ...prev, stnkPlateValidUntil: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* STNK Pajak Berlaku Hingga */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase">{t('PAJAK STNK BERLAKU HINGGA')}</label>
                    <input
                      type="date"
                      value={formData.stnkTaxValidUntil}
                      onChange={(e) => setFormData(prev => ({ ...prev, stnkTaxValidUntil: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* GROUP 3: ATTACHMENT SPECIFICATIONS */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-slate-400 rounded-full"></span>
                    {t('SPESIFIKASI ATTACHMENT (ATTACHMENT SPECIFICATIONS)')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Have Attachment Radio Buttons */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase block">{t('Memiliki Attachment?')}</label>
                    <div className="flex items-center gap-6 pt-1.5">
                      <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-slate-700 select-none">
                        <input
                          type="radio"
                          name="haveAttachment"
                          checked={formData.haveAttachment === true}
                          onChange={() => setFormData(prev => ({ ...prev, haveAttachment: true }))}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        {t('Ya')}
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-slate-700 select-none">
                        <input
                          type="radio"
                          name="haveAttachment"
                          checked={formData.haveAttachment === false}
                          onChange={() => setFormData(prev => ({ ...prev, haveAttachment: false }))}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        {t('Tidak')}
                      </label>
                    </div>
                  </div>

                  {/* Attachment Category */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-600 uppercase">{t('Attachment')}</label>
                      {formData.haveAttachment && (
                        <button
                          type="button"
                          onClick={() => setIsAttachmentMasterOpen(true)}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold transition"
                          title={t('Kelola Master Jenis Gandengan')}
                        >
                          <Settings className="w-3.5 h-3.5 animate-spin-hover" />
                        </button>
                      )}
                    </div>
                    <select
                      value={formData.attachmentCategory}
                      onChange={(e) => setFormData(prev => ({ ...prev, attachmentCategory: e.target.value }))}
                      disabled={!formData.haveAttachment}
                      className={`w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition ${
                        !formData.haveAttachment ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white'
                      }`}
                    >
                      {displayAttachmentCategoriesList.map(aName => (
                        <option key={aName} value={aName}>{aName}</option>
                      ))}
                      {formData.attachmentCategory && !displayAttachmentCategoriesList.includes(formData.attachmentCategory) && (
                        <option value={formData.attachmentCategory}>{formData.attachmentCategory}</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* ATTACHMENT DETAIL PANEL (Shown only if haveAttachment is true) */}
                {formData.haveAttachment && (
                  <div className="border border-slate-200/80 bg-slate-50/50 rounded-2xl p-5 space-y-5 animate-fade-in">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Detail Attachment')}</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Upload Attachment Photo */}
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-semibold text-slate-600 uppercase block">{t('Unggah Attachment')}</label>
                        
                        <div className="flex flex-col md:flex-row gap-4 items-start">
                          {/* Mini Drag Drop Area */}
                          <div 
                            onClick={() => document.getElementById('attachment-file-input')?.click()}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsAttachmentDragging(true);
                            }}
                            onDragLeave={() => setIsAttachmentDragging(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsAttachmentDragging(false);
                              const files = e.dataTransfer.files;
                              if (files && files.length > 0) handleAttachmentFilesChange(files);
                            }}
                            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer flex-1 w-full flex flex-col items-center justify-center min-h-[100px] transition-all ${
                              isAttachmentDragging 
                                ? 'border-blue-500 bg-blue-50/50 animate-pulse' 
                                : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50/50'
                            }`}
                          >
                            <input
                              id="attachment-file-input"
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                const files = e.target.files;
                                if (files && files.length > 0) handleAttachmentFilesChange(files);
                              }}
                            />
                            <Upload className="w-5 h-5 text-slate-400 mb-1" />
                            <p className="text-xs font-semibold text-slate-600">{t('Pilih Foto Attachment')}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">JPG, JPEG, PNG (Max 1MB)</p>
                          </div>

                          {/* Previews */}
                          {formData.attachmentImageUrls && formData.attachmentImageUrls.length > 0 && (
                            <div className="flex flex-wrap gap-2 shrink-0">
                              {formData.attachmentImageUrls.map((url, i) => (
                                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-white">
                                  <img 
                                    src={url} 
                                    alt="Attachment Preview" 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setFormData(prev => {
                                      const filtered = prev.attachmentImageUrls.filter((_, idx) => idx !== i);
                                      return {
                                        ...prev,
                                        attachmentImageUrls: filtered,
                                        attachmentImageUrl: prev.attachmentImageUrl === url ? (filtered[0] || '') : prev.attachmentImageUrl
                                      };
                                    })}
                                    className="absolute top-1 right-1 bg-rose-500 hover:bg-rose-600 text-white p-0.5 rounded-full shadow"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Type (Subtype) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-600 uppercase">{t('Tipe')}</label>
                          <button
                            type="button"
                            onClick={() => setIsAttachmentTypeMasterOpen(true)}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold transition"
                            title={t('Kelola Master Tipe Gandengan')}
                          >
                            <Settings className="w-3.5 h-3.5 animate-spin-hover" />
                          </button>
                        </div>
                        <select
                          value={formData.attachmentType}
                          onChange={(e) => setFormData(prev => ({ ...prev, attachmentType: e.target.value }))}
                          className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                          {displayAttachmentTypesList.map(atName => (
                            <option key={atName} value={atName}>{atName}</option>
                          ))}
                          {formData.attachmentType && !displayAttachmentTypesList.includes(formData.attachmentType) && (
                            <option value={formData.attachmentType}>{formData.attachmentType}</option>
                          )}
                        </select>
                      </div>

                      {/* Axels */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase">{t('Axels')}</label>
                        <input
                          type="text"
                          placeholder={t('Contoh: 2.2 atau 3.0')}
                          value={formData.attachmentAxels}
                          onChange={(e) => setFormData(prev => ({ ...prev, attachmentAxels: e.target.value }))}
                          className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        />
                      </div>

                      {/* Year Built */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase">{t('Tahun Produksi *')}</label>
                        <input
                          type="text"
                          placeholder={t('Contoh: 2016')}
                          value={formData.attachmentYearBuilt}
                          onChange={(e) => setFormData(prev => ({ ...prev, attachmentYearBuilt: e.target.value }))}
                          className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        />
                      </div>

                      {/* Valid Until */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase">{t('KEUR BERLAKU HINGGA')}</label>
                        <input
                          type="date"
                          value={formData.attachmentValidUntil}
                          onChange={(e) => setFormData(prev => ({ ...prev, attachmentValidUntil: e.target.value }))}
                          className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        />
                      </div>

                      {/* Nested subsection Dimension */}
                      <div className="md:col-span-2 border-t border-slate-200 pt-4 mt-2 space-y-4">
                        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Dimensi')}</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {/* Length */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase">{t('Panjang Total (Meter)')}</label>
                            <input
                              type="text"
                              placeholder={t('Contoh: 40 M atau 12.0')}
                              value={formData.attachmentLength}
                              onChange={(e) => setFormData(prev => ({ ...prev, attachmentLength: e.target.value }))}
                              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                            />
                          </div>

                          {/* Width */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase">{t('Lebar Total (TON)')}</label>
                            <input
                              type="text"
                              placeholder={t('Contoh: 60 Ton')}
                              value={formData.attachmentWidth}
                              onChange={(e) => setFormData(prev => ({ ...prev, attachmentWidth: e.target.value }))}
                              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                            />
                          </div>

                          {/* Height */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase">{t('Tinggi Total (Meter)')}</label>
                            <input
                              type="text"
                              placeholder={t('Contoh: 1.5 M')}
                              value={formData.attachmentHeight}
                              onChange={(e) => setFormData(prev => ({ ...prev, attachmentHeight: e.target.value }))}
                              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                            />
                          </div>


                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
                      </>
                    )}
                  </>
                );
              })()}

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">{t('Deskripsi & Spesifikasi Tambahan')}</label>
                <textarea
                  ref={descriptionRef}
                  rows={4}
                  placeholder={t('Jelaskan kondisi mesin, transmisi, kelengkapan surat KIR/STNK, riwayat perawatan, dsb.')}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[100px] resize-none overflow-hidden"
                />
              </div>

              {/* Syarat & Ketentuan (TNC) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">{t('Syarat & Ketentuan Lelang (TNC)')}</label>
                <textarea
                  rows={4}
                  placeholder={t('Opsional. Masukkan syarat & ketentuan lelang khusus untuk unit ini. Jika dikosongkan, area Syarat & Ketentuan tidak akan menampilkan ketentuan apapun.')}
                  value={formData.tnc}
                  onChange={(e) => setFormData(prev => ({ ...prev, tnc: e.target.value }))}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[100px]"
                />
              </div>

              {/* Modal Footer actions */}
              <div className="border-t border-slate-100 pt-5 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {t('Batal')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 transition-all flex items-center gap-1"
                >
                  <Check className="w-4 h-4" /> {editAssetId ? t('Simpan Perubahan') : t('Simpan Unit Baru')}
                </button>
              </div>

            </form>

          </div>
        </div>
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

      {/* Immersive Focused Bid Details Modal Overlay */}
      {focusedBid && selectedAsset && (
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setFocusedBid(null)}
        >
          <div 
            className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full p-6 sm:p-8 relative overflow-hidden transition-all duration-300 animate-zoom-in flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Gradient line */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-500" />
            
            {/* Title Bar */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 text-blue-600">
                  <FileText className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    {t('Detail Penawaran')}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    {selectedAsset.brand} {selectedAsset.name} ({selectedAsset.plateNumber})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFocusedBid(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                title={t('Tutup')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable details area */}
            <div className="space-y-6 overflow-y-auto pr-1 flex-1 py-1">
              {/* Huge Price Block */}
              <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-5 text-center shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  {t('NILAI PENAWARAN (BID PRICE)')}
                </span>
                <span className="text-3xl sm:text-4xl font-extrabold text-blue-600 font-mono tracking-tight block">
                  {formatIDR(focusedBid.price)}
                </span>
              </div>

              {/* Grid of Key Bidder Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bidder Name */}
                <div className="bg-slate-50/40 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    {t('NAMA PENAWAR')}
                  </span>
                  <span className="text-sm font-bold text-slate-800 break-words block">
                    {focusedBid.name}
                  </span>
                </div>

                {/* Scheduled Visit / Survey Date */}
                <div className="bg-slate-50/40 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    {t('JADWAL KUNJUNGAN / SURVEY')}
                  </span>
                  {focusedBid.scheduleSurveyDate ? (
                    <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs mt-1">
                      <Calendar className="w-4 h-4 shrink-0 text-blue-500" />
                      <span className="truncate">
                        {focusedBid.scheduleSurveyDate} @ {focusedBid.scheduleSurveyTime || '09:00'} WIB
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium italic mt-1">
                      {t('Belum ada jadwal survei.')}
                    </span>
                  )}
                </div>

                {/* Email address */}
                <div className="bg-slate-50/40 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    EMAIL
                  </span>
                  <div className="flex items-center justify-between gap-1 mt-1">
                    <span className="text-xs text-slate-700 font-semibold break-all block truncate flex-1" title={focusedBid.email}>
                      {focusedBid.email}
                    </span>
                    {focusedBid.email && (
                      <a
                        href={`mailto:${focusedBid.email}`}
                        className="p-1 bg-white hover:bg-blue-50 text-blue-600 border border-slate-200/60 rounded-lg hover:border-blue-200 transition-all shrink-0 ml-1"
                        title={t('Kirim Email')}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Contact/WhatsApp */}
                <div className="bg-slate-50/40 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    {t('NOMOR HP / WHATSAPP')}
                  </span>
                  <div className="flex items-center justify-between gap-1 mt-1">
                    <span className="text-xs text-slate-700 font-semibold break-words block truncate flex-1">
                      {focusedBid.contact}
                    </span>
                    {focusedBid.contact && (
                      <a
                        href={`https://wa.me/${focusedBid.contact.replace(/\D/g, '').startsWith('0') ? '62' + focusedBid.contact.replace(/\D/g, '').slice(1) : focusedBid.contact.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 bg-white hover:bg-emerald-50 text-emerald-600 border border-slate-200/60 rounded-lg hover:border-emerald-200 transition-all shrink-0 ml-1"
                        title={t('Hubungi via WhatsApp')}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Timestamp Info */}
              {focusedBid.timestamp && (
                <div className="text-right text-[10px] text-slate-400 font-semibold">
                  {t('Penawaran masuk pada')}: {new Date(focusedBid.timestamp).toLocaleString(language === 'en' ? 'en-US' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              )}
            </div>

            {/* Bottom Panel Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5 shrink-0">
              {/* Copy structured details */}
              <button
                type="button"
                onClick={() => handleCopyDetails(focusedBid, `${selectedAsset.brand} ${selectedAsset.name} (${selectedAsset.plateNumber})`)}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                  copiedState 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/60"
                }`}
              >
                {copiedState ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedState ? t('Berhasil Disalin!') : t('Salin Detail Penawaran')}</span>
              </button>

              {/* WhatsApp direct contact */}
              {focusedBid.contact && (
                <a
                  href={`https://wa.me/${focusedBid.contact.replace(/\D/g, '').startsWith('0') ? '62' + focusedBid.contact.replace(/\D/g, '').slice(1) : focusedBid.contact.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/10 hover:shadow-emerald-600/20"
                >
                  <Phone className="w-4 h-4" />
                  <span>{t('Hubungi WhatsApp')}</span>
                </a>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setFocusedBid(null)}
                className="py-3 px-5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                {t('Tutup')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brand Master Data Management Modal */}
      {isBrandMasterOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  {t('Kelola Master Merek')}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t('Tambah atau hapus daftar pilihan merek yang ada.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBrandMasterOpen(false);
                  setNewBrandName('');
                  setBrandError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content & List */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Form Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  {t('Tambah Merek Baru')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('Contoh: Mitsubishi, Volvo')}
                    value={newBrandName}
                    onChange={(e) => {
                      setNewBrandName(e.target.value);
                      setBrandError('');
                    }}
                    className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewBrand();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewBrand}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    {t('Tambah')}
                  </button>
                </div>
                {brandError && (
                  <p className="text-rose-500 text-xs font-medium flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {brandError}
                  </p>
                )}
              </div>

              {/* Brands List */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase block">
                  {t('Daftar Merek Aktif')} ({brands.length})
                </label>
                
                <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden max-h-[35vh] overflow-y-auto">
                  {brands.length > 0 ? (
                    brands.map((brandObj) => (
                      <div key={brandObj.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition">
                        <span className="text-sm font-semibold text-slate-800">{brandObj.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteBrand(brandObj.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition"
                          title={t('Hapus Merek')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs font-medium">
                      {t('Tidak ada data merek.')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsBrandMasterOpen(false);
                  setNewBrandName('');
                  setBrandError('');
                }}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-100 transition shadow-sm"
              >
                {t('Tutup')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Master Data Management Modal */}
      {isCategoryMasterOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  {t('Kelola Master Kategori')}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t('Tambah atau hapus daftar pilihan kategori yang ada.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCategoryMasterOpen(false);
                  setNewCategoryName('');
                  setCategoryError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content & List */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Form Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  {t('Tambah Kategori Baru')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('Contoh: Trailer, Tronton, Box')}
                    value={newCategoryName}
                    onChange={(e) => {
                      setNewCategoryName(e.target.value);
                      setCategoryError('');
                    }}
                    className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewCategory();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewCategory}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    {t('Tambah')}
                  </button>
                </div>
                {categoryError && (
                  <p className="text-rose-500 text-xs font-medium flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {categoryError}
                  </p>
                )}
              </div>

              {/* Categories List */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase block">
                  {t('Daftar Kategori Aktif')} ({categories.length})
                </label>
                
                <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden max-h-[35vh] overflow-y-auto">
                  {categories.length > 0 ? (
                    categories.map((catObj) => (
                      <div key={catObj.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition">
                        <span className="text-sm font-semibold text-slate-800">{catObj.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(catObj.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition"
                          title={t('Hapus Kategori')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs font-medium">
                      {t('Tidak ada data kategori.')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsCategoryMasterOpen(false);
                  setNewCategoryName('');
                  setCategoryError('');
                }}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-100 transition shadow-sm"
              >
                {t('Tutup')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Condition Master Data Management Modal */}
      {isConditionMasterOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  {t('Kelola Master Kondisi')}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t('Tambah atau hapus daftar pilihan kondisi fisik yang ada.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsConditionMasterOpen(false);
                  setNewConditionName('');
                  setConditionError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content & List */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Form Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  {t('Tambah Kondisi Baru')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('Contoh: Rusak Ringan, Rekondisi')}
                    value={newConditionName}
                    onChange={(e) => {
                      setNewConditionName(e.target.value);
                      setConditionError('');
                    }}
                    className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewCondition();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewCondition}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    {t('Tambah')}
                  </button>
                </div>
                {conditionError && (
                  <p className="text-rose-500 text-xs font-medium flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {conditionError}
                  </p>
                )}
              </div>

              {/* Conditions List */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase block">
                  {t('Daftar Kondisi Aktif')} ({conditions.length})
                </label>
                
                <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden max-h-[35vh] overflow-y-auto">
                  {conditions.length > 0 ? (
                    conditions.map((condObj) => (
                      <div key={condObj.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition">
                        <span className="text-sm font-semibold text-slate-800">{condObj.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCondition(condObj.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition"
                          title={t('Hapus Kondisi')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs font-medium">
                      {t('Tidak ada data kondisi.')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsConditionMasterOpen(false);
                  setNewConditionName('');
                  setConditionError('');
                }}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-100 transition shadow-sm"
              >
                {t('Tutup')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Series Master Data Management Modal */}
      {isSeriesMasterOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  {t('Kelola Master Seri')}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t('Tambah atau hapus daftar pilihan seri kendaraan.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSeriesMasterOpen(false);
                  setNewSeriesName('');
                  setSeriesError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content & List */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Form Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  {t('Tambah Seri Baru')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('Contoh: 500, GIGA, FL 260')}
                    value={newSeriesName}
                    onChange={(e) => {
                      setNewSeriesName(e.target.value);
                      setSeriesError('');
                    }}
                    className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewSeries();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewSeries}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    {t('Tambah')}
                  </button>
                </div>
                {seriesError && (
                  <p className="text-rose-500 text-xs font-medium flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {seriesError}
                  </p>
                )}
              </div>

              {/* Series List */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase block">
                  {t('Daftar Seri Aktif')} ({seriesList.length})
                </label>
                
                <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden max-h-[35vh] overflow-y-auto">
                  {seriesList.length > 0 ? (
                    seriesList.map((sObj) => (
                      <div key={sObj.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition">
                        <span className="text-sm font-semibold text-slate-800">{sObj.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSeries(sObj.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition"
                          title={t('Hapus Seri')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs font-medium">
                      {t('Tidak ada data seri.')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsSeriesMasterOpen(false);
                  setNewSeriesName('');
                  setSeriesError('');
                }}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-100 transition shadow-sm"
              >
                {t('Tutup')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Colour Master Data Management Modal */}
      {isColourMasterOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  {t('Kelola Master Warna')}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t('Tambah atau hapus daftar pilihan warna kendaraan.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsColourMasterOpen(false);
                  setNewColourName('');
                  setColourError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content & List */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Form Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  {t('Tambah Warna Baru')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('Contoh: Merah, Putih, Kuning')}
                    value={newColourName}
                    onChange={(e) => {
                      setNewColourName(e.target.value);
                      setColourError('');
                    }}
                    className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewColour();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewColour}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    {t('Tambah')}
                  </button>
                </div>
                {colourError && (
                  <p className="text-rose-500 text-xs font-medium flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {colourError}
                  </p>
                )}
              </div>

              {/* Colours List */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase block">
                  {t('Daftar Warna Aktif')} ({vehicleColours.length})
                </label>
                
                <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden max-h-[35vh] overflow-y-auto">
                  {vehicleColours.length > 0 ? (
                    vehicleColours.map((cObj) => (
                      <div key={cObj.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition">
                        <span className="text-sm font-semibold text-slate-800">{cObj.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteColour(cObj.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition"
                          title={t('Hapus Warna')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs font-medium">
                      {t('Tidak ada data warna.')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsColourMasterOpen(false);
                  setNewColourName('');
                  setColourError('');
                }}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-100 transition shadow-sm"
              >
                {t('Tutup')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fuel Master Data Management Modal */}
      {isFuelMasterOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  {t('Kelola Master Bahan Bakar')}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t('Tambah atau hapus daftar pilihan jenis bahan bakar.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFuelMasterOpen(false);
                  setNewFuelName('');
                  setFuelError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content & List */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Form Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  {t('Tambah Bahan Bakar Baru')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('Contoh: Solar, Diesel, Bensin')}
                    value={newFuelName}
                    onChange={(e) => {
                      setNewFuelName(e.target.value);
                      setFuelError('');
                    }}
                    className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewFuel();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewFuel}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    {t('Tambah')}
                  </button>
                </div>
                {fuelError && (
                  <p className="text-rose-500 text-xs font-medium flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {fuelError}
                  </p>
                )}
              </div>

              {/* Fuel List */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase block">
                  {t('Daftar Bahan Bakar Aktif')} ({fuelTypes.length})
                </label>
                
                <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden max-h-[35vh] overflow-y-auto">
                  {fuelTypes.length > 0 ? (
                    fuelTypes.map((fObj) => (
                      <div key={fObj.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition">
                        <span className="text-sm font-semibold text-slate-800">{fObj.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteFuel(fObj.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition"
                          title={t('Hapus Bahan Bakar')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs font-medium">
                      {t('Tidak ada data bahan bakar.')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsFuelMasterOpen(false);
                  setNewFuelName('');
                  setFuelError('');
                }}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-100 transition shadow-sm"
              >
                {t('Tutup')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Category Master Data Management Modal */}
      {isAttachmentMasterOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  {t('Kelola Master Jenis Gandengan')}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t('Tambah atau hapus daftar pilihan jenis gandengan.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAttachmentMasterOpen(false);
                  setNewAttachmentName('');
                  setAttachmentError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content & List */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Form Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  {t('Tambah Jenis Gandengan Baru')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('Contoh: Trailer, Box, Dump Body')}
                    value={newAttachmentName}
                    onChange={(e) => {
                      setNewAttachmentName(e.target.value);
                      setAttachmentError('');
                    }}
                    className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewAttachment();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewAttachment}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    {t('Tambah')}
                  </button>
                </div>
                {attachmentError && (
                  <p className="text-rose-500 text-xs font-medium flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {attachmentError}
                  </p>
                )}
              </div>

              {/* Attachment Category List */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase block">
                  {t('Daftar Jenis Gandengan Aktif')} ({attachmentCategories.length})
                </label>
                
                <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden max-h-[35vh] overflow-y-auto">
                  {attachmentCategories.length > 0 ? (
                    attachmentCategories.map((aObj) => (
                      <div key={aObj.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition">
                        <span className="text-sm font-semibold text-slate-800">{aObj.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(aObj.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition"
                          title={t('Hapus Jenis Gandengan')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs font-medium">
                      {t('Tidak ada data jenis gandengan.')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsAttachmentMasterOpen(false);
                  setNewAttachmentName('');
                  setAttachmentError('');
                }}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-100 transition shadow-sm"
              >
                {t('Tutup')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Type Master Data Management Modal */}
      {isAttachmentTypeMasterOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  {t('Kelola Master Tipe Gandengan')}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t('Tambah atau hapus daftar pilihan tipe/model gandengan.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAttachmentTypeMasterOpen(false);
                  setNewAttachmentTypeName('');
                  setAttachmentTypeError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content & List */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Form Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  {t('Tambah Tipe Gandengan Baru')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('Contoh: Highbed 40, Skeleton 20')}
                    value={newAttachmentTypeName}
                    onChange={(e) => {
                      setNewAttachmentTypeName(e.target.value);
                      setAttachmentTypeError('');
                    }}
                    className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewAttachmentType();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewAttachmentType}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    {t('Tambah')}
                  </button>
                </div>
                {attachmentTypeError && (
                  <p className="text-rose-500 text-xs font-medium flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {attachmentTypeError}
                  </p>
                )}
              </div>

              {/* Attachment Type List */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase block">
                  {t('Daftar Tipe Gandengan Aktif')} ({attachmentTypes.length})
                </label>
                
                <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden max-h-[35vh] overflow-y-auto">
                  {attachmentTypes.length > 0 ? (
                    attachmentTypes.map((atObj) => (
                      <div key={atObj.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition">
                        <span className="text-sm font-semibold text-slate-800">{atObj.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachmentType(atObj.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition"
                          title={t('Hapus Tipe Gandengan')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs font-medium">
                      {t('Tidak ada data tipe gandengan.')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsAttachmentTypeMasterOpen(false);
                  setNewAttachmentTypeName('');
                  setAttachmentTypeError('');
                }}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-100 transition shadow-sm"
              >
                {t('Tutup')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Winner Letter Modal */}
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
