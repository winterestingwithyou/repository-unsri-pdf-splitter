import { useState, useCallback, useRef } from "react";
import JSZip from "jszip";
import FileSaver from "file-saver";
const { saveAs } = FileSaver;
import {
  getDefaultSections,
  splitPdf,
  mergePdfs,
  buildFilename,
  buildFullFilename,
  detectChapterPages,
  buildDetectedRanges,
  extractPageTexts,
  getPdfPageCount,
  recalculateSuffixes,
  type SplitSection,
  type RepositoryMetadata,
  type PageRange,
} from "../utils/pdfProcessor";
import { FileDropZone } from "../components/FileDropZone";
import { StudyProgramSelect } from "../components/StudyProgramSelect";
import { SectionRangeEditor } from "../components/SectionRangeEditor";
import { PdfPagePreview } from "../components/PdfPagePreview";
import { showToast } from "../components/Toast";
import type { StudyProgram } from "../data/studyPrograms";

type Step = "upload" | "metadata" | "ranges" | "generate";

export default function SplitterPage() {
  // Step
  const [step, setStep] = useState<Step>("upload");

  // File
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState(0);

  // Metadata
  const [meta, setMeta] = useState<RepositoryMetadata>({
    kode: "",
    nim: "",
    nidn1: "",
    nidn2: "",
  });
  const [selectedProgram, setSelectedProgram] = useState<StudyProgram | null>(null);
  const [metaErrors, setMetaErrors] = useState<Partial<Record<keyof RepositoryMetadata, string>>>({});

  // Sections
  const [sections, setSections] = useState<SplitSection[]>(recalculateSuffixes(getDefaultSections()));
  const [previewPage, setPreviewPage] = useState(1);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // Detect state
  const [detecting, setDetecting] = useState(false);
  const [detectProgress, setDetectProgress] = useState(0);

  // Generate state
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [generateStatus, setGenerateStatus] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------- STEP 1: Upload ----------
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

  // ---------- STEP 2: Metadata Validation ----------
  function validateMeta(): boolean {
    const errors: typeof metaErrors = {};
    if (!meta.kode.trim()) errors.kode = "Program studi wajib dipilih";
    if (!meta.nim.trim()) errors.nim = "NIM wajib diisi";
    else if (!/^\d+$/.test(meta.nim.trim())) errors.nim = "NIM hanya boleh angka";
    if (!meta.nidn1.trim()) errors.nidn1 = "NIDN Pembimbing 1 wajib diisi";
    else if (!/^\d+$/.test(meta.nidn1.trim())) errors.nidn1 = "NIDN hanya boleh angka";
    if (meta.nidn2 && meta.nidn2.trim() && !/^\d+$/.test(meta.nidn2.trim())) {
      errors.nidn2 = "NIDN hanya boleh angka";
    }
    setMetaErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ---------- STEP 3: Auto Detect ----------
  async function handleAutoDetect() {
    if (!pdfBytes) return;
    setDetecting(true);
    setDetectProgress(0);
    try {
      const texts = await extractPageTexts(pdfBytes, (page, total) => {
        setDetectProgress(Math.round((page / total) * 100));
      });
      const detected = detectChapterPages(texts);
      const ranges = buildDetectedRanges(detected, totalPages);

      setSections((prev) => {
        let updated = [...prev];
        const detectedKeys = Object.keys(ranges);
        const babKeys = detectedKeys
          .filter((k) => k.startsWith("bab"))
          .sort((a, b) => {
            const numA = parseInt(a.replace("bab", ""));
            const numB = parseInt(b.replace("bab", ""));
            return numA - numB;
          });

        // Ensure all detected chapters exist in updated
        for (const babKey of babKeys) {
          if (!updated.some((s) => s.id === babKey)) {
            const babNum = parseInt(babKey.replace("bab", ""));
            const newChapter: SplitSection = {
              id: babKey,
              label: `BAB ${babNum}`,
              filenameSuffix: `${babNum}`,
              range: null,
              required: false,
              description: `Bab ${babNum} - Terdeteksi otomatis`,
            };
            const lastBabIdx = updated.reduce(
              (acc, s, idx) => (s.id.startsWith("bab") ? idx : acc),
              0
            );
            updated.splice(lastBabIdx + 1, 0, newChapter);
          }
        }

        updated = recalculateSuffixes(updated);

        return updated.map((s) => {
          if (s.id === "front_ref") {
            return {
              ...s,
              range: ranges["front_ref"] ?? s.range,
              range2: ranges["front_ref_range2"] ?? s.range2,
            };
          }
          return {
            ...s,
            range: ranges[s.id] ?? s.range,
          };
        });
      });
      showToast("success", "Deteksi otomatis selesai! Silakan periksa rentang halaman.");
    } catch (e) {
      console.error("[AutoDetect] Error:", e);
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
      
      // Determine next bab number based on the highest existing index in the list
      const babIds = babIndices.map((b) => parseInt(b.id.replace("bab", "")));
      const nextBabNum = babIds.length > 0 ? Math.max(...babIds) + 1 : 2;
      
      const newChapter: SplitSection = {
        id: `bab${nextBabNum}`,
        label: `BAB ${nextBabNum}`,
        filenameSuffix: `${nextBabNum}`,
        range: null,
        required: false,
        description: `Bab ${nextBabNum} - Bab Tambahan`,
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
      const filtered = prev.filter((s) => s.id !== id);
      return recalculateSuffixes(filtered);
    });
  }, []);

  // ---------- STEP 4: Generate ZIP ----------
  async function handleGenerate() {
    // Validate required sections
    const requiredMissing = sections.filter(
      (s) => s.required && (!s.range || (s.range2 !== undefined && !s.range2))
    );
    if (requiredMissing.length > 0) {
      showToast("error", `Atur rentang untuk: ${requiredMissing.map((s) => s.label).join(", ")}`);
      return;
    }

    if (!pdfBytes) return;

    setGenerating(true);
    setGenerateProgress(0);

    try {
      const zip = new JSZip();

      // Full PDF
      setGenerateStatus("Menambahkan PDF lengkap...");
      const fullName = buildFullFilename(meta);
      zip.file(fullName, pdfBytes);
      setGenerateProgress(10);

      // 1. Process 01_front_ref (Front Matter + References merged)
      setGenerateStatus("Membuat Halaman Awal & References (01_front_ref)...");
      const frontRef = sections.find((s) => s.id === "front_ref");
      
      if (frontRef?.range && frontRef?.range2) {
        const bytes1 = await splitPdf(pdfBytes, frontRef.range);
        const bytes2 = await splitPdf(pdfBytes, frontRef.range2);
        const mergedFrontBytes = await mergePdfs([bytes1, bytes2]);
        const filename = buildFilename(meta, "01_front_ref");
        zip.file(filename, mergedFrontBytes);
      } else {
        if (frontRef?.range) {
          const bytes1 = await splitPdf(pdfBytes, frontRef.range);
          zip.file(buildFilename(meta, "01_front_ref"), bytes1);
        } else if (frontRef?.range2) {
          const bytes2 = await splitPdf(pdfBytes, frontRef.range2);
          zip.file(buildFilename(meta, "01_front_ref"), bytes2);
        }
      }
      setGenerateProgress(30);

      // 2. Process other sections (chapters starting from BAB II, Daftar Pustaka stand-alone, and Lampiran)
      const otherSections = sections.filter(
        (s) => s.id !== "front_ref" && s.range
      );
      const totalOthers = otherSections.length;

      for (let i = 0; i < totalOthers; i++) {
        const section = otherSections[i];
        setGenerateStatus(`Memotong ${section.label}...`);
        const splitBytes = await splitPdf(pdfBytes, section.range!);
        const filename = buildFilename(meta, section.filenameSuffix);
        zip.file(filename, splitBytes);
        setGenerateProgress(30 + Math.round(((i + 1) / totalOthers) * 65));
      }

      setGenerateStatus("Membuat ZIP...");
      setGenerateProgress(96);
      const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      setGenerateProgress(100);

      const zipName = `${meta.kode}_${meta.nim}.zip`;
      saveAs(zipBlob, zipName);
      showToast("success", `ZIP berhasil diunduh: ${zipName}`);
      setStep("generate");
    } catch (e) {
      showToast("error", "Terjadi kesalahan saat membuat ZIP.");
      console.error(e);
    } finally {
      setGenerating(false);
      setGenerateStatus("");
    }
  }

  function updateSectionRange(sectionId: string, range: PageRange | null) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, range } : s))
    );
  }

  function updateSectionRange2(sectionId: string, range2: PageRange | null) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, range2 } : s))
    );
  }

  const filenames = sections
    .filter((s) => s.range)
    .map((s) => buildFilename(meta, s.filenameSuffix));

  const STEPS: { id: Step; label: string }[] = [
    { id: "upload", label: "Upload PDF" },
    { id: "metadata", label: "Metadata" },
    { id: "ranges", label: "Rentang Halaman" },
    { id: "generate", label: "Generate" },
  ];

  const stepOrder: Step[] = ["upload", "metadata", "ranges", "generate"];
  const currentStepIdx = stepOrder.indexOf(step);

  return (
    <div className="fade-in">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const idx = stepOrder.indexOf(s.id);
          const done = idx < currentStepIdx;
          const active = idx === currentStepIdx;
          return (
            <div key={s.id} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className="h-px w-8 flex-shrink-0"
                  style={{ background: done ? "oklch(64% 0.22 165)" : "oklch(28% 0.025 250)" }}
                />
              )}
              <button
                className="flex items-center gap-2 flex-shrink-0"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                onClick={() => {
                  if (done) setStep(s.id);
                }}
                disabled={!done && !active}
                aria-current={active ? "step" : undefined}
              >
                <div
                  className={`step-indicator ${
                    done ? "step-done" : active ? "step-active" : "step-pending"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </div>
                <span
                  className="text-sm font-medium hidden sm:block"
                  style={{
                    color: active
                      ? "oklch(90% 0.02 250)"
                      : done
                      ? "oklch(70% 0.05 250)"
                      : "oklch(45% 0.03 250)",
                  }}
                >
                  {s.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* ===== STEP 1: Upload ===== */}
      {step === "upload" && (
        <div className="max-w-xl mx-auto">
          <h2 className="text-xl font-semibold mb-2" style={{ color: "oklch(90% 0.02 250)" }}>
            Upload PDF Skripsi / Tugas Akhir
          </h2>
          <p className="text-sm mb-6" style={{ color: "oklch(60% 0.03 250)" }}>
            Upload file PDF lengkap skripsi/TA kamu. Semua pemrosesan dilakukan di browser kamu.
          </p>

          <FileDropZone
            id="pdf-upload"
            label="Upload PDF Lengkap"
            file={file}
            onFile={handleFile}
            onClear={() => {
              setFile(null);
              setPdfBytes(null);
              setTotalPages(0);
            }}
            hint="Mendukung file PDF hingga 100 MB, lebih dari 300 halaman"
          />

          {file && totalPages > 0 && (
            <div className="mt-4 alert-success flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
              </svg>
              <span>
                <strong>{file.name}</strong> — {totalPages} halaman
              </span>
            </div>
          )}

          <button
            className="btn btn-primary w-full mt-6"
            disabled={!file || totalPages === 0}
            onClick={() => setStep("metadata")}
          >
            Lanjut ke Metadata →
          </button>
        </div>
      )}

      {/* ===== STEP 2: Metadata ===== */}
      {step === "metadata" && (
        <div className="max-w-xl mx-auto">
          <h2 className="text-xl font-semibold mb-2" style={{ color: "oklch(90% 0.02 250)" }}>
            Metadata Repository
          </h2>
          <p className="text-sm mb-6" style={{ color: "oklch(60% 0.03 250)" }}>
            Data ini akan digunakan untuk penamaan file sesuai standar Repository UNSRI.
          </p>

          <div className="flex flex-col gap-4">
            {/* Program Studi */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "oklch(78% 0.04 250)" }}>
                Program Studi <span style={{ color: "oklch(65% 0.2 25)" }}>*</span>
              </label>
              <StudyProgramSelect
                value={meta.kode}
                onChange={(kode, program) => {
                  setMeta((m) => ({ ...m, kode }));
                  setSelectedProgram(program);
                  if (metaErrors.kode) setMetaErrors((e) => ({ ...e, kode: undefined }));
                }}
                error={metaErrors.kode}
              />
              {selectedProgram && (
                <p className="mt-1.5 text-xs" style={{ color: "oklch(55% 0.03 250)" }}>
                  {selectedProgram.faculty} · Kode: {selectedProgram.code}
                </p>
              )}
            </div>

            {/* NIM */}
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="nim" style={{ color: "oklch(78% 0.04 250)" }}>
                NIM (Nomor Induk Mahasiswa) <span style={{ color: "oklch(65% 0.2 25)" }}>*</span>
              </label>
              <input
                id="nim"
                type="text"
                className={`input-dark ${metaErrors.nim ? "border-[oklch(55%_0.22_25)]" : ""}`}
                placeholder="Contoh: 090312823001"
                value={meta.nim}
                onChange={(e) => {
                  setMeta((m) => ({ ...m, nim: e.target.value }));
                  if (metaErrors.nim) setMetaErrors((er) => ({ ...er, nim: undefined }));
                }}
              />
              {metaErrors.nim && <p className="mt-1 text-xs" style={{ color: "oklch(70% 0.2 25)" }}>{metaErrors.nim}</p>}
            </div>

            {/* NIDN 1 */}
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="nidn1" style={{ color: "oklch(78% 0.04 250)" }}>
                NIDN Pembimbing 1 <span style={{ color: "oklch(65% 0.2 25)" }}>*</span>
              </label>
              <input
                id="nidn1"
                type="text"
                className={`input-dark ${metaErrors.nidn1 ? "border-[oklch(55%_0.22_25)]" : ""}`}
                placeholder="Contoh: 0012345678"
                value={meta.nidn1}
                onChange={(e) => {
                  setMeta((m) => ({ ...m, nidn1: e.target.value }));
                  if (metaErrors.nidn1) setMetaErrors((er) => ({ ...er, nidn1: undefined }));
                }}
              />
              {metaErrors.nidn1 && <p className="mt-1 text-xs" style={{ color: "oklch(70% 0.2 25)" }}>{metaErrors.nidn1}</p>}
            </div>

            {/* NIDN 2 */}
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="nidn2" style={{ color: "oklch(78% 0.04 250)" }}>
                NIDN Pembimbing 2{" "}
                <span className="badge" style={{ fontSize: "0.65rem", background: "oklch(28% 0.03 250)", color: "oklch(60% 0.03 250)", border: "none", marginLeft: "4px" }}>
                  Opsional
                </span>
              </label>
              <input
                id="nidn2"
                type="text"
                className={`input-dark ${metaErrors.nidn2 ? "border-[oklch(55%_0.22_25)]" : ""}`}
                placeholder="Kosongkan jika tidak ada"
                value={meta.nidn2 ?? ""}
                onChange={(e) => {
                  setMeta((m) => ({ ...m, nidn2: e.target.value }));
                  if (metaErrors.nidn2) setMetaErrors((er) => ({ ...er, nidn2: undefined }));
                }}
              />
              {metaErrors.nidn2 && <p className="mt-1 text-xs" style={{ color: "oklch(70% 0.2 25)" }}>{metaErrors.nidn2}</p>}
            </div>

            {/* Preview filename */}
            {meta.kode && meta.nim && meta.nidn1 && (
              <div>
                <p className="text-xs mb-1.5" style={{ color: "oklch(55% 0.03 250)" }}>Contoh nama file:</p>
                <div className="filename-chip">{buildFullFilename(meta)}</div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button className="btn btn-secondary" onClick={() => setStep("upload")}>← Kembali</button>
            <button
              className="btn btn-primary flex-1"
              onClick={() => { if (validateMeta()) setStep("ranges"); }}
            >
              Lanjut ke Rentang Halaman →
            </button>
          </div>
        </div>
      )}

      {/* ===== STEP 3: Page Ranges ===== */}
      {step === "ranges" && pdfBytes && (
        <div>
          <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold" style={{ color: "oklch(90% 0.02 250)" }}>
                Rentang Halaman
              </h2>
              <p className="text-sm mt-1" style={{ color: "oklch(60% 0.03 250)" }}>
                Total {totalPages} halaman · Atur rentang untuk setiap bagian
              </p>
            </div>
            <button
              className="btn btn-secondary flex items-center gap-2"
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                  Deteksi Otomatis
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: sections */}
            <div className="flex flex-col gap-3">
              {sections.map((section) => (
                <SectionRangeEditor
                  key={section.id}
                  section={section}
                  totalPages={totalPages}
                  onChange={updateSectionRange}
                  onChange2={updateSectionRange2}
                  onPreviewPage={(page) => {
                    setPreviewPage(page);
                    setActiveSectionId(section.id);
                  }}
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

              <div className="flex gap-3 mt-4">
                <button className="btn btn-secondary" onClick={() => setStep("metadata")}>← Kembali</button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={() => setStep("generate")}
                  disabled={sections.some((s) => s.required && (!s.range || (s.range2 !== undefined && !s.range2)))}
                >
                  Lanjut ke Generate →
                </button>
              </div>
            </div>

            {/* Right: preview */}
            <div className="sticky top-6 self-start">
              <div className="section-card">
                <h3 className="text-sm font-semibold mb-3" style={{ color: "oklch(80% 0.03 250)" }}>
                  Preview PDF
                </h3>
                <PdfPagePreview
                  pdfBytes={pdfBytes}
                  currentPage={previewPage}
                  pageRange={
                    activeSectionId
                      ? sections.find((s) => s.id === activeSectionId)?.range ?? null
                      : null
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== STEP 4: Generate ===== */}
      {step === "generate" && (
        <div className="max-w-xl mx-auto">
          <h2 className="text-xl font-semibold mb-2" style={{ color: "oklch(90% 0.02 250)" }}>
            Generate File
          </h2>

          <div className="alert-info mb-4">
            <strong>Semua pemrosesan dilakukan di browser kamu.</strong> File tidak dikirimkan ke server manapun.
          </div>

          {/* File preview list */}
          <div className="section-card mb-4">
            <p className="text-sm font-medium mb-3" style={{ color: "oklch(78% 0.04 250)" }}>
              File yang akan dibuat:
            </p>
            <div className="flex flex-col gap-2">
              <div className="filename-chip">{buildFullFilename(meta)}</div>
              {Array.from(
                new Set(
                  sections
                    .filter((s) => s.range)
                    .map((s) => buildFilename(meta, s.filenameSuffix))
                )
              ).map((name) => (
                <div key={name} className="filename-chip">
                  {name}
                </div>
              ))}
            </div>
          </div>

          {/* Cover image reminder */}
          <div className="alert-warning mb-4 flex gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0, marginTop: "1px" }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <p className="font-semibold text-sm">Cover Image tidak dibuat otomatis!</p>
              <p className="text-xs mt-0.5">
                Kamu perlu foto/scan cover fisik skripsi dan upload sebagai{" "}
                <code className="font-mono">{meta.kode}_{meta.nim}_cover.jpg</code>
              </p>
            </div>
          </div>

          {/* Progress Overlay */}
          {generating && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
              style={{ background: "oklch(8% 0.015 250 / 0.85)" }}
            >
              <div 
                className="w-full max-w-md p-8 rounded-2xl text-center flex flex-col items-center gap-6 animate-fade-in"
                style={{ 
                  background: "oklch(14% 0.015 250)", 
                  border: "1px solid oklch(24% 0.03 250 / 0.6)",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
                }}
              >
                {/* Spinning/pulsing logo / loading graphic */}
                <div className="relative w-20 h-20 flex items-center justify-center">
                  {/* Outer pulsing ring */}
                  <div 
                    className="absolute inset-0 rounded-full animate-ping opacity-25"
                    style={{ border: "2px solid oklch(64% 0.22 165)" }}
                  />
                  {/* Rotating gradient ring */}
                  <div 
                    className="absolute inset-0 rounded-full animate-spin"
                    style={{ 
                      border: "3px solid transparent",
                      borderTopColor: "oklch(64% 0.22 165)",
                      borderRightColor: "oklch(80% 0.12 85)",
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
                  <h3 className="text-lg font-bold text-white mb-2">Memproses PDF Skripsi</h3>
                  <p className="text-sm font-medium" style={{ color: "oklch(64% 0.22 165)" }}>
                    {generateStatus}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="w-full">
                  <div className="flex justify-between text-xs mb-1.5" style={{ color: "oklch(60% 0.03 250)" }}>
                    <span>Kemajuan</span>
                    <span>{generateProgress}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: "8px" }}>
                    <div 
                      className="progress-fill transition-all duration-300" 
                      style={{ 
                        width: `${generateProgress}%`,
                        background: "linear-gradient(90deg, oklch(64% 0.22 165), oklch(80% 0.12 85))"
                      }} 
                    />
                  </div>
                </div>

                {/* Crucial Warning Alert */}
                <div 
                  className="w-full flex gap-3 p-3.5 rounded-xl text-left"
                  style={{ 
                    background: "oklch(60% 0.18 35 / 0.08)", 
                    border: "1px solid oklch(60% 0.18 35 / 0.15)",
                    color: "oklch(78% 0.14 45)"
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
                      Pemisahan PDF dilakukan secara lokal di browser Anda. Menutup halaman ini akan menghentikan proses pemisahan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button className="btn btn-secondary" onClick={() => setStep("ranges")} disabled={generating}>
              ← Kembali
            </button>
            <button
              id="btn-generate-zip"
              className="btn btn-primary flex-1"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download ZIP
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
