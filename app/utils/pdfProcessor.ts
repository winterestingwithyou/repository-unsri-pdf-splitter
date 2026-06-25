import { PDFDocument } from "pdf-lib";

export interface PageRange {
  start: number; // 1-indexed
  end: number; // 1-indexed, inclusive
}

export interface SplitSection {
  id: string;
  label: string;
  filenameSuffix: string;
  range: PageRange | null;
  required: boolean;
  description: string;
}

export interface RepositoryMetadata {
  kode: string;
  nim: string;
  nidn1: string;
  nidn2?: string;
}

export function buildFilename(
  meta: RepositoryMetadata,
  suffix?: string,
  ext = "pdf"
): string {
  const parts = [meta.kode, meta.nim, meta.nidn1];
  if (meta.nidn2 && meta.nidn2.trim() !== "") {
    parts.push(meta.nidn2.trim());
  }
  if (suffix) parts.push(suffix);
  return `${parts.join("_")}.${ext}`;
}

export function buildFullFilename(meta: RepositoryMetadata): string {
  return `${meta.kode}_${meta.nim}.pdf`;
}

export function buildTurnitinFilename(meta: { kode: string; nim: string }): string {
  return `${meta.kode}_${meta.nim}_TURNITIN.pdf`;
}

export function getDefaultSections(): SplitSection[] {
  return [
    {
      id: "front",
      label: "Halaman Awal (01_front_ref)",
      filenameSuffix: "01_front_ref",
      range: null,
      required: true,
      description: "Cover, lembar persetujuan, abstrak, daftar isi, dan semua halaman sebelum BAB I",
    },
    {
      id: "bab1",
      label: "BAB I",
      filenameSuffix: "02",
      range: null,
      required: true,
      description: "Bab 1 - Pendahuluan",
    },
    {
      id: "bab2",
      label: "BAB II",
      filenameSuffix: "03",
      range: null,
      required: false,
      description: "Bab 2 - Tinjauan Pustaka / Landasan Teori",
    },
    {
      id: "bab3",
      label: "BAB III",
      filenameSuffix: "04",
      range: null,
      required: false,
      description: "Bab 3 - Metodologi Penelitian",
    },
    {
      id: "bab4",
      label: "BAB IV",
      filenameSuffix: "05",
      range: null,
      required: false,
      description: "Bab 4 - Hasil dan Pembahasan",
    },
    {
      id: "bab5",
      label: "BAB V",
      filenameSuffix: "06",
      range: null,
      required: false,
      description: "Bab 5 - Penutup / Kesimpulan",
    },
    {
      id: "daftar_pustaka",
      label: "Daftar Pustaka (06_ref)",
      filenameSuffix: "06_ref",
      range: null,
      required: true,
      description: "Daftar referensi / pustaka",
    },
    {
      id: "lampiran",
      label: "Lampiran (07_lamp)",
      filenameSuffix: "07_lamp",
      range: null,
      required: false,
      description: "Lampiran-lampiran pendukung",
    },
  ];
}

export async function splitPdf(
  pdfBytes: ArrayBuffer,
  range: PageRange
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBytes.slice(0));
  const newDoc = await PDFDocument.create();

  const totalPages = srcDoc.getPageCount();
  const startIdx = Math.max(0, range.start - 1);
  const endIdx = Math.min(totalPages - 1, range.end - 1);

  if (startIdx > endIdx) {
    throw new Error(`Invalid page range: ${range.start}-${range.end}`);
  }

  const pageIndices = Array.from(
    { length: endIdx - startIdx + 1 },
    (_, i) => startIdx + i
  );
  const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  return newDoc.save();
}

export async function mergePdfs(pdfBytesArray: ArrayBuffer[]): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create();

  for (const bytes of pdfBytesArray) {
    const srcDoc = await PDFDocument.load(bytes.slice(0));
    const pageIndices = Array.from({ length: srcDoc.getPageCount() }, (_, i) => i);
    const copiedPages = await mergedDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => mergedDoc.addPage(page));
  }

  return mergedDoc.save();
}

export function getPdfPageCount(pdfBytes: ArrayBuffer): Promise<number> {
  return PDFDocument.load(pdfBytes.slice(0)).then((doc) => doc.getPageCount());
}

// PDF.js based text extraction for chapter detection
export async function extractPageTexts(
  pdfBytes: ArrayBuffer,
  progressCallback?: (page: number, total: number) => void
): Promise<string[]> {
  const { getPdfjsLib } = await import("./pdfjsSetup");
  const pdfjsLib = await getPdfjsLib();

  // Wajib copy buffer — PDF.js men-transfer (detach) ArrayBuffer ke worker
  // thread saat getDocument() dipanggil. Tanpa copy, buffer asli di React
  // state akan ter-detach dan tidak bisa digunakan oleh fungsi lain.
  const buffer = pdfBytes.slice(0);
  const typedArray = new Uint8Array(buffer);

  const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;

  const texts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: unknown) => {
        const typedItem = item as { str?: string };
        return typedItem.str || "";
      })
      .join(" ")
      .toUpperCase();
    texts.push(text);
    progressCallback?.(i, pdf.numPages);
  }

  return texts;
}

export interface DetectedRanges {
  front?: PageRange;
  daftar_pustaka?: PageRange;
  lampiran?: PageRange;
  [key: string]: PageRange | undefined;
}

const CHAPTER_PATTERNS = {
  bab1: [/\bBAB\s+I\b(?!\s*[IVX])/i, /\bBAB\s+1\b/i, /\bBAB\s+PERTAMA\b/i, /PENDAHULUAN/i],
  bab2: [/\bBAB\s+II\b(?!\s*I)/i, /\bBAB\s+2\b/i, /\bBAB\s+KEDUA\b/i],
  bab3: [/\bBAB\s+III\b(?!\s*I)/i, /\bBAB\s+3\b/i, /\bBAB\s+KETIGA\b/i],
  bab4: [/\bBAB\s+IV\b/i, /\bBAB\s+4\b/i, /\bBAB\s+KEEMPAT\b/i],
  bab5: [/\bBAB\s+V\b(?!\s*I)/i, /\bBAB\s+5\b/i, /\bBAB\s+KELIMA\b/i],
  bab6: [/\bBAB\s+VI\b(?!\s*I)/i, /\bBAB\s+6\b/i, /\bBAB\s+KEENAM\b/i],
  bab7: [/\bBAB\s+VII\b(?!\s*I)/i, /\bBAB\s+7\b/i, /\bBAB\s+KETUJUH\b/i],
  bab8: [/\bBAB\s+VIII\b(?!\s*I)/i, /\bBAB\s+8\b/i, /\bBAB\s+KEDELAPAN\b/i],
  bab9: [/\bBAB\s+IX\b(?!\s*I)/i, /\bBAB\s+9\b/i, /\bBAB\s+KESEMBILAN\b/i],
  bab10: [/\bBAB\s+X\b(?!\s*I)/i, /\bBAB\s+10\b/i, /\bBAB\s+KESEPULUH\b/i],
  daftar_pustaka: [/DAFTAR\s+PUSTAKA/i, /DAFTAR\s+REFERENSI/i, /REFERENCES/i],
  lampiran: [/\bLAMPIRAN\b/i, /\bAPPENDIX\b/i, /\bAPPENDICES\b/i],
};

export function toRoman(num: number): string {
  const romanMap: Record<number, string> = {
    1: "I", 2: "II", 3: "III", 4: "IV", 5: "V",
    6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X"
  };
  return romanMap[num] || String(num);
}

/**
 * Recalculate suffixes and labels dynamically based on the current order of sections.
 * This ensures that Halaman Awal is 01, followed by BABs sequentially (02, 03...),
 * then Daftar Pustaka gets [Last Bab + 1]_ref, and Lampiran gets [Last Bab + 2]_lamp.
 */
export function recalculateSuffixes(sections: SplitSection[]): SplitSection[] {
  const chapters = sections.filter((s) => s.id.startsWith("bab"));
  const numChapters = chapters.length;

  return sections.map((s) => {
    if (s.id === "front") {
      return {
        ...s,
        filenameSuffix: "01_front_ref",
        label: "Halaman Awal (01_front_ref)",
      };
    }
    if (s.id.startsWith("bab")) {
      const idx = chapters.findIndex((c) => c.id === s.id);
      const numStr = String(idx + 2).padStart(2, "0");
      const roman = toRoman(idx + 1);
      return {
        ...s,
        filenameSuffix: numStr,
        label: `BAB ${roman} (${numStr})`,
      };
    }
    if (s.id === "daftar_pustaka") {
      const numStr = String(numChapters + 2).padStart(2, "0");
      return {
        ...s,
        filenameSuffix: `${numStr}_ref`,
        label: `Daftar Pustaka (${numStr}_ref)`,
      };
    }
    if (s.id === "lampiran") {
      const numStr = String(numChapters + 3).padStart(2, "0");
      return {
        ...s,
        filenameSuffix: `${numStr}_lamp`,
        label: `Lampiran (${numStr}_lamp)`,
      };
    }
    return s;
  });
}

export function detectChapterPages(pageTexts: string[]): Record<string, number> {
  const detected: Record<string, number> = {};
  const totalPages = pageTexts.length;

  for (const [chapter, patterns] of Object.entries(CHAPTER_PATTERNS)) {
    for (let i = 0; i < totalPages; i++) {
      const text = pageTexts[i];
      const matched = patterns.some((pattern) => pattern.test(text));
      if (matched && !(chapter in detected)) {
        detected[chapter] = i + 1; // 1-indexed
      }
    }
  }

  return detected;
}

export function buildDetectedRanges(
  detectedPages: Record<string, number>,
  totalPages: number
): DetectedRanges {
  const ranges: DetectedRanges = {};

  const keys = Object.keys(detectedPages);
  
  // Sort chapters numerically (bab1, bab2, ... bab10)
  const babKeys = keys
    .filter((k) => k.startsWith("bab"))
    .sort((a, b) => {
      const numA = parseInt(a.replace("bab", ""));
      const numB = parseInt(b.replace("bab", ""));
      return numA - numB;
    });

  const orderedKeys = [...babKeys];
  if (detectedPages["daftar_pustaka"]) orderedKeys.push("daftar_pustaka");
  if (detectedPages["lampiran"]) orderedKeys.push("lampiran");

  // front: page 1 to start of bab1 - 1
  const firstBabPage = babKeys.length > 0 ? detectedPages[babKeys[0]] : null;
  if (firstBabPage) {
    ranges.front = { start: 1, end: firstBabPage - 1 };
  } else {
    ranges.front = { start: 1, end: 1 };
  }

  // Each chapter/section: from its start page to the page before the next chapter
  for (let i = 0; i < orderedKeys.length; i++) {
    const currentKey = orderedKeys[i];
    const startPage = detectedPages[currentKey];
    if (!startPage) continue;

    // Find the end page (next chapter's start - 1 or totalPages)
    let endPage = totalPages;
    for (let j = i + 1; j < orderedKeys.length; j++) {
      const nextKey = orderedKeys[j];
      const nextPage = detectedPages[nextKey];
      if (nextPage && nextPage > startPage) {
        endPage = nextPage - 1;
        break;
      }
    }

    ranges[currentKey] = { start: startPage, end: endPage };
  }

  return ranges;
}

