import { useEffect, useRef, useState } from "react";
import type { PageRange } from "../utils/pdfProcessor";

interface PdfPagePreviewProps {
  pdfBytes: ArrayBuffer | null;
  currentPage?: number;
  pageRange?: PageRange | null;
  onPageClick?: (page: number) => void;
  className?: string;
}

export function PdfPagePreview({
  pdfBytes,
  currentPage = 1,
  pageRange,
  onPageClick,
  className = "",
}: PdfPagePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [viewPage, setViewPage] = useState(currentPage);
  const [loading, setLoading] = useState(false);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const pdfDocRef = useRef<unknown>(null);

  useEffect(() => {
    if (!pdfBytes) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();

        const typedArray = new Uint8Array(pdfBytes);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfBytes]);

  useEffect(() => {
    setViewPage(currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (!pdfDocRef.current || !canvasRef.current) return;

    const pdf = pdfDocRef.current as {
      getPage: (n: number) => Promise<{
        getViewport: (opts: { scale: number }) => { width: number; height: number };
        render: (ctx: {
          canvasContext: CanvasRenderingContext2D;
          viewport: ReturnType<ReturnType<typeof pdf.getPage> extends Promise<infer P> ? () => P : never>;
        }) => { promise: Promise<void>; cancel: () => void };
      }>;
    };

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const page = await (pdfDocRef.current as { getPage: (n: number) => Promise<unknown> }).getPage(viewPage);
        if (cancelled) return;

        const typedPage = page as {
          getViewport: (opts: { scale: number }) => { width: number; height: number };
          render: (ctx: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void>; cancel: () => void };
        };

        const viewport = typedPage.getViewport({ scale: 1 });
        const canvas = canvasRef.current!;
        const container = canvas.parentElement!;
        const scale = Math.min(container.clientWidth / viewport.width, 2);
        const scaledViewport = typedPage.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        const ctx = canvas.getContext("2d")!;
        if (renderTaskRef.current) renderTaskRef.current.cancel();

        const task = typedPage.render({ canvasContext: ctx, viewport: scaledViewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch (e) {
        // render cancelled, ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [viewPage, pdfDocRef.current]);

  const inRange =
    pageRange && viewPage >= pageRange.start && viewPage <= pageRange.end;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Canvas area */}
      <div className="relative rounded-lg overflow-hidden bg-[oklch(10%_0.01_250)]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-8 h-8 border-2 border-[oklch(58%_0.23_250)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {pageRange && (
          <div
            className={`absolute top-2 right-2 z-10 badge text-xs ${
              inRange ? "badge-accent" : "badge-brand"
            }`}
          >
            {inRange ? "Dalam Rentang" : "Di luar rentang"}
          </div>
        )}
        <canvas ref={canvasRef} className="pdf-preview-canvas block" />
      </div>

      {/* Page navigation */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between gap-2">
          <button
            className="btn btn-secondary"
            style={{ padding: "0.375rem 0.75rem", fontSize: "0.8rem" }}
            onClick={() => setViewPage((p) => Math.max(1, p - 1))}
            disabled={viewPage <= 1}
          >
            ←
          </button>

          <div className="flex items-center gap-2 flex-1">
            <input
              type="number"
              className="input-dark text-center"
              style={{ padding: "0.375rem 0.5rem" }}
              value={viewPage}
              min={1}
              max={totalPages}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (!isNaN(v) && v >= 1 && v <= totalPages) {
                  setViewPage(v);
                  onPageClick?.(v);
                }
              }}
            />
            <span className="text-sm" style={{ color: "oklch(55% 0.03 250)", whiteSpace: "nowrap" }}>
              / {totalPages}
            </span>
          </div>

          <button
            className="btn btn-secondary"
            style={{ padding: "0.375rem 0.75rem", fontSize: "0.8rem" }}
            onClick={() => setViewPage((p) => Math.min(totalPages, p + 1))}
            disabled={viewPage >= totalPages}
          >
            →
          </button>
        </div>
      )}

      {/* Jump to range buttons */}
      {pageRange && (
        <div className="flex gap-2">
          <button
            className="btn btn-ghost flex-1"
            style={{ fontSize: "0.8rem", padding: "0.375rem 0.5rem" }}
            onClick={() => { setViewPage(pageRange.start); onPageClick?.(pageRange.start); }}
          >
            Ke Awal Rentang
          </button>
          <button
            className="btn btn-ghost flex-1"
            style={{ fontSize: "0.8rem", padding: "0.375rem 0.5rem" }}
            onClick={() => { setViewPage(pageRange.end); onPageClick?.(pageRange.end); }}
          >
            Ke Akhir Rentang
          </button>
        </div>
      )}
    </div>
  );
}
