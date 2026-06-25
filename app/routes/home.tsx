import { useState, useEffect } from "react";
import type { Route } from "./+types/home";
import SplitterPage from "../components/SplitterPage";
import TurnitinMerger from "../components/TurnitinMerger";
import { ToastContainer } from "../components/Toast";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Repository UNSRI PDF Splitter — Alat Persiapan Upload Repositori" },
    {
      name: "description",
      content:
        "Pisahkan dan siapkan file PDF skripsi/TA sesuai standar Repository Universitas Sriwijaya. Semua pemrosesan dilakukan langsung di browser kamu — file tidak pernah diunggah ke server.",
    },
    { name: "keywords", content: "repository unsri, pdf splitter, skripsi, tugas akhir, unsri" },
    { property: "og:title", content: "Repository UNSRI PDF Splitter" },
    { property: "og:description", content: "Alat bantu persiapan file upload Repository UNSRI. Privacy-first — diproses di browser." },
  ];
}

type Tab = "splitter" | "turnitin";

export default function Home() {
  const [tab, setTab] = useState<Tab>("splitter");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="animated-bg min-h-screen">
      {/* Header */}
      <header className="glass-strong sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="Logo Repository UNSRI PDF Splitter"
              className="w-8 h-8 rounded-lg flex-shrink-0 object-contain shadow-md"
              aria-hidden="true"
            />
            <div>
              <h1 className="text-sm font-bold leading-tight gradient-text">
                Repository UNSRI
              </h1>
              <p className="text-xs hidden sm:block" style={{ color: "oklch(55% 0.03 250)" }}>
                PDF Splitter & Merger
              </p>
            </div>
          </div>

          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: "oklch(64% 0.22 165 / 0.1)", border: "1px solid oklch(64% 0.22 165 / 0.2)" }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "oklch(64% 0.22 165)", animation: "pulse-dot 2s ease-in-out infinite" }}
            />
            <span className="text-xs font-medium" style={{ color: "oklch(72% 0.18 165)" }}>
              Diproses di browser
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 badge badge-brand mb-4">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Privacy-First · Tidak Ada Upload ke Server
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 gradient-text">
            Persiapan File Repository UNSRI
          </h2>
          <p className="text-sm max-w-lg mx-auto" style={{ color: "oklch(62% 0.03 250)" }}>
            Upload satu PDF skripsi lengkap, isi metadata, dan dapatkan semua file siap upload
            sesuai standar Repository Universitas Sriwijaya dalam satu klik.
          </p>
        </div>

        {/* Tab navigation */}
        <div
          className="flex gap-1 p-1 mb-8 rounded-xl mx-auto w-fit"
          style={{ background: "oklch(14% 0.015 250)", border: "1px solid oklch(22% 0.025 250)" }}
          role="tablist"
          aria-label="Fitur"
        >
          <button
            id="tab-splitter"
            role="tab"
            aria-selected={tab === "splitter"}
            aria-controls="panel-splitter"
            className={`nav-tab flex items-center gap-2 ${tab === "splitter" ? "active" : ""}`}
            onClick={() => setTab("splitter")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            PDF Splitter
          </button>
          <button
            id="tab-turnitin"
            role="tab"
            aria-selected={tab === "turnitin"}
            aria-controls="panel-turnitin"
            className={`nav-tab flex items-center gap-2 ${tab === "turnitin" ? "active" : ""}`}
            onClick={() => setTab("turnitin")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
            Turnitin Merger
          </button>
        </div>

        {/* Panels */}
        <div
          id="panel-splitter"
          role="tabpanel"
          aria-labelledby="tab-splitter"
          hidden={tab !== "splitter"}
        >
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
            tab === "splitter" && <SplitterPage />
          )}
        </div>
        <div
          id="panel-turnitin"
          role="tabpanel"
          aria-labelledby="tab-turnitin"
          hidden={tab !== "turnitin"}
        >
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
            tab === "turnitin" && <TurnitinMerger />
          )}
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
          {[
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="oklch(58% 0.23 250)" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              ),
              title: "100% Privat",
              desc: "Semua pemrosesan PDF dilakukan langsung di browser kamu. File tidak pernah dikirim ke server.",
            },
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="oklch(64% 0.22 165)" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              ),
              title: "Hemat Waktu",
              desc: "Tidak perlu split manual halaman per halaman. Deteksi otomatis bab membantu mengisi rentang halaman.",
            },
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="oklch(78% 0.18 80)" strokeWidth="1.5">
                  <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
                </svg>
              ),
              title: "Standar Repository",
              desc: "Nama file dihasilkan sesuai standar penamaan Repository UNSRI termasuk kode prodi, NIM, dan NIDN.",
            },
          ].map((card) => (
            <div key={card.title} className="section-card card-hover">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-lg mb-3"
                style={{ background: "oklch(100% 0 0 / 0.04)", border: "1px solid oklch(100% 0 0 / 0.06)" }}
              >
                {card.icon}
              </div>
              <h3 className="font-semibold text-sm mb-1" style={{ color: "oklch(88% 0.02 250)" }}>
                {card.title}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: "oklch(58% 0.03 250)" }}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16" style={{ borderColor: "oklch(18% 0.02 250)" }}>
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <p className="text-xs" style={{ color: "oklch(45% 0.03 250)" }}>
              Repository UNSRI PDF Splitter · Dibuat untuk mahasiswa Universitas Sriwijaya
            </p>
            <p className="text-xs" style={{ color: "oklch(40% 0.03 250)" }}>
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: "oklch(55% 0.03 250)", flexShrink: 0 }}>
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span className="text-xs" style={{ color: "oklch(50% 0.03 250)" }}>
              Winterest | M. Adam Yudistira
            </span>
          </a>
        </div>
      </footer>

      <ToastContainer />
    </div>
  );
}
