# Papan Jadwal — Chatbot Web Berbasis AI

Chatbot berbasis **halaman web** (bukan WhatsApp) yang bisa mencatat, mengubah,
dan menampilkan jadwal kamu lewat chat bebas. Menggunakan AI (Gemini, gratis)
untuk memahami maksud pesan, dan database cloud (Supabase, gratis) untuk
menyimpan datanya.

Ini lebih sederhana dari versi WhatsApp karena tidak ada urusan scan QR,
sesi yang putus-putus, atau risiko nomor WA kena banned — tinggal buka link.

---

## 0. Yang perlu disiapkan

- [ ] Node.js terinstall (`node -v` untuk cek)
- [ ] Akun **Google** (untuk API key Gemini)
- [ ] Akun **Supabase** (kalau kamu sudah punya dari project sebelumnya, tabel `jadwal` bisa dipakai ulang di sini)
- [ ] Akun **GitHub** dan **Railway** (untuk deploy ke cloud)

---

## 1. Kalau kamu SUDAH punya project WA-bot sebelumnya

Kabar baik: kamu **tidak perlu setup Supabase dari nol lagi**. Project ini
memakai tabel `jadwal` yang sama persis dengan struktur project WhatsApp
sebelumnya (`id`, `created_at`, `nomor_wa`, `kegiatan`, `tanggal`, `jam`, `hari`).

Tinggal pakai `SUPABASE_URL` dan `SUPABASE_SECRET_KEY` yang sama dengan yang
sudah kamu punya.

## 2. Kalau BELUM punya Supabase, setup dulu

1. [supabase.com](https://supabase.com) → **New Project**
2. **Table Editor** → buat tabel `jadwal` dengan kolom: `id` (int8, primary), `created_at` (timestamptz), `nomor_wa` (text), `kegiatan` (text), `tanggal` (date), `jam` (text), `hari` (text)
3. Saat membuat tabel, **uncheck "Enable Row Level Security (RLS)"**
4. **Project Settings → API** → catat **Project URL** dan **Secret key** (`sb_secret_...`)

## 3. Ambil API Key Gemini (gratis)

1. [aistudio.google.com](https://aistudio.google.com) → login Google
2. **Get API Key** → **Create API Key** → copy

---

## 4. Jalankan di komputer kamu

1. Buka terminal di folder project ini
2. Install dependency:
   ```bash
   npm install
   ```
3. Salin `.env.example` jadi `.env`, isi dengan data asli:
   ```
   GEMINI_API_KEY=AIza...
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SECRET_KEY=sb_secret_xxxxx
   ```
4. Jalankan server:
   ```bash
   npm start
   ```
5. Kalau muncul `✅ Server jalan di http://localhost:3000`, buka browser ke:
   ```
   http://localhost:3000
   ```
6. Coba chat langsung di halamannya:
   - `"tambahin jadwal les matematika besok jam 4 sore"`
   - `"jadwal aku hari ini apa aja?"`
   - `"ubah jadwal les matematika jadi jam 5"`

---

## 5. Push ke GitHub

```bash
git init
git add .
git commit -m "Chatbot web jadwal"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```

---

## 6. Deploy ke Railway (cloud hosting)

1. [railway.app](https://railway.app) → login GitHub
2. **New Project → Deploy from GitHub repo** → pilih repo ini
3. Tab **Variables** → tambahkan:
   - `GEMINI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
4. Tunggu build selesai → Railway kasih kamu **URL publik** (misal `xxxx.up.railway.app`)
5. Buka URL itu — chatbot kamu sekarang online 24 jam, bisa diakses siapa saja lewat link 🎉

Ini jauh lebih gampang di-demo dibanding versi WA: tinggal share link-nya ke
guru/penguji, tidak perlu scan apapun.

---

## Ringkasan arsitektur

```
Browser (halaman chat)
      │  fetch POST /api/chat
      ▼
server.js (Express) — jalan di Railway
      │
      ▼
Gemini API (src/ai.js) — ubah chat bebas jadi JSON terstruktur
      │
      ▼
Supabase (src/supabase.js) — simpan/ambil/ubah data jadwal
      │
      ▼
Balasan dikirim balik ke browser, tampil di chat
```

## Ide pengembangan lanjut (opsional)

- **Login sederhana**: supaya tiap orang punya jadwal terpisah (saat ini semua orang yang buka web berbagi 1 data jadwal yang sama)
- **Hapus jadwal**: tambah intent baru `"hapus_jadwal"` di `src/ai.js`, mirip pola `edit_jadwal`
- **Tampilan kalender**: render jadwal seminggu dalam bentuk grid/kalender, bukan cuma teks
