import React, { useState, useEffect, useRef } from 'react';
import { Asset, AssetStatus, Bid, AdminUser, ToastNotification, Brand, Category, Condition, RegisteredUser, Series, VehicleColour, FuelType, AttachmentCategory, AttachmentType } from './types';
import { INITIAL_ASSETS, INITIAL_ADMINS } from './data/mockData';
import AdminDashboard from './components/AdminDashboard';
import AdminAssets from './components/AdminAssets';
import AdminUsers from './components/AdminUsers';
import AdminSettings from './components/AdminSettings';
import CatalogView from './components/CatalogView';
import LoginModal from './components/LoginModal';
import { useLanguage } from './components/LanguageContext';

import imageIkutLelang from './assets/images/cara_ikut_lelang_1786088386491.jpg';
import { ExternalNotificationsView, ExternalInboxView } from './components/ExternalViews';
import { AnimatePresence, motion } from 'motion/react';
import { 
  seedDatabaseIfEmpty,
  fetchMasterDataWithCache,
  subscribeToAssets, 
  subscribeToAdmins, 
  subscribeToBrands,
  subscribeToCategories,
  subscribeToConditions,
  subscribeToRegisteredUsers,
  updateRegisteredUser,
  deleteRegisteredUser,
  addBrandToDb,
  deleteBrandFromDb,
  addCategoryToDb,
  deleteCategoryFromDb,
  addConditionToDb,
  deleteConditionFromDb,
  addSeriesToDb,
  deleteSeriesFromDb,
  subscribeToSeries,
  addVehicleColourToDb,
  deleteVehicleColourFromDb,
  subscribeToVehicleColours,
  addFuelTypeToDb,
  deleteFuelTypeFromDb,
  subscribeToFuelTypes,
  addAttachmentCategoryToDb,
  deleteAttachmentCategoryFromDb,
  subscribeToAttachmentCategories,
  addAttachmentTypeToDb,
  deleteAttachmentTypeFromDb,
  subscribeToAttachmentTypes,
  addAssetToDb, 
  updateAssetInDb, 
  deleteAssetFromDb, 
  addBidToAsset, 
  addAdminToDb, 
  deleteAdminFromDb,
  triggerAppsScriptSync,
  subscribeToNotifications,
  addNotificationToDb,
  deleteNotificationFromDb,
  clearAllNotificationsInDb,
  markNotificationReadInDb,
  markAllNotificationsReadInDb
} from './firebase';
import { 
  Shield, 
  Users, 
  Truck, 
  TrendingUp, 
  LogOut, 
  LogIn, 
  LayoutDashboard, 
  PlusCircle, 
  UserCheck, 
  ChevronRight,
  MapPin,
  Menu,
  X,
  Globe,
  Mail,
  Phone,
  RefreshCw,
  Bell,
  CheckCircle,
  AlertCircle,
  Trash2,
  Settings,
  ShieldCheck,
  Layers,
  Award
} from 'lucide-react';

export default function App() {
  const { language, setLanguage, t } = useLanguage();
  // 1. Core States
  const [role, setRole] = useState<'external' | 'internal'>('external');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [loggedInAdminEmail, setLoggedInAdminEmail] = useState('');
  
  // External registered user states
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [loggedInUserEmail, setLoggedInUserEmail] = useState('');
  const [loggedInUserName, setLoggedInUserName] = useState('');
  const [loggedInUserPhone, setLoggedInUserPhone] = useState('');
  
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedGuideModal, setSelectedGuideModal] = useState<'ikut' | 'titip' | 'online' | null>(null);
  
  // Navigation inside Admin area
  const [adminTab, setAdminTab] = useState<'dashboard' | 'assets' | 'users' | 'settings'>('dashboard');
  
  // Navigation inside External area
  const [externalTab, setExternalTab] = useState<'catalog' | 'notifications' | 'inbox'>('catalog');
  
  // Mobile menu toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Database States (pre-seeded from mockData and stored in localStorage)
  const [assets, setAssets] = useState<Asset[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>(INITIAL_ADMINS);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [vehicleColours, setVehicleColours] = useState<VehicleColour[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [attachmentCategories, setAttachmentCategories] = useState<AttachmentCategory[]>([]);
  const [attachmentTypes, setAttachmentTypes] = useState<AttachmentType[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  
  // Selected asset for highlighting or detailed specs in AdminAssets
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Spreadsheet Sync States
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  // Toast notifications state
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  // Persistent notification history list
  const [notificationHistory, setNotificationHistory] = useState<ToastNotification[]>(() => {
    try {
      const stored = localStorage.getItem('pancaran_notification_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((item: any) => ({
          ...item,
          read: item.read !== undefined ? item.read : false,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch (e) {
      console.error("Failed to load notifications history", e);
    }
    return [];
  });

  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Synchronize unread count with notification history
  useEffect(() => {
    const count = notificationHistory.filter(n => !n.read).length;
    setUnreadCount(count);
    localStorage.setItem('pancaran_unread_notif_count', String(count));
  }, [notificationHistory]);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [bookingCancelConfirmId, setBookingCancelConfirmId] = useState<string | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Tracking refs to identify real-time changes
  const assetsLoadedRef = useRef(false);
  const prevAssetsRef = useRef<Asset[]>([]);
  const adminsLoadedRef = useRef(false);
  const prevAdminsRef = useRef<AdminUser[]>([]);
  const registeredUsersLoadedRef = useRef(false);
  const prevRegisteredUsersRef = useRef<RegisteredUser[]>([]);

  const formatIDR = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const addNotification = (type: 'info' | 'success' | 'warning' | 'bid' | 'sync', title: string, message: string, assetId?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotif: ToastNotification = { id, type, title, message, timestamp: new Date(), assetId, read: false };
    setNotifications(prev => [newNotif, ...prev].slice(0, 5));
    
    // Save to persistent notification history in Firestore
    addNotificationToDb(newNotif);

    // Auto remove toast after 6 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 6000);
  };

  const handleOpenNotifications = () => {
    setIsNotifOpen(!isNotifOpen);
  };

  const handleClearNotifications = async () => {
    setNotificationHistory([]);
    localStorage.removeItem('pancaran_notification_history');
    await clearAllNotificationsInDb();
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotificationHistory(prev => {
      const updated = prev.filter(n => n.id !== id);
      localStorage.setItem('pancaran_notification_history', JSON.stringify(updated));
      return updated;
    });
    await deleteNotificationFromDb(id);
  };

  const handleCancelBookingSchedule = async (assetId: string, bidId: string, bypassConfirm: boolean = false) => {
    if (!bypassConfirm && !window.confirm(t('Apakah Anda yakin ingin membatalkan jadwal booking survei ini?'))) {
      return;
    }

    const targetAsset = assets.find(a => a.id === assetId);
    if (!targetAsset) return;

    const updatedBids = (targetAsset.bids || []).map(b => {
      if (b.id === bidId) {
        // Clear schedule survey info
        const updatedBid = { ...b };
        delete updatedBid.scheduleSurveyDate;
        delete updatedBid.scheduleSurveyTime;
        return updatedBid;
      }
      return b;
    });

    const highestBid = updatedBids.length > 0
      ? Math.max(...updatedBids.map(b => b.price), targetAsset.startingPrice)
      : targetAsset.startingPrice;

    // Optimistic local state update
    setAssets(prev => prev.map(a => {
      if (a.id === assetId) {
        return {
          ...a,
          bids: updatedBids,
          highestBid: highestBid
        };
      }
      return a;
    }));

    try {
      await updateAssetInDb(assetId, { bids: updatedBids, highestBid: highestBid });
      addNotification(
        'info',
        t('Jadwal Survei Dibatalkan'),
        `${t('Jadwal kunjungan telah dibatalkan.')}`,
        assetId
      );
    } catch (error) {
      console.warn("Firebase offline or error, saved locally:", error);
    }
  };

  const [notifTab, setNotifTab] = useState<'logs' | 'bookings'>('logs');

  const handleMarkAllNotificationsAsRead = async () => {
    setNotificationHistory(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem('pancaran_notification_history', JSON.stringify(updated));
      return updated;
    });
    await markAllNotificationsReadInDb();
  };

  const handleNotificationClick = async (notif: ToastNotification) => {
    // Mark as read
    setNotificationHistory(prev => {
      const updated = prev.map(n => n.id === notif.id ? { ...n, read: true } : n);
      localStorage.setItem('pancaran_notification_history', JSON.stringify(updated));
      return updated;
    });
    await markNotificationReadInDb(notif.id);

    if (notif.assetId) {
      if (isAdminLoggedIn) {
        setRole('internal');
        setAdminTab('assets');
        setSelectedAssetId(notif.assetId);
      } else {
        setRole('external');
        setSelectedAssetId(notif.assetId);
      }
      setIsNotifOpen(false);
    }
  };

  const getBookingsList = () => {
    const list: Array<{
      assetId: string;
      assetName: string;
      assetBrand: string;
      bidId: string;
      name: string;
      email: string;
      contact: string;
      price: number;
      date: string;
      time: string;
      timestamp: string;
    }> = [];
    assets.forEach(asset => {
      if (asset.bids) {
        asset.bids.forEach(bid => {
          if (bid.scheduleSurveyDate) {
            list.push({
              assetId: asset.id,
              assetName: asset.name,
              assetBrand: asset.brand,
              bidId: bid.id,
              name: bid.name,
              email: bid.email,
              contact: bid.contact,
              price: bid.price,
              date: bid.scheduleSurveyDate,
              time: bid.scheduleSurveyTime || '09:00',
              timestamp: bid.timestamp
            });
          }
        });
      }
    });
    return list.sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());
  };

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncMessage(t('Sedang menyinkronkan...'));
    try {
      await triggerAppsScriptSync();
      setSyncMessage(t('Berhasil disinkronkan!'));
      addNotification('sync', t('Spreadsheet Sync'), t('Sinkronisasi Google Spreadsheet berhasil diselesaikan.'));
      setTimeout(() => setSyncMessage(''), 3000);
    } catch (error) {
      setSyncMessage(t('Gagal sinkronisasi.'));
      addNotification('warning', t('Spreadsheet Sync'), t('Gagal sinkronisasi dengan Google Spreadsheet.'));
      setTimeout(() => setSyncMessage(''), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Initialize data and hook up Firebase subscription
  useEffect(() => {
    let unsubscribeAssets: (() => void) | null = null;
    let unsubscribeAdmins: (() => void) | null = null;
    let unsubscribeRegisteredUsers: (() => void) | null = null;
    let unsubscribeNotifications: (() => void) | null = null;

    // Load master data with aggressive local storage caching to minimize reads
    fetchMasterDataWithCache().then((master) => {
      if (master) {
        if (master.brands) setBrands(master.brands);
        if (master.categories) setCategories(master.categories);
        if (master.conditions) setConditions(master.conditions);
        if (master.series) setSeriesList(master.series);
        if (master.vehicleColours) setVehicleColours(master.vehicleColours);
        if (master.fuelTypes) setFuelTypes(master.fuelTypes);
        if (master.attachmentCategories) setAttachmentCategories(master.attachmentCategories);
        if (master.attachmentTypes) setAttachmentTypes(master.attachmentTypes);
      }
    });

    // Seed default records if empty (fast status check), then subscribe to core dynamic collections
    seedDatabaseIfEmpty().then(() => {
      unsubscribeNotifications = subscribeToNotifications((updatedNotifs) => {
        if (updatedNotifs) {
          setNotificationHistory(updatedNotifs);
          try {
            localStorage.setItem('pancaran_notification_history', JSON.stringify(updatedNotifs));
          } catch (e) {
            console.error("Failed to save notifications to localStorage:", e);
          }
        }
      });

      unsubscribeAssets = subscribeToAssets((updatedAssets) => {
        if (updatedAssets) {
          const sortedAssets = [...updatedAssets].sort((a, b) => b.id.localeCompare(a.id));
          setAssets(sortedAssets);

          // Real-time comparison for notifications
          if (!assetsLoadedRef.current) {
            prevAssetsRef.current = sortedAssets;
            assetsLoadedRef.current = true;
          } else {
            const prevAssets = prevAssetsRef.current;
            
            // 1. Detect additions or changes
            sortedAssets.forEach(asset => {
              const prevAsset = prevAssets.find(a => a.id === asset.id);
              
              if (!prevAsset) {
                // New Asset
                addNotification(
                  'success',
                  t('Armada Baru Terdaftar'),
                  `${asset.brand} ${asset.name} (${asset.id}) ${t('telah terdaftar di katalog.')}`,
                  asset.id
                );
              } else {
                // Check if bids increased
                if (asset.bids.length > prevAsset.bids.length) {
                  // Find new bids
                  const newBids = asset.bids.filter(b => !prevAsset.bids.some(pb => pb.id === b.id || pb.timestamp === b.timestamp));
                  newBids.forEach(bid => {
                    let surveyDetail = '';
                    if (bid.scheduleSurveyDate) {
                      surveyDetail = ` & ${t('booking jadwal survei')} ${bid.scheduleSurveyDate} @ ${bid.scheduleSurveyTime || '09:00'} WIB`;
                    }
                    addNotification(
                      'bid',
                      t('Penawaran Baru Masuk'),
                      `${bid.name} ${t('menawar')} ${formatIDR(bid.price)} ${t('untuk')} ${asset.brand} ${asset.name}${surveyDetail}`,
                      asset.id
                    );
                  });
                }

                // Check if any bid's schedule survey date or time changed (booking schedule updates!)
                asset.bids.forEach(bid => {
                  const prevBid = prevAsset.bids.find(pb => pb.id === bid.id);
                  if (prevBid) {
                    const dateChanged = bid.scheduleSurveyDate !== prevBid.scheduleSurveyDate;
                    const timeChanged = bid.scheduleSurveyTime !== prevBid.scheduleSurveyTime;
                    if (dateChanged || timeChanged) {
                      if (bid.scheduleSurveyDate) {
                        addNotification(
                          'success',
                          t('Jadwal Survei Diperbarui'),
                          `${t('Jadwal kunjungan')} ${bid.name} ${t('diperbarui menjadi')} ${bid.scheduleSurveyDate} @ ${bid.scheduleSurveyTime || '09:00'} WIB (${asset.brand} ${asset.name})`,
                          asset.id
                        );
                      } else {
                        addNotification(
                          'warning',
                          t('Jadwal Survei Dibatalkan'),
                          `${t('Jadwal kunjungan')} ${bid.name} ${t('telah dibatalkan.')}`,
                          asset.id
                        );
                      }
                    }
                  }
                });
                
                // Check if status changed
                if (asset.status !== prevAsset.status) {
                  addNotification(
                    'info',
                    t('Status Unit Diperbarui'),
                    `Unit ${asset.brand} ${asset.name} (${asset.id}) ${t('sekarang berstatus')} ${asset.status === 'Open' ? t('Buka / Aktif') : t('Sold / Terjual')}`,
                    asset.id
                  );
                }
                
                // Check if price or other main details changed (excluding bids and status)
                const priceChanged = asset.startingPrice !== prevAsset.startingPrice;
                const condChanged = asset.condition !== prevAsset.condition;
                if (priceChanged || condChanged) {
                  addNotification(
                    'info',
                    t('Spesifikasi Diperbarui'),
                    `${t('Informasi unit')} ${asset.id} (${asset.brand} ${asset.name}) ${t('telah diperbarui.')}`,
                    asset.id
                  );
                }
              }
            });

            // 2. Detect deletions
            prevAssets.forEach(prevAsset => {
              const stillExists = sortedAssets.some(a => a.id === prevAsset.id);
              if (!stillExists) {
                addNotification(
                  'warning',
                  t('Unit Dihapus'),
                  `${t('Unit')} ${prevAsset.brand} ${prevAsset.name} (${prevAsset.id}) ${t('telah dihapus dari sistem.')}`,
                  prevAsset.id
                );
              }
            });

            // Keep the previous reference updated
            prevAssetsRef.current = sortedAssets;
          }
        }
      });

      unsubscribeAdmins = subscribeToAdmins((updatedAdmins) => {
        if (updatedAdmins && updatedAdmins.length > 0) {
          setAdmins(updatedAdmins);

          // Real-time comparison for admin changes
          if (!adminsLoadedRef.current) {
            prevAdminsRef.current = updatedAdmins;
            adminsLoadedRef.current = true;
          } else {
            const prevAdmins = prevAdminsRef.current;

            // Detect new admin
            updatedAdmins.forEach(adm => {
              const exists = prevAdmins.some(pa => pa.email === adm.email);
              if (!exists) {
                addNotification(
                  'success',
                  t('Admin Baru Terdaftar'),
                  `${adm.name} (${adm.email}) ${t('sekarang memiliki hak akses.')}`
                );
              }
            });

            // Detect deleted admin
            prevAdmins.forEach(pa => {
              const exists = updatedAdmins.some(adm => adm.email === pa.email);
              if (!exists) {
                addNotification(
                  'warning',
                  t('Akses Admin Dicabut'),
                  `${t('Akses untuk')} ${pa.email} ${t('telah dihapus.')}`
                );
              }
            });

            prevAdminsRef.current = updatedAdmins;
          }
        }
      });

      unsubscribeRegisteredUsers = subscribeToRegisteredUsers((updatedUsers) => {
        if (updatedUsers) {
          setRegisteredUsers(updatedUsers);

          if (!registeredUsersLoadedRef.current) {
            prevRegisteredUsersRef.current = updatedUsers;
            registeredUsersLoadedRef.current = true;
          } else {
            const prevUsers = prevRegisteredUsersRef.current;

            updatedUsers.forEach(user => {
              const prevUser = prevUsers.find(pu => pu.email === user.email);
              if (user.status === 'Menunggu Persetujuan' && (!prevUser || prevUser.status !== 'Menunggu Persetujuan')) {
                addNotification(
                  'info',
                  t('Persetujuan Registrasi Baru'),
                  `${user.name} (${user.email}) ${t('menunggu persetujuan akses.')}`
                );
              }
            });

            prevRegisteredUsersRef.current = updatedUsers;
          }
        }
      });
    }).catch((err) => {
      console.warn("Firestore connection is offline or unavailable. Operating with local database.", err);
    });

    const storedSession = localStorage.getItem('pancaran_session_email');
    const storedSessionType = localStorage.getItem('pancaran_session_type');
    const storedSessionName = localStorage.getItem('pancaran_session_name') || '';
    const storedSessionPhone = localStorage.getItem('pancaran_session_phone') || '';

    if (storedSession) {
      if (storedSessionType === 'user') {
        setIsUserLoggedIn(true);
        setLoggedInUserEmail(storedSession);
        setLoggedInUserName(storedSessionName);
        setLoggedInUserPhone(storedSessionPhone);
      } else {
        setIsAdminLoggedIn(true);
        setLoggedInAdminEmail(storedSession);
      }
    }

    return () => {
      if (unsubscribeAssets) unsubscribeAssets();
      if (unsubscribeAdmins) unsubscribeAdmins();
      if (unsubscribeRegisteredUsers) unsubscribeRegisteredUsers();
      if (unsubscribeNotifications) unsubscribeNotifications();
    };
  }, []);

  // 2. Business Actions (Admin Operations via Firestore)
  
  // Input Asset (Input Asset flow in Asset branch)
  const handleAddAsset = async (newAssetData: Omit<Asset, 'id' | 'bids' | 'highestBid'>) => {
    const finalId = `PL-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const newAsset: Asset = {
      ...newAssetData,
      id: finalId,
      highestBid: newAssetData.startingPrice,
      bids: []
    };

    // Optimistic / Local update in case Firestore is offline
    setAssets(prev => [newAsset, ...prev]);

    try {
      await addAssetToDb({
        ...newAssetData,
        id: finalId,
        highestBid: newAssetData.startingPrice,
        bids: []
      });
    } catch (error) {
      console.warn("Firebase offline or error, saved locally:", error);
    }
  };

  // Update Asset (Edit specs/attributes)
  const handleUpdateAsset = async (assetId: string, updatedAsset: Partial<Asset>) => {
    // Optimistic update
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, ...updatedAsset } : a));

    try {
      await updateAssetInDb(assetId, updatedAsset);
    } catch (error) {
      console.warn("Firebase offline or error, saved locally:", error);
    }
  };

  // Update Asset Status (Open / Sold toggle)
  const handleUpdateAssetStatus = async (assetId: string, status: AssetStatus) => {
    // Optimistic update
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status } : a));

    try {
      await updateAssetInDb(assetId, { status });
    } catch (error) {
      console.warn("Firebase offline or error, saved locally:", error);
    }
  };

  // Delete Asset
  const handleDeleteAsset = async (assetId: string) => {
    // Optimistic update
    setAssets(prev => prev.filter(a => a.id !== assetId));
    setSelectedAssetId(null);

    try {
      await deleteAssetFromDb(assetId);
    } catch (error) {
      console.warn("Firebase offline or error, saved locally:", error);
    }
  };

  // Create Access / User Management (Create access flow)
  const handleAddAdmin = async (newAdmin: AdminUser) => {
    setAdmins(prev => [...prev.filter(a => a.email !== newAdmin.email), newAdmin]);

    try {
      await addAdminToDb(newAdmin);
    } catch (error) {
      console.warn("Firebase offline or error, saved locally:", error);
    }
  };

  const handleDeleteAdmin = async (email: string) => {
    setAdmins(prev => prev.filter(a => a.email !== email));

    try {
      await deleteAdminFromDb(email);
    } catch (error) {
      console.warn("Firebase offline or error, saved locally:", error);
    }
  };

  const handleApproveUser = async (email: string) => {
    try {
      await updateRegisteredUser(email, { status: 'Disetujui' });
      addNotification('success', t('Pendaftaran Disetujui'), `${t('User')} ${email} ${t('telah disetujui untuk mengakses lelang.')}`);
    } catch (error) {
      console.error("Failed to approve user", error);
      addNotification('warning', t('Gagal Menyetujui'), `${t('Gagal menyetujui user')} ${email}`);
    }
  };

  const handleRejectUser = async (email: string) => {
    try {
      await updateRegisteredUser(email, { status: 'Ditolak' });
      addNotification('warning', t('Pendaftaran Ditolak'), `${t('User')} ${email} ${t('telah ditolak.')}`);
    } catch (error) {
      console.error("Failed to reject user", error);
      addNotification('warning', t('Gagal Menolak'), `${t('Gagal menolak user')} ${email}`);
    }
  };

  const handleDeleteRegisteredUser = async (email: string) => {
    try {
      await deleteRegisteredUser(email);
      addNotification('info', t('User Dihapus'), `${t('User')} ${email} ${t('telah dihapus dari sistem.')}`);
    } catch (error) {
      console.error("Failed to delete user", error);
      addNotification('warning', t('Gagal Menghapus'), `${t('Gagal menghapus user')} ${email}`);
    }
  };

  const handleToggleUserBiddingAccess = async (email: string, canBid: boolean) => {
    try {
      await updateRegisteredUser(email, { canBid });
      const targetUser = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      const displayName = targetUser ? targetUser.name : email;
      addNotification(
        'info',
        t('Akses Bidding Diperbarui'),
        `Akses bidding untuk ${displayName} diubah menjadi: ${canBid ? t('Bisa Menawar') : t('Hanya Lihat')}.`
      );
    } catch (error) {
      console.error("Failed to update bidding access", error);
      addNotification('warning', t('Gagal Mengubah Akses'), `${t('Gagal mengubah akses bidding user')} ${email}`);
    }
  };

  // 3. Business Actions (External Operations)

  // Input Bid Price & Input Time Survey
  const handlePlaceBid = async (assetId: string, bidData: Omit<Bid, 'id' | 'timestamp'>) => {
    const nextBidId = `B-${Math.floor(100 + Math.random() * 900)}`;
    const newBid: Bid = {
      ...bidData,
      id: nextBidId,
      timestamp: new Date().toISOString()
    };

    // Optimistic update
    setAssets(prev => prev.map(a => {
      if (a.id === assetId) {
        const updatedBids = [...(a.bids || []), newBid];
        const highestBid = updatedBids.length > 0
          ? Math.max(...updatedBids.map(b => b.price), a.startingPrice)
          : a.startingPrice;
        return {
          ...a,
          bids: updatedBids,
          highestBid: highestBid
        };
      }
      return a;
    }));

    try {
      await addBidToAsset(assetId, newBid);
    } catch (error) {
      console.warn("Firebase offline or error, saved locally:", error);
    }
  };

  // 4. Session & Authentication handlers
  const handleLoginSuccess = (email: string) => {
    setIsAdminLoggedIn(true);
    setLoggedInAdminEmail(email);
    localStorage.setItem('pancaran_session_email', email);
    localStorage.setItem('pancaran_session_type', 'admin');
    setRole('internal'); // Switch to internal dashboard on login
    setAdminTab('dashboard');
  };

  const handleExternalLoginSuccess = (email: string, name: string, phone?: string) => {
    setIsUserLoggedIn(true);
    setLoggedInUserEmail(email);
    setLoggedInUserName(name);
    setLoggedInUserPhone(phone || '');
    localStorage.setItem('pancaran_session_email', email);
    localStorage.setItem('pancaran_session_type', 'user');
    localStorage.setItem('pancaran_session_name', name);
    if (phone) {
      localStorage.setItem('pancaran_session_phone', phone);
    } else {
      localStorage.removeItem('pancaran_session_phone');
    }
    setRole('external');
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    setLoggedInAdminEmail('');
    setIsUserLoggedIn(false);
    setLoggedInUserEmail('');
    setLoggedInUserName('');
    setLoggedInUserPhone('');
    localStorage.removeItem('pancaran_session_email');
    localStorage.removeItem('pancaran_session_type');
    localStorage.removeItem('pancaran_session_name');
    localStorage.removeItem('pancaran_session_phone');
    setRole('external'); // Redirect back to external catalog on logout
    setExternalTab('catalog'); // Reset external tab
  };

  const handleSelectAssetAndSwitchTab = (assetId: string) => {
    setSelectedAssetId(assetId);
    setAdminTab('assets');
  };

  const matchedAdmin = admins.find(a => a.email.toLowerCase() === loggedInAdminEmail.toLowerCase());
  const adminName = matchedAdmin ? matchedAdmin.name : 'Admin Digital Solution';
  const adminRole = matchedAdmin ? matchedAdmin.role : 'Super Admin';

  const getLoggedInUserEmail = () => {
    return isUserLoggedIn ? loggedInUserEmail : (isAdminLoggedIn ? loggedInAdminEmail : '');
  };
  const activeUserEmail = getLoggedInUserEmail().toLowerCase();

  // Helper to get won assets
  const winningAssets = activeUserEmail ? assets.filter(asset => {
    if (asset.status !== 'Sold') return false;
    if (!asset.bids || asset.bids.length === 0) return false;
    const highestBid = asset.bids.reduce((prev, current) => (prev.price > current.price) ? prev : current);
    return highestBid.email.toLowerCase() === activeUserEmail;
  }) : [];

  const externalInboxCount = winningAssets.length;

  // Let's also compute the outbid notifications for the badge count
  const outbidCount = activeUserEmail ? assets.filter(asset => {
    if (asset.status !== 'Open') return false;
    if (!asset.bids || asset.bids.length === 0) return false;
    
    // Check if user has bid on this asset
    const userBids = asset.bids.filter(b => b.email.toLowerCase() === activeUserEmail);
    if (userBids.length === 0) return false;

    const highestBid = [...asset.bids].sort((a, b) => b.price - a.price)[0];
    const userHighestBid = [...userBids].sort((a, b) => b.price - a.price)[0];

    return highestBid.email.toLowerCase() !== activeUserEmail && userHighestBid.price < highestBid.price;
  }).length : 0;

  const externalNotificationsCount = outbidCount + winningAssets.length;

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans" id="app-root-wrapper">
      
      {/* Sleek, Sticky Header / Navigation with a premium dark blue and light blue color harmony */}
      <header 
        className="sticky top-0 z-40 shadow-lg text-white border-b border-blue-500/20 bg-gradient-to-r from-slate-950 via-blue-950 to-slate-950"
        id="main-navigation-header"
      >
        {/* Glow Container to prevent overflow issues of absolute elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-b-xl" id="header-glows-container">
          {/* Soft, multi-layered light blue and cyan ambient glows */}
          <div className="absolute -top-10 left-1/4 w-96 h-20 bg-blue-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '6s' }}></div>
          <div className="absolute -bottom-10 right-1/4 w-80 h-16 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '4s' }}></div>
        </div>
        
        {/* Glowing light blue bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-400/80 to-transparent"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex justify-between h-16 items-center">
            
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center shadow-md shadow-blue-500/10 overflow-hidden">
                <img 
                  src="https://lh3.googleusercontent.com/d/1LmpjB5qAX8ev5_JRzYQDwjM58RxHl18X" 
                  alt="Pancaran Logo" 
                  className="w-full h-full object-contain p-0.5"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = "https://drive.google.com/uc?export=download&id=1LmpjB5qAX8ev5_JRzYQDwjM58RxHl18X";
                  }}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-lg tracking-tight">
                  <span className="bg-gradient-to-r from-slate-100 via-slate-300 to-slate-100 bg-clip-text text-transparent font-extrabold drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">PLATINUM</span>
                </span>
              </div>
            </div>

            {/* Desktop Navigation Toggles */}
            <div className="hidden md:flex items-center gap-8">
              
              {/* Role Switchers */}
              {isAdminLoggedIn && (
                <div className="flex items-center gap-6 text-sm font-medium">
                  <button
                    onClick={() => setRole('external')}
                    className={`pb-1 transition-all flex items-center justify-center relative ${
                      role === 'external'
                        ? 'text-blue-300 font-bold drop-shadow-[0_0_6px_rgba(147,197,253,0.3)]'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    id="tab-external-catalog"
                    title={t('Katalog Eksternal')}
                  >
                    <Globe className="w-5 h-5 mr-1" />
                    {role === 'external' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.8)]"></span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (isAdminLoggedIn) {
                        setRole('internal');
                      } else {
                        setIsLoginModalOpen(true);
                      }
                    }}
                    className={`pb-1 transition-all flex items-center justify-center relative ${
                      role === 'internal'
                        ? 'text-blue-300 font-bold drop-shadow-[0_0_6px_rgba(147,197,253,0.3)]'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    id="tab-internal-admin"
                    title={t('Area Admin Internal')}
                  >
                    <Shield className="w-5 h-5 mr-1" />
                    {role === 'internal' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.8)]"></span>
                    )}
                  </button>
                </div>
              )}

              {/* Desktop Language Selector */}
              <div className="flex bg-blue-950/40 p-0.5 rounded-lg border border-blue-800/40 shadow-inner">
                <button
                  onClick={() => setLanguage('id')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                    language === 'id' 
                      ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow shadow-blue-500/20' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ID
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                    language === 'en' 
                      ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow shadow-blue-500/20' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  EN
                </button>
              </div>

              {/* Notification Popover */}
              {isAdminLoggedIn && (
                <div ref={notifRef} className="relative">
                  <button
                    onClick={handleOpenNotifications}
                    className="p-1.5 hover:bg-slate-800/80 text-slate-300 hover:text-white rounded-lg transition-colors border border-transparent hover:border-slate-700/50 relative cursor-pointer flex items-center justify-center"
                    title={t('Notifikasi Terkini')}
                  >
                    <Bell className={`w-4.5 h-4.5 ${unreadCount > 0 ? 'text-amber-400 animate-pulse' : ''}`} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[8px] font-extrabold px-1 py-0.5 rounded-full min-w-4 text-center leading-none">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown Panel */}
                  <AnimatePresence>
                    {isNotifOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2.5 w-80 bg-white rounded-2xl border border-slate-200/80 shadow-2xl z-50 overflow-hidden font-sans text-slate-800"
                      >
                        <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Bell className="w-4 h-4 text-blue-600" />
                            <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">{t('Notifikasi Terkini')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {notifTab === 'logs' && notificationHistory.some(n => !n.read) && (
                              <button
                                onClick={handleMarkAllNotificationsAsRead}
                                className="text-[10px] text-blue-600 hover:text-blue-800 font-bold transition-colors uppercase cursor-pointer"
                              >
                                {t('Tandai Dibaca')}
                              </button>
                            )}
                            {notifTab === 'logs' && notificationHistory.length > 0 && (
                              <button
                                onClick={handleClearNotifications}
                                className="text-[10px] text-slate-400 hover:text-rose-500 font-bold transition-colors uppercase cursor-pointer ml-1"
                              >
                                {t('Bersihkan')}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Tab Switcher */}
                        <div className="flex border-b border-slate-100 bg-slate-50 p-1">
                          <button
                            onClick={() => setNotifTab('logs')}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              notifTab === 'logs'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            <span>🔔</span> {t('Log Notifikasi')}
                          </button>
                          <button
                            onClick={() => setNotifTab('bookings')}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              notifTab === 'bookings'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            <span>📅</span> {t('Daftar Booking')} ({getBookingsList().length})
                          </button>
                        </div>

                        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                          {notifTab === 'logs' ? (
                            notificationHistory.length > 0 ? (
                              notificationHistory.map((notif) => (
                                <div 
                                  key={notif.id} 
                                  onClick={() => handleNotificationClick(notif)}
                                  className={`p-3 hover:bg-slate-50/75 transition-colors flex items-start gap-2.5 text-left relative group ${notif.assetId ? 'cursor-pointer' : ''} ${!notif.read ? 'bg-blue-50/30' : ''}`}
                                >
                                  <div className="mt-0.5 shrink-0 relative">
                                    {notif.type === 'bid' && <span className="text-blue-500 text-sm">💰</span>}
                                    {notif.type === 'success' && <span className="text-emerald-500 text-sm">📅</span>}
                                    {notif.type === 'info' && <span className="text-indigo-500 text-sm">ℹ️</span>}
                                    {notif.type === 'warning' && <span className="text-amber-500 text-sm">⚠️</span>}
                                    {notif.type === 'sync' && <span className="text-sky-500 text-sm">🔄</span>}
                                    {!notif.read && (
                                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-0.5 flex-1 min-w-0 pr-5">
                                    <p className={`text-slate-800 text-[11px] leading-tight truncate ${!notif.read ? 'font-black text-slate-900' : 'font-bold'}`}>{notif.title}</p>
                                    <p className={`text-[10px] leading-normal whitespace-normal break-words ${!notif.read ? 'text-slate-950 font-semibold' : 'text-slate-500 font-medium'}`}>{notif.message}</p>
                                    {notif.assetId && (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold mt-1">
                                        {t('Lihat Unit')} &rarr;
                                      </span>
                                    )}
                                    <p className="text-[9px] text-slate-400 font-mono mt-1">
                                      {notif.timestamp ? new Date(notif.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </p>
                                  </div>
                                  <button
                                    onClick={(e) => handleDeleteNotification(notif.id, e)}
                                    className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors cursor-pointer"
                                    title={t('Hapus')}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="py-8 px-4 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5 font-medium">
                                <span className="text-xl">🔔</span>
                                <span>{t('Tidak ada notifikasi baru')}</span>
                              </div>
                            )
                          ) : (
                            /* Bookings Tab */
                            getBookingsList().length > 0 ? (
                              getBookingsList().map((booking) => (
                                <div 
                                  key={booking.bidId}
                                  className="p-3 hover:bg-slate-50/75 transition-colors flex flex-col gap-1.5 text-left border-l-2 border-l-emerald-500/30"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded truncate max-w-[80px]">
                                      {booking.assetId}
                                    </span>
                                    <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                                      📅 {booking.date} @ {booking.time}
                                    </span>
                                  </div>

                                  <div className="space-y-0.5">
                                    <h4 className="font-bold text-slate-800 text-xs truncate leading-tight">
                                      {booking.assetBrand} {booking.assetName}
                                    </h4>
                                    <p className="text-[10px] text-slate-600 font-semibold truncate">
                                      👤 {booking.name} ({booking.contact})
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-medium truncate">
                                      ✉️ {booking.email}
                                    </p>
                                    <p className="text-[10px] text-emerald-600 font-bold font-mono">
                                      💰 {formatIDR(booking.price)}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1.5 pt-1">
                                    <button
                                      onClick={() => {
                                        const mockNotif: ToastNotification = {
                                          id: booking.bidId,
                                          type: 'success',
                                          title: 'View',
                                          message: '',
                                          timestamp: new Date(),
                                          assetId: booking.assetId
                                        };
                                        handleNotificationClick(mockNotif);
                                      }}
                                      className="flex-1 py-1 text-center bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] rounded-lg transition-all cursor-pointer"
                                    >
                                      {t('Lihat Unit')}
                                    </button>
                                    <a
                                      href={`https://wa.me/${booking.contact.replace(/\D/g, '') || '#'}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold text-[9px] rounded-lg transition-all border border-emerald-200/50 flex items-center justify-center gap-0.5"
                                    >
                                      📱 {t('Hubungi')}
                                    </a>
                                    {bookingCancelConfirmId === booking.bidId ? (
                                      <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-200/50">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setBookingCancelConfirmId(null);
                                          }}
                                          className="px-1.5 py-0.5 bg-white text-slate-600 rounded text-[8px] font-bold hover:bg-slate-50 border border-slate-200 cursor-pointer animate-fade-in"
                                        >
                                          {t('Batal')}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCancelBookingSchedule(booking.assetId, booking.bidId, true);
                                            setBookingCancelConfirmId(null);
                                          }}
                                          className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[8px] font-bold cursor-pointer animate-fade-in"
                                        >
                                          {t('Ya')}
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setBookingCancelConfirmId(booking.bidId);
                                        }}
                                        className="px-2 py-1 bg-rose-50 text-rose-500 hover:bg-rose-100 border border-rose-200/50 hover:border-rose-300 font-bold text-[9px] rounded-lg transition-all flex items-center justify-center cursor-pointer"
                                        title={t('Batalkan Booking')}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="py-8 px-4 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5 font-medium">
                                <span className="text-xl">📅</span>
                                <span>{t('Belum ada jadwal booking survei.')}</span>
                              </div>
                            )
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Logged In Info */}
              <div className="flex items-center gap-4">
                {isAdminLoggedIn ? (
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="bg-blue-500/20 text-blue-300 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md border border-blue-500/30 uppercase tracking-wider">
                          {t(adminRole)}
                        </span>
                        <p className="text-white text-xs font-semibold">{adminName}</p>
                      </div>
                      <p className="text-slate-400 text-[10px] truncate max-w-[280px] font-mono mt-0.5">{loggedInAdminEmail}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="p-1.5 hover:bg-slate-800/80 text-slate-400 hover:text-rose-400 rounded-lg transition-colors border border-transparent hover:border-slate-700/50 cursor-pointer"
                      title={t('Keluar')}
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : isUserLoggedIn ? (
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        {(() => {
                          const currentRegUser = registeredUsers.find(u => u.email.toLowerCase() === loggedInUserEmail.toLowerCase());
                          const canBid = currentRegUser ? (currentRegUser.canBid !== false) : true;
                          return canBid ? (
                            <span className="bg-emerald-500/20 text-emerald-300 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md border border-emerald-500/30 uppercase tracking-wider">
                              {t('Bisa Menawar')}
                            </span>
                          ) : (
                            <span className="bg-amber-500/30 text-amber-300 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md border border-amber-500/40 uppercase tracking-wider flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5 text-amber-400" /> {t('Hanya Lihat')}
                            </span>
                          );
                        })()}
                        <p className="text-white text-xs font-semibold">{loggedInUserName}</p>
                      </div>
                      <p className="text-slate-400 text-[10px] truncate max-w-[280px] font-mono mt-0.5">{loggedInUserEmail}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="p-1.5 hover:bg-slate-800/80 text-slate-400 hover:text-rose-400 rounded-lg transition-colors border border-transparent hover:border-slate-700/50 cursor-pointer"
                      title={t('Keluar')}
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md shadow-blue-500/15 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" /> {t('Masuk / Daftar')}
                  </button>
                )}
              </div>

            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              {/* Always visible mobile language switcher */}
              <div className="flex bg-blue-950/40 p-0.5 rounded-lg border border-blue-800/40 shadow-inner">
                <button
                  onClick={() => setLanguage('id')}
                  className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${
                    language === 'id' 
                      ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow shadow-blue-500/20' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ID
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${
                    language === 'en' 
                      ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow shadow-blue-500/20' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  EN
                </button>
              </div>

              {/* Mobile Notification Popover */}
              {isAdminLoggedIn && (
                <div className="relative">
                  <button
                    onClick={handleOpenNotifications}
                    className="p-1 text-slate-300 hover:text-white rounded-lg transition-colors relative cursor-pointer flex items-center justify-center"
                    title={t('Notifikasi Terkini')}
                  >
                    <Bell className={`w-4 h-5 ${unreadCount > 0 ? 'text-amber-400 animate-pulse' : ''}`} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[7px] font-extrabold px-1 rounded-full min-w-3 text-center leading-none">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Mobile Dropdown Panel */}
                  <AnimatePresence>
                    {isNotifOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2.5 w-80 bg-white rounded-2xl border border-slate-200/80 shadow-2xl z-50 overflow-hidden font-sans text-slate-800"
                      >
                        <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Bell className="w-4 h-4 text-blue-600" />
                            <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">{t('Notifikasi Terkini')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {notifTab === 'logs' && notificationHistory.some(n => !n.read) && (
                              <button
                                onClick={handleMarkAllNotificationsAsRead}
                                className="text-[10px] text-blue-600 hover:text-blue-800 font-bold transition-colors uppercase cursor-pointer"
                              >
                                {t('Tandai Dibaca')}
                              </button>
                            )}
                            {notifTab === 'logs' && notificationHistory.length > 0 && (
                              <button
                                onClick={handleClearNotifications}
                                className="text-[10px] text-slate-400 hover:text-rose-500 font-bold transition-colors uppercase cursor-pointer ml-1"
                              >
                                {t('Bersihkan')}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Mobile Tab Switcher */}
                        <div className="flex border-b border-slate-100 bg-slate-50 p-1">
                          <button
                            onClick={() => setNotifTab('logs')}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              notifTab === 'logs'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            <span>🔔</span> {t('Log Notifikasi')}
                          </button>
                          <button
                            onClick={() => setNotifTab('bookings')}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              notifTab === 'bookings'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            <span>📅</span> {t('Daftar Booking')} ({getBookingsList().length})
                          </button>
                        </div>

                        <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                          {notifTab === 'logs' ? (
                            notificationHistory.length > 0 ? (
                              notificationHistory.map((notif) => (
                                <div 
                                  key={notif.id} 
                                  onClick={() => handleNotificationClick(notif)}
                                  className={`p-3 hover:bg-slate-50/75 transition-colors flex items-start gap-2 text-left relative group ${notif.assetId ? 'cursor-pointer' : ''} ${!notif.read ? 'bg-blue-50/30' : ''}`}
                                >
                                  <div className="mt-0.5 shrink-0 relative">
                                    {notif.type === 'bid' && <span className="text-blue-500 text-sm">💰</span>}
                                    {notif.type === 'success' && <span className="text-emerald-500 text-sm">📅</span>}
                                    {notif.type === 'info' && <span className="text-indigo-500 text-sm">ℹ️</span>}
                                    {notif.type === 'warning' && <span className="text-amber-500 text-sm">⚠️</span>}
                                    {notif.type === 'sync' && <span className="text-sky-500 text-sm">🔄</span>}
                                    {!notif.read && (
                                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-0.5 flex-1 min-w-0 pr-5">
                                    <p className={`text-slate-800 text-[11px] leading-tight truncate ${!notif.read ? 'font-black text-slate-900' : 'font-bold'}`}>{notif.title}</p>
                                    <p className={`text-[10px] leading-normal whitespace-normal break-words ${!notif.read ? 'text-slate-950 font-semibold' : 'text-slate-500 font-medium'}`}>{notif.message}</p>
                                    {notif.assetId && (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold mt-1">
                                        {t('Lihat Unit')} &rarr;
                                      </span>
                                    )}
                                    <p className="text-[9px] text-slate-400 font-mono mt-1">
                                      {notif.timestamp ? new Date(notif.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </p>
                                  </div>
                                  <button
                                    onClick={(e) => handleDeleteNotification(notif.id, e)}
                                    className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors cursor-pointer"
                                    title={t('Hapus')}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="py-8 px-4 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5 font-medium">
                                <span className="text-xl">🔔</span>
                                <span>{t('Tidak ada notifikasi baru')}</span>
                              </div>
                            )
                          ) : (
                            /* Bookings Tab */
                            getBookingsList().length > 0 ? (
                              getBookingsList().map((booking) => (
                                <div 
                                  key={booking.bidId}
                                  className="p-3 hover:bg-slate-50/75 transition-colors flex flex-col gap-1.5 text-left border-l-2 border-l-emerald-500/30"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded truncate max-w-[80px]">
                                      {booking.assetId}
                                    </span>
                                    <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                                      📅 {booking.date} @ {booking.time}
                                    </span>
                                  </div>

                                  <div className="space-y-0.5">
                                    <h4 className="font-bold text-slate-800 text-xs truncate leading-tight">
                                      {booking.assetBrand} {booking.assetName}
                                    </h4>
                                    <p className="text-[10px] text-slate-600 font-semibold truncate">
                                      👤 {booking.name} ({booking.contact})
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-medium truncate">
                                      ✉️ {booking.email}
                                    </p>
                                    <p className="text-[10px] text-emerald-600 font-bold font-mono">
                                      💰 {formatIDR(booking.price)}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1.5 pt-1">
                                    <button
                                      onClick={() => {
                                        const mockNotif: ToastNotification = {
                                          id: booking.bidId,
                                          type: 'success',
                                          title: 'View',
                                          message: '',
                                          timestamp: new Date(),
                                          assetId: booking.assetId
                                        };
                                        handleNotificationClick(mockNotif);
                                      }}
                                      className="flex-1 py-1 text-center bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] rounded-lg transition-all cursor-pointer"
                                    >
                                      {t('Lihat Unit')}
                                    </button>
                                    <a
                                      href={`https://wa.me/${booking.contact.replace(/\D/g, '') || '#'}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold text-[9px] rounded-lg transition-all border border-emerald-200/50 flex items-center justify-center gap-0.5"
                                    >
                                      📱 {t('Hubungi')}
                                    </a>
                                    {bookingCancelConfirmId === booking.bidId ? (
                                      <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-200/50">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setBookingCancelConfirmId(null);
                                          }}
                                          className="px-1.5 py-0.5 bg-white text-slate-600 rounded text-[8px] font-bold hover:bg-slate-50 border border-slate-200 cursor-pointer animate-fade-in"
                                        >
                                          {t('Batal')}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCancelBookingSchedule(booking.assetId, booking.bidId, true);
                                            setBookingCancelConfirmId(null);
                                          }}
                                          className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[8px] font-bold cursor-pointer animate-fade-in"
                                        >
                                          {t('Ya')}
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setBookingCancelConfirmId(booking.bidId);
                                        }}
                                        className="px-2 py-1 bg-rose-50 text-rose-500 hover:bg-rose-100 border border-rose-200/50 hover:border-rose-300 font-bold text-[9px] rounded-lg transition-all flex items-center justify-center cursor-pointer"
                                        title={t('Batalkan Booking')}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="py-6 px-4 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5 font-medium">
                                <span className="text-xl">📅</span>
                                <span>{t('Belum ada jadwal booking survei.')}</span>
                              </div>
                            )
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {isAdminLoggedIn && (
                <span className="text-[10px] font-mono font-bold bg-blue-500 text-white px-2 py-1 rounded">
                  {t('Admin Active')}
                </span>
              )}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Panel */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-4 shadow-lg animate-slide-in">
            {/* Language Selection in Mobile */}
            <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500">Language / Bahasa</span>
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setLanguage('id')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    language === 'id' 
                      ? 'bg-blue-600 text-white shadow' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Indonesian
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    language === 'en' 
                      ? 'bg-blue-600 text-white shadow' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {isAdminLoggedIn && (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">{t('Pilih Tampilan')}</p>
                <button
                  onClick={() => { setRole('external'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold ${
                    role === 'external' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t('Katalog Eksternal (Public)')}
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (isAdminLoggedIn) {
                      setRole('internal');
                    } else {
                      setIsLoginModalOpen(true);
                    }
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                    role === 'internal' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Shield className="w-4 h-4" /> {t('Area Admin Internal')}
                </button>
              </div>
            )}

            {role === 'internal' && isAdminLoggedIn && (
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">{t('Menu Admin')}</p>
                <button
                  onClick={() => { setAdminTab('dashboard'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold ${
                    adminTab === 'dashboard' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600'
                  }`}
                >
                  {t('Dashboard Ringkasan')}
                </button>
                <button
                  onClick={() => { setAdminTab('assets'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold ${
                    adminTab === 'assets' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600'
                  }`}
                >
                  {t('Kelola Aset (Tambah & Bids)')}
                </button>
                <button
                  onClick={() => { setAdminTab('users'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold ${
                    adminTab === 'users' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600'
                  }`}
                >
                  <span>{t('Manajemen Akses')}</span>
                  {registeredUsers.filter(u => u.status === 'Menunggu Persetujuan').length > 0 && (
                    <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {registeredUsers.filter(u => u.status === 'Menunggu Persetujuan').length}
                    </span>
                  )}
                </button>


              </div>
            )}

            {role === 'external' && (isUserLoggedIn || isAdminLoggedIn) && (
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">{t('Menu Eksternal')}</p>
                <button
                  onClick={() => { setExternalTab('catalog'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold flex items-center justify-between ${
                    externalTab === 'catalog' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600'
                  }`}
                >
                  <span>{t('Katalog')}</span>
                </button>
                <button
                  onClick={() => { setExternalTab('notifications'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold flex items-center justify-between ${
                    externalTab === 'notifications' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600'
                  }`}
                >
                  <span>{t('Notifikasi Saya')}</span>
                  {externalNotificationsCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {externalNotificationsCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => { setExternalTab('inbox'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold flex items-center justify-between ${
                    externalTab === 'inbox' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600'
                  }`}
                >
                  <span>Inbox / Surat Masuk</span>
                  {externalInboxCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                      {externalInboxCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
              {isAdminLoggedIn ? (
                <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                  <div className="text-xs">
                    <p className="text-[9px] text-slate-400 font-bold">{t('AKUN MASUK:')}</p>
                    <p className="font-mono font-bold text-slate-700 truncate">{loggedInAdminEmail}</p>
                  </div>
                  <button
                    onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                    className="w-full py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" /> {t('Logout Admin')}
                  </button>
                </div>
              ) : isUserLoggedIn ? (
                <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                  <div className="text-xs">
                    <p className="text-[9px] text-slate-400 font-bold">{t('AKUN MASUK:')}</p>
                    <p className="font-bold text-slate-700 truncate">{loggedInUserName}</p>
                    <p className="font-mono text-slate-500 truncate text-[10px]">{loggedInUserEmail}</p>
                  </div>
                  <button
                    onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                    className="w-full py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" /> {t('Logout Akun')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setIsLoginModalOpen(true); setIsMobileMenuOpen(false); }}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" /> {t('Masuk / Daftar')}
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main App Container */}
      {role === 'internal' && isAdminLoggedIn ? (
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          
          {/* Left Sidebar */}
          <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 p-5 flex-col justify-between shrink-0" id="admin-left-sidebar">
            <div className="space-y-6">
              <div>
                <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3">
                  {t('Menu Admin')}
                </h3>
                
                <nav className="flex flex-col gap-1.5">
                  <button
                    onClick={() => setAdminTab('dashboard')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-left transition-all ${
                      adminTab === 'dashboard'
                        ? 'bg-blue-50 text-blue-600 font-bold shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    <span>{t('Dashboard Ringkasan')}</span>
                  </button>

                  <button
                    onClick={() => setAdminTab('assets')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-left transition-all ${
                      adminTab === 'assets'
                        ? 'bg-blue-50 text-blue-600 font-bold shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Truck className="w-4 h-4 shrink-0" />
                    <span>{t('Kelola Aset (Tambah & Bids)')}</span>
                  </button>

                  <button
                    onClick={() => setAdminTab('users')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                      adminTab === 'users'
                        ? 'bg-blue-50 text-blue-600 font-bold shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 shrink-0" />
                      <span>{t('Manajemen Akses')}</span>
                    </div>
                    {registeredUsers.filter(u => u.status === 'Menunggu Persetujuan').length > 0 && (
                      <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {registeredUsers.filter(u => u.status === 'Menunggu Persetujuan').length}
                      </span>
                    )}
                  </button>
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3">
                  {t('Lelang Aktif')}
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">{t('Sedang Berjalan')}</span>
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {assets.filter(a => a.status === 'Open').length}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">{t('Unit Terjual')}</span>
                    <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {assets.filter(a => a.status === 'Sold').length}
                    </span>
                  </li>
                </ul>
              </div>
            </div>


          </aside>

          {/* Main Panel Content */}
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
            <div className="space-y-6">
              {adminTab === 'dashboard' && (
                <AdminDashboard 
                  assets={assets} 
                  onSelectAsset={handleSelectAssetAndSwitchTab} 
                  admins={admins}
                  registeredUsers={registeredUsers}
                />
              )}
              {adminTab === 'assets' && (
                <AdminAssets 
                  assets={assets}
                  brands={brands}
                  categories={categories}
                  conditions={conditions}
                  seriesList={seriesList}
                  vehicleColours={vehicleColours}
                  fuelTypes={fuelTypes}
                  attachmentCategories={attachmentCategories}
                  attachmentTypes={attachmentTypes}
                  selectedAssetId={selectedAssetId}
                  onSelectAsset={setSelectedAssetId}
                  onAddAsset={handleAddAsset}
                  onUpdateAsset={handleUpdateAsset}
                  onUpdateAssetStatus={handleUpdateAssetStatus}
                  onDeleteAsset={handleDeleteAsset}
                />
              )}
              {adminTab === 'users' && (
                <AdminUsers 
                  admins={admins}
                  onAddAdmin={handleAddAdmin}
                  onDeleteAdmin={handleDeleteAdmin}
                  currentAdminEmail={loggedInAdminEmail}
                  registeredUsers={registeredUsers}
                  onApproveUser={handleApproveUser}
                  onRejectUser={handleRejectUser}
                  onDeleteRegisteredUser={handleDeleteRegisteredUser}
                  onToggleBiddingAccess={handleToggleUserBiddingAccess}
                />
              )}
              {adminTab === 'settings' && (
                <AdminSettings 
                  onShowNotification={(msg, type) => {
                    const mappedType = type === 'error' ? 'warning' : type;
                    addNotification(mappedType, type === 'success' ? t('Berhasil') : t('Info'), msg);
                  }}
                />
              )}
            </div>
          </main>

        </div>
      ) : (
        <main className="flex-1 w-full py-8">
          {role === 'external' ? (
            <div className="space-y-6 w-full">
              {/* Desktop Sub-navigation for Logged In External Users */}
              {(isUserLoggedIn || isAdminLoggedIn) && (
                <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex border border-slate-200 bg-white p-1 rounded-2xl shadow-sm max-w-md mx-auto" id="external-navigation-tabs">
                    <button
                      onClick={() => setExternalTab('catalog')}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        externalTab === 'catalog'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span>{t('Katalog')}</span>
                    </button>
                    <button
                      onClick={() => setExternalTab('notifications')}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
                        externalTab === 'notifications'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <span>{t('Notifikasi')}</span>
                      {externalNotificationsCount > 0 && (
                        <span className="absolute top-1.5 right-2 bg-rose-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full leading-none">
                          {externalNotificationsCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setExternalTab('inbox')}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
                        externalTab === 'inbox'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{t('Inbox')}</span>
                      {externalInboxCount > 0 && (
                        <span className="absolute top-1.5 right-2 bg-rose-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full leading-none animate-pulse">
                          {externalInboxCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {externalTab === 'catalog' ? (
                <CatalogView 
                  assets={assets} 
                  onPlaceBid={handlePlaceBid} 
                  selectedAssetId={selectedAssetId}
                  onSelectAsset={setSelectedAssetId}
                  isUserLoggedIn={isUserLoggedIn || isAdminLoggedIn}
                  onOpenLoginModal={() => setIsLoginModalOpen(true)}
                  loggedInUserEmail={isUserLoggedIn ? loggedInUserEmail : loggedInAdminEmail}
                  loggedInUserName={isUserLoggedIn ? loggedInUserName : adminName}
                  loggedInUserPhone={isUserLoggedIn ? loggedInUserPhone : ''}
                  onOpenGuideModal={(guide) => setSelectedGuideModal(guide)}
                  canBid={
                    isAdminLoggedIn
                      ? true
                      : (() => {
                          const user = registeredUsers.find(
                            (u) => u.email.toLowerCase() === loggedInUserEmail.toLowerCase()
                          );
                          return user ? user.canBid !== false : true;
                        })()
                  }
                />
              ) : externalTab === 'notifications' ? (
                <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
                  <ExternalNotificationsView
                    assets={assets}
                    userEmail={isUserLoggedIn ? loggedInUserEmail : loggedInAdminEmail}
                    userName={isUserLoggedIn ? loggedInUserName : adminName}
                    userPhone={isUserLoggedIn ? loggedInUserPhone : ''}
                  />
                </div>
              ) : (
                <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
                  <ExternalInboxView
                    assets={assets}
                    userEmail={isUserLoggedIn ? loggedInUserEmail : loggedInAdminEmail}
                    userName={isUserLoggedIn ? loggedInUserName : adminName}
                    userPhone={isUserLoggedIn ? loggedInUserPhone : ''}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
              <div className="py-24 text-center max-w-md mx-auto space-y-4">
                <Shield className="w-16 h-16 text-blue-500 mx-auto" />
                <h2 className="text-xl font-bold text-slate-800">{t('Otorisasi Diperlukan')}</h2>
                <p className="text-sm text-slate-500 leading-normal">
                  {t('Halaman internal manajemen Pancaran Lelang dilindungi enkripsi. Silakan masuk menggunakan akun kredensial Anda.')}
                </p>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 transition-all"
                >
                  {t('Masuk Sekarang')}
                </button>
              </div>
            </div>
          )}
        </main>
      )}

      {/* Footer */}
      <footer className="relative overflow-hidden text-xs" id="main-application-footer">
        {/* Top Dark Section */}
        <div 
          className="text-slate-300 pt-12 pb-2 relative bg-cover bg-center bg-slate-950"
          style={{ 
            backgroundImage: "linear-gradient(to bottom, rgba(15, 23, 42, 0.96), rgba(3, 7, 18, 0.98)), url('https://lh3.googleusercontent.com/d/1mhiKxfRXG4nzn8A5TRCDVd4WUZCiZ388')" 
          }}
        >
          {/* Soft ambient glowing accents */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none"></div>
          
          {/* Glow Top Border Line */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Main Footer Content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8">
              
              {/* Column 1: Brand & Description */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded flex items-center justify-center shadow overflow-hidden">
                    <img 
                      src="https://lh3.googleusercontent.com/d/1LmpjB5qAX8ev5_JRzYQDwjM58RxHl18X" 
                      alt="Pancaran Logo" 
                      className="w-full h-full object-contain p-0.5"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = "https://drive.google.com/uc?export=download&id=1LmpjB5qAX8ev5_JRzYQDwjM58RxHl18X";
                      }}
                    />
                  </div>
                  <span className="text-white font-bold text-lg tracking-tight">
                    <span className="bg-gradient-to-r from-slate-100 via-slate-300 to-slate-100 bg-clip-text text-transparent font-extrabold drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">PLATINUM</span>
                  </span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
                  {t('Portal resmi likuidasi armada aktif dan alat berat dari ekosistem operasional Pancaran Group. Transparan, tepercaya, dan terintegrasi.')}
                </p>
              </div>

              {/* Column 2: COMPANY INFO */}
              <div className="space-y-4">
                <h3 className="text-white font-bold tracking-wider text-sm uppercase flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-blue-500 rounded-sm shadow-sm shadow-blue-500/50"></span>
                  {t('COMPANY INFO')}
                </h3>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-400 shrink-0 mt-0.5 drop-shadow-[0_0_4px_rgba(96,165,250,0.3)]" />
                  <div className="space-y-1">
                    <p className="text-white font-semibold text-xs">{t('Our Office')}</p>
                    <p className="text-slate-400 text-xs font-medium">{t('Head Office 1 :')}</p>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Jl. Tanah Merdeka No 20A Kalibaru Cilincing Jakarta Utara
                    </p>
                  </div>
                </div>
              </div>

              {/* Column 3: Contact Info & Pools */}
              <div className="space-y-4">
                <h3 className="text-white font-bold tracking-wider text-sm uppercase flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-blue-500 rounded-sm shadow-sm shadow-blue-500/50"></span>
                  {t('HUBUNGI KAMI')}
                </h3>
                <div className="space-y-3">
                  {/* Phone / WhatsApp */}
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 drop-shadow-[0_0_4px_rgba(52,211,153,0.3)]" />
                    <div className="space-y-0.5">
                      <a 
                        href="https://wa.me/6281317469744" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-white font-mono font-bold text-xs hover:text-emerald-400 transition flex items-center gap-1.5 group"
                      >
                        +62 813-1746-9744
                        <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded font-sans font-bold border border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-white transition">WhatsApp</span>
                      </a>
                      <p className="text-emerald-400/90 text-[11px] font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Hotline & Support Lelang
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-blue-400 shrink-0 mt-0.5 drop-shadow-[0_0_4px_rgba(96,165,250,0.3)]" />
                    <div className="space-y-0.5">
                      <a 
                        href="mailto:angga.prahadi@pancaran-logistic.id"
                        className="text-white font-mono font-semibold text-xs hover:text-blue-300 transition"
                      >
                        angga.prahadi@pancaran-logistic.id
                      </a>
                      <p className="text-slate-400 text-[11px] font-medium">(Inland & Logistic Services)</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">{t('Lokasi Pool Inspeksi:')}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-blue-950/60 px-3 py-1 rounded-lg text-[10px] font-bold text-blue-300 border border-blue-800/50 shadow-sm shadow-blue-500/10">{t('Cilincing')}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Wavy transition section (Combines Slate and Multiple Light Blue waves) */}
        <div className="w-full relative select-none pointer-events-none -mt-1 bg-slate-950">
          <svg 
            viewBox="0 0 1440 200" 
            className="w-full h-auto block"
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            {/* Wave 1: Background dark transition to blend seamlessly */}
            <path 
              d="M0 0 L1440 0 L1440 80 Q1080 30 720 100 T0 50 Z" 
              fill="#030712" /* slate-950 */
            />
            {/* Wave 2: Cyan / Blue-300 semi-transparent */}
            <path 
              d="M0 40 Q360 120 720 50 T1440 100 L1440 200 L0 200 Z" 
              fill="#7dd3fc" /* sky-300 */
              opacity="0.3" 
            />
            {/* Wave 3: Light blue / Sky-200 */}
            <path 
              d="M0 65 Q360 145 720 75 T1440 130 L1440 200 L0 200 Z" 
              fill="#bae6fd" /* sky-200 */
              opacity="0.6" 
            />
            {/* Wave 4: Beautiful Soft Light Blue base */}
            <path 
              d="M0 95 Q360 170 720 105 T1440 160 L1440 200 L0 200 Z" 
              fill="#e0f2fe" /* sky-100 */
              opacity="0.9" 
            />
            {/* Wave 5: Clean white / light-sky-50 floor */}
            <path 
              d="M0 120 Q360 190 720 130 T1440 180 L1440 200 L0 200 Z" 
              fill="#f0f9ff" /* sky-5 */
            />
          </svg>

          {/* Floating animated ambient sparkles on the wave */}
          <div className="absolute right-[8%] bottom-[45%] w-2.5 h-2.5 bg-sky-200 rounded-full opacity-60 blur-[0.5px] animate-pulse"></div>
          <div className="absolute right-[15%] bottom-[60%] w-2 h-2 bg-blue-300 rounded-full opacity-45 blur-[0.5px] animate-pulse"></div>
          <div className="absolute right-[22%] bottom-[35%] w-1.5 h-1.5 bg-white rounded-full opacity-70"></div>
          <div className="absolute left-[12%] bottom-[40%] w-2 h-2 bg-sky-300 rounded-full opacity-40 blur-[1px]"></div>
        </div>

        {/* Bottom Copyright Section - Rendered on Light Sky Blue floor */}
        <div className="bg-[#f0f9ff] text-slate-600 py-6 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] font-medium">
              <p className="text-slate-500">
                © 2026 PLATINUM - Pancaran Logistics. {t('Hak Cipta Dilindungi')}.
              </p>
              <div className="flex gap-4">
                <span className="text-slate-600 hover:text-blue-600 transition-colors cursor-pointer font-bold">{t('Syarat & Ketentuan')}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 hover:text-blue-600 transition-colors cursor-pointer font-bold">{t('Kebijakan Privasi')}</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Admin Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        onLoginSuccess={handleLoginSuccess} 
        onExternalLoginSuccess={handleExternalLoginSuccess}
        admins={admins}
      />

      {/* Real-time Toast Notifications in Top Right */}
      <div className="fixed top-6 right-6 z-[9999] pointer-events-none flex flex-col gap-3 max-w-sm w-full">
        <AnimatePresence>
          {notifications.map(notif => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: -20, scale: 0.9, x: 50 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85, x: 100, transition: { duration: 0.2 } }}
              layout
              className="pointer-events-auto bg-slate-950/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-800/80 flex gap-3 items-start overflow-hidden relative group"
            >
              {/* Left Indicator Strip */}
              <div className={`absolute top-0 bottom-0 left-0 w-1 ${
                notif.type === 'success' ? 'bg-emerald-500' :
                notif.type === 'bid' ? 'bg-amber-500' :
                notif.type === 'warning' ? 'bg-rose-500' :
                notif.type === 'sync' ? 'bg-blue-500' :
                'bg-slate-400'
              }`} />

              <div className="pl-1 shrink-0">
                {notif.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />}
                {notif.type === 'bid' && <TrendingUp className="w-5 h-5 text-amber-400 mt-0.5" />}
                {notif.type === 'warning' && <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5" />}
                {notif.type === 'sync' && <RefreshCw className="w-5 h-5 text-blue-400 mt-0.5 animate-spin" />}
                {notif.type === 'info' && <Shield className="w-5 h-5 text-indigo-400 mt-0.5" />}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-wider truncate">{notif.title}</h4>
                  <span className="text-[9px] text-slate-500 font-mono shrink-0">
                    {notif.timestamp.toLocaleTimeString(language === 'en' ? 'en-US' : 'id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-normal font-sans">{notif.message}</p>
              </div>

              <button
                type="button"
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 mt-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Guide Detail Modal */}
      {selectedGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedGuideModal(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {selectedGuideModal === 'ikut' && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                      {t('Syarat & Ketentuan Akses Bidding - Lelang Truck Pancaran Platinum')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{t('Informasi Resmi Deposit & Akses Penawaran')}</p>
                  </div>
                </div>

                {/* Banner / Guide Image */}
                <div className="w-full h-48 sm:h-56 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-sm">
                  <img
                    src="https://lh3.googleusercontent.com/d/19rthCmJjo1yZlT94ce5xY_mcwGnyaqjN"
                    alt={t('Syarat & Ketentuan Akses Bidding')}
                    className="w-full h-full object-cover object-center"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
                  <p className="font-medium text-slate-800">
                    {t('Untuk menjaga kualifikasi dan kelancaran proses penawaran, setiap peserta diwajibkan melakukan')} <span className="font-extrabold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded">{t('deposit jaminan sebesar Rp10.000.000,-')}</span> {t('sebagai syarat aktif untuk melakukan penawaran (ngebid).')}
                  </p>

                  <div className="p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl space-y-1.5">
                    <h4 className="font-extrabold text-emerald-900 text-sm flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      {t('Jaminan Keamanan Dana:')}
                    </h4>
                    <p className="text-emerald-950 font-medium text-xs sm:text-sm">
                      {t('Bagi peserta yang belum berkesempatan menjadi pemenang, dana deposit sebesar')} <span className="font-extrabold text-emerald-900">{t('Rp10.000.000,-')}</span> {t('akan dikembalikan penuh')} <span className="font-extrabold text-emerald-900">({t('100%')})</span> {t('setelah pengumuman pemenang resmi dan memasuki tahapan acara selanjutnya.')}
                    </p>
                  </div>

                  <p className="font-semibold text-blue-950 italic text-center pt-2">
                    {t('Mari bergabung dan dapatkan unit truck impian Anda di ajang eksklusif Pancaran Platinum!')}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-3 justify-end items-center">
                  <button
                    onClick={() => setSelectedGuideModal(null)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-200 transition"
                  >
                    {t('Tutup')}
                  </button>
                  <a
                    href="https://wa.me/6281317469744?text=Halo%20Panitia%20Lelang%20Pancaran%20Platinum,%20saya%20ingin%20mengkonfirmasi%20deposit%20jaminan%20Rp10.000.000%20untuk%20akses%20bidding%20lelang."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
                  >
                    <Phone className="w-4 h-4" />
                    {t('Hubungi Panitia untuk Akses Bidding')}
                  </a>
                </div>
              </div>
            )}

            {selectedGuideModal === 'titip' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900">{t('Panduan & Cara Titip Jual')}</h3>
                    <p className="text-xs text-slate-500">{t('Layanan konsinyasi & penjualan armada transparan')}</p>
                  </div>
                </div>

                <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 bg-emerald-600 text-white font-bold text-xs rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{t('Pengajuan Data Konsinyasi')}</h4>
                      <p>{t('Kirimkan spesifikasi armada/unit kendaraan Anda beserta fotokopi STNK dan BPKB.')}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 bg-emerald-600 text-white font-bold text-xs rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{t('Inspeksi & Estimasi Nilai Limit')}</h4>
                      <p>{t('Tim ahli mekanik Pancaran melakukan penilaian kondisi fisik, mesin, dan memberikan rekomendasi harga limit.')}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 bg-emerald-600 text-white font-bold text-xs rounded-full flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{t('Penandatanganan Perjanjian')}</h4>
                      <p>{t('Sepakati nilai reserve price dan persyaratan hak lelang dalam surat titip jual resmi.')}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 bg-emerald-600 text-white font-bold text-xs rounded-full flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{t('Pemasaran & Event Lelang')}</h4>
                      <p>{t('Unit dipasarkan ke ribuan pembeli potensial di ekosistem lelang nasional Pancaran Platinum.')}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 bg-emerald-600 text-white font-bold text-xs rounded-full flex items-center justify-center shrink-0 mt-0.5">5</span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{t('Pencairan Hasil Lelang')}</h4>
                      <p>{t('Setelah pembeli melunasi pembayaran, dana diteruskan ke rekening Anda secara tepat waktu.')}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setSelectedGuideModal(null)}
                    className="px-5 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition"
                  >
                    {t('Saya Mengerti')}
                  </button>
                </div>
              </div>
            )}

            {selectedGuideModal === 'online' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center shrink-0">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900">{t('Panduan & Cara Lelang Online')}</h3>
                    <p className="text-xs text-slate-500">{t('Partisipasi lelang digital dari mana saja kapan saja')}</p>
                  </div>
                </div>

                <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 bg-cyan-600 text-white font-bold text-xs rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{t('Akses Portal Digital')}</h4>
                      <p>{t('Masuk ke portal Pancaran Lelang menggunakan HP, tablet, atau laptop Anda.')}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 bg-cyan-600 text-white font-bold text-xs rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{t('Cek Katalog & Laporan Inspeksi')}</h4>
                      <p>{t('Pelajari foto detail, spesifikasi teknis, serta nilai grade kelayakan unit.')}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 bg-cyan-600 text-white font-bold text-xs rounded-full flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{t('Beli NPL Online')}</h4>
                      <p>{t('Dapatkan Nomor Peserta Lelang secara cepat melalui pembayaran Payment Gateway terverifikasi.')}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 bg-cyan-600 text-white font-bold text-xs rounded-full flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{t('Live Bidding Real-Time')}</h4>
                      <p>{t('Ikuti penawaran interaktif saat lelang dibuka dengan indikator persaingan harga otomatis.')}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 bg-cyan-600 text-white font-bold text-xs rounded-full flex items-center justify-center shrink-0 mt-0.5">5</span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{t('Konfirmasi & Risalah Lelang')}</h4>
                      <p>{t('Terima pemberitahuan penetapan pemenang dan unduh risalah lelang secara digital.')}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setSelectedGuideModal(null)}
                    className="px-5 py-2.5 bg-cyan-600 text-white font-bold text-xs rounded-xl hover:bg-cyan-700 transition"
                  >
                    {t('Saya Mengerti')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
