# Repository UNSRI Guide

Aplikasi web **100% client-side** untuk membantu mahasiswa Universitas Sriwijaya menyiapkan berkas Repository UNSRI dengan cepat, rapi, dan sesuai standar penamaan.

## Tujuan

Aplikasi ini dibuat untuk mengotomasi proses yang biasanya manual:
- memecah PDF skripsi per bagian/BAB,
- menggabungkan dokumen Turnitin,
- menyiapkan paket berkas RAMA lengkap,
- serta memberi panduan upload ke repository.unsri.ac.id.

Semua proses dijalankan langsung di browser pengguna.

## Prinsip Privasi

- Tidak ada upload file ke server aplikasi.
- Tidak ada penyimpanan file ke database.
- Dokumen diproses sepenuhnya di perangkat pengguna (browser).

## Fitur Utama

### 1) Penyusun Berkas Repository (Paket Lengkap)
Fitur all-in-one untuk menghasilkan ZIP berkas siap upload.

Input yang dibutuhkan:
- Program Studi (dropdown dari data lokal)
- NIM
- NIDN Pembimbing 1
- NIDN Pembimbing 2 (opsional)
- Cover skripsi (gambar)
- PDF skripsi lengkap
- Surat Similarity (PDF)
- Laporan Turnitin (PDF)

Output ZIP:
- `RAMA_KODE_NIM_cover.jpg`
- `RAMA_KODE_NIM.pdf`
- `RAMA_KODE_NIM_TURNITIN.pdf`
- file split skripsi sesuai urutan dinamis:
  - `RAMA_KODE_NIM_NIDN1(_NIDN2)_01_front_ref.pdf`
  - `RAMA_KODE_NIM_NIDN1(_NIDN2)_02.pdf`
  - `RAMA_KODE_NIM_NIDN1(_NIDN2)_03.pdf`
  - dst.
  - `RAMA_KODE_NIM_NIDN1(_NIDN2)_[N]_ref.pdf`
  - `RAMA_KODE_NIM_NIDN1(_NIDN2)_[N+1]_lamp.pdf`

Catatan:
- Cover otomatis dikompres di browser bila >500KB (target <500KB).
- `front_ref` dibuat dari gabungan 2 rentang halaman: halaman awal s.d. BAB I + halaman daftar pustaka.

### 2) Splitter PDF Mandiri
Mode khusus untuk memecah PDF skripsi saja.

Alur 3 langkah:
1. Upload PDF & metadata
2. Atur rentang halaman
3. Pratinjau nama file & unduh ZIP

Dukungan tambahan:
- Preview halaman PDF
- Deteksi otomatis judul BAB/Daftar Pustaka/Lampiran (tetap bisa diedit manual)
- Tambah BAB dinamis

### 3) Turnitin Merger Mandiri
Menggabungkan:
1. Surat Keterangan Similarity (PDF)
2. Laporan Turnitin (PDF)

Output:
- `RAMA_KODE_NIM_TURNITIN.pdf`

Urutan merge: **Surat Similarity → Laporan Turnitin**.

### 4) Panduan Upload Repository
Panduan visual langkah demi langkah untuk proses upload ke Repository UNSRI, termasuk:
- link pendaftaran akun: `https://bit.ly/userrepositoryunsri`
- urutan upload file RAMA
- pengisian opsi file
- pengisian metadata karya ilmiah
- tahap deposit hingga status *under review*

## Aturan Penamaan Penting

- Jika NIDN2 kosong, nama file **tidak** menyisakan underscore kosong.
  - Benar: `RAMA_55201_0903xxxxxx_0012345678_02.pdf`
  - Salah: `RAMA_55201_0903xxxxxx_0012345678__02.pdf`

## Stack Teknologi

- React Router v7 (framework mode)
- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- pdf-lib
- PDF.js (`pdfjs-dist`)
- JSZip
- FileSaver
- React Hook Form + Zod

## Menjalankan Proyek

> Repo ini memakai `bun.lock`; disarankan menggunakan **bun**.

### Install
```bash
bun install
```

### Development
```bash
bun run dev
```

### Build
```bash
bun run build
```

### Typecheck (wajib untuk verifikasi TypeScript)
```bash
bun run typecheck
```

## Batasan Scope Aplikasi

Aplikasi ini sengaja sederhana:
- tanpa backend,
- tanpa autentikasi,
- tanpa database.

Fokus utamanya: membantu mahasiswa menyiapkan berkas Repository UNSRI secepat dan seakurat mungkin.
