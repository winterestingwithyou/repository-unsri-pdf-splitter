import { useState, useMemo, useRef, useEffect } from "react";
import { studyPrograms, type StudyProgram } from "../data/studyPrograms";

interface StudyProgramSelectProps {
  value: string;
  onChange: (kode: string, program: StudyProgram | null) => void;
  error?: string;
  disabled?: boolean;
}

export function StudyProgramSelect({
  value,
  onChange,
  error,
  disabled = false,
}: StudyProgramSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedProgram = useMemo(
    () => studyPrograms.find((p) => p.code === value) ?? null,
    [value]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return studyPrograms;
    const q = query.toLowerCase();
    return studyPrograms.filter(
      (p) =>
        p.code.includes(q) ||
        p.nameId.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.faculty.toLowerCase().includes(q) ||
        p.degree.toLowerCase().includes(q)
    );
  }, [query]);

  // Group by faculty
  const grouped = useMemo(() => {
    const map = new Map<string, StudyProgram[]>();
    for (const p of filtered) {
      if (!map.has(p.faculty)) map.set(p.faculty, []);
      map.get(p.faculty)!.push(p);
    }
    return map;
  }, [filtered]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(program: StudyProgram) {
    onChange(program.code, program);
    setOpen(false);
    setQuery("");
  }

  function handleClear() {
    onChange("", null);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger display */}
      <div
        className={`input-dark flex items-center justify-between cursor-pointer gap-2 ${
          error ? "border-[oklch(55%_0.22_25)]" : ""
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={() => !disabled && setOpen((v) => !v)}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Pilih Program Studi"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen((v) => !v);
          if (e.key === "Escape") setOpen(false);
        }}
      >
        {selectedProgram ? (
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="badge badge-brand flex-shrink-0"
              style={{ fontFamily: "monospace" }}
            >
              {selectedProgram.code}
            </span>
            <span className="truncate text-sm" style={{ color: "oklch(88% 0.02 250)" }}>
              {selectedProgram.nameId}
            </span>
            <span className="badge badge-accent flex-shrink-0" style={{ fontSize: "0.7rem" }}>
              {selectedProgram.degree}
            </span>
          </div>
        ) : (
          <span style={{ color: "oklch(55% 0.02 250)" }}>Cari program studi...</span>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedProgram && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="btn btn-ghost"
              style={{ padding: "0.125rem 0.375rem", fontSize: "0.8rem" }}
              aria-label="Hapus pilihan"
            >
              ✕
            </button>
          )}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ transform: open ? "rotate(180deg)" : "", transition: "transform 0.2s", color: "oklch(55% 0.03 250)" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Dropdown panel */}
      {open && (
        <div
          className="dropdown"
          style={{ top: "calc(100% + 6px)", left: 0, right: 0, maxHeight: "320px", overflowY: "auto" }}
          role="listbox"
        >
          {/* Search box */}
          <div
            className="sticky top-0 p-2"
            style={{ background: "oklch(14% 0.015 250)", borderBottom: "1px solid oklch(22% 0.025 250)" }}
          >
            <input
              autoFocus
              type="text"
              className="input-dark"
              style={{ padding: "0.5rem 0.75rem" }}
              placeholder="Cari kode, nama, atau fakultas..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {grouped.size === 0 && (
            <div
              className="dropdown-item"
              style={{ color: "oklch(55% 0.03 250)", textAlign: "center" }}
            >
              Program studi tidak ditemukan
            </div>
          )}

          {Array.from(grouped.entries()).map(([faculty, programs]) => (
            <div key={faculty}>
              <div
                style={{
                  padding: "0.5rem 0.875rem 0.25rem",
                  fontSize: "0.7rem",
                  color: "oklch(50% 0.05 250)",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                {faculty}
              </div>
              {programs.map((program) => (
                <div
                  key={program.code}
                  className={`dropdown-item ${value === program.code ? "selected" : ""}`}
                  role="option"
                  aria-selected={value === program.code}
                  onClick={() => handleSelect(program)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: "0.8rem",
                        color: "oklch(58% 0.23 250)",
                        flexShrink: 0,
                        minWidth: "3.5rem",
                      }}
                    >
                      {program.code}
                    </span>
                    <span className="flex-1 truncate" style={{ color: "oklch(85% 0.02 250)" }}>
                      {program.nameId}
                    </span>
                    <span
                      className="badge flex-shrink-0"
                      style={{
                        fontSize: "0.65rem",
                        background: "oklch(58% 0.23 250 / 0.1)",
                        color: "oklch(70% 0.1 250)",
                        border: "1px solid oklch(58% 0.23 250 / 0.15)",
                        padding: "0.1rem 0.4rem",
                      }}
                    >
                      {program.degree}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs" style={{ color: "oklch(70% 0.2 25)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
