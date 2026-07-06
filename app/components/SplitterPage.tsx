import { useState, useRef, useEffect, useCallback } from "react";
import JSZip from "jszip";
import FileSaver from "file-saver";
const { saveAs } = FileSaver;
import {
  getDefaultSections,
  splitPdf,
  mergePdfs,
  buildRamaFilename,
  buildRamaFullFilename,
  detectChapterPages,
  buildDetectedRanges,
  extractPageTexts,
  getPdfPageCount,
  recalculateSuffixes,
  toRoman,
  type SplitSection,
  type RepositoryMetadata,
  type PageRange,
} from "../utils/pdfProcessor";
import { FileDropZone } from "./FileDropZone";
import { StudyProgramSelect } from "./StudyProgramSelect";
import { SectionRangeEditor } from "./SectionRangeEditor";
import { PdfPagePreview } from "./PdfPagePreview";
import { showToast } from "./Toast";
import type { StudyProgram } from "../data/studyPrograms";

type Step = "upload" | "ranges" | "download";

export default function SplitterPage() {
  const [step, setStep] = useState<Step>("upload");

  // Reset scroll to top when changing steps
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Files State
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState(0);

  // Metadata State
  const [meta, setMeta] = useState<RepositoryMetadata>({
    kode: "",
    nim: "",
    nidn1: "",
    nidn2: "",
  });
  const [selectedProgram, setSelectedProgram] = useState<StudyProgram | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sections State
  const [sections, setSections] = useState<SplitSection[]>(recalculateSuffixes(getDefaultSections()));
  const [previewPage, setPreviewPage] = useState(1);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // Auto Detect State
  const [detecting, setDetecting] = useState(false);
  const [detectProgress, setDetectProgress] = useState(0);

  // Generate State
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [generateStatus, setGenerateStatus] = useState("");

  async function handleFile(f: File) {
    try {
      const bytes = await f.arrayBuffer();
      const count = await getPdfPageCount(bytes);
      setFile(f);
      setPdfBytes(bytes);
      setTotalPages(count);
      setSections(recalculateSuffixes(getDefaultSections()));
      showToast("success", `PDF dimuat: ${count} halaman`);
    } catch {
      showToast("error", "File PDF tidak valid atau rusak.");
    }
  }

  function validateMeta(): boolean {
    const e: Record<string, string> = {};
    if (!meta.kode.trim()) e.kode = "Program studi wajib dipilih";
    
    if (!meta.nim.trim()) {
      e.nim = "NIM wajib diisi";
    } else if (!/^\d+$/.test(meta.nim.trim())) {
      e.nim = "NIM hanya boleh angka";
    }

    if (!meta.nidn1.trim()) {
      e.nidn1 = "NIDN Pembimbing 1 wajib diisi";
    } else if (!/^\d+$/.test(meta.nidn1.trim())) {
      e.nidn1 = "NIDN hanya boleh angka";
    } else if (meta.nidn1.trim().length !== 10) {
      e.nidn1 = "NIDN harus tepat 10 digit";
    }

    if (meta.nidn2 && meta.nidn2.trim() !== "") {
      if (!/^\d+$/.test(meta.nidn2.trim())) {
        e.nidn2 = "NIDN hanya boleh angka";
      } else if (meta.nidn2.trim().length !== 10) {
        e.nidn2 = "NIDN harus tepat 10 digit";
      }
    }

    if (!file) e.file = "File PDF skripsi lengkap wajib diunggah";

    setErrors(e);
    if (Object.keys(e).length > 0) {
      showToast("error", "Harap lengkapi formulir dan upload berkas skripsi.");
      return false;
    }
    return true;
  }

  async function handleAutoDetect() {
    if (!pdfBytes) return;
    setDetecting(true);
    setDetectProgress(0);

    try {
      const pageTexts = await extractPageTexts(pdfBytes, (current, total) => {
        setDetectProgress(Math.round((current / total) * 100));
      });

      const detected = detectChapterPages(pageTexts);
      const ranges = buildDetectedRanges(detected, totalPages);

      // Find the maximum chapter index in detected ranges
      const rangeBabIds = Object.keys(ranges)
        .filter((k) => k.startsWith("bab"))
        .map((k) => parseInt(k.replace("bab", ""), 10));
      const maxBabNum = rangeBabIds.length > 0 ? Math.max(...rangeBabIds) : 5;

      let updatedSections = [...sections];
      let addedAny = false;
      for (let b = 6; b <= maxBabNum; b++) {
        const babId = `bab${b}`;
        if (!updatedSections.some((s) => s.id === babId)) {
          const babIndices = updatedSections
            .map((s, idx) => ({ id: s.id, idx }))
            .filter((s) => s.id.startsWith("bab"));
          const insertIdx = babIndices.length > 0 ? babIndices[babIndices.length - 1].idx + 1 : 5;
          updatedSections.splice(insertIdx, 0, {
            id: babId,
            label: `BAB ${toRoman(b)}`,
            filenameSuffix: String(b).padStart(2, "0"),
            range: null,
            required: false,
            description: "",
          });
          addedAny = true;
        }
      }

      if (addedAny) {
        updatedSections = recalculateSuffixes(updatedSections);
      }

      const finalSections = updatedSections.map((s) => {
        const key = s.id;
        const range = ranges[key];
        const range2 = key === "front_ref" ? ranges["front_ref_range2"] : undefined;
        return {
          ...s,
          range: range || null,
          range2: range2 !== undefined ? range2 : s.range2,
        };
      });

      setSections(finalSections);
      showToast("success", "Deteksi bab selesai! Bab baru ditambahkan otomatis jika terdeteksi.");
    } catch (err) {
      console.error(err);
      showToast("error", "Gagal mendeteksi bab secara otomatis.");
    } finally {
      setDetecting(false);
    }
  }

  const handleAddChapter = useCallback(() => {
    setSections((prev) => {
      const babIndices = prev
        .map((s, idx) => ({ id: s.id, idx }))
        .filter((s) => s.id.startsWith("bab"));
      const lastBabIdx = babIndices.length > 0 ? babIndices[babIndices.length - 1].idx : 0;
      
      const babIds = babIndices.map((b) => parseInt(b.id.replace("bab", "")));
      const nextBabNum = babIds.length > 0 ? Math.max(...babIds) + 1 : 2;
      
      const newChapter: SplitSection = {
        id: `bab${nextBabNum}`,
        label: `BAB ${toRoman(nextBabNum)}`,
        filenameSuffix: String(nextBabNum).padStart(2, "0"),
        range: null,
        required: false,
        description: "",
      };

      const updated = [...prev];
      updated.splice(lastBabIdx + 1, 0, newChapter);
      return recalculateSuffixes(updated);
    });
  }, []);

  const handleDeleteChapter = useCallback((id: string) => {
    setSections((prev) => {
      if (["bab2", "bab3", "bab4", "bab5"].includes(id)) {
        return prev;
      }
      return recalculateSuffixes(prev.filter((s) => s.id !== id));
    });
  }, []);

  async function handleGenerateZip() {
    const requiredMissing = sections.filter(
      (s) => s.required && (!s.range || (s.range2 !== undefined && !s.range2))
    );
    if (requiredMissing.length > 0) {
      showToast("error", `Atur rentang untuk: ${requiredMissing.map((s) => s.label).join(", ")}`);
      return;
    }

    if (!file || !pdfBytes) return;

    setGenerating(true);
    setGenerateProgress(0);
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      const zip = new JSZip();

      // 1. Add complete thesis PDF
      setGenerateStatus("Menambahkan PDF Skripsi Lengkap...");
      const fullThesisName = buildRamaFullFilename(meta);
      zip.file(fullThesisName, pdfBytes);
      setGenerateProgress(20);

      // 2. Split PDF Chapters
      const totalSteps = sections.length;
      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        setGenerateStatus(`Membuat ${sec.label}...`);

        if (sec.id === "front_ref" && sec.range && sec.range2) {
          const bytes1 = await splitPdf(pdfBytes, sec.range);
          const bytes2 = await splitPdf(pdfBytes, sec.range2);
          const mergedFront = await mergePdfs([bytes1, bytes2]);
          zip.file(buildRamaFilename(meta, sec.filenameSuffix), mergedFront);
        } else {
          if (sec.range) {
            const bytes = await splitPdf(pdfBytes, sec.range);
            zip.file(buildRamaFilename(meta, sec.filenameSuffix), bytes);
          }
        }
        
        const stepProgress = 20 + Math.round(((i + 1) / totalSteps) * 60);
        setGenerateProgress(stepProgress);
      }

      setGenerateStatus("Mengemas ke dalam file ZIP...");
      const content = await zip.generateAsync({ type: "blob" });
      const zipFilename = `${meta.kode}_${meta.nim}_SPLIT.zip`;
      saveAs(content, zipFilename);

      setGenerateProgress(100);
      showToast("success", "File split skripsi berhasil diunduh!");
      setStep("download");
    } catch (e) {
      console.error(e);
      showToast("error", "Gagal memproses file. Pastikan dokumen yang diunggah valid.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Step Indicator */}
      <div className="flex justify-center items-center gap-2 mb-8 select-none flex-wrap">
        {[
          { id: "upload", label: "Upload & Metadata" },
          { id: "ranges", label: "Rentang Halaman" },
          { id: "download", label: "Selesai & Unduh" },
        ].map((s, idx) => {
          const isActive = step === s.id;
          const isDone =
            (step === "ranges" && idx === 0) ||
            (step === "download" && (idx === 0 || idx === 1));

          return (
            <div key={s.id} className="flex items-center gap-2">
              {idx > 0 && (
                <div
                  className="w-8 h-[2px] rounded"
                  style={{
                    background: isDone ? "oklch(55% 0.16 245)" : "oklch(20% 0.015 245)",
                  }}
                />
              )}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-brand text-white border border-brand/20 shadow-md"
                    : isDone
                    ? "bg-brand/10 text-brand border border-brand/20"
                    : "bg-white/5 text-white/40 border border-white/5"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    isActive
                      ? "bg-white text-brand"
                      : isDone
                      ? "bg-brand text-white"
                      : "bg-white/10 text-white/50"
                  }`}
                >
                  {isDone ? "✓" : idx + 1}
                </div>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* STEP 1: Upload & Metadata */}
      {step === "upload" && (
        <div className="max-w-2xl mx-auto">
          <div className="section-card">
            <h2 className="text-xl font-bold mb-2 text-white">Langkah 1: Unggah PDF & Metadata</h2>
            <p className="text-sm mb-6" style={{ color: "oklch(60% 0.03 245)" }}>
              Isi data skripsi Anda dan upload file PDF utama skripsi untuk memisahkannya per bab.
            </p>

            <div className="flex flex-col gap-6">
              {/* Prodi */}
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: "oklch(78% 0.04 245)" }}>
                  Program Studi <span style={{ color: "oklch(65% 0.2 25)" }}>*</span>
                </label>
                <StudyProgramSelect
                  value={meta.kode}
                  onChange={(k, p) => {
                    setMeta((m) => ({ ...m, kode: k }));
                    setSelectedProgram(p);
                    if (errors.kode) setErrors((e) => { const c = { ...e }; delete c.kode; return c; });
                  }}
                  error={errors.kode}
                />
              </div>

              {/* NIM */}
              <div>
                <label className="block text-sm font-semibold mb-1.5" htmlFor="split-nim" style={{ color: "oklch(78% 0.04 245)" }}>
                  NIM <span style={{ color: "oklch(65% 0.2 25)" }}>*</span>
                </label>
                <input
                  id="split-nim"
                  type="text"
                  className={`input-dark ${errors.nim ? "border-[oklch(55%_0.22_25)]" : ""}`}
                  placeholder="Nomor Induk Mahasiswa"
                  value={meta.nim}
                  onChange={(e) => {
                    setMeta((m) => ({ ...m, nim: e.target.value }));
                    if (errors.nim) setErrors((er) => { const c = { ...er }; delete c.nim; return c; });
                  }}
                />
                {errors.nim && <p className="mt-1 text-xs" style={{ color: "oklch(70% 0.2 25)" }}>{errors.nim}</p>}
              </div>

              {/* NIDN 1 & 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5" htmlFor="split-nidn1" style={{ color: "oklch(78% 0.04 245)" }}>
                    NIDN Pembimbing 1 <span style={{ color: "oklch(65% 0.2 25)" }}>*</span>
                  </label>
                  <input
                    id="split-nidn1"
                    type="text"
                    maxLength={10}
                    className={`input-dark ${errors.nidn1 ? "border-[oklch(55%_0.22_25)]" : ""}`}
                    placeholder="10 digit NIDN"
                    value={meta.nidn1}
                    onChange={(e) => {
                      setMeta((m) => ({ ...m, nidn1: e.target.value }));
                      if (errors.nidn1) setErrors((er) => { const c = { ...er }; delete c.nidn1; return c; });
                    }}
                  />
                  {errors.nidn1 && <p className="mt-1 text-xs" style={{ color: "oklch(70% 0.2 25)" }}>{errors.nidn1}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5" htmlFor="split-nidn2" style={{ color: "oklch(78% 0.04 245)" }}>
                    NIDN Pembimbing 2 <span className="text-[11px]" style={{ color: "oklch(50% 0.02 245)" }}>(Opsional)</span>
                  </label>
                  <input
                    id="split-nidn2"
                    type="text"
                    maxLength={10}
                    className={`input-dark ${errors.nidn2 ? "border-[oklch(55%_0.22_25)]" : ""}`}
                    placeholder="10 digit NIDN"
                    value={meta.nidn2 || ""}
                    onChange={(e) => {
                      setMeta((m) => ({ ...m, nidn2: e.target.value }));
                      if (errors.nidn2) setErrors((er) => { const c = { ...er }; delete c.nidn2; return c; });
                    }}
                  />
                  {errors.nidn2 && <p className="mt-1 text-xs" style={{ color: "oklch(70% 0.2 25)" }}>{errors.nidn2}</p>}
                </div>
              </div>

              {/* Thesis File PDF */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "oklch(78% 0.04 245)" }}>
                  File PDF Skripsi Utama Lengkap <span style={{ color: "oklch(65% 0.2 25)" }}>*</span>
                </label>
                <FileDropZone
                  id="thesis-upload"
                  label="Pilih atau seret file PDF skripsi utama"
                  file={file}
                  onFile={handleFile}
                  onClear={() => {
                    setFile(null);
                    setPdfBytes(null);
                    setTotalPages(0);
                  }}
                  error={errors.file}
                />
              </div>

              {/* Submit / Continue Button */}
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid oklch(18% 0.01 245)" }}>
                <button
                  className="btn btn-brand w-full py-3"
                  onClick={() => {
                    if (validateMeta()) {
                      setStep("ranges");
                    }
                  }}
                >
                  Lanjut ke Atur Rentang Halaman →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Page Ranges */}
      {step === "ranges" && pdfBytes && (
        <div className="fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Langkah 2: Tentukan Rentang Halaman</h2>
              <p className="text-sm mt-1" style={{ color: "oklch(60% 0.03 245)" }}>
                Total {totalPages} halaman skripsi · Atur rentang untuk setiap bab
              </p>
            </div>
            <button
              className="btn btn-accent flex items-center gap-2 animate-pulse-subtle"
              style={{ animation: "float 3s ease-in-out infinite" }}
              onClick={handleAutoDetect}
              disabled={detecting}
            >
              {detecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Mendeteksi... {detectProgress}%
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                    <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5z" opacity="0.7" />
                    <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" opacity="0.7" />
                  </svg>
                  Deteksi Otomatis
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Sections range editors */}
            <div className="flex flex-col gap-3">
              {sections.map((section) => (
                <SectionRangeEditor
                  key={section.id}
                  section={section}
                  totalPages={totalPages}
                  onChange={(id, rng) => {
                    const next = sections.map((s) => (s.id === id ? { ...s, range: rng } : s));
                    setSections(next);
                  }}
                  onChange2={(id, rng) => {
                    const next = sections.map((s) => (s.id === id ? { ...s, range2: rng } : s));
                    setSections(next);
                  }}
                  onPreviewPage={setPreviewPage}
                  onDelete={
                    section.id.startsWith("bab") &&
                    !["bab2", "bab3", "bab4", "bab5"].includes(section.id)
                      ? handleDeleteChapter
                      : undefined
                  }
                />
              ))}

              <button
                type="button"
                className="btn btn-ghost w-full py-3 border border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-sm font-medium flex items-center justify-center gap-2 mt-1"
                style={{ borderRadius: "0.75rem" }}
                onClick={handleAddChapter}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Tambah Bab Baru
              </button>

              <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
                <button className="btn btn-secondary flex-1" onClick={() => setStep("upload")}>
                  ← Kembali ke Upload
                </button>
                <button className="btn btn-brand flex-1" onClick={() => setStep("download")}>
                  Lanjut ke Pratinjau Paket →
                </button>
              </div>
            </div>

            {/* Right: PDF Preview */}
            <div className="lg:sticky lg:top-20 h-[calc(100vh-140px)] min-h-[400px]">
              <div className="section-card h-full flex flex-col p-4">
                <h3 className="text-sm font-semibold mb-3 text-white">Pratinjau Halaman Skripsi</h3>
                <div className="flex-1 overflow-hidden relative">
                  <PdfPagePreview
                    pdfBytes={pdfBytes}
                    currentPage={previewPage}
                    onPageClick={setPreviewPage}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Preview & Download */}
      {step === "download" && (
        <div className="max-w-2xl mx-auto fade-in">
          <div className="section-card">
            <h2 className="text-xl font-bold mb-2 text-white">Langkah 3: Pratinjau & Unduh File Split</h2>
            <p className="text-sm mb-6" style={{ color: "oklch(60% 0.03 245)" }}>
              Split file skripsi Anda telah siap disusun. Berikut adalah daftar berkas yang akan dihasilkan dan dikemas:
            </p>

            {/* Filename List Preview */}
            <div className="flex flex-col gap-3 mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-1">Daftar Berkas Hasil Konversi</h3>
              
              {/* Full Text */}
              <div className="flex items-start justify-between py-2 border-b border-white/5">
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-mono text-white truncate">{buildRamaFullFilename(meta)}</p>
                  <p className="text-[11px] mt-0.5 text-white/60">File PDF Skripsi Lengkap</p>
                </div>
                <span className="badge badge-brand flex-shrink-0">Full Text</span>
              </div>

              {/* Chapters */}
              {sections.map((sec, i) => {
                const isConfigured = sec.range || sec.range2;
                return (
                  <div key={sec.id} className="flex items-start justify-between py-2 border-b border-white/5 last:border-b-0">
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-mono text-white truncate">
                        {buildRamaFilename(meta, sec.filenameSuffix)}
                      </p>
                      <p className="text-[11px] mt-0.5 text-white/60">
                        {sec.description} 
                        {sec.range && ` (Halaman ${sec.range.start}-${sec.range.end})`}
                        {sec.range2 && ` + (Halaman ${sec.range2.start}-${sec.range2.end})`}
                      </p>
                    </div>
                    <span className="badge badge-secondary flex-shrink-0">BAB / Bagian</span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-white/5">
              <button className="btn btn-secondary flex-1" onClick={() => setStep("ranges")}>
                ← Kembali ke Atur Rentang
              </button>
              <button className="btn btn-accent flex-1" onClick={handleGenerateZip}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Unduh ZIP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Overlay */}
      {generating && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          style={{ background: "oklch(8% 0.005 245 / 0.82)" }}
        >
          <div 
            className="w-full max-w-md p-8 rounded-2xl text-center flex flex-col items-center gap-6 animate-fade-in"
            style={{ 
              background: "oklch(12% 0.008 245)", 
              border: "1px solid oklch(20% 0.015 245)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)"
            }}
          >
            {/* Spinning/pulsing logo / loading graphic */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              {/* Outer pulsing ring */}
              <div 
                className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ border: "2px solid oklch(55% 0.16 245)" }}
              />
              {/* Rotating gradient ring */}
              <div 
                className="absolute inset-0 rounded-full animate-spin"
                style={{ 
                  border: "3px solid transparent",
                  borderTopColor: "oklch(55% 0.16 245)",
                  borderRightColor: "oklch(72% 0.16 85)",
                  borderRadius: "50%"
                }}
              />
              {/* Central Logo */}
              <img 
                src="/logo.svg" 
                alt="Logo" 
                className="w-12 h-12 object-contain relative z-10" 
              />
            </div>

            {/* Title & Status */}
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Memisahkan PDF Skripsi</h3>
              <p className="text-sm font-medium" style={{ color: "oklch(72% 0.16 85)" }}>
                {generateStatus}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full">
              <div className="flex justify-between text-xs mb-1.5" style={{ color: "oklch(60% 0.03 245)" }}>
                <span>Kemajuan</span>
                <span>{generateProgress}%</span>
              </div>
              <div className="progress-bar" style={{ height: "8px" }}>
                <div 
                  className="progress-fill transition-all duration-300" 
                  style={{ 
                    width: `${generateProgress}%`,
                    background: "linear-gradient(90deg, oklch(55% 0.16 245), oklch(72% 0.16 85))"
                  }} 
                />
              </div>
            </div>

            {/* Crucial Warning Alert */}
            <div 
              className="w-full flex gap-3 p-3.5 rounded-xl text-left"
              style={{ 
                background: "oklch(78% 0.18 80 / 0.06)", 
                border: "1px solid oklch(78% 0.18 80 / 0.12)",
                color: "oklch(85% 0.14 80)"
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: "2px" }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <p className="font-semibold text-xs text-white">Jangan Tutup Halaman Ini!</p>
                <p className="text-[11px] mt-0.5" style={{ opacity: 0.9 }}>
                  Seluruh pemrosesan dokumen berjalan sepenuhnya di browser Anda. Menutup halaman ini akan membatalkan proses.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
