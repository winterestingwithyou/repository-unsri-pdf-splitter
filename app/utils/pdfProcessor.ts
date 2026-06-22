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
  const srcDoc = await PDFDocument.load(pdfBytes);
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
    const srcDoc = await PDFDocument.load(bytes);
    const pageIndices = Array.from({ length: srcDoc.getPageCount() }, (_, i) => i);
    const copiedPages = await mergedDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => mergedDoc.addPage(page));
  }

  return mergedDoc.save();
}

export function getPdfPageCount(pdfBytes: ArrayBuffer): Promise<number> {
  return PDFDocument.load(pdfBytes).then((doc) => doc.getPageCount());
}

// PDF.js based text extraction for chapter detection
export async function extractPageTexts(
  pdfBytes: ArrayBuffer,
  progressCallback?: (page: number, total: number) => void
): Promise<string[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const typedArray = new Uint8Array(pdfBytes);
  const loadingTask = pdfjsLib.getDocument({ data: typedArray });
  const pdf = await loadingTask.promise;

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
  bab1?: PageRange;
  bab2?: PageRange;
  bab3?: PageRange;
  bab4?: PageRange;
  bab5?: PageRange;
  daftar_pustaka?: PageRange;
  lampiran?: PageRange;
}

const CHAPTER_PATTERNS = {
  bab1: [/\bBAB\s+I\b(?!\s*[IVX])/i, /\bBAB\s+1\b/i, /\bBAB\s+PERTAMA\b/i, /PENDAHULUAN/i],
  bab2: [/\bBAB\s+II\b(?!\s*I)/i, /\bBAB\s+2\b/i, /\bBAB\s+KEDUA\b/i],
  bab3: [/\bBAB\s+III\b(?!\s*I)/i, /\bBAB\s+3\b/i, /\bBAB\s+KETIGA\b/i],
  bab4: [/\bBAB\s+IV\b/i, /\bBAB\s+4\b/i, /\bBAB\s+KEEMPAT\b/i],
  bab5: [/\bBAB\s+V\b(?!\s*I)/i, /\bBAB\s+5\b/i, /\bBAB\s+KELIMA\b/i],
  daftar_pustaka: [/DAFTAR\s+PUSTAKA/i, /DAFTAR\s+REFERENSI/i, /REFERENCES/i],
  lampiran: [/\bLAMPIRAN\b/i, /\bAPPENDIX\b/i, /\bAPPENDICES\b/i],
};

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
  const chapters = ["bab1", "bab2", "bab3", "bab4", "bab5", "daftar_pustaka", "lampiran"];

  // front: page 1 to start of bab1 - 1
  const bab1Page = detectedPages["bab1"];
  if (bab1Page) {
    ranges.front = { start: 1, end: bab1Page - 1 };
  } else {
    ranges.front = { start: 1, end: 1 };
  }

  // Each chapter: from its start page to the page before the next chapter
  for (let i = 0; i < chapters.length; i++) {
    const chapterId = chapters[i];
    const startPage = detectedPages[chapterId];
    if (!startPage) continue;

    // Find the end page (next chapter's start - 1 or totalPages)
    let endPage = totalPages;
    for (let j = i + 1; j < chapters.length; j++) {
      const nextPage = detectedPages[chapters[j]];
      if (nextPage && nextPage > startPage) {
        endPage = nextPage - 1;
        break;
      }
    }

    ranges[chapterId as keyof DetectedRanges] = { start: startPage, end: endPage };
  }

  return ranges;
}
