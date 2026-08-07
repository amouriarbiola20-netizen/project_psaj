// import-jadwal-kelas.js
// Skrip SEKALI JALAN untuk membaca Template_Jadwal_Kelas.xlsx (sheet "Jadwal")
// lalu meng-upload semua barisnya ke tabel "jadwal_kelas" di Supabase.
//
// Cara pakai:
//   1. Taruh file Excel yang sudah diisi di folder project ini
//   2. Jalankan: node import-jadwal-kelas.js nama-file-excel-kamu.xlsx
//   3. Tunggu sampai selesai, cek pesan "Selesai! X baris berhasil diupload"

require('dotenv').config();
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

const namaFile = process.argv[2];
if (!namaFile) {
  console.error('❌ Sebutkan nama file Excel-nya. Contoh: node import-jadwal-kelas.js Template_Jadwal_Kelas.xlsx');
  process.exit(1);
}

function normalisasiJam(nilai) {
  // Menerima "07:40", "7:40", angka Excel time, dll -> selalu keluar "HH:mm"
  if (typeof nilai === 'number') {
    // Excel kadang menyimpan jam sebagai pecahan hari (0.319... = 07:40)
    const totalMenit = Math.round(nilai * 24 * 60);
    const jam = Math.floor(totalMenit / 60);
    const menit = totalMenit % 60;
    return `${String(jam).padStart(2, '0')}:${String(menit).padStart(2, '0')}`;
  }
  const teks = String(nilai).trim().replace('.', ':');
  const [jam, menit] = teks.split(':');
  return `${jam.padStart(2, '0')}:${(menit || '00').padStart(2, '0')}`;
}

async function main() {
  console.log(`📖 Membaca file: ${namaFile}`);
  const workbook = xlsx.readFile(namaFile);
  const sheet = workbook.Sheets['Jadwal'];
  if (!sheet) {
    console.error('❌ Sheet bernama "Jadwal" tidak ditemukan di file ini.');
    process.exit(1);
  }

  const baris = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  console.log(`📋 Ditemukan ${baris.length} baris data.`);

  const payload = baris
    .filter((b) => b['Kelas'] && b['Hari'] && b['Jam Mulai'])
    .map((b) => ({
      kelas: String(b['Kelas']).trim().toUpperCase(),
      hari: String(b['Hari']).trim(),
      jam_mulai: normalisasiJam(b['Jam Mulai']),
      jam_selesai: normalisasiJam(b['Jam Selesai']),
      kode_mapel: String(b['Kode Mapel'] || '').trim(),
      kode_ruang: String(b['Kode Ruang'] || '').trim(),
    }));

  if (payload.length === 0) {
    console.log('⚠️  Tidak ada baris valid untuk diupload (cek apakah kolom Kelas/Hari/Jam Mulai terisi).');
    return;
  }

  console.log(`⬆️  Mengupload ${payload.length} baris ke Supabase...`);

  // Upload per 500 baris sekaligus (batasi ukuran request)
  const ukuranBatch = 500;
  let totalSukses = 0;
  for (let i = 0; i < payload.length; i += ukuranBatch) {
    const batch = payload.slice(i, i + ukuranBatch);
    const { error } = await supabase.from('jadwal_kelas').insert(batch);
    if (error) {
      console.error('❌ Gagal upload batch:', error.message);
      process.exit(1);
    }
    totalSukses += batch.length;
    console.log(`   ...${totalSukses}/${payload.length} baris terupload`);
  }

  console.log(`✅ Selesai! ${totalSukses} baris berhasil diupload ke tabel jadwal_kelas.`);
}

main().catch((err) => {
  console.error('❌ Terjadi error:', err.message);
  process.exit(1);
});
