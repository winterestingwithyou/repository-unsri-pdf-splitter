import React, { createContext, useContext, useState, useEffect } from "react";

interface ImageInfo {
  src: string;
  alt: string;
  caption: string;
}

interface ImageModalContextType {
  openImage: (src: string, alt: string, caption: string) => void;
}

const ImageModalContext = createContext<ImageModalContextType | null>(null);

export default function UploadGuidePage({ onNavigateToGenerator }: { onNavigateToGenerator?: () => void }) {
  const [activeImage, setActiveImage] = useState<ImageInfo | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveImage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openImage = (src: string, alt: string, caption: string) => {
    setActiveImage({ src, alt, caption });
  };

  return (
    <ImageModalContext.Provider value={{ openImage }}>
      <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="section-card mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "oklch(55% 0.16 245 / 0.15)", border: "1px solid oklch(55% 0.16 245 / 0.25)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="oklch(65% 0.18 245)" strokeWidth="2">
              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
              <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Panduan Upload Repository UNSRI</h1>
            <p className="text-sm" style={{ color: "oklch(58% 0.03 245)" }}>
              Panduan resmi langkah-demi-langkah untuk upload skripsi/tesis ke Institutional Repository Universitas Sriwijaya.
              Sumber: Panduan UPT Perpustakaan UNSRI 2025–2026.
            </p>
          </div>
        </div>

        {/* Privacy note */}
        <div
          className="mt-4 flex items-start gap-2.5 p-3 rounded-xl text-xs"
          style={{ background: "oklch(55% 0.16 245 / 0.08)", border: "1px solid oklch(55% 0.16 245 / 0.15)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="oklch(65% 0.16 245)" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="leading-relaxed" style={{ color: "oklch(65% 0.04 245)" }}>
            Gunakan fitur <strong className="text-white">Penyusun Berkas Repository</strong> di tab sebelah untuk menyiapkan semua file sebelum mengikuti panduan ini.
            {onNavigateToGenerator && (
              <button
                onClick={onNavigateToGenerator}
                className="inline-block mt-1.5 sm:mt-0 sm:ml-2 underline underline-offset-2 font-semibold hover:opacity-80 transition-opacity"
                style={{ color: "oklch(72% 0.16 85)" }}
              >
                Buka Penyusun Berkas →
              </button>
            )}
          </span>
        </div>
      </div>

      {/* Phase 1 — Buat Akun */}
      <PhaseHeader number="A" title="Pembuatan Akun Repository" />

      <GuideStep
        number={1}
        title="Daftar Akun Repository UNSRI"
        description={
          <>
            <p className="mb-3">
              Mahasiswa harus mendaftar terlebih dahulu melalui form pendaftaran resmi. Setelah mendaftar, kamu akan mendapat username (NIM) dan password untuk login.
            </p>
            <a
              href="https://bit.ly/userrepositoryunsri"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-brand inline-flex items-center gap-2 text-sm w-full sm:w-auto justify-center whitespace-normal h-auto py-2.5 text-center"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span>
                Buka Form Pendaftaran <span className="opacity-80 text-xs block sm:inline sm:ml-1 break-all">(bit.ly/userrepositoryunsri)</span>
              </span>
            </a>
          </>
        }
      />

      {/* Phase 2 — Siapkan File */}
      <PhaseHeader number="B" title="Persiapan File" />

      <GuideStep
        number={2}
        title="Siapkan Semua File RAMA"
        description={
          <>
            <p className="mb-3">
              Sebelum upload, siapkan 10 file berikut menggunakan <strong className="text-white">Penyusun Berkas Repository</strong> yang ada di aplikasi ini:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {[
                { name: "RAMA_KODE_NIM_cover", desc: "Foto cover hardcover (JPG/JPEG, maks 500KB)" },
                { name: "RAMA_KODE_NIM", desc: "Full text PDF lengkap bertanda tangan, cap, materai" },
                { name: "RAMA_KODE_NIM_TURNITIN", desc: "PDF Turnitin + Surat Keterangan Similarity" },
                { name: "RAMA_..._01_front_ref", desc: "Mulai cover sampai BAB I + References" },
                { name: "RAMA_..._02", desc: "BAB II (nomor dilanjutkan berurutan: 03, 04, dst. untuk BAB berikutnya)" },
                { name: "RAMA_..._[N]_ref", desc: "References / Daftar Pustaka (nomor kelanjutan setelah BAB terakhir)" },
                { name: "RAMA_..._[N+1]_lamp", desc: "Lampiran (jika ada, nomor kelanjutan setelah file ref)" },
              ].map((f) => (
                <div
                  key={f.name}
                  className="flex flex-col gap-0.5 p-2.5 rounded-lg"
                  style={{ background: "oklch(100% 0 0 / 0.03)", border: "1px solid oklch(100% 0 0 / 0.06)" }}
                >
                  <span className="font-mono text-xs font-semibold" style={{ color: "oklch(72% 0.16 85)" }}>{f.name}</span>
                  <span className="text-xs" style={{ color: "oklch(55% 0.02 245)" }}>{f.desc}</span>
                </div>
              ))}
            </div>
            <div
              className="p-3 rounded-lg text-xs mb-4"
              style={{ background: "oklch(72% 0.16 85 / 0.05)", border: "1px solid oklch(72% 0.16 85 / 0.15)", color: "oklch(80% 0.1 85)" }}
            >
              <strong>Aturan Penomoran Suffix:</strong> Jumlah BAB karya ilmiah bersifat dinamis. Urutan nomor suffix untuk Referensi (`_ref`) dan Lampiran (`_lamp`) harus menyesuaikan setelah nomor BAB terakhir. Contoh jika ada 5 BAB utama (BAB II - BAB V), maka referensi menggunakan suffix `06_ref` dan lampiran menggunakan suffix `07_lamp`.
            </div>
            {onNavigateToGenerator && (
              <button
                onClick={onNavigateToGenerator}
                className="btn btn-accent inline-flex items-center gap-2 text-sm w-full sm:w-auto justify-center"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                Buka Penyusun Berkas Repository
              </button>
            )}
          </>
        }
      />

      {/* Phase 3 — Upload Steps */}
      <PhaseHeader number="C" title="Langkah-langkah Upload ke Repository" />

      <GuideStep
        number={3}
        title="Login ke Repository UNSRI"
        description={
          <p>
            Akses <a href="https://repository.unsri.ac.id" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 font-medium" style={{ color: "oklch(72% 0.16 85)" }}>repository.unsri.ac.id</a> lalu login menggunakan <strong className="text-white">NIM</strong> sebagai username dan password yang diterima saat registrasi.
          </p>
        }
        image={{ src: "/guide/step-login.jpg", alt: "Laman depan repository.unsri.ac.id", caption: "Gambar 1.3 — Laman Depan Web repository.unsri.ac.id" }}
      />

      <GuideStep
        number={4}
        title={`Klik "New Item" untuk Memulai`}
        description={
          <p>
            Setelah login, kamu akan masuk ke dashboard. Klik tombol <strong className="text-white">"New Item"</strong> untuk memulai proses pemuatan karya ilmiah.
          </p>
        }
        image={{ src: "/guide/step-new-item.jpg", alt: "Interface New Item", caption: "Gambar 1.4 — Interface untuk memuat Skripsi, Tesis dan Disertasi" }}
      />

      <GuideStep
        number={5}
        title="Pilih Type → Thesis"
        description={
          <>
            <p className="mb-2">Pada halaman pemilihan tipe, pilih <strong className="text-white">"Thesis"</strong> sebagai tipe karya ilmiah yang akan diupload.</p>
          </>
        }
        images={[
          { src: "/guide/step-type-select.jpg", alt: "Pemilihan Type of Item", caption: 'Gambar 1.5 — Laman Pemilihan "Type" of Thesis' },
          { src: "/guide/step-thesis-select.jpg", alt: "Pemilihan Thesis", caption: 'Gambar 1.6 — Laman Pemilihan "Thesis" sebagai Acuan untuk Upload' },
        ]}
      />

      <GuideStep
        number={6}
        title="Upload File-file RAMA Secara Berurutan"
        description={
          <p>
            Upload semua file RAMA secara berurutan, mulai dari <strong className="text-white">cover</strong> hingga <strong className="text-white">lampiran</strong>. Pastikan urutan file sesuai standar.
          </p>
        }
        image={{ src: "/guide/step-upload-files.jpg", alt: "Laman upload file RAMA", caption: "Gambar 1.7 — Laman Depan Web repository.unsri.ac.id (Upload Files)" }}
      />

      <GuideStep
        number={7}
        title="Pastikan Semua File Termuat"
        description={
          <p>
            Setelah semua file diupload, pastikan tampilan menampilkan seluruh file RAMA yang lengkap sebelum melanjutkan ke pengisian opsi.
          </p>
        }
        image={{ src: "/guide/step-files-loaded.jpg", alt: "Semua file termuat", caption: "Gambar 1.8 — Laman Pemuatan file-file karya ilmiah secara lengkap" }}
      />

      <GuideStep
        number={8}
        title="Isi Opsi untuk Setiap File (Show Option)"
        description={
          <>
            <p className="mb-3">
              Untuk setiap file yang diupload, klik tombol <strong className="text-white">"Show option"</strong> dan isi opsi yang tersedia. Perhatikan perbedaan pengisian antara file-file berikut:
            </p>
            <div className="flex flex-col gap-3">
              <OptionNote
                label="Cover (RAMA_KODE_NIM_cover)"
                note="Isi opsi sesuai Gambar 1.9. Pilih visibility yang sesuai."
                tag="Opsi Khusus Cover"
                tagColor="gold"
                image={{ src: "/guide/step-option-cover.png", alt: "Opsi file cover", caption: "Gambar 1.9 — Laman Opsi untuk file Cover" }}
              />
              <OptionNote
                label="Front Ref (RAMA_..._01_front_ref)"
                note="Isi opsi sesuai Gambar 1.10. Berbeda dari file BAB biasa."
                tag="Opsi Khusus"
                tagColor="brand"
                image={{ src: "/guide/step-option-front-ref.png", alt: "Opsi file front_ref", caption: "Gambar 1.10 — Laman Opsi untuk file Front Ref" }}
              />
              <OptionNote
                label="BAB Utama (BAB II, III, dst.), Full Text, Turnitin & Lampiran (_lamp)"
                note="Isi opsi standar sesuai Gambar 1.11. Opsi standar ini juga digunakan untuk file Lampiran (akhiran _lamp)."
                tag="Opsi Standar"
                tagColor="default"
                image={{ src: "/guide/step-option-standard.png", alt: "Opsi file BAB standar", caption: "Gambar 1.11 — Laman Opsi untuk file BAB (standar)" }}
              />
              <OptionNote
                label="Referensi (RAMA_..._ref)"
                note="Isi opsi khusus sesuai Gambar 1.12. File referensi memiliki opsi yang berbeda."
                tag="Opsi Khusus Referensi"
                tagColor="gold"
                image={{ src: "/guide/step-option-ref.jpg", alt: "Opsi khusus file referensi", caption: "Gambar 1.12 — Laman Opsi Khusus untuk file Referensi" }}
              />
            </div>
          </>
        }
      />

      <GuideStep
        number={9}
        title="Review File Upload → Klik Next"
        description={
          <p>
            Periksa semua file yang telah diupload beserta opsinya. Jika sudah benar, klik <strong className="text-white">"Next"</strong> untuk melanjutkan ke pengisian metadata.
          </p>
        }
        image={{ src: "/guide/step-file-review.jpg", alt: "Review file upload", caption: "Gambar 1.13 — Laman File Upload" }}
      />

      <GuideStep
        number={10}
        title="Isi Detail Metadata Karya Ilmiah"
        description={
          <>
            <p className="mb-3">Isi keterangan detail karya ilmiah secara berurutan. Perhatikan aturan penulisan berikut:</p>
            <div className="flex flex-col gap-2 mb-4">
              {[
                { field: "Judul / Title", rule: "Ditulis menggunakan HURUF KAPITAL SEMUA", highlight: true },
                { field: "Creator (Nama Mahasiswa)", rule: "Ditulis HURUF KAPITAL SEMUA", highlight: true },
                { field: "Creator (Nama Pembimbing)", rule: "Ditulis dengan Huruf Kapital Pada Awal Setiap Kata (Title Case)", highlight: false },
                { field: "Contributors", rule: "Hanya diisi nama pembimbing saja (bukan mahasiswa)", highlight: false },
              ].map(({ field, rule, highlight }) => (
                <div
                  key={field}
                  className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 p-3 rounded-lg"
                  style={{
                    background: highlight ? "oklch(72% 0.16 85 / 0.06)" : "oklch(100% 0 0 / 0.03)",
                    border: `1px solid ${highlight ? "oklch(72% 0.16 85 / 0.15)" : "oklch(100% 0 0 / 0.06)"}`,
                  }}
                >
                  <span className="text-xs font-semibold sm:min-w-[140px] sm:flex-shrink-0" style={{ color: highlight ? "oklch(72% 0.16 85)" : "oklch(70% 0.04 245)" }}>
                    {field}
                  </span>
                  <span className="text-xs" style={{ color: "oklch(58% 0.03 245)" }}>{rule}</span>
                </div>
              ))}
            </div>
            <ScreenshotGrid
              images={[
                { src: "/guide/step-thesis-detail-1.png", alt: "Pengisian Detail Karya Ilmiah 1", caption: "Gambar 1.14 — Pengisian Detail Karya Ilmiah 1 (Judul, Creator)" },
                { src: "/guide/step-thesis-detail-2.png", alt: "Pengisian Detail Karya Ilmiah 2", caption: "Gambar 1.15 — Pengisian Detail Karya Ilmiah 2 (Contributors)" },
                { src: "/guide/step-thesis-detail-3.png", alt: "Pengisian Detail Karya Ilmiah 3", caption: "Gambar 1.16 — Pengisian Detail Karya Ilmiah 3 (Abstract, Date, dll.)" },
              ]}
            />
          </>
        }
      />

      <GuideStep
        number={11}
        title="Pilih Subject → Deposit Item Now"
        description={
          <>
            <p className="mb-3">
              Pilih <strong className="text-white">"Subject"</strong> yang sesuai dengan bidang karya ilmiah kamu, lalu klik <strong className="text-white">"Deposit Item Now"</strong> untuk menyelesaikan proses upload.
            </p>
            <ScreenshotGrid
              images={[
                { src: "/guide/step-subject-select.png", alt: "Pemilihan Subject", caption: 'Gambar 1.17 — Laman Pemilihan "Subject" yang sesuai untuk Karya Ilmiah' },
                { src: "/guide/step-deposit-item.png", alt: "Deposit Item Now", caption: 'Gambar 1.18 — Laman "Deposit Item Now"' },
              ]}
            />
          </>
        }
      />

      <GuideStep
        number={12}
        title="Periksa Status Upload"
        description={
          <>
            <p className="mb-3">
              Setelah deposit, status karya ilmiah akan muncul sebagai <strong className="text-white">"Under Review"</strong>. UPT Perpustakaan akan memeriksa file yang diupload.
            </p>
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "oklch(55% 0.12 250 / 0.08)", border: "1px solid oklch(55% 0.12 250 / 0.2)" }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "oklch(60% 0.14 250)" }} />
                <span className="text-sm" style={{ color: "oklch(70% 0.04 245)" }}>
                  <strong className="text-white">Under Review</strong> — Sedang diperiksa oleh UPT Perpustakaan
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "oklch(55% 0.14 145 / 0.08)", border: "1px solid oklch(55% 0.14 145 / 0.2)" }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "oklch(60% 0.17 145)" }} />
                <span className="text-sm" style={{ color: "oklch(70% 0.04 245)" }}>
                  <strong className="text-white">Live Archive</strong> — ✅ Upload selesai dan diterima!
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "oklch(60% 0.2 25 / 0.06)", border: "1px solid oklch(60% 0.2 25 / 0.15)" }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "oklch(60% 0.2 25)" }} />
                <span className="text-sm" style={{ color: "oklch(70% 0.04 245)" }}>
                  <strong className="text-white">Perlu Perbaikan</strong> — Akan diberitahu melalui email. Lakukan perbaikan sesuai arahan.
                </span>
              </div>
            </div>
            <p className="text-xs mb-4" style={{ color: "oklch(55% 0.02 245)" }}>
              Untuk melihat status, klik <strong className="text-white">Home</strong> → <strong className="text-white">Manage Deposit</strong>. Pastikan semua kotak (<em>User Work Area</em>, <em>Under Review</em>, <em>Live Archive</em>, <em>Retired</em>) dicentang semua.
            </p>
            <ScreenshotGrid
              images={[
                { src: "/guide/step-status.jpg", alt: "Item Status Under Review", caption: 'Gambar 1.19 — Laman "Item Status" yang Diupload' },
                { src: "/guide/step-manage-deposits.jpg", alt: "Manage Deposits semua dicentang", caption: "Gambar 1.20 — Laman Manage Deposits (centang semua kotak)" },
              ]}
            />
          </>
        }
      />

      {/* Tips Penting */}
      <div
        className="section-card mt-6"
        style={{ border: "1px solid oklch(72% 0.16 85 / 0.3)", background: "oklch(72% 0.16 85 / 0.04)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="oklch(72% 0.16 85)" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h3 className="text-base font-bold" style={{ color: "oklch(80% 0.14 85)" }}>Tips & Hal Penting</h3>
        </div>
        <ul className="flex flex-col gap-2.5">
          {[
            { text: "JUDUL karya ilmiah wajib ditulis dengan HURUF KAPITAL SEMUA." },
            { text: "Nama mahasiswa (Creator) ditulis HURUF KAPITAL SEMUA." },
            { text: "Nama pembimbing ditulis dengan Huruf Kapital Pada Awal Setiap Kata (Title Case)." },
            { text: "Kolom Contributors hanya diisi nama pembimbing, bukan nama mahasiswa." },
            { text: "File cover HARUS berformat JPG/JPEG dengan ukuran maksimal 500KB. Aplikasi ini akan mengompresi otomatis." },
            { text: "File Turnitin harus sudah ditandatangani oleh dosen pembimbing jika pengecekan tidak dilakukan di UPT Perpustakaan." },
            { text: "File referensi (_ref) memiliki opsi pengisian yang berbeda dari file BAB lainnya — perhatikan Gambar 1.12." },
            { text: 'Jika jumlah BAB lebih dari 5, urutan nomor file disesuaikan (07, 08, dst.) dengan tetap menggunakan akhiran "_ref" untuk referensi dan "_lamp" untuk lampiran.' },
            { text: 'Centang semua kotak di Manage Deposits (User Work Area, Under Review, Live Archive, Retired) agar semua kiriman bisa terlihat.' },
          ].map(({ text }, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: "oklch(65% 0.03 245)" }}>
              <span className="w-1.5 h-1.5 rounded-full mt-[6px] flex-shrink-0" style={{ background: "oklch(72% 0.16 85)" }} />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>

      {/* Premium Image Modal Overlay */}
      {activeImage && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-opacity duration-300 cursor-zoom-out"
          onClick={() => setActiveImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setActiveImage(null)}
            aria-label="Close image"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          
          <div 
            className="relative max-w-4xl w-full flex flex-col items-center gap-3 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeImage.src}
              alt={activeImage.alt}
              className="max-h-[82vh] max-w-full rounded-xl object-contain shadow-2xl border border-white/10"
            />
            <p className="text-sm font-semibold text-center mt-1 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/5" style={{ color: "oklch(75% 0.1 85)" }}>
              {activeImage.caption}
            </p>
          </div>
        </div>
      )}
    </ImageModalContext.Provider>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function PhaseHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mt-8 mb-4">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: "oklch(55% 0.16 245 / 0.2)", color: "oklch(72% 0.16 245)", border: "1px solid oklch(55% 0.16 245 / 0.3)" }}
      >
        {number}
      </div>
      <h2 className="text-base font-bold text-white">{title}</h2>
      <div className="flex-1 h-px" style={{ background: "oklch(20% 0.01 245)" }} />
    </div>
  );
}

interface ImageInfo {
  src: string;
  alt: string;
  caption: string;
}

interface GuideStepProps {
  number: number;
  title: string;
  description: React.ReactNode;
  image?: ImageInfo;
  images?: ImageInfo[];
}

function GuideStep({ number, title, description, image, images }: GuideStepProps) {
  const allImages = images ?? (image ? [image] : []);
  return (
    <div className="section-card mb-4 card-hover transition-all">
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
          style={{ background: "oklch(55% 0.16 245)", color: "white" }}
        >
          {number}
        </div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      <div className="pl-0 sm:pl-10 text-sm" style={{ color: "oklch(62% 0.03 245)" }}>
        {description}
        {allImages.length > 0 && (
          <ScreenshotGrid images={allImages} />
        )}
      </div>
    </div>
  );
}

function ScreenshotGrid({ images }: { images: ImageInfo[] }) {
  const modal = useContext(ImageModalContext);
  return (
    <div className={`grid gap-3 mt-3 ${images.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
      {images.map(({ src, alt, caption }) => (
        <figure key={src} className="flex flex-col gap-1.5 group">
          <div
            className="rounded-xl overflow-hidden cursor-zoom-in transition-all duration-300 hover:border-white/20 hover:scale-[1.01] hover:brightness-[1.05]"
            style={{ border: "1px solid oklch(20% 0.01 245)" }}
            onClick={() => modal?.openImage(src, alt, caption)}
          >
            <img
              src={src}
              alt={alt}
              className="w-full h-auto block"
              loading="lazy"
            />
          </div>
          <figcaption className="text-center text-xs group-hover:text-white/60 transition-colors" style={{ color: "oklch(48% 0.02 245)" }}>
            {caption}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

interface OptionNoteProps {
  label: string;
  note: string;
  tag: string;
  tagColor: "gold" | "brand" | "default";
  image?: ImageInfo;
}

function OptionNote({ label, note, tag, tagColor, image }: OptionNoteProps) {
  const tagStyles: Record<string, string> = {
    gold: "badge-gold",
    brand: "badge-brand",
    default: "badge-secondary",
  };
  return (
    <div className="rounded-xl p-3" style={{ background: "oklch(100% 0 0 / 0.02)", border: "1px solid oklch(100% 0 0 / 0.06)" }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
        <span className="text-xs font-semibold text-white">{label}</span>
        <span className={`badge ${tagStyles[tagColor]} flex-shrink-0 self-start sm:self-auto`} style={{ fontSize: "0.6rem" }}>{tag}</span>
      </div>
      <p className="text-xs" style={{ color: "oklch(55% 0.02 245)" }}>{note}</p>
      {image && <ScreenshotGrid images={[image]} />}
    </div>
  );
}
