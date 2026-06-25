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
  range2?: PageRange | null;
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
      id: "front_ref",
      label: "Halaman Awal & BAB I (01_front_ref)",
      filenameSuffix: "01_front_ref",
      range: null,
      range2: null,
      required: true,
      description: "Cover, abstrak, daftar isi, sampai dengan BAB I + Halaman Daftar Pustaka",
    },
    {
      id: "bab2",
      label: "BAB II",
      filenameSuffix: "02",
      range: null,
      required: true,
      description: "Bab 2 - Tinjauan Pustaka / Landasan Teori",
    },
    {
      id: "bab3",
      label: "BAB III",
      filenameSuffix: "03",
      range: null,
      required: true,
      description: "Bab 3 - Metodologi Penelitian",
    },
    {
      id: "bab4",
      label: "BAB IV",
      filenameSuffix: "04",
      range: null,
      required: true,
      description: "Bab 4 - Hasil dan Pembahasan",
    },
    {
      id: "bab5",
      label: "BAB V",
      filenameSuffix: "05",
      range: null,
      required: true,
      description: "Bab 5 - Penutup / Kesimpulan",
    },
    {
      id: "daftar_pustaka",
      label: "Daftar Pustaka",
      filenameSuffix: "06_ref",
      range: null,
      required: true,
      description: "Daftar referensi / pustaka",
    },
    {
      id: "lampiran",
      label: "Lampiran",
      filenameSuffix: "07_lamp",
      range: null,
      required: true,
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

export async function mergePdfs(pdfBytesArray: (ArrayBuffer | Uint8Array)[]): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create();

  for (const bytes of pdfBytesArray) {
    const srcDoc = await PDFDocument.load(bytes);
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

  const buffer = pdfBytes.slice(0);
  const typedArray = new Uint8Array(buffer);

  const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;

  const texts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as Array<{ str?: string; transform?: number[] }>;

    // Sort items top-to-bottom (Y descending), then left-to-right (X ascending).
    // In PDF space, Y=0 is the bottom of the page, so higher Y means higher up.
    const sortedItems = [...items].sort((a, b) => {
      const yA = a.transform ? a.transform[5] : 0;
      const yB = b.transform ? b.transform[5] : 0;
      const xA = a.transform ? a.transform[4] : 0;
      const xB = b.transform ? b.transform[4] : 0;

      // Group items on the same line if their Y values are very close (< 5 units)
      if (Math.abs(yA - yB) < 5) {
        return xA - xB;
      }
      return yB - yA;
    });

    const lines: string[] = [];
    let currentY = -1;
    let currentLine: string[] = [];

    for (const item of sortedItems) {
      const y = item.transform ? item.transform[5] : 0;
      const str = item.str || "";

      if (currentY === -1) {
        currentY = y;
        currentLine.push(str);
      } else if (Math.abs(currentY - y) < 5) {
        currentLine.push(str);
      } else {
        lines.push(currentLine.join(" ").trim());
        currentY = y;
        currentLine = [str];
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine.join(" ").trim());
    }

    const text = lines.join("\n").toUpperCase();
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
  bab1: [/^[^A-Z0-9]*(BAB\s+I\b(?!\s*[IVX])|BAB\s+1\b|BAB\s+PERTAMA\b)/i],
  bab2: [/^[^A-Z0-9]*(BAB\s+II\b(?!\s*I)|BAB\s+2\b|BAB\s+KEDUA\b)/i],
  bab3: [/^[^A-Z0-9]*(BAB\s+III\b(?!\s*I)|BAB\s+3\b|BAB\s+KETIGA\b)/i],
  bab4: [/^[^A-Z0-9]*(BAB\s+IV\b|BAB\s+4\b|BAB\s+KEEMPAT\b)/i],
  bab5: [/^[^A-Z0-9]*(BAB\s+V\b(?!\s*I)|BAB\s+5\b|BAB\s+KELIMA\b)/i],
  bab6: [/^[^A-Z0-9]*(BAB\s+VI\b(?!\s*I)|BAB\s+6\b|BAB\s+KEENAM\b)/i],
  bab7: [/^[^A-Z0-9]*(BAB\s+VII\b(?!\s*I)|BAB\s+7\b|BAB\s+KETUJUH\b)/i],
  bab8: [/^[^A-Z0-9]*(BAB\s+VIII\b(?!\s*I)|BAB\s+8\b|BAB\s+KEDELAPAN\b)/i],
  bab9: [/^[^A-Z0-9]*(BAB\s+IX\b(?!\s*I)|BAB\s+9\b|BAB\s+KESEMBILAN\b)/i],
  bab10: [/^[^A-Z0-9]*(BAB\s+X\b(?!\s*I)|BAB\s+10\b|BAB\s+KESEPULUH\b)/i],
  daftar_pustaka: [/^[^A-Z0-9]*(DAFTAR\s+PUSTAKA|DAFTAR\s+REFERENSI|REFERENCES)/i],
  lampiran: [/^[^A-Z0-9]*(LAMPIRAN|APPENDIX|APPENDICES)/i],
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
    if (s.id === "front_ref") {
      return {
        ...s,
        filenameSuffix: "01_front_ref",
        label: "Halaman Awal & BAB I (01_front_ref)",
      };
    }
    if (s.id.startsWith("bab")) {
      const idx = chapters.findIndex((c) => c.id === s.id);
      const numStr = String(idx + 2).padStart(2, "0");
      const roman = toRoman(idx + 2);
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

  function isTocLine(line: string): boolean {
    const upper = line.toUpperCase();
    // Check for leader dots
    if (upper.includes("..") || upper.includes(". .")) return true;
    // Check if line ends with a number preceded by dots, dashes, underscores, or multiple spaces
    if (/[\.\-_\s]\s*\d+$/.test(upper)) {
      // If there's a gap of 3 or more spaces before the number, it's a TOC line
      if (/\s{3,}\d+$/.test(upper)) return true;
      if (/[\.\-_]\s*\d+$/.test(upper)) return true;
    }
    return false;
  }

  for (let i = 0; i < totalPages; i++) {
    const pageText = pageTexts[i];

    // Split page text into trimmed lines
    const lines = pageText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Skip Table of Contents (Daftar Isi) or list pages to avoid false positives
    const isTocOrList = lines.some((line) => {
      const upper = line.toUpperCase();
      return (
        upper.includes("DAFTAR ISI") ||
        upper.includes("TABLE OF CONTENTS") ||
        upper.includes("DAFTAR TABEL") ||
        upper.includes("DAFTAR GAMBAR")
      );
    });
    if (isTocOrList) continue;

    // Check only the first 8 lines of the page
    const topLines = lines.slice(0, 8);

    for (const [chapter, patterns] of Object.entries(CHAPTER_PATTERNS)) {
      if (chapter in detected) continue;

      const isMatch = topLines.some((line) => {
        // If this line looks like a Table of Contents entry, don't match it as a heading
        if (isTocLine(line)) return false;

        return patterns.some((pattern) => pattern.test(line));
      });

      if (isMatch) {
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

  // Determine end page for each detected section
  const sectionEndPages: Record<string, number> = {};
  for (let i = 0; i < orderedKeys.length; i++) {
    const currentKey = orderedKeys[i];
    const startPage = detectedPages[currentKey];
    if (!startPage) continue;

    let endPage = totalPages;
    for (let j = i + 1; j < orderedKeys.length; j++) {
      const nextKey = orderedKeys[j];
      const nextPage = detectedPages[nextKey];
      if (nextPage && nextPage > startPage) {
        endPage = nextPage - 1;
        break;
      }
    }
    sectionEndPages[currentKey] = endPage;
  }

  // Map to our UI section IDs:
  // 1. front_ref (Cover to BAB I end, and Daftar Pustaka range):
  const bab2Page = detectedPages["bab2"];
  const dpPage = detectedPages["daftar_pustaka"];
  
  let frontEnd = totalPages;
  if (bab2Page) {
    frontEnd = bab2Page - 1;
  } else if (dpPage) {
    frontEnd = dpPage - 1;
  }
  ranges["front_ref"] = { start: 1, end: frontEnd };

  if (dpPage) {
    ranges["front_ref_range2"] = { start: dpPage, end: sectionEndPages["daftar_pustaka"] || totalPages };
  } else {
    ranges["front_ref_range2"] = { start: totalPages, end: totalPages };
  }

  // 2. Chapters: bab2, bab3, bab4...
  for (const babKey of babKeys) {
    if (babKey === "bab1") continue; // bab1 is merged in front_ref
    const start = detectedPages[babKey];
    const end = sectionEndPages[babKey] || totalPages;
    if (start) {
      ranges[babKey] = { start, end };
    }
  }

  // 3. Daftar Pustaka (Stand-alone):
  if (dpPage) {
    ranges["daftar_pustaka"] = { start: dpPage, end: sectionEndPages["daftar_pustaka"] || totalPages };
  }

  // 4. Lampiran:
  const lampPage = detectedPages["lampiran"];
  if (lampPage) {
    ranges["lampiran"] = { start: lampPage, end: sectionEndPages["lampiran"] || totalPages };
  }

  return ranges;
}

