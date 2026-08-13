export interface Bid {
  id: string;
  name: string;
  email: string;
  contact: string;
  price: number;
  timestamp: string;
  scheduleSurveyDate?: string;
  scheduleSurveyTime?: string;
}

export type AssetStatus = 'Open' | 'Sold';

export const MAIN_CATEGORIES = ['Vehicle', 'Used part', 'Property', 'Miscellaneous'] as const;

export function normalizeCategory(category?: string): string {
  if (!category) return 'Vehicle';
  const matched = MAIN_CATEGORIES.find(c => c.toLowerCase() === category.trim().toLowerCase());
  return matched || 'Vehicle';
}

export function getGoogleMapsUrl(input?: string): string | null {
  if (!input || !input.trim()) return null;
  const val = input.trim();
  if (val.startsWith('http://') || val.startsWith('https://')) {
    return val;
  }
  const coordRegex = /^\s*[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)\s*,\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)\s*$/;
  if (coordRegex.test(val)) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(val)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(val)}`;
}

export interface Asset {
  id: string;
  name: string;
  brand: string;
  category: string;
  modelYear: number | string;
  plateNumber: string;
  condition: string;
  location: string;
  description: string;
  startingPrice: number;
  highestBid: number;
  status: AssetStatus;
  imageUrl: string;
  imageUrls?: string[];
  bids: Bid[];
  dimensions?: string;
  propertyType?: string;
  auctionType?: string;
  landArea?: string;
  buildingArea?: string;
  // Used Part specific fields
  usedPartCategory?: 'Ban' | 'Aki' | 'Besi' | 'Oli' | 'Lainnya' | string;
  quantity?: string;
  salesSystem?: string;
  openHouseSchedule?: string;
  // Ban fields
  tireBrand?: string;
  tireSize?: string;
  tireType?: string;
  tireTreadDepth?: string;
  tireCondition?: string;
  tireDotCode?: string;
  // Aki fields
  batteryBrand?: string;
  batteryTypeCode?: string;
  batteryCapacity?: string;
  batteryType?: string;
  batteryCondition?: string;
  batteryElectrolyteStatus?: string;
  // Besi fields
  metalType?: string;
  metalSalesMethod?: string;
  metalEstimatedWeight?: string;
  metalCondition?: string;
  metalHandlingFacility?: string;
  // Oli fields
  oilBrand?: string;
  oilType?: string;
  oilCondition?: string;
  oilVolume?: string;
  model?: string;
  series?: string;
  axels?: string;
  vehicleColour?: string;
  fuelType?: string;
  horsepower?: string;
  odometer?: string;
  keurValidUntil?: string;
  stnkPlateValidUntil?: string;
  stnkTaxValidUntil?: string;
  haveAttachment?: boolean;
  attachmentCategory?: string;
  attachmentImageUrl?: string;
  attachmentImageUrls?: string[];
  attachmentType?: string;
  attachmentAxels?: string;
  attachmentYearBuilt?: string;
  attachmentKeurNo?: string;
  attachmentValidUntil?: string;
  attachmentLength?: string;
  attachmentWidth?: string;
  attachmentHeight?: string;
  attachmentExtension?: string;
  tnc?: string;
  closeBidDate?: string;
  coordinates?: string;
}

export interface AdminUser {
  email: string;
  name: string;
  role: string;
  createdAt: string;
  password?: string;
}

export interface Brand {
  id: string;
  name: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface Condition {
  id: string;
  name: string;
  createdAt: string;
}

export interface Series {
  id: string;
  name: string;
  createdAt: string;
}

export interface VehicleColour {
  id: string;
  name: string;
  createdAt: string;
}

export interface FuelType {
  id: string;
  name: string;
  createdAt: string;
}

export interface AttachmentCategory {
  id: string;
  name: string;
  createdAt: string;
}

export interface AttachmentType {
  id: string;
  name: string;
  createdAt: string;
}

export interface RegisteredUser {
  email: string;
  name: string;
  phone: string;
  password?: string;
  company?: string;
  address?: string;
  status: 'Menunggu Verifikasi' | 'Menunggu Persetujuan' | 'Disetujui' | 'Ditolak';
  emailVerified: boolean;
  verificationCode: string;
  createdAt: string;
  canBid?: boolean; // Default true when approved. If false, user cannot place bids (View Only)
}

export interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'bid' | 'sync';
  title: string;
  message: string;
  timestamp: Date;
  assetId?: string;
  read?: boolean;
}

export interface BiddingRequest {
  id: string;
  email: string;
  userName: string;
  requestType: string;
  proofUrl: string; // Base64 image
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  updatedAt?: string;
  notes?: string;
}

export interface RefundRequest {
  id: string;
  email: string;
  userName: string;
  phone: string;
  purpose: string; // Keperluan refund
  proofUrl: string; // Base64 image upload
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  updatedAt?: string;
  amount?: number;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  registerEntryName?: string;
}

export interface WaSessionData {
  id: string; // user email
  email: string;
  status: 'disconnected' | 'connecting' | 'connected';
  connectedPhone: string;
  updatedAt: string;
}

export interface WaTemplateData {
  id: string;
  name: string;
  category: string;
  content: string;
  imageUrl?: string;
  createdAt?: string;
}

export interface PopupItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  mainDescription?: string;
  depositHighlight?: string;
  securityTitle?: string;
  securityDescription?: string;
  cancellationTitle?: string;
  cancellationDescription?: string;
  closingSlogan?: string;
  ctaButtonText?: string;
  ctaButtonUrl?: string;
  showBeforeLogin: boolean;
  showAfterLogin: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface PopupConfig {
  popups: PopupItem[];
}

export const DEFAULT_POPUP_ITEM: PopupItem = {
  id: 'default_bidding_rules_popup',
  title: 'Syarat & Ketentuan Akses Bidding - Lelang Truck Pancaran Platinum',
  subtitle: 'Informasi Resmi Deposit & Akses Penawaran',
  imageUrl: 'https://lh3.googleusercontent.com/d/19rthCmJjo1yZlT94ce5xY_mcwGnyaqjN',
  mainDescription: 'Untuk menjaga kualifikasi dan kelancaran proses penawaran, setiap peserta diwajibkan melakukan',
  depositHighlight: 'deposit jaminan sebesar Rp10.000.000,- di Rekening Resmi Kantor Pancaran.',
  securityTitle: 'Jaminan Keamanan Dana:',
  securityDescription: 'Bagi peserta yang belum berkesempatan menjadi pemenang, dana deposit sebesar Rp10.000.000,- akan dikembalikan penuh (100%) setelah pengumuman pemenang resmi dan memasuki tahapan acara selanjutnya.',
  cancellationTitle: 'Syarat & Ketentuan Pembatalan:',
  cancellationDescription: 'Deposit akan dianggap hangus apabila pemenang mengundurkan diri atau tidak menyelesaikan proses transaksi dalam jangka waktu maksimal 7 (tujuh) hari.',
  closingSlogan: 'Mari bergabung dan dapatkan unit impian Anda di ajang eksklusif Pancaran Platinum!',
  ctaButtonText: 'Hubungi Panitia untuk Akses Bidding',
  ctaButtonUrl: 'https://wa.me/6281317469744?text=Halo%20Panitia%20Lelang%20Pancaran%20Platinum,%20saya%20ingin%20mengkonfirmasi%20deposit%20jaminan%20Rp10.000.000%20untuk%20akses%20bidding%20lelang.',
  showBeforeLogin: true,
  showAfterLogin: true,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const DEFAULT_POPUP_CONFIG: PopupConfig = {
  popups: [DEFAULT_POPUP_ITEM],
};

export const EMPTY_POPUP_CONFIG: PopupConfig = {
  popups: [],
};


