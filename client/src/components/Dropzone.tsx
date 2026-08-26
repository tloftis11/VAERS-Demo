import { useRef, useState } from "react";
import { FieldIcon } from "./illustrations";

interface DropzoneProps {
  acceptedExtensions: string[];
  onFiles: (acceptedFiles: File[], rejectedCount: number) => void;
  hint?: string;
  disabled?: boolean;
}

function isAcceptedFile(file: File, acceptedExtensions: string[]): boolean {
  const name = file.name.toLowerCase();
  return acceptedExtensions.some((ext) => name.endsWith(ext));
}

export function Dropzone({ acceptedExtensions, onFiles, hint, disabled }: DropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  function handleFiles(files: File[]) {
    if (files.length === 0) return;
    const accepted = files.filter((f) => isAcceptedFile(f, acceptedExtensions));
    onFiles(accepted, files.length - accepted.length);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFiles(Array.from(e.target.files ?? []));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current += 1;
    if (e.dataTransfer.types.includes("Files")) setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragActive(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragActive(false);
    handleFiles(Array.from(e.dataTransfer.files ?? []));
  }

  return (
    <div
      className={`dropzone${dragActive ? " dropzone--active" : ""}${disabled ? " dropzone--disabled" : ""}`}
      onDragEnter={disabled ? undefined : handleDragEnter}
      onDragLeave={disabled ? undefined : handleDragLeave}
      onDragOver={disabled ? undefined : handleDragOver}
      onDrop={disabled ? undefined : handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Add a document — drag and drop or click to browse"
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
    >
      <FieldIcon name="upload" size={28} className="dropzone__icon" />
      <p className="dropzone__label">
        <strong>Drag and drop files here</strong>, or click to browse
      </p>
      <p className="dropzone__hint">{hint ?? "PDF, JPEG, PNG, or Word — 15 MB max each"}</p>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedExtensions.join(",")}
        onChange={handleFileChange}
        className="dropzone__input"
        disabled={disabled}
      />
    </div>
  );
}
