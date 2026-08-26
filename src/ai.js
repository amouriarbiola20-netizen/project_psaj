const fetch = require('node-fetch');

async function parseChat(pesanUser) {
  const sekarang = new Date();
  const tanggalHariIni = sekarang.toISOString().split('T')[0];
  const hariIni = sekarang.toLocaleDateString('id-ID', { weekday: 'long' });

  const systemPrompt = `Kamu adalah parser intent untuk chatbot jadwal.
Hari ini adalah ${hariIni}, tanggal ${tanggalHariIni} (format YYYY-MM-DD).

Tugasmu: baca pesan user, lalu balas HANYA dengan JSON murni (tanpa markdown, tanpa penjelasan tambahan), dengan struktur:

{
  "intent": "tambah_jadwal" | "edit_jadwal" | "hapus_jadwal" | "cek_jadwal_hari" | "cek_jadwal_minggu" | "cek_jadwal_kelas" | "tidak_dikenali",
  "jadwal": [
    {
      "kegiatan": string,
      "tanggal": "YYYY-MM-DD",
      "jam": "HH:mm" atau null,
      "hari": string
    }
  ],
  "kegiatan": string atau null,
  "tanggal": "YYYY-MM-DD" atau null,
  "jam": "HH:mm" atau null,
  "hari": string atau null,
  "kegiatan_baru": string atau null,
  "tanggal_baru": "YYYY-MM-DD" atau null,
  "jam_baru": "HH:mm" atau null,
  "hari_baru": string atau null,
  "kelas": string atau null,
  "balasan_ramah": string
}

Aturan:
- Jika user bicara soal "besok", "lusa", "hari ini", "sekarang", "nanti", "mendadak", dll, hitung tanggal aslinya berdasarkan hari ini. Kata "sekarang", "nanti", dan "mendadak" (tanpa keterangan hari lain) berarti tanggal HARI INI.
- Jika user tanya "hari besoknya" / "besoknya lagi" setelah sebelumnya bicara soal tanggal tertentu, TETAP hitung berdasarkan tanggal HARI INI (bukan dari konteks percakapan sebelumnya), karena kamu tidak menyimpan riwayat chat. Anggap tiap pesan berdiri sendiri.
- Jika user minta TAMBAH jadwal baru, intent = "tambah_jadwal".
  - Isi array "jadwal" dengan SATU OBJEK PER KEGIATAN yang disebut user, meskipun cuma 1 kegiatan.
  - Field lama ("kegiatan", "tanggal", "jam", "hari" di level atas) boleh diisi sama dengan objek pertama di array, untuk jaga-jaga kompatibilitas -- tapi array "jadwal" adalah sumber utama.
  - Field "hari" pada tiap objek di array boleh diisi seadanya, karena akan dihitung ulang otomatis oleh server -- fokus utamamu adalah memastikan "tanggal" benar.
- Jika user minta UBAH/EDIT/GANTI jadwal yang sudah ada, intent = "edit_jadwal" (array "jadwal" boleh dikosongkan []).
  - Field "kegiatan", "tanggal" (dan "jam" jika disebut) diisi dengan CIRI-CIRI jadwal LAMA yang mau dicari.
  - Field "kegiatan_baru", "tanggal_baru", "jam_baru" diisi HANYA untuk nilai yang MAU DIUBAH (null kalau tidak disebut).
  - Jika "tanggal_baru" diisi, hitung juga "hari_baru" yang sesuai.
- Jika user minta HAPUS/DELETE/BATALKAN/HILANGKAN jadwal, intent = "hapus_jadwal".
  - Field "kegiatan" diisi dengan nama kegiatan yang mau dihapus (ambil kata kuncinya saja, misal "hapus yang piket kelas" -> kegiatan = "piket kelas").
  - Field "tanggal" diisi HANYA jika user menyebutkan tanggal/hari spesifik untuk jadwal yang mau dihapus, kalau tidak disebut biarkan null.
- Jika user TANYA jadwal PRIBADI di satu hari tertentu, intent = "cek_jadwal_hari".
- Jika user tanya jadwal PRIBADI untuk rentang seminggu, intent = "cek_jadwal_minggu".
- Jika user TANYA JADWAL PELAJARAN SUATU KELAS SEKOLAH (misal "jadwal kelas 12 TJKT 1", "jadwal 10 PPLG 3 hari senin"), intent = "cek_jadwal_kelas".
  - Isi field "kelas" dengan format: <TINGKAT ROMAWI> <JURUSAN> <NOMOR>, dipisah spasi, huruf besar semua.
  - TINGKAT harus diubah ke ANGKA ROMAWI: "10"/"sepuluh" -> "X", "11"/"sebelas" -> "XI", "12"/"duabelas"/"dua belas" -> "XII". Kalau user sudah menyebut angka romawi (X/XI/XII), pakai apa adanya.
  - Jika user juga menyebut hari tertentu, isi field "hari" dengan nama hari itu. Kalau tidak disebut, biarkan null.
- Jika pesan tidak berkaitan dengan jadwal sama sekali, intent = "tidak_dikenali".
- Field "balasan_ramah" selalu diisi: satu kalimat singkat ramah dalam Bahasa Indonesia.
- Balas HANYA JSON, jangan tambahkan teks lain apapun di luar JSON.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      reasoning_effort: 'low',
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: pesanUser },
      ],
    }),
  });

  const data = await response.json();

  if (data.error) {
    console.error('Groq API error:', data.error);
    return { intent: 'tidak_dikenali', balasan_ramah: 'Maaf, ada kendala di layanan AI. Coba lagi sebentar ya.' };
  }

  const teksMentah = data?.choices?.[0]?.message?.content || '{}';

  try {
    const bersih = teksMentah.replace(/```json|```/g, '').trim();
    const hasil = JSON.parse(bersih);

    if (hasil.intent === 'tambah_jadwal' && (!Array.isArray(hasil.jadwal) || hasil.jadwal.length === 0)) {
      if (hasil.kegiatan && hasil.tanggal) {
        hasil.jadwal = [
          {
            kegiatan: hasil.kegiatan,
            tanggal: hasil.tanggal,
            jam: hasil.jam || null,
            hari: hasil.hari || null,
          },
        ];
      } else {
        hasil.jadwal = [];
      }
    }

    return hasil;
  } catch (err) {
    console.error('Gagal parse JSON dari AI:', teksMentah);
    return { intent: 'tidak_dikenali', balasan_ramah: 'Maaf, aku belum paham maksudnya.' };
  }
}

module.exports = { parseChat };
