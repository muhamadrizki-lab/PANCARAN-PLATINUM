/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT: FIRESTORE TO GOOGLE SPREADSHEET REAL-TIME SYNC (OAUTH2 FIX)
 * ==============================================================================
 * 
 * SPREADSHEET: https://docs.google.com/spreadsheets/d/1BlzO5TeCmOeRqTrg-M0AmrxRs89ohM9vBhtmVMAofkE/edit
 * DATABASE ID: ai-studio-remixremixpancar-e5d36007-18cd-4f4e-8eec-a93a35f15981
 * PROJECT ID: gen-lang-client-0387361643
 *
 * CARA MENGATASI ERROR 403 (REQUEST HAD INSUFFICIENT AUTHENTICATION SCOPES):
 * ------------------------------------------------------------------------------
 * Karena kita memanggil Firestore API secara manual menggunakan `UrlFetchApp`, Google Apps Script
 * tidak tahu secara otomatis bahwa dia memerlukan izin akses Firestore/Cloud Platform.
 * Kita harus menambahkan izin ini secara manual di file manifes `appsscript.json`:
 * 
 * 1. Di menu sebelah kiri editor Google Apps Script, klik ikon Roda Gigi ⚙️ (Setelan Proyek / Project Settings).
 * 2. Centang pilihan "Tampilkan file manifes 'appsscript.json' di editor" (Show "appsscript.json" manifest file in editor).
 * 3. Kembali ke editor kode dengan mengklik ikon Kode < > di sebelah kiri.
 * 4. Anda sekarang akan melihat file baru bernama "appsscript.json" di daftar file.
 * 5. Buka file "appsscript.json" tersebut, hapus isinya, dan PASTE kode JSON berikut:
 * 
 * {
 *   "timeZone": "Asia/Jakarta",
 *   "dependencies": {},
 *   "exceptionLogging": "STACKDRIVER",
 *   "runtimeVersion": "V8",
 *   "oauthScopes": [
 *     "https://www.googleapis.com/auth/spreadsheets",
 *     "https://www.googleapis.com/auth/script.external_request",
 *     "https://www.googleapis.com/auth/cloud-platform",
 *     "https://www.googleapis.com/auth/datastore"
 *   ]
 * }
 * 
 * 6. Simpan file tersebut (Klik ikon simpan/disket).
 * 7. Lakukan "Terapkan" (Deploy) ulang:
 *    - Klik Terapkan (Deploy) > Kelola penerapan (Manage deployments).
 *    - Klik ikon Pensil (Edit) pada penerapan aktif Anda.
 *    - Di bagian Versi (Version), pilih "Versi baru" (New version).
 *    - Klik Terapkan (Deploy).
 *    - Google mungkin akan meminta Anda memberikan otorisasi ulang (Authorize) karena ada cakupan izin baru. Klik "Berikan Akses" dan setujui izinnya.
 * 
 * CARA INSTALASI & UPDATE KODE DI SPREADSHEET (BAHASA INDONESIA):
 * ------------------------------------------------------------------------------
 * 1. Buka Google Spreadsheet Anda:
 *    https://docs.google.com/spreadsheets/d/1BlzO5TeCmOeRqTrg-M0AmrxRs89ohM9vBhtmVMAofkE/edit
 * 2. Di menu atas, pilih: Ekstensi (Extensions) > Apps Script.
 * 3. Hapus seluruh kode lama yang ada di editor Apps Script Anda.
 * 4. COPY seluruh kode di bawah ini, lalu PASTE ke dalam editor Apps Script.
 * 5. Klik ikon Simpan (Save/Disket) di bagian atas editor.
 * 
 * AGAR SELALU TERISI SECARA REAL-TIME (PER DETIK / INSTAN):
 * ------------------------------------------------------------------------------
 * 1. Di bagian kanan atas editor Apps Script, klik tombol biru "Terapkan" (Deploy) > "Penerapan baru" (New deployment).
 * 2. Jika Anda meng-update kode: Pilih "Kelola penerapan" (Manage deployments), lalu edit penerapan yang sudah ada, setel versi ke "Versi Baru" (New version), dan klik "Terapkan".
 *    Jika Anda membuat baru: Pilih "Aplikasi web" (Web app).
 * 3. Konfigurasikan:
 *    - Deskripsi: Real-time Firestore Sync (OAuth2)
 *    - Jalankan sebagai (Execute as): Saya (Me / muhamad.rizki@pancaran-logistic.id)
 *    - Siapa yang memiliki akses (Who has access): Siapa saja (Anyone) -> *Penting agar React App bisa mengirim sinyal sinkronisasi!*
 * 4. Klik "Terapkan" (Deploy).
 * 5. Jika muncul jendela otorisasi, klik "Berikan Akses" (Authorize Access), pilih akun Anda, 
 *    klik "Advanced" di kiri bawah, lalu klik "Go to Pancaran Firestore Sync (unsafe)" dan setujui izinnya.
 * 6. Setelah berhasil, salin "URL Aplikasi Web" (Web App URL) baru yang diberikan.
 * 7. Masukkan URL tersebut ke dalam pengaturan env aplikasi web Anda (atau hubungi admin) dengan kunci:
 *    VITE_APPS_SCRIPT_URL="URL_APLIKASI_WEB_BARU_ANDA"
 * 
 * CATATAN UNTUK MEMPERBAIKI ERROR 403 (PEMBATASAN AKSES TOKEN):
 * ------------------------------------------------------------------------------
 * Karena kita menggunakan `ScriptApp.getOAuthToken()` untuk membaca data Firestore Anda yang aman,
 * Google Apps Script membutuhkan izin eksplisit untuk cakupan (scopes) Google Cloud.
 * Jika Anda menjalankan fungsi `syncFirestoreToSpreadsheet` secara manual di editor Apps Script pertama kali, 
 * Google akan meminta Anda memberikan izin keamanan. Ini wajib disetujui sekali saja agar token OAuth2 aktif.
 */

// ==================== CONFIGURATION ====================
var SPREADSHEET_ID = "1BlzO5TeCmOeRqTrg-M0AmrxRs89ohM9vBhtmVMAofkE";
var PROJECT_ID = "gen-lang-client-0387361643";
var DATABASE_ID = "ai-studio-remixremixpancar-e5d36007-18cd-4f4e-8eec-a93a35f15981";
// =======================================================

/**
 * Endpoint POST yang akan dipanggil oleh React Web App secara instan (real-time)
 * ketika terjadi aksi database (add bid, update asset, delete, dll.)
 */
function doPost(e) {
  try {
    Logger.log("Menerima webhook...");
    
    // Parse data post jika ada
    var postData = null;
    if (e && e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        Logger.log("Gagal parse postData: " + parseErr.toString());
      }
    }

    // Jika aksinya adalah kirim OTP, kirim email verifikasi asli
    if (postData && postData.action === "send_otp") {
      var email = postData.email;
      var code = postData.code;
      var name = postData.name || "User";
      
      MailApp.sendEmail({
        to: email,
        subject: "Kode Verifikasi OTP - Pancaran Lelang",
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
            <div style="background-color: #1e3a8a; padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold;">PANCARAN LELANG</h2>
              <p style="color: #93c5fd; margin: 5px 0 0 0; font-size: 12px; letter-spacing: 1px; font-weight: bold;">PORTAL LELANG OTOMOTIF & LOGISTIK</p>
            </div>
            <div style="padding: 25px; color: #334155; line-height: 1.6;">
              <p style="font-size: 15px; margin-top: 0;">Halo <strong style="color: #1e3a8a;">${name}</strong>,</p>
              <p style="font-size: 14px;">Terima kasih telah mendaftar di <strong>Pancaran Lelang</strong>. Untuk mengaktifkan akun Anda dan memverifikasi keaslian kepemilikan email, silakan gunakan kode verifikasi OTP berikut:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e3a8a; background-color: #f1f5f9; padding: 15px 30px; border-radius: 10px; border: 1px solid #cbd5e1; font-family: monospace; display: inline-block;">${code}</span>
              </div>
              
              <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
                Masukkan kode di atas pada formulir verifikasi di halaman web. Kode ini berlaku selama 15 menit. Jika Anda tidak melakukan pendaftaran ini, Anda dapat mengabaikan email ini dengan aman.
              </p>
            </div>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8; margin-top: 20px;">
              Email ini dikirim secara otomatis oleh sistem keamanan Pancaran Lelang.<br>
              &copy; 2026 PT Pancaran Darma Herindo (Pancaran Logistics). Hak Cipta Dilindungi.
            </div>
          </div>
        `
      });
      
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        message: "Kode OTP berhasil dikirim ke email asli Anda!" 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Jalankan fungsi sinkronisasi utama
    syncFirestoreToSpreadsheet();
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      message: "Spreadsheet berhasil diperbarui secara instan!" 
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log("Gagal memproses webhook: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Endpoint GET untuk pengujian manual lewat browser jika dibutuhkan
 */
function doGet(e) {
  try {
    syncFirestoreToSpreadsheet();
    return ContentService.createTextOutput("Sinkronisasi Berhasil! Data Firestore Pancaran telah disalin ke Google Sheets.").setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    return ContentService.createTextOutput("Gagal: " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * Fungsi Utama untuk mengambil seluruh data dari Firestore REST API
 * dan menuliskannya secara rapi ke Spreadsheet.
 */
function syncFirestoreToSpreadsheet() {
  Logger.log("Memulai sinkronisasi dari Firestore...");
  
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Ambil dan Sinkronisasikan Data Assets & Bids
  var assets = fetchFirestoreCollection("assets");
  Logger.log("Berhasil mengambil " + assets.length + " assets.");
  writeAssetsAndBidsToSheet(ss, assets);
  
  // Ambil dan Sinkronisasikan Data Admins
  var admins = fetchFirestoreCollection("admins");
  Logger.log("Berhasil mengambil " + admins.length + " admins.");
  writeAdminsToSheet(ss, admins);
  
  Logger.log("Sinkronisasi selesai dengan sukses!");
}

/**
 * Mengambil dokumen dari koleksi Firestore menggunakan OAuth2 Token Internal Google
 */
function fetchFirestoreCollection(collectionName) {
  // Ditambahkan parameter ?pageSize=300 agar data tidak terpotong maksimal 20 item
  var url = "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID + 
            "/databases/" + DATABASE_ID + "/documents/" + collectionName + "?pageSize=300";
  
  try {
    // FIX 403: Mengambil OAuth2 Access Token akun Google Anda secara otomatis
    var token = ScriptApp.getOAuthToken();
    
    var options = {
      "method": "get",
      "headers": {
        "Authorization": "Bearer " + token
      },
      "muteHttpExceptions": true
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      Logger.log("Error mengambil koleksi " + collectionName + " (Code: " + responseCode + "): " + response.getContentText());
      return [];
    }
    
    var data = JSON.parse(response.getContentText());
    var rawDocuments = data.documents || [];
    
    // Parse dokumen-dokumen Firestore ke objek JavaScript standar yang bersih
    return rawDocuments.map(function(doc) {
      return parseFirestoreDocument(doc);
    });
  } catch (error) {
    Logger.log("Gagal melakukan fetch " + collectionName + ": " + error.toString());
    return [];
  }
}

/**
 * Memformat dan menulis data Assets dan Bids ke sheet masing-masing
 */
function writeAssetsAndBidsToSheet(ss, assets) {
  // ------------------ 1. SINKRONISASI SHEET "ASSETS" ------------------
  var assetsSheet = getOrCreateSheet(ss, "Assets");
  assetsSheet.clear(); // Bersihkan sheet agar selalu up-to-date
  
  var assetsHeader = [
    "Asset ID", "Nama Unit", "Merek (Brand)", "Kategori", "Tahun", 
    "Nomor Polisi", "Kondisi", "Lokasi", "Harga Awal (IDR)", 
    "Penawaran Tertinggi (IDR)", "Status Unit", "URL Gambar", 
    "Total Penawaran (Bids)", "Deskripsi Lengkap"
  ];
  
  var assetsRows = [assetsHeader];
  var bidsRows = [[
    "Asset ID", "Nama Unit", "Nama Penawar (Bidder)", "Email Penawar", 
    "Kontak (WA/Telp)", "Harga Bid (IDR)", "Waktu Bid", 
    "Request Survei?", "Tanggal Survei", "Sesi Survei", "Status Bid"
  ]];
  
  assets.forEach(function(asset) {
    // Tentukan jumlah penawaran
    var totalBids = 0;
    if (asset.bids && Array.isArray(asset.bids)) {
      totalBids = asset.bids.length;
    }
    
    // Baris Asset
    assetsRows.push([
      asset.id || "",
      asset.name || "",
      asset.brand || "",
      asset.category || "",
      asset.modelYear !== undefined ? asset.modelYear : "",
      asset.plateNumber || "",
      asset.condition || "",
      asset.location || "",
      asset.startingPrice !== undefined ? asset.startingPrice : 0,
      asset.highestBid !== undefined ? asset.highestBid : (asset.startingPrice || 0),
      asset.status || "Open",
      asset.imageUrl || "",
      totalBids,
      asset.description || ""
    ]);
    
    // Ekstrak bids bersarang untuk dicatat ke Sheet "Bids" (Tabel Mendatar)
    if (asset.bids && Array.isArray(asset.bids)) {
      asset.bids.forEach(function(bid) {
        bidsRows.push([
          asset.id || "",
          asset.name || "",
          bid.name || "",
          bid.email || "",
          bid.contact || "",
          bid.price !== undefined ? bid.price : 0,
          bid.timestamp ? formatDateString(bid.timestamp) : "",
          bid.requestSurvey ? "Ya" : "Tidak",
          bid.surveyDate || "-",
          bid.surveySession || "-",
          bid.status || "pending"
        ]);
      });
    }
  });
  
  // Tulis data ke sheet Assets
  if (assetsRows.length > 1) {
    assetsSheet.getRange(1, 1, assetsRows.length, assetsHeader.length).setValues(assetsRows);
  } else {
    assetsSheet.getRange(1, 1, 1, assetsHeader.length).setValues([assetsHeader]);
  }
  formatHeaderRow(assetsSheet, assetsHeader.length);
  
  // ------------------ 2. SINKRONISASI SHEET "BIDS" ------------------
  var bidsSheet = getOrCreateSheet(ss, "Bids");
  bidsSheet.clear();
  
  var bidsHeader = bidsRows[0];
  if (bidsRows.length > 1) {
    bidsSheet.getRange(1, 1, bidsRows.length, bidsHeader.length).setValues(bidsRows);
  } else {
    bidsSheet.getRange(1, 1, 1, bidsHeader.length).setValues([bidsHeader]);
  }
  formatHeaderRow(bidsSheet, bidsHeader.length);
}

/**
 * Memformat dan menulis data Admins ke sheet "Admins"
 */
function writeAdminsToSheet(ss, admins) {
  var adminsSheet = getOrCreateSheet(ss, "Admins");
  adminsSheet.clear();
  
  var adminsHeader = ["Email Admin", "Nama", "Peran (Role)", "Tanggal Dibuat"];
  var adminsRows = [adminsHeader];
  
  admins.forEach(function(admin) {
    adminsRows.push([
      admin.email || "",
      admin.name || "",
      admin.role || "",
      admin.createdAt || ""
    ]);
  });
  
  if (adminsRows.length > 1) {
    adminsSheet.getRange(1, 1, adminsRows.length, adminsHeader.length).setValues(adminsRows);
  } else {
    adminsSheet.getRange(1, 1, 1, adminsHeader.length).setValues([adminsHeader]);
  }
  formatHeaderRow(adminsSheet, adminsHeader.length);
}

/**
 * Mengambil sheet dengan nama tertentu, atau membuatnya jika belum ada
 */
function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

/**
 * Menghias baris header sheet agar tampil profesional dan elegan
 */
function formatHeaderRow(sheet, columnCount) {
  if (columnCount <= 0) return;
  
  var headerRange = sheet.getRange(1, 1, 1, columnCount);
  
  // Berikan warna latar biru dongker elegan (Pancaran Blue Theme) dan teks putih tebal
  headerRange.setBackground("#1E3A8A")
             .setFontColor("#FFFFFF")
             .setFontWeight("bold")
             .setHorizontalAlignment("center")
             .setVerticalAlignment("middle");
  
  // Bekukan (freeze) baris pertama agar tidak ikut tergulung saat scroll ke bawah
  sheet.setFrozenRows(1);
  
  // Atur tinggi baris header agar terlihat longgar & profesional
  sheet.setRowHeight(1, 28);
  
  // Sesuaikan lebar kolom otomatis sesuai isi agar terbaca sempurna
  for (var col = 1; col <= columnCount; col++) {
    sheet.autoResizeColumn(col);
    // Tambahkan sedikit ruang ekstra agar tidak terlalu mepet
    var currentWidth = sheet.getColumnWidth(col);
    if (currentWidth < 100) {
      sheet.setColumnWidth(col, 120);
    } else {
      sheet.setColumnWidth(col, currentWidth + 15);
    }
  }
}

/**
 * Helper untuk menyederhanakan parsing tipe data Firestore REST API yang kompleks
 */
function parseFirestoreValue(value) {
  if (!value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return parseFloat(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) {
    var values = value.arrayValue.values || [];
    return values.map(function(item) {
      return parseFirestoreValue(item);
    });
  }
  if ('mapValue' in value) {
    var fields = value.mapValue.fields || {};
    var obj = {};
    for (var key in fields) {
      obj[key] = parseFirestoreValue(fields[key]);
    }
    return obj;
  }
  return null;
}

/**
 * Mem-parsing dokumen Firestore mentah menjadi objek JavaScript murni
 */
function parseFirestoreDocument(doc) {
  var fields = doc.fields || {};
  var result = {};
  
  // Ambil ID dari akhir path nama dokumen (misal: "projects/.../documents/assets/PL-2026-001")
  var nameParts = doc.name.split('/');
  result.id = nameParts[nameParts.length - 1];
  
  for (var key in fields) {
    result[key] = parseFirestoreValue(fields[key]);
  }
  return result;
}

/**
 * Memformat string tanggal ISO menjadi format terbaca sederhana WIB/Local
 */
function formatDateString(isoString) {
  try {
    var date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    
    // Format: YYYY-MM-DD HH:mm:ss
    var year = date.getFullYear();
    var month = ("0" + (date.getMonth() + 1)).slice(-2);
    var day = ("0" + date.getDate()).slice(-2);
    var hours = ("0" + date.getHours()).slice(-2);
    var minutes = ("0" + date.getMinutes()).slice(-2);
    var seconds = ("0" + date.getSeconds()).slice(-2);
    
    return year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;
  } catch (err) {
    return isoString;
  }
}
