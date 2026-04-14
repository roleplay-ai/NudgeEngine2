'use client';

import { useState, useRef, type DragEvent } from 'react';

interface FileUploadProps {
  bucket: string;
  path: string;
  accept?: string;
  maxSizeMB?: number;
  onUpload: (url: string, file: File) => void;
}

export default function FileUpload({ accept = '.pdf,.mp4', maxSizeMB = 50, onUpload }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrag(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragging(true);
    else if (e.type === 'dragleave') setDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const files = e.dataTransfer.files;
    if (files?.[0]) processFile(files[0]);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files?.[0]) processFile(files[0]);
  }

  async function processFile(file: File) {
    setError(null);

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File exceeds ${maxSizeMB}MB limit`);
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const interval = setInterval(() => {
        setProgress(p => Math.min(p + 15, 85));
      }, 300);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Upload failed');
      }

      const data = await res.json();
      setProgress(100);
      onUpload(data.url, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div
      className="relative rounded-xl transition-all duration-200 cursor-pointer"
      style={{
        border: `2px dashed ${dragging ? '#FFCE00' : 'rgba(34,29,35,0.15)'}`,
        background: dragging ? '#FFF6CF' : '#FFFDF5',
        padding: '32px 24px',
      }}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      <div className="text-center">
        <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(98,60,234,0.08)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#623CEA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <p className="text-sm font-semibold text-brand-dark mb-1">
          {uploading ? 'Uploading…' : 'Drop files here or click to browse'}
        </p>
        <p className="text-xs text-text-muted">
          {accept.replace(/\./g, '').toUpperCase()} — max {maxSizeMB}MB
        </p>
      </div>

      {uploading && (
        <div className="mt-4">
          <div className="progress-wrap">
            <div
              className="progress-fill"
              style={{ width: `${progress}%`, background: '#623CEA' }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-brand-red text-center">{error}</p>
      )}
    </div>
  );
}
