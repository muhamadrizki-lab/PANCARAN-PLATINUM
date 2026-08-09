import React, { useState, useRef } from 'react';
import { Asset, Bid, BiddingRequest, ToastNotification, RefundRequest } from '../types';
import { addBiddingRequest, addNotificationToDb, addRefundRequest } from '../firebase';
import { useLanguage } from './LanguageContext';
import { 
  Bell, 
  Mail, 
  MailOpen, 
  Trophy, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Tag, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Printer, 
  Inbox, 
  ArrowLeft,
  Calendar,
  Lock,
  ExternalLink,
  FileText
} from 'lucide-react';
import { OfficialWinnerLetterModal } from './OfficialWinnerLetterModal';

interface ExternalViewsProps {
  assets: Asset[];
  userEmail: string;
  userName: string;
  userPhone: string;
}

export function ExternalNotificationsView({ assets, userEmail, userName, userPhone }: ExternalViewsProps) {
  const { language, t } = useLanguage();
  const [selectedWinnerAsset, setSelectedWinnerAsset] = useState<Asset | null>(null);

  const formatIDR = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const locale = language === 'en' ? 'en-US' : 'id-ID';
      return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  // Generate dynamic, real-time notifications for the logged-in user
  const generateNotifications = () => {
    const notificationsList: Array<{
      id: string;
      type: 'bid_success' | 'outbid' | 'won' | 'lost' | 'general';
      title: string;
      message: string;
      timestamp: string;
      assetId: string;
      assetName: string;
    }> = [];

    assets.forEach(asset => {
      const userBids = (asset.bids || []).filter(b => b.email.toLowerCase() === userEmail.toLowerCase());
      if (userBids.length === 0) return;

      // Sort user bids by price descending
      userBids.sort((a, b) => b.price - a.price);
      const userHighestBid = userBids[0];

      // Sort all bids on asset
      const allBidsSorted = [...asset.bids].sort((a, b) => b.price - a.price);
      const highestBid = allBidsSorted[0];

      // 1. Notification for bid placement success
      userBids.forEach(bid => {
        let msg = t('Penawaran Anda sebesar {price} berhasil diajukan untuk {unit}.', {
          price: formatIDR(bid.price),
          unit: `${asset.brand} ${asset.name}`
        });

        if (bid.scheduleSurveyDate) {
          msg += `\n\n📅 ${t('Jadwal Booking Survei')}: ${bid.scheduleSurveyDate} @ ${bid.scheduleSurveyTime || '09:00'} WIB`;
        }

        notificationsList.push({
          id: `notif-bid-${bid.id}`,
          type: 'bid_success',
          title: t('Penawaran Berhasil Diajukan'),
          message: msg,
          timestamp: bid.timestamp,
          assetId: asset.id,
          assetName: `${asset.brand} ${asset.name}`
        });

        // Also add a dedicated survey booking notification if scheduled!
        if (bid.scheduleSurveyDate) {
          notificationsList.push({
            id: `notif-booking-${bid.id}`,
            type: 'general',
            title: `📅 ${t('Booking Jadwal Survei Fisik')}`,
            message: t('Konfirmasi: Jadwal survei fisik Anda untuk unit {unit} telah terdaftar pada tanggal {date} pukul {time} WIB.', {
              unit: `${asset.brand} ${asset.name}`,
              date: bid.scheduleSurveyDate,
              time: bid.scheduleSurveyTime || '09:00'
            }),
            timestamp: bid.timestamp,
            assetId: asset.id,
            assetName: `${asset.brand} ${asset.name}`
          });
        }
      });

      // 2. Outbid Notification
      if (asset.status === 'Open' && highestBid.email.toLowerCase() !== userEmail.toLowerCase() && userHighestBid.price < highestBid.price) {
        notificationsList.push({
          id: `notif-outbid-${asset.id}`,
          type: 'outbid',
          title: t('⚠️ Penawaran Terlampaui!'),
          message: t('Penawar lain telah mengajukan harga lebih tinggi yaitu {price} pada {unit}. Silakan tawar kembali untuk memenangkan lelang.', {
            price: formatIDR(highestBid.price),
            unit: `${asset.brand} ${asset.name}`
          }),
          timestamp: highestBid.timestamp,
          assetId: asset.id,
          assetName: `${asset.brand} ${asset.name}`
        });
      }

      // 3. Won / Lost Notification if asset is Sold
      if (asset.status === 'Sold') {
        const isWinner = highestBid.email.toLowerCase() === userEmail.toLowerCase();
        if (isWinner) {
          notificationsList.push({
            id: `notif-closed-won-${asset.id}`,
            type: 'won',
            title: t('🏆 Selamat, Anda Pemenang!'),
            message: t('Lelang ditutup. Anda memenangkan penawaran untuk {unit} dengan harga {price}. Surat resmi pemenang dikirim ke Inbox Anda.', {
              unit: `${asset.brand} ${asset.name}`,
              price: formatIDR(highestBid.price)
            }),
            timestamp: highestBid.timestamp, // closed close time approx
            assetId: asset.id,
            assetName: `${asset.brand} ${asset.name}`
          });
        } else {
          notificationsList.push({
            id: `notif-closed-lost-${asset.id}`,
            type: 'lost',
            title: t('Lelang Ditutup (Terjual)'),
            message: t('Unit {unit} telah terjual kepada penawar tertinggi lain. Terima kasih atas partisipasi Anda.', {
              unit: `${asset.brand} ${asset.name}`
            }),
            timestamp: highestBid.timestamp,
            assetId: asset.id,
            assetName: `${asset.brand} ${asset.name}`
          });
        }
      }
    });

    // Sort by timestamp descending
    return notificationsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const notifications = generateNotifications();

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in" id="external-notifications-container">
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 border-l-[6px] border-l-slate-200 shadow-xs">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          <span>{t('Notifikasi Saya')} ({notifications.length})</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {t('Pantau riwayat penawaran, status outbid, dan pengumuman lelang Anda secara real-time.')}
        </p>
      </div>

      <div className="space-y-4">
        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <div 
              key={notif.id}
              className={`bg-white p-5 rounded-2xl border border-slate-200/70 shadow-xs flex items-start gap-4 transition-all hover:border-blue-200 hover:shadow-md ${
                notif.type === 'won' ? 'border-l-4 border-l-emerald-500 bg-emerald-50/10' :
                notif.type === 'outbid' ? 'border-l-4 border-l-amber-500 bg-amber-50/10' :
                notif.id.includes('booking') ? 'border-l-4 border-l-indigo-500 bg-indigo-50/10' :
                'border-l-4 border-l-blue-500'
              }`}
            >
              <div className="mt-1 p-2 rounded-xl bg-slate-50 border border-slate-100">
                {notif.type === 'won' && <Trophy className="w-5 h-5 text-emerald-600" />}
                {notif.type === 'outbid' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                {notif.type === 'bid_success' && <CheckCircle className="w-5 h-5 text-blue-600" />}
                {notif.type === 'lost' && <Lock className="w-5 h-5 text-slate-400" />}
                {notif.id.includes('booking') && <Calendar className="w-5 h-5 text-indigo-600" />}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    {notif.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono font-medium flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatDate(notif.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {notif.message}
                </p>
                {notif.type === 'won' && (() => {
                  const asset = assets.find(a => a.id === notif.assetId);
                  return asset ? (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedWinnerAsset(asset)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{language === 'en' ? 'View Official Winner Letter (PDF)' : 'Lihat Surat Pemenang Resmi (PDF)'}</span>
                      </button>
                    </div>
                  ) : null;
                })()}
                <div className="pt-1.5 flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                  <span>{language === 'en' ? 'UNIT ID' : 'ID UNIT'}: <span className="font-mono text-slate-700 font-extrabold">{notif.assetId}</span></span>
                  <span>•</span>
                  <span>{notif.assetName}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white py-16 text-center border border-dashed border-slate-200 rounded-3xl space-y-3">
            <Bell className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-400 font-semibold text-sm">{t('Belum ada notifikasi aktivitas lelang Anda.')}</p>
            <p className="text-xs text-slate-400">{t('Silakan lakukan penawaran pada katalog unit untuk memulai.')}</p>
          </div>
        )}
      </div>

      {/* Official Winner Letter Modal */}
      {selectedWinnerAsset && (
        <OfficialWinnerLetterModal
          asset={selectedWinnerAsset}
          onClose={() => setSelectedWinnerAsset(null)}
          formatIDR={formatIDR}
        />
      )}
    </div>
  );
}

export function ExternalInboxView({ assets, userEmail, userName, userPhone }: ExternalViewsProps) {
  const { language, t } = useLanguage();
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null);

  const formatIDR = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Find all mails (Winner Letters & Survey Booking Confirmations) for the logged-in user
  const getMails = () => {
    const mailsList: Array<{
      id: string;
      type: 'winner' | 'booking';
      asset: Asset;
      highestBidPrice?: number;
      bookingDate?: string;
      bookingTime?: string;
      subject: string;
      date: string;
    }> = [];

    assets.forEach(asset => {
      // 1. Winner Letters (when asset is Sold and user is the highest bidder)
      if (asset.status === 'Sold' && asset.bids && asset.bids.length > 0) {
        const sortedBids = [...asset.bids].sort((a, b) => b.price - a.price);
        const winnerBid = sortedBids[0];

        if (winnerBid.email.toLowerCase() === userEmail.toLowerCase()) {
          mailsList.push({
            id: `mail-winner-${asset.id}`,
            type: 'winner',
            asset: asset,
            highestBidPrice: winnerBid.price,
            subject: `[PANCARAN LELANG] Pengumuman Resmi Pemenang Lelang - Unit ${asset.id}`,
            date: winnerBid.timestamp
          });
        }
      }

      // 2. Survey Booking Letters (when user submitted a bid on this asset with a survey booking)
      const userBids = (asset.bids || []).filter(b => b.email.toLowerCase() === userEmail.toLowerCase());
      userBids.forEach(bid => {
        if (bid.scheduleSurveyDate) {
          mailsList.push({
            id: `mail-booking-${bid.id}`,
            type: 'booking',
            asset: asset,
            bookingDate: bid.scheduleSurveyDate,
            bookingTime: bid.scheduleSurveyTime || '09:00',
            subject: `[PANCARAN LELANG] Konfirmasi Jadwal Survei Fisik - Unit ${asset.id}`,
            date: bid.timestamp
          });
        }
      });
    });

    return mailsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const mails = getMails();
  const activeMail = mails.find(m => m.id === selectedMailId);

  const handlePrint = () => {
    const letterElement = document.getElementById("printable-winner-letter");
    
    // Create or reuse hidden iframe for robust printing inside iframes and sandboxes
    let printIframe = document.getElementById("print-helper-iframe") as HTMLIFrameElement | null;
    if (!printIframe) {
      printIframe = document.createElement("iframe");
      printIframe.id = "print-helper-iframe";
      printIframe.style.position = "fixed";
      printIframe.style.top = "-9999px";
      printIframe.style.left = "-9999px";
      printIframe.style.width = "0";
      printIframe.style.height = "0";
      printIframe.style.border = "none";
      document.body.appendChild(printIframe);
    }

    if (letterElement) {
      const clonedElement = letterElement.cloneNode(true) as HTMLElement;
      // Remove any no-print items from clone
      const noPrints = clonedElement.querySelectorAll(".no-print");
      noPrints.forEach(node => node.remove());

      const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>${language === 'en' ? 'Official Winner Decision Letter - Pancaran Platinum' : 'Surat Resmi Pemenang Lelang - Pancaran Platinum'}</title>
              <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                @page { size: A4 portrait; margin: 10mm 12mm; }
                body {
                  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
                  background: #ffffff !important;
                  color: #0f172a !important;
                  margin: 0;
                  padding: 16px;
                  font-size: 11pt;
                  line-height: 1.45;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .no-print { display: none !important; }
                .overflow-y-auto, .max-h-\\[70vh\\] { max-height: none !important; overflow: visible !important; height: auto !important; }
                .border { border-color: #cbd5e1 !important; }
                .bg-slate-50 { background-color: #f8fafc !important; }
                .bg-blue-50\\/50, .bg-blue-50 { background-color: #f0f9ff !important; }
                .bg-indigo-50\\/50, .bg-indigo-50 { background-color: #e0e7ff !important; }
                .border-t { border-top: 1px solid #e2e8f0 !important; }
                .shadow-md, .shadow-sm, .shadow-xs { box-shadow: none !important; }
                .rounded-3xl { border-radius: 12px !important; }
              </style>
            </head>
            <body>
              <div style="width: 100%; max-width: 800px; margin: 0 auto;">
                ${clonedElement.innerHTML}
              </div>
            </body>
          </html>
        `);
        iframeDoc.close();

        setTimeout(() => {
          try {
            printIframe?.contentWindow?.focus();
            printIframe?.contentWindow?.print();
          } catch (e) {
            console.warn("Iframe print error, falling back to window.print():", e);
            window.focus();
            window.print();
          }
        }, 350);
        return;
      }
    }

    // Direct fallback
    try {
      window.focus();
      window.print();
    } catch (e) {
      console.error("Window print error:", e);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in" id="external-inbox-container">
      
      {/* Inbox Welcome Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 border-l-[6px] border-l-slate-200 shadow-xs mb-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-600" />
          <span>{language === 'en' ? 'Inbox' : 'Kotak Masuk / Inbox'} ({mails.length})</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {t('Surat resmi penunjukan pemenang lelang dikirim secara eksklusif ke email pemenang di sini.')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Mailbox List */}
        <div className={`bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden lg:col-span-4 ${selectedMailId ? 'hidden lg:block' : 'col-span-full'}`}>
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <Inbox className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
              {language === 'en' ? 'Inbox' : 'Kotak Masuk'}
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {mails.length > 0 ? (
              mails.map((mail) => (
                <button
                  key={mail.id}
                  onClick={() => setSelectedMailId(mail.id)}
                  className={`w-full text-left p-4 transition-all flex flex-col gap-1.5 ${
                    selectedMailId === mail.id 
                      ? 'bg-blue-50/70 border-l-4 border-l-blue-600' 
                      : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    {mail.type === 'winner' ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        🏆 {language === 'en' ? 'WINNER' : 'PEMENANG'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        📅 {language === 'en' ? 'SURVEY BOOKED' : 'JADWAL SURVEI'}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(mail.date).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className={`text-xs truncate ${selectedMailId === mail.id ? 'font-black text-blue-800' : 'font-bold text-slate-800'}`}>
                      {mail.subject}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {mail.type === 'winner' ? (
                        language === 'en'
                          ? `Dear Mr/Mrs ${userName}, Congratulations! You have been selected as the official auction winner of Pancaran Platinum for unit ${mail.asset.brand} ${mail.asset.name}...`
                          : `Yth. Bapak/Ibu ${userName}, Selamat! Anda telah terpilih sebagai pemenang lelang resmi Pancaran Platinum untuk unit ${mail.asset.brand} ${mail.asset.name}...`
                      ) : (
                        language === 'en'
                          ? `Dear Mr/Mrs ${userName}, Your physical survey schedule for unit ${mail.asset.brand} ${mail.asset.name} has been successfully registered on ${mail.bookingDate} at ${mail.bookingTime} WIB.`
                          : `Yth. Bapak/Ibu ${userName}, Jadwal survei fisik Anda untuk unit ${mail.asset.brand} ${mail.asset.name} telah berhasil terdaftar pada tanggal ${mail.bookingDate} pukul ${mail.bookingTime} WIB.`
                      )}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="py-16 text-center text-slate-400 font-semibold text-xs space-y-2 flex flex-col items-center justify-center">
                <Mail className="w-8 h-8 text-slate-300" />
                <span>{language === 'en' ? 'No incoming emails.' : 'Tidak ada email masuk.'}</span>
                <span className="text-[10px] text-slate-400 font-normal px-6">
                  {t('Hanya pemenang lelang tertinggi yang akan menerima surat pengumuman pemenang di kotak masuk.')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Mail Reader */}
        <div className={`lg:col-span-8 ${!selectedMailId ? 'hidden lg:flex' : 'col-span-full'}`}>
          {activeMail ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden flex flex-col w-full animate-fade-in" id="printable-winner-letter">
              {/* Mail Reader Header */}
              <div className="p-4 md:p-6 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 no-print">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSelectedMailId(null)}
                    className="lg:hidden p-2 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className={`p-2.5 text-white rounded-2xl shadow-sm ${activeMail.type === 'winner' ? 'bg-blue-600' : 'bg-indigo-600'}`}>
                    {activeMail.type === 'winner' ? (
                      <Trophy className="w-5 h-5" />
                    ) : (
                      <Calendar className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 truncate max-w-md">{activeMail.subject}</h3>
                    <p className="text-[10px] text-slate-500 font-medium">{language === 'en' ? 'From' : 'Dari'}: <strong>PLATINUM</strong> &lt;noreply@pancaran-logistic.id&gt;</p>
                  </div>
                </div>

                <button 
                  onClick={handlePrint}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs hover:shadow active:scale-95 no-print"
                  title={language === 'en' ? 'Print or Save as PDF' : 'Cetak atau Simpan sebagai PDF'}
                >
                  <Printer className="w-4 h-4 text-blue-600" /> {language === 'en' ? 'Print / PDF' : 'Cetak / PDF'}
                </button>
              </div>

              {/* Official Email Letter Body */}
              <div className="p-6 md:p-10 space-y-8 max-h-[70vh] overflow-y-auto font-sans leading-relaxed text-slate-700 text-xs">
                
                {/* Pancaran Header Grid */}
                <div className="flex justify-between items-start border-b-2 border-blue-900/10 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded flex items-center justify-center shadow border border-slate-100 overflow-hidden">
                      <img 
                        src="https://lh3.googleusercontent.com/d/1LmpjB5qAX8ev5_JRzYQDwjM58RxHl18X" 
                        alt="Pancaran Logo" 
                        className="w-full h-full object-contain p-0.5"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <span className="text-blue-950 font-black text-base tracking-tight block">
                        PANCARAN PLATINUM
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                        Member of Pancaran Group
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-400 font-mono font-bold uppercase">
                    <p>{activeMail.type === 'winner' ? (language === 'en' ? 'AUCTION DECISION LETTER' : 'SURAT KEPUTUSAN LELANG') : (language === 'en' ? 'PHYSICAL SURVEY CONFIRMATION' : 'SURAT KONFIRMASI SURVEI FISIK')}</p>
                    <p className="text-slate-700 mt-1">NO: {activeMail.type === 'winner' ? 'PL/WIN' : 'PL/SRV'}/{activeMail.asset.id}/{new Date(activeMail.date).getFullYear()}</p>
                  </div>
                </div>

                {/* Letter Content */}
                <div className="space-y-4">
                  <p className="font-semibold">{language === 'en' ? 'Jakarta,' : 'Jakarta,'} {new Date(activeMail.date).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  
                  <div className="space-y-0.5">
                    <p>{language === 'en' ? 'To Dear,' : 'Kepada Yth,'}</p>
                    <p className="font-black text-slate-900 text-sm">{userName}</p>
                    <p className="font-mono text-slate-500">{userEmail}</p>
                    {userPhone && <p className="text-slate-600 font-semibold">{userPhone}</p>}
                  </div>

                  <p className="text-justify leading-relaxed">
                    {activeMail.type === 'winner' ? (
                      language === 'en' ? (
                        <>
                          Dear Sir/Madam, <br/>
                          Based on the decision of the PLATINUM Committee, we hereby officially state that you have been selected as the <strong>GRAND WINNER OF THE AUCTION</strong> for the unit below:
                        </>
                      ) : (
                        <>
                          Dengan hormat, <br/>
                          Berdasarkan hasil keputusan Panitia PLATINUM, dengan ini kami menyatakan secara resmi bahwa Anda telah terpilih sebagai <strong>PEMENANG UTAMA LELANG</strong> atas unit di bawah ini:
                        </>
                      )
                    ) : (
                      language === 'en' ? (
                        <>
                          Dear Sir/Madam, <br/>
                          Thank you for participating in the PLATINUM auction. Your physical survey schedule booking to inspect the unit condition directly at our pool has been successfully registered and confirmed:
                        </>
                      ) : (
                        <>
                          Dengan hormat, <br/>
                          Terima kasih atas partisipasi Anda dalam lelang PLATINUM. Pengajuan jadwal booking survei fisik untuk memeriksa kondisi mesin dan unit secara langsung di Pool kami telah berhasil terdaftar dan dikonfirmasi dengan detail sebagai berikut:
                        </>
                      )
                    )}
                  </p>

                  {/* Unit Specs Card */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-inner">
                    <h4 className={`font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2 ${activeMail.type === 'winner' ? 'text-blue-900' : 'text-indigo-900'}`}>
                      <CheckCircle className={`w-4 h-4 ${activeMail.type === 'winner' ? 'text-emerald-500' : 'text-indigo-500'}`} /> {language === 'en' ? 'Selected Unit Specifications' : 'Spesifikasi Unit Terpilih'}
                    </h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3.5 gap-x-6 text-[11px] font-semibold">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">{language === 'en' ? 'Unit ID / Serial No' : 'ID Unit / No Seri'}</span>
                        <span className="text-slate-800 font-mono font-bold text-xs">{activeMail.asset.id}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">{language === 'en' ? 'Unit Name' : 'Nama Unit'}</span>
                        <span className="text-slate-800 font-bold text-xs">{activeMail.asset.brand} {activeMail.asset.name}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">{language === 'en' ? 'License Plate' : 'Nomor Polisi'}</span>
                        <span className="text-slate-800 font-mono font-bold text-xs uppercase">{activeMail.asset.plateNumber}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">{language === 'en' ? 'Year of Manufacture' : 'Tahun Pembuatan'}</span>
                        <span className="text-slate-800 font-bold text-xs">{activeMail.asset.modelYear}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">{language === 'en' ? 'Physical Condition' : 'Kondisi Fisik'}</span>
                        <span className="text-slate-800 font-bold text-xs">{activeMail.asset.condition}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">{language === 'en' ? 'Inspection Location' : 'Lokasi Inspeksi'}</span>
                        <span className="text-slate-800 font-bold text-xs">{activeMail.asset.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing / Booking Details Card */}
                  {activeMail.type === 'winner' ? (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 space-y-4">
                      <h4 className="font-bold text-blue-950 text-[11px] uppercase tracking-wider flex items-center gap-1.5 border-b border-blue-100 pb-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" /> {language === 'en' ? 'Approved Bid Value' : 'Nilai Penawaran Disetujui'}
                      </h4>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">{language === 'en' ? 'Highest Bid Price (Approved)' : 'Harga Penawaran Tertinggi (Disetujui)'}</span>
                          <span className="text-blue-900 font-black text-xl tracking-tight">{formatIDR(activeMail.highestBidPrice || 0)}</span>
                        </div>
                        <div className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-3 py-1 rounded-lg shadow-sm uppercase border border-emerald-200">
                          {language === 'en' ? 'Valid Winner' : 'Pemenang Sah'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 space-y-4">
                      <h4 className="font-bold text-indigo-950 text-[11px] uppercase tracking-wider flex items-center gap-1.5 border-b border-indigo-100 pb-2">
                        <Calendar className="w-4 h-4 text-indigo-600" /> {language === 'en' ? 'Confirmed Survey Schedule' : 'Konfirmasi Jadwal Survei'}
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">{language === 'en' ? 'SURVEY DATE' : 'TANGGAL SURVEI'}</span>
                          <span className="text-indigo-900 font-black text-sm block mt-1">{activeMail.bookingDate}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">{language === 'en' ? 'SURVEY TIME' : 'JAM SURVEI'}</span>
                          <span className="text-indigo-900 font-black text-sm block mt-1">{activeMail.bookingTime} WIB</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">{language === 'en' ? 'SURVEY PLACE' : 'TEMPAT / POOL'}</span>
                          <span className="text-indigo-900 font-black text-sm block mt-1">{activeMail.asset.location || 'Pool Cilincing'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Next Step Procedure instructions */}
                  <div className="space-y-3.5 pt-2">
                    {activeMail.type === 'winner' ? (
                      <>
                        <h4 className="font-black text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-blue-600" /> {language === 'en' ? 'Payment & Handover Procedure:' : 'Prosedur Pelunasan & Serah Terima:'}
                        </h4>
                        
                        {language === 'en' ? (
                          <ul className="space-y-2 list-decimal list-inside text-slate-600 font-medium">
                            <li>
                              <strong>Administrative Payment:</strong> Please transfer the DP/full unit payment to the official Pancaran Platinum bank account at the latest <strong>1 week</strong> after this decision letter is issued.
                            </li>
                            <li>
                              <strong>Document Verification:</strong> Our team will contact you via your registered telephone number <span className="text-slate-900 font-bold font-mono">{userPhone || 'registered'}</span> to coordinate the scheduling of signing the Deed of Sale and Purchase (AJB) and official receipt.
                            </li>
                            <li>
                              <strong>Physical Handover:</strong> Unit collection can be done at Cilincing Pool after payment has been verified by bringing your original ID card (KTP) and this proof of winning.
                            </li>
                          </ul>
                        ) : (
                          <ul className="space-y-2 list-decimal list-inside text-slate-600 font-medium">
                            <li>
                              <strong>Pembayaran Administrasi:</strong> Mohon lakukan transfer DP/pelunasan unit ke rekening resmi Pancaran Platinum selambat-lambatnya <strong>1 minggu</strong> setelah surat keputusan ini terbit.
                            </li>
                            <li>
                              <strong>Verifikasi Dokumen:</strong> Tim kami akan menghubungi Anda melalui nomor telepon <span className="text-slate-900 font-bold font-mono">{userPhone || 'terdaftar'}</span> untuk mengoordinasikan jadwal penandatanganan Akta Jual Beli (AJB) dan kwitansi resmi.
                            </li>
                            <li>
                              <strong>Serah Terima Fisik:</strong> Pengambilan unit dapat dilakukan di Pool Cilincing setelah pelunasan diverifikasi dengan membawa KTP asli dan bukti tanda pemenang ini.
                            </li>
                          </ul>
                        )}
                      </>
                    ) : (
                      <>
                        <h4 className="font-black text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-indigo-600" /> {language === 'en' ? 'Survey Visit Guidelines:' : 'Panduan Kunjungan Survei Fisik:'}
                        </h4>
                        
                        {language === 'en' ? (
                          <ul className="space-y-2 list-decimal list-inside text-slate-600 font-medium">
                            <li>
                              <strong>Safety Requirements:</strong> Visitors are required to wear closed shoes (safety shoes preferred) and a safety vest while inside the pool area for safety.
                            </li>
                            <li>
                              <strong>Gate Registration:</strong> Upon arrival, please show this survey confirmation letter (printout or on-screen) to the security officer on duty at the front gate.
                            </li>
                            <li>
                              <strong>Inspection Process:</strong> You will be guided by our fleet mechanic to perform engine checkups, structural inspection, and document verification of the selected unit.
                            </li>
                          </ul>
                        ) : (
                          <ul className="space-y-2 list-decimal list-inside text-slate-600 font-medium">
                            <li>
                              <strong>Persyaratan Keamanan:</strong> Pengunjung wajib mengenakan sepatu tertutup (disarankan sepatu safety) dan menjaga keselamatan selama berada di area Pool armada.
                            </li>
                            <li>
                              <strong>Registrasi Gerbang Utama:</strong> Setibanya di lokasi, silakan tunjukkan surat konfirmasi booking survei ini (cetak atau lewat HP) kepada petugas keamanan (security) yang berjaga.
                            </li>
                            <li>
                              <strong>Proses Inspeksi Unit:</strong> Anda akan didampingi oleh mekanik internal kami untuk melakukan pemeriksaan mesin, kondisi fisik sasis, serta kelengkapan dokumen asli unit terpilih.
                            </li>
                          </ul>
                        )}
                      </>
                    )}
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-between items-end">
                    <div></div>

                    <div className="text-center w-48 space-y-12">
                      <p className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">{language === 'en' ? 'Sincerely Yours,' : 'Hormat Kami,'}</p>
                      <div className="space-y-1">
                        <p className="font-black text-slate-800 border-b border-slate-300 pb-1 mx-2">{language === 'en' ? 'Pancaran Auction Committee' : 'Panitia Pancaran Lelang'}</p>
                        <p className="text-slate-400 text-[9px] font-bold">PANCARAN PLATINUM</p>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-16 text-center text-slate-400 font-medium text-xs flex flex-col items-center justify-center gap-3 w-full h-[550px]">
              <MailOpen className="w-12 h-12 text-slate-300" />
              <span>
                {language === 'en' 
                  ? 'Please select a letter from the left menu to read the announcement details.' 
                  : 'Silakan pilih surat di menu kiri untuk membaca detail pengumuman.'}
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

interface ExternalBiddingAccessViewProps {
  userEmail: string;
  userName: string;
  biddingRequests: BiddingRequest[];
}

export function ExternalBiddingAccessView({ userEmail, userName, biddingRequests }: ExternalBiddingAccessViewProps) {
  const { language, t } = useLanguage();
  const [requestType, setRequestType] = useState('Akses Bidding Semua Aset / Umum');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter requests submitted by the logged-in user
  const userRequests = biddingRequests.filter(req => req.email.toLowerCase() === userEmail.toLowerCase());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMsg(language === 'en' ? 'Please upload an image file (png, jpg, jpeg).' : 'Silakan unggah file gambar (png, jpg, jpeg).');
        return;
      }
      // Max 5MB
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg(language === 'en' ? 'Image size must be less than 5MB.' : 'Ukuran gambar harus kurang dari 5MB.');
        return;
      }

      setErrorMsg('');
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProofImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMsg(language === 'en' ? 'Please upload an image file (png, jpg, jpeg).' : 'Silakan unggah file gambar (png, jpg, jpeg).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg(language === 'en' ? 'Image size must be less than 5MB.' : 'Ukuran gambar harus kurang dari 5MB.');
        return;
      }

      setErrorMsg('');
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProofImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofImage) {
      setErrorMsg(language === 'en' ? 'Please upload proof of transfer receipt.' : 'Silakan unggah bukti transfer pembayaran.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const requestId = `REQ-${Date.now()}`;
      const newRequest: BiddingRequest = {
        id: requestId,
        email: userEmail,
        userName: userName,
        requestType: requestType,
        proofUrl: proofImage,
        status: 'Pending',
        createdAt: new Date().toISOString()
      };

      await addBiddingRequest(newRequest);

      // Save a ToastNotification for both admin and client reference
      const notif: ToastNotification = {
        id: `notif-${Date.now()}`,
        type: 'info',
        title: 'Pending Approval Akses Bidding',
        message: `${userName} (${userEmail}) mengajukan permohonan ${requestType}.`,
        timestamp: new Date()
      };
      await addNotificationToDb(notif);

      setSubmitSuccess(true);
      setProofImage(null);
      // Reset after success
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8" id="bidding-access-view-container">
      {/* Header section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Lock className="w-6 h-6 text-blue-600" />
            {language === 'en' ? 'Bidding Access Request' : 'Permohonan Akses Bidding'}
          </h1>
          <p className="text-slate-500 text-sm max-w-xl">
            {language === 'en' 
              ? 'Submit your bidding access application and attach your proof of transfer receipt to start participating in active asset auctions.' 
              : 'Ajukan permohonan akses bidding Anda dan lampirkan bukti transfer pembayaran untuk mulai berpartisipasi dalam lelang aset aktif.'}
          </p>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3 max-w-xs md:max-w-md">
          <div className="bg-blue-100 text-blue-700 p-2 rounded-xl">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">{language === 'en' ? 'Transfer Verification' : 'Verifikasi Transfer'}</h4>
            <p className="text-slate-600 text-xs mt-1">
              {language === 'en' 
                ? 'Verification takes up to 24 hours. You will receive notifications inside your account.' 
                : 'Verifikasi membutuhkan waktu hingga 24 jam. Anda akan menerima notifikasi di akun Anda.'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 p-6 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">{language === 'en' ? 'Application Form' : 'Formulir Permohonan'}</h2>
              <p className="text-xs text-slate-500 mt-1">{language === 'en' ? 'Fill in the two required fields below' : 'Isi dua kolom wajib di bawah ini'}</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              {submitSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold">{language === 'en' ? 'Application Submitted!' : 'Permohonan Berhasil Dikirim!'}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      {language === 'en' 
                        ? 'Your request is now in pending approval. Our team will verify your receipt shortly.' 
                        : 'Permohonan Anda saat ini dalam status pending approval. Tim kami akan segera melakukan verifikasi.'}
                    </p>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <p className="text-xs font-medium">{errorMsg}</p>
                </div>
              )}

              {/* Input 1: Pilihan Permohonan Akses Bidding */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  1. {language === 'en' ? 'Bidding Access Option' : 'Pilihan Permohonan Akses Bidding'}
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  required
                >
                  <option value="Akses Bidding Semua Aset / Umum">
                    {language === 'en' ? 'All Assets / General Bidding Access' : 'Akses Bidding Semua Aset / Umum'}
                  </option>
                  <option value="Akses Bidding Unit (Heavy Equipment, Property, etc.)">
                    {language === 'en' ? 'Heavy Equipment / Property Bidding Access' : 'Akses Bidding Unit (Alat Berat, Properti, dll)'}
                  </option>
                  <option value="Akses Bidding Fleet (Truck, Trailer, etc.)">
                    {language === 'en' ? 'Fleet / Truck & Trailer Bidding Access' : 'Akses Bidding Fleet (Truk, Trailer, dll)'}
                  </option>
                </select>
              </div>

              {/* Input 2: Bukti Transfer Akses Bidding */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  2. {language === 'en' ? 'Proof of Transfer Receipt' : 'Bukti Transfer Akses Bidding'}
                </label>
                
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                    proofImage 
                      ? 'border-emerald-200 bg-emerald-50/20' 
                      : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />

                  {proofImage ? (
                    <div className="space-y-4 w-full max-w-xs">
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-white shadow-inner">
                        <img 
                          src={proofImage} 
                          alt="Proof of transfer preview" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-800">{language === 'en' ? 'Receipt uploaded successfully' : 'Bukti transfer berhasil diunggah'}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{language === 'en' ? 'Click or drag a new file to replace' : 'Klik atau seret file baru untuk mengganti'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">{language === 'en' ? 'Upload transfer receipt' : 'Unggah bukti transfer pembayaran'}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{language === 'en' ? 'Drag & drop image here, or click to browse' : 'Seret & lepas gambar ke sini, atau klik untuk memilih'}</p>
                      </div>
                      <span className="inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full tracking-wider mt-2">PNG, JPG, JPEG (MAX. 5MB)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !proofImage}
                  className={`w-full py-3 px-4 rounded-xl text-sm font-extrabold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    !proofImage
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : isSubmitting
                        ? 'bg-blue-600/80 text-white cursor-wait'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/10'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{language === 'en' ? 'Submitting Application...' : 'Mengirimkan Permohonan...'}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>{language === 'en' ? 'Submit Access Request' : 'Kirim Permohonan Akses'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* History Column */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">{language === 'en' ? 'Request Status' : 'Status Permohonan'}</h3>
              <p className="text-xs text-slate-500 mt-1">{language === 'en' ? 'Monitor your access submissions' : 'Pantau pengajuan akses Anda'}</p>
            </div>

            <div className="space-y-4">
              {userRequests.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-100 rounded-2xl">
                  <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-2">
                    <Clock className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-600">{language === 'en' ? 'No active requests' : 'Belum ada pengajuan'}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{language === 'en' ? 'Your submissions will appear here' : 'Pengajuan Anda akan muncul di sini'}</p>
                </div>
              ) : (
                userRequests.map((req) => (
                  <div 
                    key={req.id} 
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3 relative overflow-hidden"
                  >
                    {/* Status badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 font-bold">{req.id}</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        req.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : req.status === 'Rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                      }`}>
                        {req.status === 'Approved' && <CheckCircle className="w-3 h-3" />}
                        {req.status === 'Rejected' && <AlertTriangle className="w-3 h-3" />}
                        {req.status === 'Pending' && <Clock className="w-3 h-3" />}
                        {req.status === 'Pending' ? (language === 'en' ? 'Pending Approval' : 'Pending Approval') : req.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-extrabold text-slate-800">{req.requestType}</h4>
                      <p className="text-[10px] text-slate-400">
                        {language === 'en' ? 'Submitted on:' : 'Diajukan pada:'} {new Date(req.createdAt).toLocaleString('id-ID')}
                      </p>
                    </div>

                    {/* Receipt thumbnail */}
                    {req.proofUrl && (
                      <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {language === 'en' ? 'Proof of Payment' : 'Bukti Pembayaran'}
                        </span>
                        <button 
                          type="button"
                          onClick={() => {
                            const win = window.open();
                            if (win) {
                              win.document.write(`<img src="${req.proofUrl}" style="max-width:100%; max-height:100vh; display:block; margin:auto;"/>`);
                            }
                          }}
                          className="text-[10px] text-blue-600 font-extrabold hover:underline"
                        >
                          {language === 'en' ? 'View File' : 'Lihat File'}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ExternalRefundBiddingViewProps {
  userEmail: string;
  userName: string;
  userPhone: string;
  refundRequests: RefundRequest[];
}

export function ExternalRefundBiddingView({ userEmail, userName, userPhone, refundRequests }: ExternalRefundBiddingViewProps) {
  const { language, t } = useLanguage();
  const [purpose, setPurpose] = useState('Refund Uang Jaminan (Deposit) Bidding');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter requests submitted by the logged-in user
  const userRefunds = refundRequests.filter(req => req.email.toLowerCase() === userEmail.toLowerCase());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMsg(language === 'en' ? 'Please upload an image file (png, jpg, jpeg).' : 'Silakan unggah file gambar (png, jpg, jpeg).');
        return;
      }
      // Max 5MB
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg(language === 'en' ? 'Image size must be less than 5MB.' : 'Ukuran gambar harus kurang dari 5MB.');
        return;
      }

      setErrorMsg('');
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProofImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMsg(language === 'en' ? 'Please upload an image file (png, jpg, jpeg).' : 'Silakan unggah file gambar (png, jpg, jpeg).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg(language === 'en' ? 'Image size must be less than 5MB.' : 'Ukuran gambar harus kurang dari 5MB.');
        return;
      }

      setErrorMsg('');
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProofImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofImage) {
      setErrorMsg(language === 'en' ? 'Please upload refund proof receipt.' : 'Silakan unggah bukti refund pembayaran.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const requestId = `REF-${Date.now()}`;
      const newRequest: RefundRequest = {
        id: requestId,
        email: userEmail,
        userName: userName,
        phone: userPhone || '',
        purpose: purpose,
        proofUrl: proofImage,
        status: 'Pending',
        createdAt: new Date().toISOString()
      };

      await addRefundRequest(newRequest);

      // Save a ToastNotification for both admin and client reference
      const notif: ToastNotification = {
        id: `notif-${Date.now()}`,
        type: 'info',
        title: 'Pengajuan Refund Bidding Baru',
        message: `${userName} (${userEmail}) mengajukan pengembalian: ${purpose}.`,
        timestamp: new Date()
      };
      await addNotificationToDb(notif);

      setSubmitSuccess(true);
      setProofImage(null);
      // Reset after success
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in" id="refund-bidding-view-container">
      {/* Header section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-rose-50 text-rose-600 rounded-2xl inline-block">
              <FileText className="w-6 h-6" />
            </span>
            {language === 'en' ? 'Refund Bidding' : 'Refund Bidding / Pengembalian'}
          </h1>
          <p className="text-slate-500 text-sm max-w-xl">
            {language === 'en' 
              ? 'Submit your bidding deposit refund request, select your purpose, and attach the original receipt/proof of transfer.' 
              : 'Ajukan pengembalian uang jaminan (refund deposit) bidding Anda, pilih keperluan, dan lampirkan bukti transfer asli.'}
          </p>
        </div>
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3 max-w-xs md:max-w-md">
          <div className="bg-rose-100 text-rose-700 p-2 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{language === 'en' ? 'Processing Time' : 'Waktu Proses'}</h4>
            <p className="text-slate-500 text-[11px] mt-1">
              {language === 'en' 
                ? 'Refund requests take 1-3 business days to verify. Funds will be returned to the registered bank account.' 
                : 'Permohonan refund diproses dalam 1-3 hari kerja. Dana dikembalikan ke rekening bank yang terdaftar.'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 p-6 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">{language === 'en' ? 'Refund Application Form' : 'Formulir Pengajuan Refund'}</h2>
              <p className="text-xs text-slate-500 mt-1">{language === 'en' ? 'Fill in the two required fields below' : 'Isi dua kolom wajib di bawah ini'}</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              {submitSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-center gap-3 animate-fade-in">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold">{language === 'en' ? 'Refund Request Submitted!' : 'Pengajuan Refund Berhasil Dikirim!'}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      {language === 'en' 
                        ? 'Your request has been saved and is currently in pending approval. Our finance team will process it shortly.' 
                        : 'Pengajuan Anda telah disimpan dan berstatus pending approval. Tim keuangan kami akan segera memprosesnya.'}
                    </p>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl flex items-center gap-3 animate-fade-in">
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <p className="text-xs font-medium">{errorMsg}</p>
                </div>
              )}

              {/* Input 1: Keperluan Refund */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  1. {language === 'en' ? 'Refund Purpose' : 'Keperluan Refund / Pengembalian'}
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  required
                >
                  <option value="Refund Uang Jaminan (Deposit) Bidding">
                    {language === 'en' ? 'Refund Bidding Guarantee Deposit' : 'Refund Uang Jaminan (Deposit) Bidding'}
                  </option>
                  <option value="Pembatalan Ikut Lelang & Tarik Deposit">
                    {language === 'en' ? 'Cancel Auction & Withdraw Deposit' : 'Pembatalan Ikut Lelang & Tarik Deposit'}
                  </option>
                  <option value="Kelebihan Bayar Transfer Pelunasan Unit">
                    {language === 'en' ? 'Overpayment of Unit Handover/Settlement' : 'Kelebihan Bayar Transfer Pelunasan Unit'}
                  </option>
                  <option value="Salah Transfer Pembayaran">
                    {language === 'en' ? 'Mistransfer of Payment' : 'Salah Transfer Pembayaran'}
                  </option>
                  <option value="Lainnya">
                    {language === 'en' ? 'Others' : 'Lainnya'}
                  </option>
                </select>
              </div>

              {/* Input 2: Upload Bukti Refund */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  2. {language === 'en' ? 'Proof of Refund (Transfer Receipt)' : 'Upload Bukti Refund / Bukti Transfer'}
                </label>
                
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                    proofImage 
                      ? 'border-emerald-200 bg-emerald-50/20' 
                      : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />

                  {proofImage ? (
                    <div className="space-y-4 w-full max-w-xs">
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-white shadow-inner">
                        <img 
                          src={proofImage} 
                          alt="Refund proof preview" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-800">{language === 'en' ? 'Proof uploaded successfully' : 'Bukti refund berhasil diunggah'}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{language === 'en' ? 'Click or drag a new file to replace' : 'Klik atau seret file baru untuk mengganti'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">{language === 'en' ? 'Upload transfer receipt / proof' : 'Unggah bukti refund / resi transfer'}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{language === 'en' ? 'Drag & drop image here, or click to browse' : 'Seret & lepas gambar ke sini, atau klik untuk memilih'}</p>
                      </div>
                      <span className="inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full tracking-wider mt-2">PNG, JPG, JPEG (MAX. 5MB)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !proofImage}
                  className={`w-full py-3 px-4 rounded-xl text-sm font-extrabold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    !proofImage
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : isSubmitting
                        ? 'bg-blue-600/80 text-white cursor-wait'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/10'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{language === 'en' ? 'Submitting Request...' : 'Mengirimkan Pengajuan...'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>{language === 'en' ? 'Submit Refund Request' : 'Kirim Pengajuan Refund'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* History / Details Column */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">{language === 'en' ? 'Refund Status' : 'Status Refund'}</h3>
              <p className="text-xs text-slate-500 mt-1">{language === 'en' ? 'Monitor your refund submissions' : 'Pantau pengajuan refund Anda'}</p>
            </div>

            <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
              {userRefunds.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-100 rounded-2xl">
                  <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-2">
                    <Clock className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-600">{language === 'en' ? 'No active refunds' : 'Belum ada pengajuan'}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{language === 'en' ? 'Your submissions will appear here' : 'Pengajuan Anda akan muncul di sini'}</p>
                </div>
              ) : (
                userRefunds.map((req) => (
                  <div 
                    key={req.id} 
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3 relative overflow-hidden transition-all hover:border-rose-100"
                  >
                    {/* Status badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 font-bold">{req.id}</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        req.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : req.status === 'Rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                      }`}>
                        {req.status === 'Approved' && <CheckCircle className="w-3 h-3" />}
                        {req.status === 'Rejected' && <AlertTriangle className="w-3 h-3" />}
                        {req.status === 'Pending' && <Clock className="w-3 h-3" />}
                        {req.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-extrabold text-slate-800 leading-snug">{req.purpose}</h4>
                      <p className="text-[10px] text-slate-400">
                        {language === 'en' ? 'Submitted on:' : 'Diajukan pada:'} {new Date(req.createdAt).toLocaleString('id-ID')}
                      </p>
                    </div>

                    {/* Receipt thumbnail */}
                    {req.proofUrl && (
                      <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-500" />
                          {language === 'en' ? 'Receipt Bukti' : 'Bukti Refund'}
                        </span>
                        <button 
                          type="button"
                          onClick={() => {
                            const win = window.open();
                            if (win) {
                              win.document.write(`<img src="${req.proofUrl}" style="max-width:100%; max-height:100vh; display:block; margin:auto;"/>`);
                            }
                          }}
                          className="text-[10px] text-blue-600 font-extrabold hover:underline"
                        >
                          {language === 'en' ? 'View File' : 'Lihat File'}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
