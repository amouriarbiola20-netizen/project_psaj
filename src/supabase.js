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

async function tambahJadwal(data) {
  const { data: hasil, error } = await supabase
    .from('jadwal')
    .insert({
      nomor_wa: USER_ID, // kolom lama dipakai ulang sebagai id pengguna generik
      kegiatan: data.kegiatan,
      tanggal: data.tanggal,
      jam: data.jam,
      hari: data.hari,
    })
    .select();

  if (error) throw error;
  return hasil[0];
}

async function ambilJadwalByTanggal(tanggal) {
  const { data, error } = await supabase
    .from('jadwal')
    .select('*')
    .eq('nomor_wa', USER_ID)
    .eq('tanggal', tanggal)
    .order('jam', { ascending: true });

  if (error) throw error;
  return data;
}

async function ambilJadwalByRentang(tanggalMulai, tanggalSelesai) {
  const { data, error } = await supabase
    .from('jadwal')
    .select('*')
    .eq('nomor_wa', USER_ID)
    .gte('tanggal', tanggalMulai)
    .lte('tanggal', tanggalSelesai)
    .order('tanggal', { ascending: true })
    .order('jam', { ascending: true });

  if (error) throw error;
  return data;
}

async function cariJadwal(kegiatan, tanggal) {
  let query = supabase
    .from('jadwal')
    .select('*')
    .eq('nomor_wa', USER_ID)
    .ilike('kegiatan', `%${kegiatan}%`);

  if (tanggal) {
    query = query.eq('tanggal', tanggal);
  }

  const { data, error } = await query.order('tanggal', { ascending: true });
  if (error) throw error;
  return data;
}

async function updateJadwal(id, dataBaru) {
  const payload = {};
  if (dataBaru.kegiatan) payload.kegiatan = dataBaru.kegiatan;
  if (dataBaru.tanggal) payload.tanggal = dataBaru.tanggal;
  if (dataBaru.jam) payload.jam = dataBaru.jam;
  if (dataBaru.hari) payload.hari = dataBaru.hari;

  const { data, error } = await supabase
    .from('jadwal')
    .update(payload)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
}

async function ambilJadwalKelas(kelas, hari) {
  let query = supabase
    .from('jadwal_kelas')
    .select('*')
    .ilike('kelas', `%${kelas}%`);

  if (hari) {
    query = query.ilike('hari', hari);
  }

  const { data, error } = await query.order('hari', { ascending: true }).order('jam_mulai', { ascending: true });
  if (error) throw error;
  return data;
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
