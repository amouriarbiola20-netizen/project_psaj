// server.js
// Server web: menyajikan halaman chat + endpoint API yang menghubungkan ke AI dan database

require('dotenv').config();
const express = require('express');
const path = require('path');

const { parseChat } = require('./src/ai');
const {
  tambahJadwal,
  ambilJadwalByTanggal,
  ambilJadwalByRentang,
  cariJadwal,
  updateJadwal,
  hapusJadwal,
  ambilJadwalKelas,
} = require('./src/supabase');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
  const pesanUser = (req.body?.pesan || '').trim();

  if (!pesanUser) {
    return res.status(400).json({ balasan: 'Pesannya kosong nih, coba tulis sesuatu dulu.' });
  }

  try {
    const hasil = await parseChat(pesanUser);
    const balasan = await prosesIntent(hasil);
    res.json({ balasan });
  } catch (err) {
    console.error('Terjadi error:', err);
    res.status(500).json({ balasan: 'Maaf, ada kendala teknis di server. Coba lagi ya.' });
  }
});

async function prosesIntent(hasil) {
  switch (hasil.intent) {
    case 'tambah_jadwal': {
      const daftarJadwal = Array.isArray(hasil.jadwal) ? hasil.jadwal : [];
      const valid = daftarJadwal.filter((j) => j.kegiatan && j.tanggal);

      if (valid.length === 0) {
        return 'Boleh sebutkan lagi kegiatan dan tanggalnya? Aku belum yakin nangkepnya 🙏';
      }

      const hasilSimpan = [];
      for (const item of valid) {
        try {
          const disimpan = await tambahJadwal(item);
          hasilSimpan.push(disimpan);
        } catch (err) {
          if (err.tipe === 'tanggal_invalid') {
            return `Tanggal untuk "${item.kegiatan}" kurang jelas nih, coba sebutkan tanggal atau hari yang lebih pasti ya 🙏`;
          }
          throw err;
        }
      }

      if (hasilSimpan.length === 1) {
        const j = hasilSimpan[0];
        return `✅ Oke, jadwal sudah disimpan:\n${j.kegiatan}\n📅 ${j.hari}, ${j.tanggal}${j.jam ? `\n⏰ ${j.jam}` : ''}`;
      }

      const daftarTeks = hasilSimpan
        .map((j) => `• ${j.kegiatan} — ${j.hari}, ${j.tanggal}${j.jam ? ` (${j.jam})` : ''}`)
        .join('\n');
      return `✅ Oke, ${hasilSimpan.length} jadwal sudah disimpan:\n${daftarTeks}`;
    }

    case 'edit_jadwal': {
      if (!hasil.kegiatan) {
        return 'Jadwal yang mana yang mau diubah? Sebutkan nama kegiatannya ya 🙏';
      }
      const ditemukan = await cariJadwal(hasil.kegiatan, hasil.tanggal);

      if (ditemukan.length === 0) {
        return `Aku tidak menemukan jadwal "${hasil.kegiatan}"${hasil.tanggal ? ` pada ${hasil.tanggal}` : ''}. Coba sebutkan lebih spesifik ya.`;
      }
      if (ditemukan.length > 1) {
        const daftar = ditemukan
          .map((j) => `• ${j.kegiatan} — ${j.hari}, ${j.tanggal} (${j.jam || '--:--'})`)
          .join('\n');
        return `Ada beberapa jadwal yang cocok, sebutkan lebih spesifik:\n${daftar}`;
      }

      const jadwalLama = ditemukan[0];
      const updated = await updateJadwal(jadwalLama.id, {
        kegiatan: hasil.kegiatan_baru,
        tanggal: hasil.tanggal_baru,
        jam: hasil.jam_baru,
        hari: hasil.hari_baru,
      });
      return `✅ Jadwal berhasil diubah:\n${updated.kegiatan}\n📅 ${updated.hari || ''}, ${updated.tanggal}${updated.jam ? `\n⏰ ${updated.jam}` : ''}`;
    }

    case 'hapus_jadwal': {
      if (!hasil.kegiatan) {
        return 'Jadwal yang mana yang mau dihapus? Sebutkan nama kegiatannya ya 🙏';
      }
      const ditemukan = await cariJadwal(hasil.kegiatan, hasil.tanggal);

      if (ditemukan.length === 0) {
        return `Aku tidak menemukan jadwal "${hasil.kegiatan}"${hasil.tanggal ? ` pada ${hasil.tanggal}` : ''}. Mungkin sudah terhapus atau belum pernah tercatat.`;
      }
      if (ditemukan.length > 1) {
        const daftar = ditemukan
          .map((j) => `• ${j.kegiatan} — ${j.hari}, ${j.tanggal} (${j.jam || '--:--'})`)
          .join('\n');
        return `Ada beberapa jadwal yang cocok, sebutkan lebih spesifik biar nggak salah hapus:\n${daftar}`;
      }

      const target = ditemukan[0];
      await hapusJadwal(target.id);
      return `🗑️ Oke, jadwal ini sudah dihapus:\n${target.kegiatan}\n📅 ${target.hari}, ${target.tanggal}${target.jam ? `\n⏰ ${target.jam}` : ''}`;
    }

    case 'cek_jadwal_hari': {
      const daftar = await ambilJadwalByTanggal(hasil.tanggal);
      if (daftar.length === 0) {
        return `Tidak ada jadwal tercatat untuk ${hasil.hari || hasil.tanggal} 📭`;
      }
      const teks = daftar.map((j) => `• ${j.jam || '--:--'} - ${j.kegiatan}`).join('\n');
      return `📅 Jadwal ${hasil.hari || hasil.tanggal}:\n${teks}`;
    }

    case 'cek_jadwal_minggu': {
      const mulai = hasil.tanggal || new Date().toISOString().split('T')[0];
      const tglMulai = new Date(mulai);
      const tglSelesai = new Date(mulai);
      tglSelesai.setDate(tglSelesai.getDate() + 6);

      const daftar = await ambilJadwalByRentang(
        tglMulai.toISOString().split('T')[0],
        tglSelesai.toISOString().split('T')[0]
      );

      if (daftar.length === 0) {
        return 'Tidak ada jadwal tercatat untuk minggu ini 📭';
      }
      const teks = daftar
        .map((j) => `• ${j.hari}, ${j.tanggal} (${j.jam || '--:--'}) - ${j.kegiatan}`)
        .join('\n');
      return `📅 Jadwal minggu ini:\n${teks}`;
    }

    case 'cek_jadwal_kelas': {
      if (!hasil.kelas) {
        return 'Kelas yang mana ya? Sebutkan contohnya "jadwal kelas 12 TJKT 1" 🙏';
      }

      const daftar = await ambilJadwalKelas(hasil.kelas, hasil.hari);

      if (daftar.length === 0) {
        return `Belum ada data jadwal untuk kelas "${hasil.kelas}"${hasil.hari ? ` di hari ${hasil.hari}` : ''}. Mungkin datanya belum diupload.`;
      }

      const perHari = {};
      for (const j of daftar) {
        if (!perHari[j.hari]) perHari[j.hari] = [];
        perHari[j.hari].push(j);
      }

      const urutanHari = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
      const bagian = urutanHari
        .filter((h) => perHari[h])
        .map((h) => {
          const jamJam = perHari[h]
            .map((j) => `   • ${j.jam_mulai}–${j.jam_selesai} — ${j.kode_mapel}${j.kode_ruang ? ` (Ruang ${j.kode_ruang})` : ''}`)
            .join('\n');
          return `📅 ${h}:\n${jamJam}`;
        })
        .join('\n\n');

      return `Jadwal kelas ${daftar[0].kelas}:\n\n${bagian}`;
    }

    default:
      return (
        hasil.balasan_ramah ||
        'Aku bisa bantu catat, ubah, atau cek jadwal kamu. Coba bilang misalnya "tambahin jadwal meeting besok jam 3 sore".'
      );
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server jalan di http://localhost:${PORT}`);
});
