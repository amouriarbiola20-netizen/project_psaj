// src/supabase.js
// Koneksi ke Supabase (PostgreSQL) + fungsi-fungsi untuk simpan/ambil/edit jadwal

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Karena chatbot web ini dipakai satu orang (tanpa sistem login),
// kita pakai satu "id pengguna" tetap untuk menandai baris data di tabel yang sama.
// Kalau nanti mau multi-user beneran, tinggal ganti ID ini jadi dinamis (misal dari sesi login).
const USER_ID = 'web_default';

async function hariDariTanggal(tanggal) {
  const namaHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const d = new Date(tanggal + 'T00:00:00');
  return namaHari[d.getDay()];
}

async function tambahJadwal(data) {
  const formatTanggalOk = /^\d{4}-\d{2}-\d{2}$/.test(data.tanggal || '');
  if (!formatTanggalOk) {
    const err = new Error('Format tanggal tidak valid');
    err.tipe = 'tanggal_invalid';
    throw err;
  }

  const kegiatan = (data.kegiatan || '').trim();
  if (!kegiatan) {
    const err = new Error('Kegiatan kosong');
    err.tipe = 'kegiatan_kosong';
    throw err;
  }

  // Nama hari selalu dihitung ulang di server, bukan dipercaya dari AI,
  // supaya selalu akurat walau AI meleset menyebut nama harinya.
  const hariAkurat = hariDariTanggal(data.tanggal);

  const { data: hasil, error } = await supabase
    .from('jadwal')
    .insert({
      nomor_wa: USER_ID,
      kegiatan,
      tanggal: data.tanggal,
      jam: data.jam || null,
      hari: hariAkurat,
    })
    .select();
  if (error) throw error;
  return hasil[0];
}

module.exports = {
  supabase,
  tambahJadwal,
  ambilJadwalByTanggal,
  ambilJadwalByRentang,
  cariJadwal,
  updateJadwal,
  ambilJadwalKelas,
};
