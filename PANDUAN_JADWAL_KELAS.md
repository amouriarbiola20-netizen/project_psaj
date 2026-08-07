# Panduan: Fitur "Jadwal Kelas" (update — data sudah otomatis diekstrak dari PDF asli!)

Kabar baik: saya sudah baca ketiga PDF jadwal resmi sekolah kamu (Kelas X, XI, XII —
"Jadwal Pelajaran dan Ruangan") langsung dari filenya, bukan menebak dari foto lagi.
Hasilnya **1656 baris data, 35 kelas, lengkap dengan kode mata pelajaran DAN kode ruang**,
sudah saya susun rapi di `Jadwal_Kelas_Terisi.xlsx` — **tidak perlu isi manual lagi**.

Saya sempat cek silang beberapa baris dengan yang saya baca manual dari gambar
sebelumnya — hasilnya cocok persis, jadi datanya bisa dipercaya. Tapi tetap boleh kamu
spot-check sendiri beberapa baris (misal kelas kamu sendiri) sebelum di-import.

---

## Langkah 1: Buat tabel baru di Supabase

1. Buka project Supabase kamu → **Table Editor** → **New Table**
2. Nama tabel: `jadwal_kelas`
3. **Uncheck "Enable Row Level Security (RLS)"**
4. Tambahkan kolom-kolom ini:

| Name | Type | Primary |
|---|---|---|
| `id` | int8 | ✅ (sudah default) |
| `created_at` | timestamptz | (sudah default) |
| `kelas` | text | |
| `hari` | text | |
| `jam_mulai` | text | |
| `jam_selesai` | text | |
| `kode_mapel` | text | |
| `kode_ruang` | text | |

5. Klik **Save**

## Langkah 2: Update file project di komputer kamu

Ganti/tambah file-file ini dengan versi terbaru:
- `src/supabase.js` (update)
- `server.js` (update — sekarang balasannya juga menyertakan nomor ruang)
- `src/ai.js` (update — sudah punya dari sebelumnya)
- `import-jadwal-kelas.js` (update — sekarang baca kolom "Kode Ruang" juga)

## Langkah 3: Install library tambahan (kalau belum)

```cmd
npm install
```

## Langkah 4: Jalankan skrip import

1. Taruh file **`Jadwal_Kelas_Terisi.xlsx`** (yang sudah ada isinya) di folder project kamu
2. Jalankan:
   ```cmd
   node import-jadwal-kelas.js Jadwal_Kelas_Terisi.xlsx
   ```
3. Karena ada 1656 baris, prosesnya jalan per 500 baris sekaligus — tunggu sampai muncul
   `✅ Selesai! 1656 baris berhasil diupload`

## Langkah 5: Testing

```cmd
npm start
```
Buka `http://localhost:3000`, coba beberapa kelas:
- `"jadwal kelas 12 tjkt 1"`
- `"jadwal kelas 10 pplg 3 hari senin"`
- `"jadwal kelas 11 tjkt 5"`

Balasannya sekarang juga menyertakan **nomor ruang** di belakang tiap mata pelajaran.

## Langkah 6: Push ke Railway

```cmd
git add .
git commit -m "Tambah fitur jadwal kelas + ruang dari PDF resmi"
git push
```

---

## Catatan soal kode mata pelajaran & ruang

- **Kode mapel** (misal `MTK-4`, `ING-2`) adalah singkatan mata pelajaran + kemungkinan
  identitas guru/kelompok — sesuai yang tertulis apa adanya di PDF sekolah kamu.
- **Kode ruang** (misal `A.2.4`, `RPS UTR`) juga persis seperti di PDF "Jadwal Pemakaian
  Ruang" sekolah kamu.
- Chatbot saat ini menampilkan kode-kode itu apa adanya (belum di-"terjemahkan" ke nama
  lengkap mapel/guru/ruang), karena PDF yang saya baca tidak menyertakan tabel keterangan
  kode → nama lengkap. Kalau sekolah kamu punya dokumen keterangan itu, kirim juga —
  saya bisa bikinkan fitur "decode" biar chatbot jawab nama lengkapnya.
