import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  limit
} from 'firebase/firestore';
import { Asset, AdminUser, Bid, Brand, Category, Condition, RegisteredUser, Series, VehicleColour, FuelType, AttachmentCategory, AttachmentType, ToastNotification, normalizeCategory, BiddingRequest, RefundRequest, WaSessionData, WaTemplateData } from './types';
import { INITIAL_ASSETS, INITIAL_ADMINS, INITIAL_REGISTERED_USERS } from './data/mockData';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize the standard client-side Firebase app
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
} as any, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Collection names
const ASSETS_COLLECTION = 'assets';
const ADMINS_COLLECTION = 'admins';
const BRANDS_COLLECTION = 'brands';
const CATEGORIES_COLLECTION = 'categories';
const CONDITIONS_COLLECTION = 'conditions';
const SERIES_COLLECTION = 'series';
const COLOURS_COLLECTION = 'colours';
const FUELS_COLLECTION = 'fuels';
const ATTACHMENTS_COLLECTION = 'attachments';
const ATTACHMENT_TYPES_COLLECTION = 'attachment_types';
const NOTIFICATIONS_COLLECTION = 'notifications';
const BIDDING_REQUESTS_COLLECTION = 'bidding_requests';
const REFUND_REQUESTS_COLLECTION = 'refund_requests';

// Operation types for standard error handling matching the Firebase skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

/**
 * Handles errors and formats them into standard FirestoreErrorInfo JSON string.
 * Gracefully swallows Quota Exceeded errors to prevent application crashes and allow fallback to cached/local data.
 */
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const isQuotaError = errorMsg.includes('Quota limit exceeded') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota') || errorMsg.includes('quota metric');
  
  const errInfo: FirestoreErrorInfo = {
    error: isQuotaError ? 'Firestore Quota limit exceeded (Free Tier Daily Limit Reached).' : errorMsg,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (isQuotaError) {
    console.warn(`[Quota Exceeded] Firestore operation '${operationType}' on '${path}' skipped. Utilizing local cache / default state.`);
    return;
  }

  const isPermissionError = errorMsg.includes('Missing or insufficient permissions') || errorMsg.includes('permission');
  if (isPermissionError) {
    console.warn(`[Firestore Permission Warning] Operation '${operationType}' on '${path}' failed due to permissions. Fallback active.`, JSON.stringify(errInfo));
    return;
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Triggers the Google Apps Script Web App sync in the background.
 * Uses mode: 'no-cors' to bypass GAS Web App redirect CORS restrictions
 * while ensuring the script successfully runs on the server side.
 */
export async function triggerAppsScriptSync() {
  const appsScriptUrl = (import.meta as any).env.VITE_APPS_SCRIPT_URL;
  if (!appsScriptUrl) {
    console.log('VITE_APPS_SCRIPT_URL is not set. Real-time Google Spreadsheet sync will not be called.');
    return;
  }

  try {
    console.log('Triggering instant Google Spreadsheet sync...');
    await fetch(appsScriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'sync' }),
    });
    console.log('Google Spreadsheet sync triggered successfully.');
  } catch (error) {
    console.warn('Failed to trigger Google Spreadsheet sync:', error);
  }
}

/**
 * Recursively cleans data to remove properties with 'undefined' values before writing to Firestore.
 */
function sanitizeData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeData(item)) as unknown as T;
  }

  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeData(value);
      }
    }
    return cleaned as unknown as T;
  }

  return obj;
}

/**
 * Seeds initial data into Firestore if collections are empty.
 * Uses local and remote seed status check to avoid repeating collection scans on every load.
 */
export async function seedDatabaseIfEmpty() {
  if (typeof window !== 'undefined' && localStorage.getItem('pancaran_db_seeded_v1') === 'true') {
    return;
  }

  // Set seed status in localStorage immediately to avoid spamming Firestore reads if quota is exceeded
  if (typeof window !== 'undefined') {
    localStorage.setItem('pancaran_db_seeded_v1', 'true');
  }

  const seedDocRef = doc(db, CONFIG_COLLECTION, 'seed_status');
  try {
    const seedSnap = await getDoc(seedDocRef);
    if (seedSnap.exists() && seedSnap.data()?.seeded) {
      return;
    }
  } catch (e) {
    console.warn('Could not check seed status from Firestore:', e);
    return;
  }

  try {
    const adminsSnapshot = await getDocs(collection(db, ADMINS_COLLECTION));
    if (adminsSnapshot.empty) {
      console.log('Seeding initial admins to Firestore...');
      for (const adminUser of INITIAL_ADMINS) {
        await setDoc(doc(db, ADMINS_COLLECTION, adminUser.email), adminUser);
      }
      console.log('Admins successfully seeded.');
    }

    const brandsSnapshot = await getDocs(collection(db, BRANDS_COLLECTION));
    if (brandsSnapshot.empty) {
      console.log('Seeding initial brands to Firestore...');
      const defaultBrands = ['Hino', 'Isuzu', 'Fuso', 'Scania', 'Toyota', 'Caterpillar', 'Komatsu', 'Lainnya'];
      for (const brandName of defaultBrands) {
        const brandId = brandName.toLowerCase();
        await setDoc(doc(db, BRANDS_COLLECTION, brandId), {
          id: brandId,
          name: brandName,
          createdAt: new Date().toISOString()
        });
      }
      console.log('Brands successfully seeded.');
    }

    const categoriesSnapshot = await getDocs(collection(db, CATEGORIES_COLLECTION));
    if (categoriesSnapshot.empty) {
      console.log('Seeding initial categories to Firestore...');
      const defaultCategories = ['Vehicle', 'Used part', 'Property', 'Miscellaneous'];
      for (const catName of defaultCategories) {
        const catId = catName.toLowerCase().replace(/\s+/g, '-');
        await setDoc(doc(db, CATEGORIES_COLLECTION, catId), {
          id: catId,
          name: catName,
          createdAt: new Date().toISOString()
        });
      }
      console.log('Categories successfully seeded.');
    }

    const conditionsSnapshot = await getDocs(collection(db, CONDITIONS_COLLECTION));
    if (conditionsSnapshot.empty) {
      console.log('Seeding initial conditions to Firestore...');
      const defaultConditions = ['Sangat Baik', 'Baik', 'Cukup', 'Butuh Perbaikan'];
      for (const condName of defaultConditions) {
        const condId = condName.toLowerCase().replace(/\s+/g, '-');
        await setDoc(doc(db, CONDITIONS_COLLECTION, condId), {
          id: condId,
          name: condName,
          createdAt: new Date().toISOString()
        });
      }
      console.log('Conditions successfully seeded.');
    }

    // Seed Series
    const seriesSnapshot = await getDocs(collection(db, SERIES_COLLECTION));
    if (seriesSnapshot.empty) {
      console.log('Seeding initial series to Firestore...');
      const defaultSeries = ['440', '500', '320', '260', 'FL 260', 'GIGA', 'Lainnya'];
      for (const sName of defaultSeries) {
        const sId = sName.toLowerCase().replace(/\s+/g, '-');
        await setDoc(doc(db, SERIES_COLLECTION, sId), {
          id: sId,
          name: sName,
          createdAt: new Date().toISOString()
        });
      }
      console.log('Series successfully seeded.');
    }

    // Seed Colours
    const coloursSnapshot = await getDocs(collection(db, COLOURS_COLLECTION));
    if (coloursSnapshot.empty) {
      console.log('Seeding initial colours to Firestore...');
      const defaultColours = ['White', 'Yellow', 'Red', 'Blue', 'Green', 'Grey', 'Black', 'Lainnya'];
      for (const cName of defaultColours) {
        const cId = cName.toLowerCase().replace(/\s+/g, '-');
        await setDoc(doc(db, COLOURS_COLLECTION, cId), {
          id: cId,
          name: cName,
          createdAt: new Date().toISOString()
        });
      }
      console.log('Colours successfully seeded.');
    }

    // Seed Fuels
    const fuelsSnapshot = await getDocs(collection(db, FUELS_COLLECTION));
    if (fuelsSnapshot.empty) {
      console.log('Seeding initial fuels to Firestore...');
      const defaultFuels = ['Solar', 'Diesel', 'Bensin', 'Listrik'];
      for (const fName of defaultFuels) {
        const fId = fName.toLowerCase().replace(/\s+/g, '-');
        await setDoc(doc(db, FUELS_COLLECTION, fId), {
          id: fId,
          name: fName,
          createdAt: new Date().toISOString()
        });
      }
      console.log('Fuels successfully seeded.');
    }

    // Seed Attachments
    const attachmentsSnapshot = await getDocs(collection(db, ATTACHMENTS_COLLECTION));
    if (attachmentsSnapshot.empty) {
      console.log('Seeding initial attachments to Firestore...');
      const defaultAttachments = ['Trailer', 'Box', 'Dump Body', 'Flatbed', 'Lainnya'];
      for (const aName of defaultAttachments) {
        const aId = aName.toLowerCase().replace(/\s+/g, '-');
        await setDoc(doc(db, ATTACHMENTS_COLLECTION, aId), {
          id: aId,
          name: aName,
          createdAt: new Date().toISOString()
        });
      }
      console.log('Attachments successfully seeded.');
    }

    // Seed Attachment Types
    const attachmentTypesSnapshot = await getDocs(collection(db, ATTACHMENT_TYPES_COLLECTION));
    if (attachmentTypesSnapshot.empty) {
      console.log('Seeding initial attachment types to Firestore...');
      const defaultAttachmentTypes = ['Highbed 40', 'Highbed 20', 'Flatbed 40', 'Flatbed 20', 'Skeleton 40', 'Skeleton 20', 'Lowbed', 'Dolly', 'Lainnya'];
      for (const atName of defaultAttachmentTypes) {
        const atId = atName.toLowerCase().replace(/\s+/g, '-');
        await setDoc(doc(db, ATTACHMENT_TYPES_COLLECTION, atId), {
          id: atId,
          name: atName,
          createdAt: new Date().toISOString()
        });
      }
      console.log('Attachment types successfully seeded.');
    }

    // Seed Initial Registered Users
    const registeredUsersSnapshot = await getDocs(collection(db, REGISTERED_USERS_COLLECTION));
    if (registeredUsersSnapshot.empty) {
      console.log('Seeding initial registered users to Firestore...');
      for (const regUser of INITIAL_REGISTERED_USERS) {
        await setDoc(doc(db, REGISTERED_USERS_COLLECTION, regUser.email.toLowerCase()), sanitizeData(regUser));
      }
      console.log('Registered users successfully seeded.');
    }

    // Mark as seeded in Firestore
    await setDoc(seedDocRef, { seeded: true, seededAt: new Date().toISOString() });
  } catch (error) {
    console.warn('Seeding step skipped due to quota or network limitation:', error);
  }
}

const MOCK_ASSET_IDS = new Set(['PL-2026-001', 'PL-2026-002', 'PL-2026-003', 'PL-2026-004', 'PL-2026-005', 'PL-2026-006']);

function filterOutMockAssets(assets: Asset[]): Asset[] {
  return assets
    .filter(a => !MOCK_ASSET_IDS.has(a.id))
    .map(a => ({
      ...a,
      category: normalizeCategory(a.category)
    }));
}

/**
 * Fetch all assets from Firestore.
 */
export async function fetchAssets(): Promise<Asset[]> {
  try {
    const querySnapshot = await getDocs(collection(db, ASSETS_COLLECTION));
    const assets: Asset[] = [];
    querySnapshot.forEach((docSnap) => {
      assets.push({ id: docSnap.id, ...docSnap.data() } as Asset);
    });
    return filterOutMockAssets(assets);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ASSETS_COLLECTION);
    let fallback: Asset[] = [];
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('pancaran_assets_cache');
        if (cached) fallback = filterOutMockAssets(JSON.parse(cached));
      } catch (e) {}
    }
    return fallback;
  }
}

/**
 * Fetch all admin users from Firestore.
 */
export async function fetchAdmins(): Promise<AdminUser[]> {
  try {
    const querySnapshot = await getDocs(collection(db, ADMINS_COLLECTION));
    const admins: AdminUser[] = [];
    querySnapshot.forEach((docSnap) => {
      admins.push(docSnap.data() as AdminUser);
    });
    return admins.length > 0 ? admins : INITIAL_ADMINS;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ADMINS_COLLECTION);
    let fallback = INITIAL_ADMINS;
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('pancaran_admins_cache');
        if (cached) fallback = JSON.parse(cached);
      } catch (e) {}
    }
    return fallback;
  }
}

/**
 * Add a new asset to Firestore.
 */
export async function addAssetToDb(asset: Omit<Asset, 'id'> & { id?: string }): Promise<string> {
  const finalId = asset.id || `PL-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  const path = `${ASSETS_COLLECTION}/${finalId}`;
  try {
    const assetWithId = {
      ...asset,
      id: finalId,
      bids: asset.bids || []
    };
    await setDoc(doc(db, ASSETS_COLLECTION, finalId), sanitizeData(assetWithId));
    triggerAppsScriptSync(); // Trigger background spreadsheet sync
    return finalId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return '';
  }
}

/**
 * Update an existing asset in Firestore.
 */
export async function updateAssetInDb(id: string, updates: Partial<Asset>): Promise<void> {
  const path = `${ASSETS_COLLECTION}/${id}`;
  try {
    await updateDoc(doc(db, ASSETS_COLLECTION, id), sanitizeData(updates));
    triggerAppsScriptSync(); // Trigger background spreadsheet sync
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Delete an asset from Firestore.
 */
export async function deleteAssetFromDb(id: string): Promise<void> {
  const path = `${ASSETS_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, ASSETS_COLLECTION, id));
    triggerAppsScriptSync(); // Trigger background spreadsheet sync
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Add a bid to an asset in Firestore.
 */
export async function addBidToAsset(assetId: string, bid: Bid): Promise<void> {
  const path = `${ASSETS_COLLECTION}/${assetId}`;
  try {
    const assetRef = doc(db, ASSETS_COLLECTION, assetId);
    const assetSnap = await getDoc(assetRef);
    if (!assetSnap.exists()) {
      throw new Error(`Asset with ID ${assetId} does not exist`);
    }
    const currentAsset = assetSnap.data() as Asset;
    const updatedBids = [...(currentAsset.bids || []), bid];
    const highestBid = updatedBids.length > 0
      ? Math.max(...updatedBids.map(b => b.price), currentAsset.startingPrice)
      : currentAsset.startingPrice;

    await updateDoc(assetRef, sanitizeData({
      bids: updatedBids,
      highestBid: highestBid
    }));
    triggerAppsScriptSync(); // Trigger background spreadsheet sync
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Add a new admin user to Firestore.
 */
export async function addAdminToDb(admin: AdminUser): Promise<void> {
  const path = `${ADMINS_COLLECTION}/${admin.email}`;
  try {
    await setDoc(doc(db, ADMINS_COLLECTION, admin.email), sanitizeData(admin));
    triggerAppsScriptSync(); // Trigger background spreadsheet sync
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Delete an admin user from Firestore.
 */
export async function deleteAdminFromDb(email: string): Promise<void> {
  const path = `${ADMINS_COLLECTION}/${email}`;
  try {
    await deleteDoc(doc(db, ADMINS_COLLECTION, email));
    triggerAppsScriptSync(); // Trigger background spreadsheet sync
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribe to realtime updates for assets.
 */
export function subscribeToAssets(callback: (assets: Asset[]) => void) {
  return onSnapshot(
    collection(db, ASSETS_COLLECTION),
    (snapshot) => {
      const assets: Asset[] = [];
      snapshot.forEach((docSnap) => {
        assets.push({ id: docSnap.id, ...docSnap.data() } as Asset);
      });
      const realAssets = filterOutMockAssets(assets);
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('pancaran_assets_cache', JSON.stringify(realAssets)); } catch (e) {}
      }
      callback(realAssets);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, ASSETS_COLLECTION);
      let fallback: Asset[] = [];
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('pancaran_assets_cache');
          if (cached) fallback = filterOutMockAssets(JSON.parse(cached));
        } catch (e) {}
      }
      callback(fallback);
    }
  );
}

/**
 * Subscribe to realtime updates for admins.
 */
export function subscribeToAdmins(callback: (admins: AdminUser[]) => void) {
  return onSnapshot(
    collection(db, ADMINS_COLLECTION),
    (snapshot) => {
      const admins: AdminUser[] = [];
      snapshot.forEach((docSnap) => {
        admins.push(docSnap.data() as AdminUser);
      });
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('pancaran_admins_cache', JSON.stringify(admins)); } catch (e) {}
      }
      callback(admins);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, ADMINS_COLLECTION);
      let fallback = INITIAL_ADMINS;
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('pancaran_admins_cache');
          if (cached) fallback = JSON.parse(cached);
        } catch (e) {}
      }
      callback(fallback);
    }
  );
}

const DEFAULT_BRANDS: Brand[] = ['Hino', 'Isuzu', 'Fuso', 'Scania', 'Toyota', 'Caterpillar', 'Komatsu', 'Lainnya'].map(name => ({
  id: name.toLowerCase(),
  name,
  createdAt: new Date().toISOString()
}));

const DEFAULT_CATEGORIES: Category[] = ['Vehicle', 'Used part', 'Property', 'Miscellaneous'].map(name => ({
  id: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  createdAt: new Date().toISOString()
}));

const DEFAULT_CONDITIONS: Condition[] = ['Sangat Baik', 'Baik', 'Cukup', 'Butuh Perbaikan'].map(name => ({
  id: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  createdAt: new Date().toISOString()
}));

const DEFAULT_SERIES: Series[] = ['440', '500', '320', '260', 'FL 260', 'GIGA', 'Lainnya'].map(name => ({
  id: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  createdAt: new Date().toISOString()
}));

const DEFAULT_COLOURS: VehicleColour[] = ['White', 'Yellow', 'Red', 'Blue', 'Green', 'Grey', 'Black', 'Lainnya'].map(name => ({
  id: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  createdAt: new Date().toISOString()
}));

const DEFAULT_FUELS: FuelType[] = ['Solar', 'Diesel', 'Bensin', 'Listrik'].map(name => ({
  id: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  createdAt: new Date().toISOString()
}));

const DEFAULT_ATTACHMENTS: AttachmentCategory[] = ['Trailer', 'Box', 'Dump Body', 'Flatbed', 'Lainnya'].map(name => ({
  id: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  createdAt: new Date().toISOString()
}));

const DEFAULT_ATTACHMENT_TYPES: AttachmentType[] = ['Highbed 40', 'Highbed 20', 'Flatbed 40', 'Flatbed 20', 'Skeleton 40', 'Skeleton 20', 'Lowbed', 'Dolly', 'Lainnya'].map(name => ({
  id: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  createdAt: new Date().toISOString()
}));

/**
 * Fetch all brands from Firestore.
 */
export async function fetchBrands(): Promise<Brand[]> {
  try {
    const querySnapshot = await getDocs(collection(db, BRANDS_COLLECTION));
    const brands: Brand[] = [];
    querySnapshot.forEach((docSnap) => {
      brands.push(docSnap.data() as Brand);
    });
    return brands.length > 0 ? brands.sort((a, b) => a.name.localeCompare(b.name)) : DEFAULT_BRANDS;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, BRANDS_COLLECTION);
    return DEFAULT_BRANDS;
  }
}

/**
 * Add a new brand to Firestore.
 */
export async function addBrandToDb(brand: Brand): Promise<void> {
  const path = `${BRANDS_COLLECTION}/${brand.id}`;
  try {
    await setDoc(doc(db, BRANDS_COLLECTION, brand.id), sanitizeData(brand));
    clearMasterDataCache();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Delete a brand from Firestore.
 */
export async function deleteBrandFromDb(id: string): Promise<void> {
  const path = `${BRANDS_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, BRANDS_COLLECTION, id));
    clearMasterDataCache();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribe to realtime updates for brands.
 */
export function subscribeToBrands(callback: (brands: Brand[]) => void) {
  return onSnapshot(
    collection(db, BRANDS_COLLECTION),
    (snapshot) => {
      const brands: Brand[] = [];
      snapshot.forEach((docSnap) => {
        brands.push(docSnap.data() as Brand);
      });
      callback(brands.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, BRANDS_COLLECTION);
    }
  );
}

/**
 * Add a new category to Firestore.
 */
export async function addCategoryToDb(category: Category): Promise<void> {
  const path = `${CATEGORIES_COLLECTION}/${category.id}`;
  try {
    await setDoc(doc(db, CATEGORIES_COLLECTION, category.id), sanitizeData(category));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Delete a category from Firestore.
 */
export async function deleteCategoryFromDb(id: string): Promise<void> {
  const path = `${CATEGORIES_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, CATEGORIES_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribe to realtime updates for categories.
 */
export function subscribeToCategories(callback: (categories: Category[]) => void) {
  return onSnapshot(
    collection(db, CATEGORIES_COLLECTION),
    (snapshot) => {
      const categories: Category[] = [];
      snapshot.forEach((docSnap) => {
        categories.push(docSnap.data() as Category);
      });
      callback(categories.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, CATEGORIES_COLLECTION);
    }
  );
}

/**
 * Add a new physical condition to Firestore.
 */
export async function addConditionToDb(condition: Condition): Promise<void> {
  const path = `${CONDITIONS_COLLECTION}/${condition.id}`;
  try {
    await setDoc(doc(db, CONDITIONS_COLLECTION, condition.id), sanitizeData(condition));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Delete a physical condition from Firestore.
 */
export async function deleteConditionFromDb(id: string): Promise<void> {
  const path = `${CONDITIONS_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, CONDITIONS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribe to realtime updates for physical conditions.
 */
export function subscribeToConditions(callback: (conditions: Condition[]) => void) {
  return onSnapshot(
    collection(db, CONDITIONS_COLLECTION),
    (snapshot) => {
      const conditions: Condition[] = [];
      snapshot.forEach((docSnap) => {
        conditions.push(docSnap.data() as Condition);
      });
      callback(conditions.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, CONDITIONS_COLLECTION);
    }
  );
}

/**
 * Add a new series to Firestore.
 */
export async function addSeriesToDb(series: Series): Promise<void> {
  const path = `${SERIES_COLLECTION}/${series.id}`;
  try {
    await setDoc(doc(db, SERIES_COLLECTION, series.id), sanitizeData(series));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Delete a series from Firestore.
 */
export async function deleteSeriesFromDb(id: string): Promise<void> {
  const path = `${SERIES_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, SERIES_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribe to realtime updates for series.
 */
export function subscribeToSeries(callback: (series: Series[]) => void) {
  return onSnapshot(
    collection(db, SERIES_COLLECTION),
    (snapshot) => {
      const list: Series[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Series);
      });
      callback(list.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, SERIES_COLLECTION);
    }
  );
}

/**
 * Add a new vehicle colour to Firestore.
 */
export async function addVehicleColourToDb(colour: VehicleColour): Promise<void> {
  const path = `${COLOURS_COLLECTION}/${colour.id}`;
  try {
    await setDoc(doc(db, COLOURS_COLLECTION, colour.id), sanitizeData(colour));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Delete a vehicle colour from Firestore.
 */
export async function deleteVehicleColourFromDb(id: string): Promise<void> {
  const path = `${COLOURS_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, COLOURS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribe to realtime updates for vehicle colours.
 */
export function subscribeToVehicleColours(callback: (colours: VehicleColour[]) => void) {
  return onSnapshot(
    collection(db, COLOURS_COLLECTION),
    (snapshot) => {
      const list: VehicleColour[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as VehicleColour);
      });
      callback(list.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, COLOURS_COLLECTION);
    }
  );
}

/**
 * Add a new fuel type to Firestore.
 */
export async function addFuelTypeToDb(fuel: FuelType): Promise<void> {
  const path = `${FUELS_COLLECTION}/${fuel.id}`;
  try {
    await setDoc(doc(db, FUELS_COLLECTION, fuel.id), sanitizeData(fuel));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Delete a fuel type from Firestore.
 */
export async function deleteFuelTypeFromDb(id: string): Promise<void> {
  const path = `${FUELS_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, FUELS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribe to realtime updates for fuel types.
 */
export function subscribeToFuelTypes(callback: (fuels: FuelType[]) => void) {
  return onSnapshot(
    collection(db, FUELS_COLLECTION),
    (snapshot) => {
      const list: FuelType[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as FuelType);
      });
      callback(list.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, FUELS_COLLECTION);
    }
  );
}

/**
 * Add a new attachment category to Firestore.
 */
export async function addAttachmentCategoryToDb(attachment: AttachmentCategory): Promise<void> {
  const path = `${ATTACHMENTS_COLLECTION}/${attachment.id}`;
  try {
    await setDoc(doc(db, ATTACHMENTS_COLLECTION, attachment.id), sanitizeData(attachment));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Delete an attachment category from Firestore.
 */
export async function deleteAttachmentCategoryFromDb(id: string): Promise<void> {
  const path = `${ATTACHMENTS_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, ATTACHMENTS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribe to realtime updates for attachment categories.
 */
export function subscribeToAttachmentCategories(callback: (attachments: AttachmentCategory[]) => void) {
  return onSnapshot(
    collection(db, ATTACHMENTS_COLLECTION),
    (snapshot) => {
      const list: AttachmentCategory[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as AttachmentCategory);
      });
      callback(list.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, ATTACHMENTS_COLLECTION);
    }
  );
}

/**
 * Add a new attachment type to Firestore.
 */
export async function addAttachmentTypeToDb(atType: AttachmentType): Promise<void> {
  const path = `${ATTACHMENT_TYPES_COLLECTION}/${atType.id}`;
  try {
    await setDoc(doc(db, ATTACHMENT_TYPES_COLLECTION, atType.id), sanitizeData(atType));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Delete an attachment type from Firestore.
 */
export async function deleteAttachmentTypeFromDb(id: string): Promise<void> {
  const path = `${ATTACHMENT_TYPES_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, ATTACHMENT_TYPES_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

const MASTER_CACHE_KEY = 'pancaran_master_data_cache_v2';

export function clearMasterDataCache() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(MASTER_CACHE_KEY);
  }
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const querySnapshot = await getDocs(collection(db, CATEGORIES_COLLECTION));
    const categories: Category[] = [];
    querySnapshot.forEach((docSnap) => {
      categories.push(docSnap.data() as Category);
    });
    return categories.length > 0 ? categories.sort((a, b) => a.name.localeCompare(b.name)) : DEFAULT_CATEGORIES;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, CATEGORIES_COLLECTION);
    return DEFAULT_CATEGORIES;
  }
}

export async function fetchConditions(): Promise<Condition[]> {
  try {
    const querySnapshot = await getDocs(collection(db, CONDITIONS_COLLECTION));
    const conditions: Condition[] = [];
    querySnapshot.forEach((docSnap) => {
      conditions.push(docSnap.data() as Condition);
    });
    return conditions.length > 0 ? conditions.sort((a, b) => a.name.localeCompare(b.name)) : DEFAULT_CONDITIONS;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, CONDITIONS_COLLECTION);
    return DEFAULT_CONDITIONS;
  }
}

export async function fetchSeries(): Promise<Series[]> {
  try {
    const querySnapshot = await getDocs(collection(db, SERIES_COLLECTION));
    const list: Series[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Series);
    });
    return list.length > 0 ? list.sort((a, b) => a.name.localeCompare(b.name)) : DEFAULT_SERIES;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, SERIES_COLLECTION);
    return DEFAULT_SERIES;
  }
}

export async function fetchVehicleColours(): Promise<VehicleColour[]> {
  try {
    const querySnapshot = await getDocs(collection(db, COLOURS_COLLECTION));
    const list: VehicleColour[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as VehicleColour);
    });
    return list.length > 0 ? list.sort((a, b) => a.name.localeCompare(b.name)) : DEFAULT_COLOURS;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLOURS_COLLECTION);
    return DEFAULT_COLOURS;
  }
}

export async function fetchFuelTypes(): Promise<FuelType[]> {
  try {
    const querySnapshot = await getDocs(collection(db, FUELS_COLLECTION));
    const list: FuelType[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as FuelType);
    });
    return list.length > 0 ? list.sort((a, b) => a.name.localeCompare(b.name)) : DEFAULT_FUELS;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, FUELS_COLLECTION);
    return DEFAULT_FUELS;
  }
}

export async function fetchAttachmentCategories(): Promise<AttachmentCategory[]> {
  try {
    const querySnapshot = await getDocs(collection(db, ATTACHMENTS_COLLECTION));
    const list: AttachmentCategory[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as AttachmentCategory);
    });
    return list.length > 0 ? list.sort((a, b) => a.name.localeCompare(b.name)) : DEFAULT_ATTACHMENTS;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ATTACHMENTS_COLLECTION);
    return DEFAULT_ATTACHMENTS;
  }
}

export async function fetchAttachmentTypes(): Promise<AttachmentType[]> {
  try {
    const querySnapshot = await getDocs(collection(db, ATTACHMENT_TYPES_COLLECTION));
    const list: AttachmentType[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as AttachmentType);
    });
    return list.length > 0 ? list.sort((a, b) => a.name.localeCompare(b.name)) : DEFAULT_ATTACHMENT_TYPES;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ATTACHMENT_TYPES_COLLECTION);
    return DEFAULT_ATTACHMENT_TYPES;
  }
}

export async function fetchMasterDataWithCache(forceRefresh = false) {
  const CACHE_TTL = 3600 * 1000 * 24; // 24 hours

  if (!forceRefresh && typeof window !== 'undefined') {
    try {
      const cachedStr = localStorage.getItem(MASTER_CACHE_KEY);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (Date.now() - cached.timestamp < CACHE_TTL && cached.data) {
          return cached.data;
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached master data:', e);
    }
  }

  const [
    brands,
    categories,
    conditions,
    series,
    vehicleColours,
    fuelTypes,
    attachmentCategories,
    attachmentTypes
  ] = await Promise.all([
    fetchBrands(),
    fetchCategories(),
    fetchConditions(),
    fetchSeries(),
    fetchVehicleColours(),
    fetchFuelTypes(),
    fetchAttachmentCategories(),
    fetchAttachmentTypes()
  ]);

  const masterData = {
    brands,
    categories,
    conditions,
    series,
    vehicleColours,
    fuelTypes,
    attachmentCategories,
    attachmentTypes
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(MASTER_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: masterData
      }));
    } catch (e) {
      console.warn('Failed to save master data to localStorage cache:', e);
    }
  }

  return masterData;
}

/**
 * Subscribe to realtime updates for attachment types.
 */
export function subscribeToAttachmentTypes(callback: (atTypes: AttachmentType[]) => void) {
  return onSnapshot(
    collection(db, ATTACHMENT_TYPES_COLLECTION),
    (snapshot) => {
      const list: AttachmentType[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as AttachmentType);
      });
      callback(list.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, ATTACHMENT_TYPES_COLLECTION);
    }
  );
}

const REGISTERED_USERS_COLLECTION = 'registered_users';

/**
 * Add a new registered external user to Firestore.
 */
export async function addRegisteredUser(user: RegisteredUser): Promise<void> {
  const path = `${REGISTERED_USERS_COLLECTION}/${user.email.toLowerCase()}`;
  try {
    await setDoc(doc(db, REGISTERED_USERS_COLLECTION, user.email.toLowerCase()), sanitizeData(user));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Update a registered user's status or details.
 */
export async function updateRegisteredUser(email: string, updates: Partial<RegisteredUser>): Promise<void> {
  const path = `${REGISTERED_USERS_COLLECTION}/${email.toLowerCase()}`;
  try {
    await updateDoc(doc(db, REGISTERED_USERS_COLLECTION, email.toLowerCase()), sanitizeData(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Delete a registered user.
 */
export async function deleteRegisteredUser(email: string): Promise<void> {
  const path = `${REGISTERED_USERS_COLLECTION}/${email.toLowerCase()}`;
  try {
    await deleteDoc(doc(db, REGISTERED_USERS_COLLECTION, email.toLowerCase()));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribe to realtime updates for registered users.
 */
export function subscribeToRegisteredUsers(callback: (users: RegisteredUser[]) => void) {
  return onSnapshot(
    collection(db, REGISTERED_USERS_COLLECTION),
    (snapshot) => {
      const users: RegisteredUser[] = [];
      snapshot.forEach((docSnap) => {
        users.push(docSnap.data() as RegisteredUser);
      });
      const sorted = users.sort((a, b) => String(b?.createdAt || '').localeCompare(String(a?.createdAt || '')));
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('pancaran_users_cache', JSON.stringify(sorted)); } catch (e) {}
      }
      callback(sorted);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, REGISTERED_USERS_COLLECTION);
      let fallback: RegisteredUser[] = [];
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('pancaran_users_cache');
          if (cached) fallback = JSON.parse(cached);
        } catch (e) {}
      }
      callback(fallback);
    }
  );
}

const CONFIG_COLLECTION = 'config';
const SYSTEM_SETTINGS_DOC = 'settings';

import { PopupConfig } from './types';

export interface SystemSettings {
  appsScriptUrl?: string;
  popupConfig?: PopupConfig;
}

/**
 * Fetch system settings from Firestore.
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const docSnap = await getDoc(doc(db, CONFIG_COLLECTION, SYSTEM_SETTINGS_DOC));
    if (docSnap.exists()) {
      return docSnap.data() as SystemSettings;
    }
  } catch (error) {
    console.warn('Failed to fetch system settings from Firestore:', error);
  }
  return {};
}

/**
 * Save system settings to Firestore.
 */
export async function saveSystemSettings(settings: SystemSettings): Promise<void> {
  const path = `${CONFIG_COLLECTION}/${SYSTEM_SETTINGS_DOC}`;
  try {
    await setDoc(doc(db, CONFIG_COLLECTION, SYSTEM_SETTINGS_DOC), sanitizeData(settings));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Sends a real OTP verification email via Google Apps Script Web App.
 */
export async function sendOtpEmailViaAppsScript(
  email: string,
  code: string,
  name: string,
  customAppsScriptUrl?: string
): Promise<boolean> {
  const appsScriptUrl = customAppsScriptUrl || (import.meta as any).env.VITE_APPS_SCRIPT_URL;
  if (!appsScriptUrl) {
    console.log('No Apps Script Web App URL available. Skipping real email delivery.');
    return false;
  }

  try {
    console.log(`Sending OTP email via Apps Script for ${email}...`);
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'send_otp',
        email,
        code,
        name,
      }),
    });
    console.log('OTP email trigger fetch complete.');
    return true;
  } catch (error) {
    console.warn('Failed to send OTP email via Apps Script:', error);
    return false;
  }
}

/**
 * Subscribe to realtime updates for global notifications.
 */
export function subscribeToNotifications(callback: (notifications: ToastNotification[]) => void) {
  const notifQuery = query(collection(db, NOTIFICATIONS_COLLECTION), limit(25));
  return onSnapshot(
    notifQuery,
    (snapshot) => {
      const notifications: ToastNotification[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        notifications.push({
          id: docSnap.id,
          type: data.type || 'info',
          title: data.title || '',
          message: data.message || '',
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
          assetId: data.assetId,
          read: data.read ?? false,
        } as ToastNotification);
      });
      // Sort newest first
      notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('pancaran_notifications_cache', JSON.stringify(notifications)); } catch (e) {}
      }
      callback(notifications);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, NOTIFICATIONS_COLLECTION);
      let fallback: ToastNotification[] = [];
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('pancaran_notifications_cache');
          if (cached) fallback = JSON.parse(cached);
        } catch (e) {}
      }
      callback(fallback);
    }
  );
}

/**
 * Add a new notification to Firestore.
 */
export async function addNotificationToDb(notif: ToastNotification) {
  const path = `${NOTIFICATIONS_COLLECTION}/${notif.id}`;
  try {
    const dataToSave = {
      ...notif,
      timestamp: notif.timestamp ? new Date(notif.timestamp).toISOString() : new Date().toISOString()
    };
    await setDoc(doc(db, NOTIFICATIONS_COLLECTION, notif.id), sanitizeData(dataToSave));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Delete a specific notification from Firestore so it is removed for all users.
 */
export async function deleteNotificationFromDb(id: string) {
  const path = `${NOTIFICATIONS_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Clear all notifications in Firestore.
 */
export async function clearAllNotificationsInDb() {
  try {
    const querySnapshot = await getDocs(collection(db, NOTIFICATIONS_COLLECTION));
    const deletePromises = querySnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, NOTIFICATIONS_COLLECTION);
  }
}

/**
 * Mark a specific notification as read in Firestore.
 */
export async function markNotificationReadInDb(id: string) {
  const path = `${NOTIFICATIONS_COLLECTION}/${id}`;
  try {
    await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, id), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Mark all notifications as read in Firestore.
 */
export async function markAllNotificationsReadInDb() {
  try {
    const querySnapshot = await getDocs(collection(db, NOTIFICATIONS_COLLECTION));
    const updatePromises = querySnapshot.docs.map(docSnap => updateDoc(docSnap.ref, { read: true }));
    await Promise.all(updatePromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, NOTIFICATIONS_COLLECTION);
  }
}

/**
 * Add a new bidding access request to Firestore.
 */
export async function addBiddingRequest(request: BiddingRequest): Promise<void> {
  const path = `${BIDDING_REQUESTS_COLLECTION}/${request.id}`;
  try {
    await setDoc(doc(db, BIDDING_REQUESTS_COLLECTION, request.id), sanitizeData(request));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Update a bidding access request (e.g. status).
 */
export async function updateBiddingRequest(id: string, updates: Partial<BiddingRequest>): Promise<void> {
  const path = `${BIDDING_REQUESTS_COLLECTION}/${id}`;
  try {
    await updateDoc(doc(db, BIDDING_REQUESTS_COLLECTION, id), sanitizeData(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Delete a bidding access request.
 */
export async function deleteBiddingRequest(id: string): Promise<void> {
  const path = `${BIDDING_REQUESTS_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, BIDDING_REQUESTS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribe to realtime updates for bidding access requests.
 */
export function subscribeToBiddingRequests(callback: (requests: BiddingRequest[]) => void) {
  return onSnapshot(
    collection(db, BIDDING_REQUESTS_COLLECTION),
    (snapshot) => {
      const requests: BiddingRequest[] = [];
      snapshot.forEach((docSnap) => {
        requests.push(docSnap.data() as BiddingRequest);
      });
      const sorted = requests.sort((a, b) => String(b?.createdAt || '').localeCompare(String(a?.createdAt || '')));
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('pancaran_bidding_requests_cache', JSON.stringify(sorted)); } catch (e) {}
      }
      callback(sorted);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, BIDDING_REQUESTS_COLLECTION);
      let fallback: BiddingRequest[] = [];
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('pancaran_bidding_requests_cache');
          if (cached) fallback = JSON.parse(cached);
        } catch (e) {}
      }
      callback(fallback);
    }
  );
}

/**
 * Add a new refund request to Firestore.
 */
export async function addRefundRequest(request: RefundRequest): Promise<void> {
  const path = `${REFUND_REQUESTS_COLLECTION}/${request.id}`;
  try {
    await setDoc(doc(db, REFUND_REQUESTS_COLLECTION, request.id), sanitizeData(request));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Update a refund request (e.g. status).
 */
export async function updateRefundRequest(id: string, updates: Partial<RefundRequest>): Promise<void> {
  const path = `${REFUND_REQUESTS_COLLECTION}/${id}`;
  try {
    await updateDoc(doc(db, REFUND_REQUESTS_COLLECTION, id), sanitizeData(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Delete a refund request.
 */
export async function deleteRefundRequest(id: string): Promise<void> {
  const path = `${REFUND_REQUESTS_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, REFUND_REQUESTS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribe to realtime updates for refund requests.
 */
export function subscribeToRefundRequests(callback: (requests: RefundRequest[]) => void) {
  return onSnapshot(
    collection(db, REFUND_REQUESTS_COLLECTION),
    (snapshot) => {
      const requests: RefundRequest[] = [];
      snapshot.forEach((docSnap) => {
        requests.push(docSnap.data() as RefundRequest);
      });
      const sorted = requests.sort((a, b) => String(b?.createdAt || '').localeCompare(String(a?.createdAt || '')));
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('pancaran_refund_requests_cache', JSON.stringify(sorted)); } catch (e) {}
      }
      callback(sorted);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, REFUND_REQUESTS_COLLECTION);
      let fallback: RefundRequest[] = [];
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('pancaran_refund_requests_cache');
          if (cached) fallback = JSON.parse(cached);
        } catch (e) {}
      }
      callback(fallback);
    }
  );
}

// ==========================================
// WHATSAPP SESSION & TEMPLATE PERSISTENCE
// ==========================================
const WA_SESSIONS_COLLECTION = 'wa_sessions';
const WA_TEMPLATES_COLLECTION = 'wa_templates';

export const INITIAL_WA_TEMPLATES: WaTemplateData[] = [
  {
    id: 'tpl_lelang_baru',
    name: 'Pengumuman Lelang Unit Baru',
    category: 'Lelang Baru',
    content: `Halo *{name}*, 👋\n\nPancaran Platinum kembali menghadirkan lelang unit kendaraan komersial pilihan dengan harga penawaran awal yang sangat kompetitif!\n\n🚛 *Spesifikasi Unit Terbuka:*\n• *Nama Unit:* [NAMA_UNIT]\n• *Tahun / Kondisi:* [TAHUN] / Ready Unit\n• *Harga Penawaran Awal:* Rp [HARGA_AWAL]\n\nDapatkan unit impian Anda sekarang sebelum masa lelang ditutup.\nKunjungi portal resmi kami untuk mengajukan penawaran:\nhttps://pancaran-platinum.vercel.app/\n\nSalam hangat,\n*Tim Lelang Pancaran Platinum*`
  },
  {
    id: 'tpl_pengingat_lelang',
    name: 'Pengingat Batas Akhir Penawaran',
    category: 'Pengingat',
    content: `Yth. Bapak/Ibu *{name}*, ⏰\n\nMasa penawaran lelang untuk unit kendaraan *[NAMA_UNIT]* akan segera ditutup!\nJangan sampai melewatkan kesempatan emas untuk menjadi pemenang lelang resmi.\n\nGunakan fitur penawaran cepat di portal kami:\nhttps://pancaran-platinum.vercel.app/\n\nHormat kami,\n*Pancaran Platinum Auction Team*`
  },
  {
    id: 'tpl_pemenang_sah',
    name: 'Pengumuman Pemenang Lelang Sah',
    category: 'Pemenang',
    content: `Selamat kepada Bapak/Ibu *{name}*! 🎉🏆\n\nBerdasarkan hasil penutupan lelang resmi Pancaran Platinum, Anda dinyatakan sebagai *PEMENANG RESMI* untuk unit *[NAMA_UNIT]*.\n\nSurat Keputusan Lelang Resmi telah dikirimkan ke Kotak Masuk (Inbox) akun Anda di portal.\nTim admin kami akan segera menghubungi Anda untuk koordinasi proses serah terima dan penyelesaian administrasi.\n\nTerima kasih atas partisipasi Anda!\n*Pancaran Platinum*`
  },
  {
    id: 'tpl_konfirmasi_survei',
    name: 'Konfirmasi Jadwal Survei Fisik',
    category: 'Survei Fisik',
    content: `Halo *{name}*, 🚚\n\nPengajuan jadwal survei fisik unit kendaraan Anda telah kami terima dan terkonfirmasi di sistem.\n\n📍 *Lokasi Pool:* Pool Utama Pancaran Platinum\n🕒 *Waktu Survei:* Sesuai konfirmasi jadwal di sistem\n\nSilakan tunjukkan surat konfirmasi survei yang ada di Kotak Masuk (Inbox) portal saat tiba di lokasi pool.\n\nSalam,\n*Tim Layanan Lelang Pancaran Platinum*`
  }
];

/**
 * Save WhatsApp connection status to Firestore
 */
export async function saveWaSessionToFirestore(email: string, status: 'disconnected' | 'connecting' | 'connected', connectedPhone: string): Promise<void> {
  const cleanEmail = (email || 'digital.solution@pancaran-logistic.id').toLowerCase().trim();
  const docKey = cleanEmail.replace(/[^a-z0-9]/g, '_');
  const path = `${WA_SESSIONS_COLLECTION}/${docKey}`;
  const data: WaSessionData = {
    id: docKey,
    email: cleanEmail,
    status,
    connectedPhone,
    updatedAt: new Date().toISOString()
  };
  try {
    await setDoc(doc(db, WA_SESSIONS_COLLECTION, docKey), sanitizeData(data));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Subscribe to realtime WhatsApp session status for a given admin email
 */
export function subscribeToWaSession(email: string, callback: (session: WaSessionData | null) => void) {
  const cleanEmail = (email || 'digital.solution@pancaran-logistic.id').toLowerCase().trim();
  const docKey = cleanEmail.replace(/[^a-z0-9]/g, '_');
  return onSnapshot(
    doc(db, WA_SESSIONS_COLLECTION, docKey),
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as WaSessionData);
      } else {
        callback(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${WA_SESSIONS_COLLECTION}/${docKey}`);
      callback(null);
    }
  );
}

/**
 * Save a WhatsApp message template to Firestore
 */
export async function saveWaTemplateToFirestore(template: WaTemplateData): Promise<void> {
  const path = `${WA_TEMPLATES_COLLECTION}/${template.id}`;
  try {
    await setDoc(doc(db, WA_TEMPLATES_COLLECTION, template.id), sanitizeData(template));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a WhatsApp message template from Firestore
 */
export async function deleteWaTemplateFromFirestore(id: string): Promise<void> {
  const path = `${WA_TEMPLATES_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, WA_TEMPLATES_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribe to realtime WhatsApp templates list from Firestore
 */
export function subscribeToWaTemplates(callback: (templates: WaTemplateData[]) => void) {
  return onSnapshot(
    collection(db, WA_TEMPLATES_COLLECTION),
    (snapshot) => {
      const items: WaTemplateData[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as WaTemplateData);
      });
      if (items.length === 0) {
        // Automatically seed default templates if collection is empty
        INITIAL_WA_TEMPLATES.forEach((tpl) => {
          saveWaTemplateToFirestore(tpl);
        });
        callback(INITIAL_WA_TEMPLATES);
      } else {
        callback(items);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, WA_TEMPLATES_COLLECTION);
      callback(INITIAL_WA_TEMPLATES);
    }
  );
}


