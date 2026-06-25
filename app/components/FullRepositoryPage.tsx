import { useState, useRef, useEffect } from "react";
import JSZip from "jszip";
import FileSaver from "file-saver";
const { saveAs } = FileSaver;
import imageCompression from "browser-image-compression";
import {
  getDefaultSections,
  splitPdf,
  mergePdfs,
  buildRamaFilename,
  buildRamaFullFilename,
  buildRamaTurnitinFilename,
  buildRamaCoverFilename,
  detectChapterPages,
  buildDetectedRanges,
  extractPageTexts,
  getPdfPageCount,
  recalculateSuffixes,
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
import SplitterPage from "./SplitterPage";
import TurnitinMerger from "./TurnitinMerger";

type Step = "upload" | "ranges" | "download";

export default function FullRepositoryPage() {
  const [mode, setMode] = useState<"complete" | "splitter" | "turnitin">("complete");

  // If sub-mode is selected, render it directly
  if (mode === "splitter") {
    return (
      <div className="fade-in">
        {renderModeSelector()}
        <SplitterPage />
      </div>
    );
  }

  if (mode === "turnitin") {
    return (
      <div className="fade-in">
        {renderModeSelector()}
        <TurnitinMerger />
      </div>
    );
  }

  return (
    <div className="fade-in">
      {renderModeSelector()}
      <CompleteRepositoryFlow />
    </div>
  );

  function renderModeSelector() {
    return (
      <div className="flex flex-col sm:flex-row gap-2 p-1.5 rounded-xl mb-8 bg-white/5 border border-white/10 max-w-2xl mx-auto">
        <button
          onClick={() => setMode("complete")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            mode === "complete"
              ? "bg-brand text-white shadow-lg"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          Paket Lengkap Repository
        </button>
        <button
          onClick={() => setMode("splitter")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            mode === "splitter"
              ? "bg-brand text-white shadow-lg"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="11" x2="12" y2="17" />
            <polyline points="9 14 12 11 15 14" />
          </svg>
          Splitter PDF Mandiri
        </button>
        <button
          onClick={() => setMode("turnitin")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            mode === "turnitin"
              ? "bg-brand text-white shadow-lg"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 3H8l-2 4h12z" />
          </svg>
          Turnitin Merger Mandiri
        </button>
      </div>
    );
  }
}

function CompleteRepositoryFlow() {
  const [step, setStep] = useState<Step>("upload");

  // Reset scroll to top when changing steps
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Files State
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [thesisFile, setThesisFile] = useState<File | null>(null);
  const [similarityFile, setSimilarityFile] = useState<File | null>(null);
  const [turnitinFile, setTurnitinFile] = useState<File | null>(null);

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

  async function handleThesisFile(f: File) {
    try {
      const bytes = await f.arrayBuffer();
      const count = await getPdfPageCount(bytes);
      setThesisFile(f);
      setPdfBytes(bytes);
      setTotalPages(count);
      setSections(recalculateSuffixes(getDefaultSections()));
      showToast("success", `Skripsi dimuat: ${count} halaman`);
    } catch {
      showToast("error", "File PDF Skripsi tidak valid atau rusak.");
    }
  }

  function validateUploadsAndMeta(): boolean {
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

    if (!coverFile) e.cover = "File cover skripsi wajib diunggah";
    if (!thesisFile) e.thesis = "File PDF skripsi lengkap wajib diunggah";
    if (!similarityFile) e.similarity = "Surat keterangan similarity wajib diunggah";
    if (!turnitinFile) e.turnitin = "Laporan Turnitin wajib diunggah";

    setErrors(e);
    if (Object.keys(e).length > 0) {
      showToast("error", "Harap periksa form dan lengkapi seluruh file/metadata.");
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

      const updated = sections.map((s) => {
        const key = s.id;
        const range = ranges[key];
        const range2 = key === "front_ref" ? ranges["front_ref_range2"] : undefined;
        return {
          ...s,
          range: range || null,
          range2: range2 !== undefined ? range2 : s.range2,
        };
      });

      setSections(updated);
      showToast("success", "Deteksi bab selesai!");
    } catch (err) {
      console.error(err);
      showToast("error", "Gagal mendeteksi bab secara otomatis.");
    } finally {
      setDetecting(false);
    }
  }

  async function handleGenerateZip() {
    // Validate ranges
    const requiredMissing = sections.filter(
      (s) => s.required && (!s.range || (s.range2 !== undefined && !s.range2))
    );
    if (requiredMissing.length > 0) {
      showToast("error", `Atur rentang untuk: ${requiredMissing.map((s) => s.label).join(", ")}`);
      return;
    }

    if (!coverFile || !thesisFile || !similarityFile || !turnitinFile || !pdfBytes) return;

    setGenerating(true);
    setGenerateProgress(0);
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      const zip = new JSZip();

      // 1. Process Cover Image (Compress if size > 500KB)
      setGenerateStatus("Memproses & Mengompres Cover Image...");
      let coverBlob: Blob = coverFile;
      if (coverFile.size > 500 * 1024) {
        setGenerateStatus("Mengompres Cover Image (Target < 500KB)...");
        const options = {
          maxSizeMB: 0.48, // under 500kb
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: "image/jpeg",
        };
        try {
          coverBlob = await imageCompression(coverFile, options);
        } catch (err) {
          console.error("Compression error, using original file", err);
          coverBlob = coverFile;
        }
      }
      const coverName = buildRamaCoverFilename(meta);
      zip.file(coverName, coverBlob);
      setGenerateProgress(15);

      // 2. Full Thesis PDF
      setGenerateStatus("Menambahkan PDF Skripsi Lengkap...");
      const fullThesisName = buildRamaFullFilename(meta);
      zip.file(fullThesisName, pdfBytes);
      setGenerateProgress(30);

      // 3. Merged Turnitin
      setGenerateStatus("Menggabungkan Turnitin & Surat Similarity...");
      const simBytes = await similarityFile.arrayBuffer();
      const turnBytes = await turnitinFile.arrayBuffer();
      const mergedTurnBytes = await mergePdfs([simBytes, turnBytes]);
      const turnitinName = buildRamaTurnitinFilename(meta);
      zip.file(turnitinName, mergedTurnBytes);
      setGenerateProgress(45);

      // 4. Split PDF Chapters
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
        
        const stepProgress = 45 + Math.round(((i + 1) / totalSteps) * 45);
        setGenerateProgress(stepProgress);
      }

      setGenerateStatus("Mengemas ke dalam file ZIP...");
      const content = await zip.generateAsync({ type: "blob" });
      const zipFilename = `RAMA_${meta.kode}_${meta.nim}_LENGKAP.zip`;
      saveAs(content, zipFilename);

      setGenerateProgress(100);
      showToast("success", "Paket ZIP Repository berhasil dibuat & diunduh!");
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
            <h2 className="text-xl font-bold mb-2 text-white">Langkah 1: Unggah Dokumen & Metadata</h2>
            <p className="text-sm mb-6" style={{ color: "oklch(60% 0.03 245)" }}>
              Isi data skripsi Anda dan upload berkas-berkas persyaratan untuk menyusun paket lengkap Repository.
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
                <label className="block text-sm font-semibold mb-1.5" htmlFor="rama-nim" style={{ color: "oklch(78% 0.04 245)" }}>
                  NIM <span style={{ color: "oklch(65% 0.2 25)" }}>*</span>
                </label>
                <input
                  id="rama-nim"
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
                  <label className="block text-sm font-semibold mb-1.5" htmlFor="rama-nidn1" style={{ color: "oklch(78% 0.04 245)" }}>
                    NIDN Pembimbing 1 <span style={{ color: "oklch(65% 0.2 25)" }}>*</span>
                  </label>
                  <input
                    id="rama-nidn1"
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
                  <label className="block text-sm font-semibold mb-1.5" htmlFor="rama-nidn2" style={{ color: "oklch(78% 0.04 245)" }}>
                    NIDN Pembimbing 2 <span className="text-[11px]" style={{ color: "oklch(50% 0.02 245)" }}>(Opsional)</span>
                  </label>
                  <input
                    id="rama-nidn2"
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

              {/* Cover File Upload */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "oklch(78% 0.04 245)" }}>
                  Foto/Scan Cover Hardcover Skripsi <span style={{ color: "oklch(65% 0.2 25)" }}>*</span>
                </label>
                <p className="text-[11px] mb-2" style={{ color: "oklch(50% 0.02 245)" }}>
                  Harus berformat JPG/JPEG. Jika ukuran melebihi 500KB akan otomatis dikompres di browser.
                </p>
                <FileDropZone
                  id="cover-upload"
                  label="Pilih atau seret foto cover (JPG/PNG)"
                  file={coverFile}
                  onFile={setCoverFile}
                  onClear={() => setCoverFile(null)}
                  error={errors.cover}
                  accept="image/*"
                />
              </div>

              {/* Thesis File PDF */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "oklch(78% 0.04 245)" }}>
                  File PDF Skripsi Utama Lengkap <span style={{ color: "oklch(65% 0.2 25)" }}>*</span>
                </label>
                <FileDropZone
                  id="thesis-upload"
                  label="Pilih atau seret file PDF skripsi utama"
                  file={thesisFile}
                  onFile={handleThesisFile}
                  onClear={() => {
                    setThesisFile(null);
                    setPdfBytes(null);
                    setTotalPages(0);
                  }}
                  error={errors.thesis}
                />
              </div>

              {/* Similarity letter & Turnitin report */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: "oklch(78% 0.04 245)" }}>
                    Surat Similarity (PDF) <span style={{ color: "oklch(65% 0.2 25)" }}>*</span>
                  </label>
                  <FileDropZone
                    id="similarity-upload"
                    label="Pilih atau seret Surat Similarity"
                    file={similarityFile}
                    onFile={setSimilarityFile}
                    onClear={() => setSimilarityFile(null)}
                    error={errors.similarity}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: "oklch(78% 0.04 245)" }}>
                    Laporan Turnitin (PDF) <span style={{ color: "oklch(65% 0.2 25)" }}>*</span>
                  </label>
                  <FileDropZone
                    id="turnitin-upload"
                    label="Pilih atau seret PDF Laporan Turnitin"
                    file={turnitinFile}
                    onFile={setTurnitinFile}
                    onClear={() => setTurnitinFile(null)}
                    error={errors.turnitin}
                  />
                </div>
              </div>

              {/* Submit / Continue Button */}
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid oklch(18% 0.01 245)" }}>
                <button
                  className="btn btn-brand w-full py-3"
                  onClick={() => {
                    if (validateUploadsAndMeta()) {
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
                />
              ))}

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
            <h2 className="text-xl font-bold mb-2 text-white">Langkah 3: Pratinjau & Unduh Paket Berkas</h2>
            <p className="text-sm mb-6" style={{ color: "oklch(60% 0.03 245)" }}>
              Paket ZIP lengkap untuk Repository telah siap disusun. Berikut adalah daftar berkas yang akan dihasilkan dan dikemas:
            </p>

            {/* Filename List Preview */}
            <div className="flex flex-col gap-3 mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-1">Daftar Berkas Hasil Konversi</h3>
              
              {/* Cover Image */}
              <div className="flex items-start justify-between py-2 border-b border-white/5">
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-mono text-gold-400 truncate">{buildRamaCoverFilename(meta)}</p>
                  <p className="text-[11px] mt-0.5 text-white/60">Foto Cover Skripsi (Format JPG, compressed &lt; 500KB)</p>
                </div>
                <span className="badge badge-gold flex-shrink-0">Cover</span>
              </div>

              {/* Full Text */}
              <div className="flex items-start justify-between py-2 border-b border-white/5">
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-mono text-white truncate">{buildRamaFullFilename(meta)}</p>
                  <p className="text-[11px] mt-0.5 text-white/60">File PDF Skripsi Lengkap</p>
                </div>
                <span className="badge badge-brand flex-shrink-0">Full Text</span>
              </div>

              {/* Turnitin Merged */}
              <div className="flex items-start justify-between py-2 border-b border-white/5">
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-mono text-white truncate">{buildRamaTurnitinFilename(meta)}</p>
                  <p className="text-[11px] mt-0.5 text-white/60">Gabungan PDF Surat Similarity + Laporan Turnitin</p>
                </div>
                <span className="badge badge-brand flex-shrink-0">Turnitin</span>
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
                Unduh ZIP Lengkap
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
              <h3 className="text-lg font-bold text-white mb-2">Menyusun Paket Berkas Repository</h3>
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
                  Seluruh pemrosesan dokumen dan kompresi gambar berjalan sepenuhnya di browser Anda. Menutup halaman ini akan membatalkan proses.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
