import { useCallback, useState } from "react";

interface FileDropZoneProps {
  id: string;
  label: string;
  accept?: string;
  file: File | null;
  onFile: (file: File) => void;
  onClear: () => void;
  hint?: string;
  disabled?: boolean;
  error?: string;
}

export function FileDropZone({
  id,
  label,
  accept = ".pdf,application/pdf",
  file,
  onFile,
  onClear,
  hint,
  disabled = false,
  error,
}: FileDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const dropped = e.dataTransfer.files[0];
      if (dropped) onFile(dropped);
    },
    [disabled, onFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) onFile(selected);
      e.target.value = "";
    },
    [onFile]
  );

  function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  return (
    <div>
      <label
        htmlFor={id}
        className={`upload-zone flex flex-col items-center justify-center p-6 text-center ${
          dragOver ? "drag-over" : ""
        } ${error ? "border-[oklch(55%_0.22_25_/_0.5)]" : ""} ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{ minHeight: "140px" }}
      >
        {file ? (
          <div className="flex flex-col items-center gap-3 w-full">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl"
              style={{ background: "oklch(64% 0.22 165 / 0.15)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="oklch(64% 0.22 165)" strokeWidth="1.5">
                <path d="M9 12l2 2 4-4" />
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="w-full">
              <p
                className="font-medium text-sm truncate max-w-full"
                style={{ color: "oklch(88% 0.02 250)" }}
                title={file.name}
              >
                {file.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "oklch(55% 0.03 250)" }}>
                {formatSize(file.size)}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: "0.8rem", padding: "0.25rem 0.75rem" }}
              onClick={(e) => {
                e.preventDefault();
                if (!disabled) onClear();
              }}
            >
              Ganti File
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl"
              style={{
                background: dragOver
                  ? "oklch(58% 0.23 250 / 0.15)"
                  : "oklch(100% 0 0 / 0.04)",
                border: "1px solid oklch(100% 0 0 / 0.08)",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="oklch(58% 0.23 250)" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "oklch(78% 0.04 250)" }}>
                {label}
              </p>
              <p className="text-xs mt-1" style={{ color: "oklch(55% 0.03 250)" }}>
                Drag & drop atau klik untuk memilih
              </p>
              {hint && (
                <p className="text-xs mt-1" style={{ color: "oklch(50% 0.03 250)" }}>
                  {hint}
                </p>
              )}
            </div>
          </div>
        )}
        <input
          id={id}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
          aria-label={label}
        />
      </label>
      {error && (
        <p className="mt-1.5 text-xs" style={{ color: "oklch(70% 0.2 25)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
