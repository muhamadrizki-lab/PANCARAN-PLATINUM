import React from 'react';
import { Asset, Bid } from '../types';
import { useLanguage } from './LanguageContext';
import { 
  Trophy, 
  Printer, 
  X, 
  CheckCircle, 
  TrendingUp, 
  Calendar, 
  Phone, 
  Mail, 
  Building2, 
  FileText 
} from 'lucide-react';

interface OfficialWinnerLetterModalProps {
  asset: Asset;
  winnerBid?: Bid | null;
  onClose: () => void;
  formatIDR: (amount: number) => string;
}

export function OfficialWinnerLetterModal({ 
  asset, 
  winnerBid: propWinnerBid, 
  onClose, 
  formatIDR 
}: OfficialWinnerLetterModalProps) {
  const { language, t } = useLanguage();

  // Determine top winning bid if not explicitly passed
  const winnerBid = propWinnerBid || (
    asset.bids && asset.bids.length > 0 
      ? [...asset.bids].sort((a, b) => b.price - a.price)[0] 
      : null
  );

  const winningPrice = winnerBid ? winnerBid.price : (asset.highestBid || asset.startingPrice);
  const winnerName = winnerBid ? winnerBid.name : 'Ricky Darmawan';
  const winnerEmail = winnerBid ? winnerBid.email : 'info@tubagasjayamandiri.com';
  const winnerPhone = winnerBid ? winnerBid.contact : '081319000979';
  const letterDate = winnerBid ? new Date(winnerBid.timestamp) : new Date();

  const formattedDateStr = letterDate.toLocaleDateString(
    language === 'en' ? 'en-US' : 'id-ID', 
    { day: 'numeric', month: 'long', year: 'numeric' }
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 z-[100] animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh] my-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 no-print border-b border-blue-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-2xl border border-emerald-400/30">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                {language === 'en' ? 'Official Winner Decision Letter' : 'Surat Keputusan Resmi Pemenang Lelang'}
              </h3>
              <p className="text-[11px] text-blue-200 mt-0.5 font-medium">
                Unit {asset.brand} {asset.name} • ID: {asset.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 cursor-pointer"
              title={language === 'en' ? 'Print or Save as PDF' : 'Cetak atau Simpan sebagai PDF'}
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">{language === 'en' ? 'Print / Save PDF' : 'Cetak / Simpan PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Letter Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/50 custom-scrollbar">
          <div 
            id="printable-winner-letter"
            className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-6 font-sans text-xs text-slate-700"
          >
            {/* Kop Surat / Letterhead */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-blue-900/15 pb-5 gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-xs border border-slate-200 p-1 shrink-0">
                  <img 
                    src="https://lh3.googleusercontent.com/d/1LmpjB5qAX8ev5_JRzYQDwjM58RxHl18X" 
                    alt="Pancaran Logo" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <span className="text-blue-950 font-black text-lg tracking-tight block leading-tight">
                    PANCARAN PLATINUM
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
                    Member of Pancaran Group • Divisi Lelang Logistik
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right text-[10px] text-slate-500 font-mono font-bold uppercase space-y-0.5">
                <p className="text-blue-900 font-bold tracking-wider">{language === 'en' ? 'AUCTION DECISION LETTER' : 'SURAT KEPUTUSAN LELANG'}</p>
                <p className="text-slate-800 font-extrabold text-xs">NO: PL/WIN/{asset.id}/{letterDate.getFullYear()}</p>
              </div>
            </div>

            {/* Letter Content & Salutation */}
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <p className="font-semibold text-slate-600">Jakarta, {formattedDateStr}</p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full uppercase border border-emerald-300">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  {language === 'en' ? 'Official Certificate' : 'Dokumen Pemenang Sah'}
                </span>
              </div>

              <div className="space-y-0.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">{language === 'en' ? 'Recipient / Winner Data:' : 'Data Penerima / Pemenang:'}</p>
                <p className="font-extrabold text-slate-900 text-sm mt-0.5">{winnerName}</p>
                <p className="font-mono text-slate-600">{winnerEmail}</p>
                {winnerPhone && <p className="text-slate-700 font-semibold font-mono">HP/WA: {winnerPhone}</p>}
              </div>

              <p className="text-justify leading-relaxed text-slate-700">
                {language === 'en' ? (
                  <>
                    Dear Sir/Madam, <br/>
                    Based on the official verification and final tally by the <strong>PLATINUM Auction Committee</strong>, we hereby officially state that you have been selected as the <strong>GRAND WINNER OF THE AUCTION</strong> for the operational unit listed below:
                  </>
                ) : (
                  <>
                    Dengan hormat, <br/>
                    Berdasarkan hasil verifikasi dan keputusan akhir Panitia <strong>PLATINUM Lelang</strong>, dengan ini kami menyatakan secara resmi bahwa Anda telah terpilih sebagai <strong>PEMENANG UTAMA LELANG</strong> atas unit operasional di bawah ini:
                  </>
                )}
              </p>

              {/* Unit Specifications Card */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4.5 space-y-3 shadow-2xs">
                <h4 className="font-bold text-[11px] text-blue-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Building2 className="w-4 h-4 text-blue-600" /> 
                  {language === 'en' ? 'Selected Unit Specifications' : 'Spesifikasi Unit Terpilih'}
                </h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-[11px]">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">{language === 'en' ? 'Unit ID' : 'ID Unit'}</span>
                    <span className="text-slate-900 font-mono font-extrabold text-xs">{asset.id}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">{language === 'en' ? 'Unit Name' : 'Nama Unit'}</span>
                    <span className="text-slate-900 font-bold text-xs">{asset.brand} {asset.name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">{language === 'en' ? 'License Plate' : 'Nomor Polisi'}</span>
                    <span className="text-slate-900 font-mono font-bold text-xs uppercase">{asset.plateNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">{language === 'en' ? 'Category / Type' : 'Kategori / Jenis'}</span>
                    <span className="text-slate-900 font-bold text-xs">{asset.category}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">{language === 'en' ? 'Year of Manufacture' : 'Tahun Pembuatan'}</span>
                    <span className="text-slate-900 font-bold text-xs">{asset.modelYear}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">{language === 'en' ? 'Inspection Location' : 'Lokasi Unit / Pool'}</span>
                    <span className="text-slate-900 font-bold text-xs">{asset.location || 'Pool Cilincing'}</span>
                  </div>
                </div>
              </div>

              {/* Approved Winning Bid Price Card */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4.5 flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider block">
                    {language === 'en' ? 'Approved Winning Bid Price' : 'Harga Penawaran Disetujui (Nilai Pemenang)'}
                  </span>
                  <span className="text-emerald-950 font-black text-xl sm:text-2xl font-mono tracking-tight block mt-0.5">
                    {formatIDR(winningPrice)}
                  </span>
                </div>
                <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-xs shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              {/* Physical Survey Schedule (if any) */}
              {winnerBid?.scheduleSurveyDate && (
                <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 space-y-1.5">
                  <h5 className="font-bold text-indigo-950 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    {language === 'en' ? 'Confirmed Physical Inspection Schedule' : 'Konfirmasi Jadwal Survei Fisik Unit'}
                  </h5>
                  <p className="text-xs text-indigo-900 font-medium">
                    Tanggal: <strong className="font-mono">{winnerBid.scheduleSurveyDate}</strong> @ <strong className="font-mono">{winnerBid.scheduleSurveyTime || '11:00'} WIB</strong> di <strong className="font-semibold">{asset.location || 'Pool Cilincing'}</strong>
                  </p>
                </div>
              )}

              {/* Next Steps / Terms */}
              <div className="space-y-2 pt-2 border-t border-slate-200/60">
                <h4 className="font-black text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" /> 
                  {language === 'en' ? 'Payment & Handover Procedure:' : 'Prosedur Pelunasan & Serah Terima Unit:'}
                </h4>
                
                {language === 'en' ? (
                  <ol className="space-y-1.5 list-decimal list-inside text-slate-600 font-medium text-[11px] leading-relaxed">
                    <li>
                      <strong>Administrative Payment:</strong> Transfer DP/full payment to official Pancaran Platinum bank account within <strong>7 working days</strong> from the date of this letter.
                    </li>
                    <li>
                      <strong>Document Verification:</strong> Our team will contact <span className="font-mono text-slate-900 font-bold">{winnerPhone}</span> to arrange Deed of Sale (AJB) & invoice signing.
                    </li>
                    <li>
                      <strong>Unit Pickup:</strong> Unit collection can be performed at Pool Cilincing upon presenting original ID Card (KTP) and this printed Official Decision Letter.
                    </li>
                  </ol>
                ) : (
                  <ol className="space-y-1.5 list-decimal list-inside text-slate-600 font-medium text-[11px] leading-relaxed">
                    <li>
                      <strong>Pembayaran Administrasi:</strong> Lakukan transfer DP/pelunasan unit ke rekening resmi Pancaran Platinum selambat-lambatnya <strong>7 hari kerja</strong> sejak diterbitkannya surat ini.
                    </li>
                    <li>
                      <strong>Verifikasi Dokumen:</strong> Tim kami akan menghubungi <span className="font-mono text-slate-900 font-bold">{winnerPhone}</span> untuk mengoordinasikan Akta Jual Beli (AJB) & kwitansi resmi.
                    </li>
                    <li>
                      <strong>Pengambilan Unit:</strong> Serah terima dilakukan di Pool Cilincing dengan menunjukkan KTP asli dan lembar cetak Surat Keputusan Pemenang ini.
                    </li>
                  </ol>
                )}
              </div>

              {/* Official Stamp & Signatures */}
              <div className="pt-6 border-t border-slate-200 flex justify-between items-end gap-4">
                <div className="text-[10px] text-slate-400 space-y-1">
                  <p className="font-bold text-slate-500 uppercase">{language === 'en' ? 'Official Digital Validation' : 'Validasi Digital Resmi'}</p>
                  <p className="font-mono">HASH: {asset.id}-WIN-{letterDate.getTime().toString(36).toUpperCase()}</p>
                  <p>Pancaran Platinum System Auto-Generated</p>
                </div>

                <div className="text-center w-52 space-y-10 shrink-0">
                  <p className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">{language === 'en' ? 'Sincerely Yours,' : 'Hormat Kami,'}</p>
                  
                  {/* Digital Seal Badge */}
                  <div className="relative flex justify-center items-center py-2">
                    <div className="border-2 border-dashed border-blue-600/40 rounded-full w-20 h-20 flex flex-col items-center justify-center text-blue-900 rotate-[-12deg] bg-blue-50/50 shadow-xs">
                      <span className="text-[8px] font-black tracking-widest uppercase">PANCARAN</span>
                      <span className="text-[7px] font-bold text-emerald-600 uppercase">LELANG SAH</span>
                      <span className="text-[6px] font-mono font-semibold text-slate-500">JAKARTA</span>
                    </div>
                  </div>

                  <div className="space-y-0.5 border-t border-slate-300 pt-1.5">
                    <p className="font-black text-slate-900 text-xs">{language === 'en' ? 'Pancaran Auction Committee' : 'Panitia Pancaran Lelang'}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Modal Footer (Screen only) */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-2">
            {winnerPhone && (
              <a
                href={`https://wa.me/${winnerPhone.replace(/\D/g, '').startsWith('0') ? '62' + winnerPhone.replace(/\D/g, '').slice(1) : winnerPhone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>WhatsApp Pemenang</span>
              </a>
            )}
            {winnerEmail && (
              <a
                href={`mailto:${winnerEmail}`}
                className="px-3 py-2 bg-white hover:bg-blue-50 border border-slate-200 text-blue-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Pemenang</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{language === 'en' ? 'Print / PDF' : 'Cetak / PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              {language === 'en' ? 'Close' : 'Tutup'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
