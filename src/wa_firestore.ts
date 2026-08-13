import { doc, setDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore';
import { db } from './firebase'; // Adjust path based on actual structure
import { WaSessionData, WaTemplateData } from './types';

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

export async function saveWaSessionToFirestore(email: string, status: 'disconnected' | 'connecting' | 'connected', connectedPhone: string): Promise<void> {
  const cleanEmail = (email || 'digital.solution@pancaran-logistic.id').toLowerCase().trim();
  const docKey = cleanEmail.replace(/[^a-z0-9]/g, '_');
  const data: WaSessionData = {
    id: docKey,
    email: cleanEmail,
    status,
    connectedPhone,
    updatedAt: new Date().toISOString()
  };
  await setDoc(doc(db, WA_SESSIONS_COLLECTION, docKey), data);
}

export function subscribeToWaSession(email: string, callback: (session: WaSessionData | null) => void) {
  const cleanEmail = (email || 'digital.solution@pancaran-logistic.id').toLowerCase().trim();
  const docKey = cleanEmail.replace(/[^a-z0-9]/g, '_');
  return onSnapshot(doc(db, WA_SESSIONS_COLLECTION, docKey), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as WaSessionData);
    } else {
      callback(null);
    }
  });
}

export async function saveWaTemplateToFirestore(template: WaTemplateData): Promise<void> {
  await setDoc(doc(db, WA_TEMPLATES_COLLECTION, template.id), template);
}

export async function deleteWaTemplateFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, WA_TEMPLATES_COLLECTION, id));
}

export function subscribeToWaTemplates(callback: (templates: WaTemplateData[]) => void) {
  return onSnapshot(collection(db, WA_TEMPLATES_COLLECTION), (snapshot) => {
    const items: WaTemplateData[] = [];
    snapshot.forEach((docSnap) => {
      items.push(docSnap.data() as WaTemplateData);
    });
    if (items.length === 0) {
      INITIAL_WA_TEMPLATES.forEach((tpl) => saveWaTemplateToFirestore(tpl));
      callback(INITIAL_WA_TEMPLATES);
    } else {
      callback(items);
    }
  });
}
