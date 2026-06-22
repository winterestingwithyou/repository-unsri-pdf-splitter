import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { mergePdfs, buildTurnitinFilename } from "../utils/pdfProcessor";
import { FileDropZone } from "../components/FileDropZone";
import { StudyProgramSelect } from "../components/StudyProgramSelect";
import { showToast } from "../components/Toast";
import type { StudyProgram } from "../data/studyPrograms";

export default function TurnitinMerger() {
  const [turnitinFile, setTurnitinFile] = useState<File | null>(null);
  const [letterFile, setLetterFile] = useState<File | null>(null);
  const [kode, setKode] = useState("");
  const [nim, setNim] = useState("");
  const [selectedProgram, setSelectedProgram] = useState<StudyProgram | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [merging, setMerging] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!kode) e.kode = "Program studi wajib dipilih";
    if (!nim.trim()) e.nim = "NIM wajib diisi";
    else if (!/^\d+$/.test(nim.trim())) e.nim = "NIM hanya boleh angka";
    if (!turnitinFile) e.turnitin = "Upload file Turnitin terlebih dahulu";
    if (!letterFile) e.letter = "Upload surat keterangan terlebih dahulu";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleMerge() {
    if (!validate()) return;
    if (!turnitinFile || !letterFile) return;

    setMerging(true);
    try {
      const [turnitinBytes, letterBytes] = await Promise.all([
        turnitinFile.arrayBuffer(),
        letterFile.arrayBuffer(),
      ]);

      const merged = await mergePdfs([letterBytes, turnitinBytes]);
      const filename = buildTurnitinFilename({ kode, nim });

      const blob = new Blob([merged], { type: "application/pdf" });
      saveAs(blob, filename);
      showToast("success", `Berhasil diunduh: ${filename}`);
    } catch (e) {
      showToast("error", "Gagal menggabungkan PDF. Pastikan kedua file valid.");
      console.error(e);
    } finally {
      setMerging(false);
    }
  }

  const outputName = kode && nim ? buildTurnitinFilename({ kode, nim }) : null;

  return (
    <div className="fade-in max-w-xl mx-auto">
      <h2 className="text-xl font-semibold mb-2" style={{ color: "oklch(90% 0.02 250)" }}>
        Turnitin PDF Merger
      </h2>
      <p className="text-sm mb-6" style={{ color: "oklch(60% 0.03 250)" }}>
        Gabungkan surat keterangan similarity dengan file Turnitin menjadi satu PDF.
      </p>

      <div className="alert-info mb-6 flex gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: "1px" }}>
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>Urutan file: Surat keterangan → Laporan Turnitin</span>
      </div>

      <div className="flex flex-col gap-5">
        {/* Program Studi */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "oklch(78% 0.04 250)" }}>
            Program Studi <span style={{ color: "oklch(65% 0.2 25)" }}>*</span>
          </label>
          <StudyProgramSelect
            value={kode}
            onChange={(k, p) => {
              setKode(k);
              setSelectedProgram(p);
              if (errors.kode) setErrors((e) => ({ ...e, kode: "" }));
            }}
            error={errors.kode}
          />
        </div>

        {/* NIM */}
        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="turnitin-nim" style={{ color: "oklch(78% 0.04 250)" }}>
            NIM <span style={{ color: "oklch(65% 0.2 25)" }}>*</span>
          </label>
          <input
            id="turnitin-nim"
            type="text"
            className={`input-dark ${errors.nim ? "border-[oklch(55%_0.22_25)]" : ""}`}
            placeholder="Nomor Induk Mahasiswa"
            value={nim}
            onChange={(e) => {
              setNim(e.target.value);
              if (errors.nim) setErrors((er) => ({ ...er, nim: "" }));
            }}
          />
          {errors.nim && <p className="mt-1 text-xs" style={{ color: "oklch(70% 0.2 25)" }}>{errors.nim}</p>}
        </div>

        {/* Surat Keterangan */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "oklch(78% 0.04 250)" }}>
            Surat Keterangan Similarity <span style={{ color: "oklch(65% 0.2 25)" }}>*</span>
          </label>
          <FileDropZone
            id="letter-upload"
            label="Upload Surat Keterangan Similarity (PDF)"
            file={letterFile}
            onFile={setLetterFile}
            onClear={() => setLetterFile(null)}
            error={errors.letter}
          />
        </div>

        {/* Turnitin PDF */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "oklch(78% 0.04 250)" }}>
            Laporan Turnitin (PDF) <span style={{ color: "oklch(65% 0.2 25)" }}>*</span>
          </label>
          <FileDropZone
            id="turnitin-upload"
            label="Upload Laporan Turnitin (PDF)"
            file={turnitinFile}
            onFile={setTurnitinFile}
            onClear={() => setTurnitinFile(null)}
            error={errors.turnitin}
          />
        </div>

        {/* Output preview */}
        {outputName && (
          <div>
            <p className="text-xs mb-1.5" style={{ color: "oklch(55% 0.03 250)" }}>Output file:</p>
            <div className="filename-chip">{outputName}</div>
          </div>
        )}

        <button
          id="btn-merge-turnitin"
          className="btn btn-accent w-full"
          onClick={handleMerge}
          disabled={merging}
        >
          {merging ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Menggabungkan...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
              Gabungkan & Download PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
}
