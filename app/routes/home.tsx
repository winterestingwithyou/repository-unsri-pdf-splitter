import { useState, useEffect } from "react";
import type { Route } from "./+types/home";
import FullRepositoryPage from "../components/FullRepositoryPage";
import { ToastContainer } from "../components/Toast";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Repository UNSRI Guide — Panduan & Alat Persiapan Upload" },
    {
      name: "description",
      content:
        "Panduan lengkap dan alat bantu persiapan file upload Repository Universitas Sriwijaya. Gabungkan PDF Turnitin, kompres cover, split bab skripsi — semua diproses di browser.",
    },
    { name: "keywords", content: "repository unsri, pdf splitter, skripsi, tugas akhir, unsri, panduan upload" },
    { property: "og:title", content: "Repository UNSRI Guide — Panduan & Alat Upload" },
    { property: "og:description", content: "Panduan & alat persiapan file Repository UNSRI. Privacy-first — diproses langsung di browser." },
  ];
}

type Feature = "generator" | "guide";

const FEATURES: { id: Feature; label: string; desc: string; icon: React.ReactNode; soon?: boolean }[] = [
  {
    id: "generator",
    label: "Penyusun Berkas RAMA",
    desc: "Buat paket berkas repository",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: "guide",
    label: "Panduan Upload",
    desc: "Tata cara upload repository",
    soon: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
  },
];

export default function Home() {
  const [feature, setFeature] = useState<Feature>("generator");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="animated-bg min-h-screen flex flex-col">
      {/* ============ HEADER ============ */}
      <header className="glass-strong sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="Logo"
              className="w-9 h-9 rounded-xl flex-shrink-0 object-contain"
              style={{ filter: "drop-shadow(0 2px 8px oklch(0% 0 0 / 0.3))" }}
            />
            <div>
              <h1 className="text-sm font-bold leading-tight gradient-text">
                Repository UNSRI Guide
              </h1>
              <p className="text-[11px] hidden sm:block" style={{ color: "oklch(50% 0.02 245)" }}>
                Panduan & Alat Persiapan Upload
              </p>
            </div>
          </div>

          {/* Privacy badge */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: "oklch(62% 0.14 175 / 0.08)", border: "1px solid oklch(62% 0.14 175 / 0.12)" }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "oklch(62% 0.14 175)", animation: "pulse-dot 2s ease-in-out infinite" }}
            />
            <span className="text-xs font-medium" style={{ color: "oklch(72% 0.1 175)" }}>
              Diproses di browser
            </span>
          </div>
        </div>
      </header>

      {/* ============ MAIN ============ */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {/* ---- Hero ---- */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-2">
            <div>
              <div className="inline-flex items-center gap-2 badge badge-brand mb-3">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Privacy-First · Tidak Ada Upload ke Server
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold gradient-text tracking-tight leading-tight">
                Persiapan File<br className="hidden sm:block" /> Repository UNSRI
              </h2>
            </div>
            <p className="text-sm max-w-md" style={{ color: "oklch(55% 0.02 245)" }}>
              Gabungkan PDF, kompres cover, split bab skripsi, dan unduh paket berkas lengkap siap upload sesuai standar Repository RAMA Universitas Sriwijaya.
            </p>
          </div>
          <div className="separator" />
        </div>

        {/* ---- Layout: Feature Nav + Content ---- */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar / Feature navigation */}
          <nav className="lg:w-64 flex-shrink-0" aria-label="Fitur">
            {/* Horizontal on mobile, vertical on desktop */}
            <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0">
              {FEATURES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => !f.soon && setFeature(f.id)}
                  className={`feature-nav-item ${feature === f.id ? "active" : ""} ${f.soon ? "opacity-50 cursor-not-allowed" : ""}`}
                  aria-current={feature === f.id ? "page" : undefined}
                  disabled={f.soon}
                >
                  <div className="nav-icon">
                    {f.icon}
                  </div>
                  <div className="flex flex-col items-start min-w-0">
                    <span className="font-semibold text-sm flex items-center gap-2">
                      {f.label}
                      {f.soon && (
                        <span className="badge badge-gold text-[10px] py-0 px-1.5">Segera</span>
                      )}
                    </span>
                    <span className="text-[11px] hidden lg:block" style={{ color: "oklch(50% 0.02 245)" }}>
                      {f.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Sidebar info cards (desktop only) */}
            <div className="hidden lg:flex flex-col gap-3 mt-6 pt-6" style={{ borderTop: "1px solid oklch(18% 0.01 245)" }}>
              {[
                {
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="oklch(55% 0.16 245)" strokeWidth="1.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  ),
                  title: "100% Privat",
                  desc: "File diproses di browser kamu, tidak pernah dikirim ke server.",
                },
                {
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="oklch(72% 0.16 85)" strokeWidth="1.5">
                      <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
                    </svg>
                  ),
                  title: "Standar Repository",
                  desc: "Penamaan file otomatis sesuai standar RAMA UNSRI.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="flex gap-3 p-3 rounded-xl"
                  style={{ background: "oklch(100% 0 0 / 0.02)", border: "1px solid oklch(100% 0 0 / 0.04)" }}
                >
                  <div className="flex-shrink-0 mt-0.5">{card.icon}</div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "oklch(80% 0.02 245)" }}>{card.title}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "oklch(48% 0.02 245)" }}>{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </nav>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            {/* Generator */}
            <div hidden={feature !== "generator"}>
              {!mounted ? (
                <div className="section-card max-w-xl mx-auto h-[380px] flex flex-col justify-between animate-pulse">
                  <div className="space-y-4">
                    <div className="h-6 w-3/4 rounded bg-white/5" />
                    <div className="h-4 w-1/2 rounded bg-white/5" />
                    <div className="h-48 rounded bg-white/5 border border-dashed border-white/10" />
                  </div>
                  <div className="h-10 w-full rounded bg-white/5" />
                </div>
              ) : (
                feature === "generator" && <FullRepositoryPage />
              )}
            </div>

            {/* Guide placeholder */}
            <div hidden={feature !== "guide"}>
              <div className="section-card text-center py-16">
                <svg className="mx-auto mb-4" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="oklch(50% 0.02 245)" strokeWidth="1.5">
                  <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                </svg>
                <h3 className="text-lg font-bold mb-2" style={{ color: "oklch(75% 0.02 245)" }}>Panduan Upload Repository</h3>
                <p className="text-sm max-w-sm mx-auto" style={{ color: "oklch(48% 0.02 245)" }}>
                  Fitur panduan lengkap pembuatan akun dan upload file ke Repository UNSRI sedang dalam pengembangan.
                </p>
                <span className="inline-block mt-4 badge badge-gold">Segera Hadir</span>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Bottom info cards (mobile only) ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10 lg:hidden">
          {[
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="oklch(55% 0.16 245)" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              ),
              title: "100% Privat",
              desc: "File diproses langsung di browser. Tidak pernah dikirim ke server.",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="oklch(62% 0.14 175)" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              ),
              title: "Hemat Waktu",
              desc: "Deteksi otomatis bab membantu mengisi rentang halaman.",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="oklch(72% 0.16 85)" strokeWidth="1.5">
                  <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
                </svg>
              ),
              title: "Standar Repository",
              desc: "Penamaan file sesuai standar Repository UNSRI termasuk kode prodi, NIM, dan NIDN.",
            },
          ].map((card) => (
            <div key={card.title} className="section-card card-hover">
              <div
                className="flex items-center justify-center w-9 h-9 rounded-lg mb-3"
                style={{ background: "oklch(100% 0 0 / 0.03)", border: "1px solid oklch(100% 0 0 / 0.05)" }}
              >
                {card.icon}
              </div>
              <h3 className="font-semibold text-sm mb-1" style={{ color: "oklch(86% 0.02 245)" }}>
                {card.title}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: "oklch(52% 0.02 245)" }}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* ============ FOOTER ============ */}
      <footer style={{ borderTop: "1px solid oklch(16% 0.01 245)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <p className="text-xs" style={{ color: "oklch(40% 0.02 245)" }}>
              Repository UNSRI · Dibuat untuk mahasiswa Universitas Sriwijaya
            </p>
            <p className="text-[11px]" style={{ color: "oklch(34% 0.02 245)" }}>
              File kamu tidak pernah meninggalkan perangkat kamu
            </p>
          </div>
          <a
            href="https://github.com/winterestingwithyou"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
            aria-label="GitHub Winterest"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ color: "oklch(45% 0.02 245)", flexShrink: 0 }}>
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span className="text-xs" style={{ color: "oklch(42% 0.02 245)" }}>
              Winterest | M. Adam Yudistira
            </span>
          </a>
        </div>
      </footer>

      <ToastContainer />
    </div>
  );
}
