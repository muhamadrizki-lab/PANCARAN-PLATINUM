import { Asset, AdminUser } from '../types';

export const INITIAL_ADMINS: AdminUser[] = [
  {
    email: 'digital.solution@pancaran-logistic.id',
    name: 'Digital Solution Admin',
    role: 'Super Admin',
    createdAt: '2026-01-15'
  },
  {
    email: 'admin.lelang@pancaran-logistic.id',
    name: 'Budi Hartono',
    role: 'Admin Keuangan',
    createdAt: '2026-02-10'
  }
];

export const INITIAL_ASSETS: Asset[] = [
  {
    id: 'PL-2026-001',
    name: 'Hino Ranger FL 265 JW Wingbox 10-Wheeler',
    brand: 'Hino',
    category: 'Vehicle',
    modelYear: 2021,
    plateNumber: 'B 9845 PXT',
    condition: 'Sangat Baik',
    location: 'Pool Cakung, Jakarta Timur',
    description: 'Truk Wingbox Hino Ranger FL 265 JW tahun 2021 dalam kondisi prima. Perawatan rutin bengkel resmi Pancaran. Sasis lurus kokoh, mesin kering bertenaga, sistem wingbox hidrolik berfungsi lancar 100%. CO2 emission standar Euro 4.',
    startingPrice: 420000000,
    highestBid: 435000000,
    status: 'Open',
    imageUrl: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
    tnc: '1. Penawaran mengikat selama 7 hari kerja.\n2. Wajib melakukan survei fisik sebelum melakukan pembayaran akhir.\n3. Unit dijual dengan kondisi apa adanya ("as-is").',
    bids: [
      {
        id: 'B-101',
        name: 'Andi Wijaya',
        email: 'andi.wijaya@gmail.com',
        contact: '081234567890',
        price: 425000000,
        timestamp: '2026-06-25T14:30:00Z',
        scheduleSurveyDate: '2026-07-01',
        scheduleSurveyTime: '10:00'
      },
      {
        id: 'B-102',
        name: 'PT Logistik Sejahtera (Roni)',
        email: 'roni@logistiksejahtera.co.id',
        contact: '08119876543',
        price: 435000000,
        timestamp: '2026-06-28T09:15:00Z',
        scheduleSurveyDate: '2026-07-02',
        scheduleSurveyTime: '14:00'
      }
    ]
  },
  {
    id: 'PL-2026-002',
    name: 'Isuzu Giga FVR 34 Q Box Besi',
    brand: 'Isuzu',
    category: 'Vehicle',
    modelYear: 2020,
    plateNumber: 'B 9012 PXS',
    condition: 'Baik',
    location: 'Pool Marunda, Jakarta Utara',
    description: 'Truk medium Isuzu Giga FVR 34 Q Box Besi tebal. Sangat cocok untuk kargo industri berat. Mesin 6 silinder Common Rail irit solar dan bandel. Ban 90% baru, kabin bersih ber-AC, surat-surat hidup lengkap KIR aktif.',
    startingPrice: 350000000,
    highestBid: 362000000,
    status: 'Open',
    imageUrl: 'https://images.unsplash.com/photo-1516576885502-d5334430e52b?auto=format&fit=crop&w=800&q=80',
    bids: [
      {
        id: 'B-201',
        name: 'Heri Susanto',
        email: 'heri.s@yahoo.com',
        contact: '081344556677',
        price: 355000000,
        timestamp: '2026-06-26T11:00:00Z',
        scheduleSurveyDate: '2026-06-30',
        scheduleSurveyTime: '09:00'
      },
      {
        id: 'B-202',
        name: 'CV Trans Mandiri',
        email: 'info@transmandiri.com',
        contact: '085211223344',
        price: 362000000,
        timestamp: '2026-06-28T16:45:00Z',
        scheduleSurveyDate: '2026-07-02',
        scheduleSurveyTime: '11:00'
      }
    ]
  },
  {
    id: 'PL-2026-003',
    name: 'Mitsubishi Fuso Colt Diesel FE 74 HD Dump Truck',
    brand: 'Fuso',
    category: 'Vehicle',
    modelYear: 2022,
    plateNumber: 'B 9231 PXR',
    condition: 'Sangat Baik',
    location: 'Pool Cakung, Jakarta Timur',
    description: 'Mitsubishi Fuso Canter / Colt Diesel FE 74 Heavy Duty Dump Truck. Indeks bak 8 kubik, plat tebal antikeropos. Digunakan khusus di lingkungan depo semen/beton Pancaran, terawat maksimal. KM rendah di bawah 50.000.',
    startingPrice: 280000000,
    highestBid: 280000000,
    status: 'Open',
    imageUrl: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=800&q=80',
    bids: []
  },
  {
    id: 'PL-2026-004',
    name: 'Scania R560 V8 Heavy Trailer Head',
    brand: 'Scania',
    category: 'Vehicle',
    modelYear: 2019,
    plateNumber: 'B 9755 PXW',
    condition: 'Baik',
    location: 'Pool Teluk Gong, Jakarta Utara',
    description: 'Kepala Trailer Premium Scania R560 mesin V8, rajanya angkutan berat kontainer 40 feet. Transmisi Opticruise halus, suspensi udara nyaman. Kabin lengkap sleeper bed untuk rute antar kota lintas pulau.',
    startingPrice: 850000000,
    highestBid: 890000000,
    status: 'Sold',
    imageUrl: 'https://images.unsplash.com/photo-1592838064575-70ed626d3a44?auto=format&fit=crop&w=800&q=80',
    bids: [
      {
        id: 'B-401',
        name: 'PT Samudera Jaya Logistics',
        email: 'tender@samuderajaya.co.id',
        contact: '02188442211',
        price: 870000000,
        timestamp: '2026-06-20T10:00:00Z'
      },
      {
        id: 'B-402',
        name: 'PT Mega Transportindo',
        email: 'purchasing@megatrans.id',
        contact: '081299881122',
        price: 890000000,
        timestamp: '2026-06-22T15:20:00Z'
      }
    ]
  },
  {
    id: 'PL-2026-005',
    name: 'Toyota Hilux Single Cabin 2.4 DSL 4x2',
    brand: 'Toyota',
    category: 'Vehicle',
    modelYear: 2021,
    plateNumber: 'B 9631 PXV',
    condition: 'Baik',
    location: 'Pool Cibubur, Depok',
    description: 'Mobil pick-up operasional lapangan Toyota Hilux Bensin 2.4 Single Cabin. Sasis sangat baik, dipasang bak tambahan pengaman kargo. Ac dingin sekali, tape standar, ban cadangan tersedia, pajak panjang sampai November 2026.',
    startingPrice: 160000000,
    highestBid: 165000000,
    status: 'Open',
    imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
    bids: [
      {
        id: 'B-501',
        name: 'Agus Salim',
        email: 'agus.salim99@gmail.com',
        contact: '087812345678',
        price: 165000000,
        timestamp: '2026-06-27T08:30:00Z',
        scheduleSurveyDate: '2026-06-30',
        scheduleSurveyTime: '13:00'
      }
    ]
  },
  {
    id: 'PL-2026-006',
    name: 'Caterpillar DP30N Forklift Diesel 3 Ton',
    brand: 'Caterpillar',
    category: 'Vehicle',
    modelYear: 2020,
    plateNumber: 'N/A (Alat Berat)',
    condition: 'Cukup',
    location: 'Gudang Logistik Marunda, Jakarta Utara',
    description: 'Forklift diesel kapasitas angkat 3 Ton dari Caterpillar tipe DP30N. Tinggi angkat tiang (mast) 3 meter dupleks. Ban solid anti bocor, engine sehat bertenaga, transmisi powershift handal. Ada sedikit lecet pemakaian luar biasa.',
    startingPrice: 120000000,
    highestBid: 125000000,
    status: 'Sold',
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
    bids: [
      {
        id: 'B-601',
        name: 'CV Makmur Warehouse',
        email: 'makmur@warehouse.co.id',
        contact: '081266554433',
        price: 125000000,
        timestamp: '2026-06-18T11:00:00Z'
      }
    ]
  }
];
