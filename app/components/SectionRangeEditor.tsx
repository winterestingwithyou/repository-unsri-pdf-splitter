import type { SplitSection, PageRange } from "../utils/pdfProcessor";

interface SectionRangeEditorProps {
  section: SplitSection;
  totalPages: number;
  onChange: (sectionId: string, range: PageRange | null) => void;
  onPreviewPage?: (page: number) => void;
  onDelete?: (sectionId: string) => void;
  error?: string;
}

export function SectionRangeEditor({
  section,
  totalPages,
  onChange,
  onPreviewPage,
  onDelete,
  error,
}: SectionRangeEditorProps) {
  const range = section.range;

  function handleStart(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value);
    if (isNaN(val)) return;
    const clamped = Math.max(1, Math.min(val, totalPages));
    const newEnd = range ? Math.max(clamped, range.end) : clamped;
    onChange(section.id, { start: clamped, end: newEnd });
    onPreviewPage?.(clamped);
  }

  function handleEnd(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value);
    if (isNaN(val)) return;
    const clamped = Math.max(1, Math.min(val, totalPages));
    const newStart = range ? Math.min(range.start, clamped) : clamped;
    onChange(section.id, { start: newStart, end: clamped });
    onPreviewPage?.(clamped);
  }

  function handleClear() {
    onChange(section.id, null);
  }

  const pageCount = range ? range.end - range.start + 1 : 0;

  return (
    <div
      className={`section-card card-hover transition-all ${
        range ? "border-[oklch(58%_0.23_250_/_0.2)]" : ""
      } ${error ? "border-[oklch(55%_0.22_25_/_0.4)]" : ""}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm" style={{ color: "oklch(90% 0.02 250)" }}>
              {section.label}
            </span>
            {section.required && (
              <span className="badge badge-brand" style={{ fontSize: "0.65rem" }}>
                Wajib
              </span>
            )}
            {range && (
              <span className="badge badge-accent" style={{ fontSize: "0.65rem" }}>
                {pageCount} halaman
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: "oklch(55% 0.03 250)" }}>
            {section.description}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {range && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
              onClick={handleClear}
              aria-label={`Kosongkan rentang ${section.label}`}
            >
              Kosongkan
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="btn btn-ghost hover:text-[oklch(55%_0.22_25)] text-red-400"
              style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
              onClick={() => onDelete(section.id)}
              aria-label={`Hapus bab ${section.label}`}
            >
              Hapus Bab
            </button>
          )}
        </div>
      </div>

      {/* Range inputs */}
      <div className="page-range-row">
        <div>
          <label
            className="block text-xs mb-1"
            style={{ color: "oklch(58% 0.03 250)" }}
            htmlFor={`${section.id}-start`}
          >
            Halaman Awal
          </label>
          <input
            id={`${section.id}-start`}
            type="number"
            className="input-dark text-center"
            min={1}
            max={totalPages}
            value={range?.start ?? ""}
            placeholder="—"
            onChange={handleStart}
            onFocus={() => range && onPreviewPage?.(range.start)}
          />
        </div>

        <div className="flex items-end pb-2">
          <span style={{ color: "oklch(45% 0.03 250)", fontSize: "1.1rem" }}>–</span>
        </div>

        <div>
          <label
            className="block text-xs mb-1"
            style={{ color: "oklch(58% 0.03 250)" }}
            htmlFor={`${section.id}-end`}
          >
            Halaman Akhir
          </label>
          <input
            id={`${section.id}-end`}
            type="number"
            className="input-dark text-center"
            min={1}
            max={totalPages}
            value={range?.end ?? ""}
            placeholder="—"
            onChange={handleEnd}
            onFocus={() => range && onPreviewPage?.(range.end)}
          />
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs" style={{ color: "oklch(70% 0.2 25)" }}>
          {error}
        </p>
      )}

      {/* Quick fill if no range */}
      {!range && (
        <button
          type="button"
          className="mt-2 btn btn-ghost w-full"
          style={{ fontSize: "0.8rem", padding: "0.375rem 0.5rem" }}
          onClick={() => {
            onChange(section.id, { start: 1, end: totalPages });
          }}
        >
          + Atur Rentang Halaman
        </button>
      )}
    </div>
  );
}
