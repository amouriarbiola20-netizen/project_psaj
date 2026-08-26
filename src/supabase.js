// src/supabase.js
// Koneksi ke Supabase (PostgreSQL + Auth) + fungsi simpan/ambil/edit/hapus jadwal
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Client terpisah pakai anon key, khusus buat verifikasi token login user dari frontend.
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const USER_ID = 'web_default';

function hariDariTanggal(tanggal) {
  const namaHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const d = new Date(tanggal + 'T00:00:00');
  return namaHari[d.getDay()];
}

// Cek apakah request ini datang dari admin yang sudah login.
// authHeader formatnya "Bearer <token>", dikirim dari frontend.
async function verifyAdmin(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data?.user?.email) return false;
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  return data.user.email.toLowerCase() === adminEmail;
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

async function hapusJadwal(id) {
  const { data, error } = await supabase
    .from('jadwal')
    .delete()
    .eq('id', id)
    .eq('nomor_wa', USER_ID)
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
  verifyAdmin,
  tambahJadwal,
  ambilJadwalByTanggal,
  ambilJadwalByRentang,
  cariJadwal,
  updateJadwal,
  hapusJadwal,
  ambilJadwalKelas,
};
