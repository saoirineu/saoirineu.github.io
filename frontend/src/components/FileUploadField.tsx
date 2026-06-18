import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import {
  compressEuropeanGatheringImage,
  formatFileSize,
  shouldOfferEuropeanGatheringImageCompression,
  validateEuropeanGatheringUploadFile
} from '../lib/europeanGatheringUpload';

export function FileUploadField({
  accept,
  className,
  existingStoredFile,
  file,
  closeLabel,
  compressedSizeLabel,
  compressionBody,
  compressionError,
  compressionTitle,
  downloadLabel,
  invalidTypeError,
  keepOriginalLabel,
  label,
  labelClassName,
  openInNewTabLabel,
  originalSizeLabel,
  onChange,
  onRemoveExisting,
  previewLabel,
  previewTitle,
  processingLabel,
  removeLabel,
  selectLabel,
  tooLargeError,
  useCompressedLabel
}: {
  accept: string;
  className?: string;
  existingStoredFile?: { name: string; url: string } | null;
  file: File | null;
  closeLabel: string;
  compressedSizeLabel: string;
  compressionBody: string;
  compressionError: string;
  compressionTitle: string;
  downloadLabel: string;
  invalidTypeError: string;
  keepOriginalLabel: string;
  label: ReactNode;
  labelClassName?: string;
  openInNewTabLabel: string;
  originalSizeLabel: string;
  onChange: (file: File | null) => void;
  onRemoveExisting?: () => void;
  previewLabel: string;
  previewTitle: string;
  processingLabel: string;
  removeLabel: string;
  selectLabel: string;
  tooLargeError: string;
  useCompressedLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [compressionCandidate, setCompressionCandidate] = useState<{ compressed: File; original: File } | null>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const compressionPreviewUrl = useMemo(
    () => (compressionCandidate ? URL.createObjectURL(compressionCandidate.compressed) : null),
    [compressionCandidate]
  );

  const openPicker = () => {
    if (isProcessing) {
      return;
    }

    inputRef.current?.click();
  };

  const resetPicker = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleSelectedFile = async (nextFile: File | null) => {
    if (!nextFile) {
      setErrorMessage('');
      setCompressionCandidate(null);
      onChange(null);
      return;
    }

    const validationError = validateEuropeanGatheringUploadFile(nextFile);
    if (validationError === 'invalid-type') {
      setErrorMessage(invalidTypeError);
      setCompressionCandidate(null);
      resetPicker();
      return;
    }

    if (validationError === 'file-too-large') {
      setErrorMessage(tooLargeError);
      setCompressionCandidate(null);
      resetPicker();
      return;
    }

    setErrorMessage('');

    if (shouldOfferEuropeanGatheringImageCompression(nextFile)) {
      setIsProcessing(true);

      try {
        const compressed = await compressEuropeanGatheringImage(nextFile);
        if (compressed !== nextFile) {
          setCompressionCandidate({ compressed, original: nextFile });
          return;
        }
      } catch {
        setErrorMessage(compressionError);
      } finally {
        setIsProcessing(false);
      }
    }

    setCompressionCandidate(null);
    onChange(nextFile);
  };

  const handleDroppedFiles = async (files: FileList | null) => {
    const nextFile = files?.[0] ?? null;
    await handleSelectedFile(nextFile);
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (compressionPreviewUrl) {
        URL.revokeObjectURL(compressionPreviewUrl);
      }
    };
  }, [compressionPreviewUrl]);

  const compressionReviewModal =
    compressionCandidate && typeof document !== 'undefined'
      ? createPortal(
          <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/50 px-4 py-6" role="dialog" aria-modal="true" aria-label={compressionTitle}>
            <div className="flex min-h-full items-center justify-center">
              <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{compressionTitle}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{compressionBody}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"
                    onClick={() => {
                      setCompressionCandidate(null);
                    }}
                  >
                    {closeLabel}
                  </button>
                </div>

                {compressionPreviewUrl ? (
                  <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                    <img src={compressionPreviewUrl} alt={compressionTitle} className="max-h-[60vh] w-full object-contain" />
                  </div>
                ) : null}

                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <dt className="text-slate-500">{originalSizeLabel}</dt>
                    <dd className="mt-1 font-semibold text-slate-900">{formatFileSize(compressionCandidate.original.size)}</dd>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                    <dt className="text-emerald-700">{compressedSizeLabel}</dt>
                    <dd className="mt-1 font-semibold text-emerald-900">{formatFileSize(compressionCandidate.compressed.size)}</dd>
                  </div>
                </dl>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                    onClick={() => {
                      onChange(compressionCandidate.compressed);
                      setCompressionCandidate(null);
                    }}
                  >
                    {useCompressedLabel}
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={() => {
                      onChange(compressionCandidate.original);
                      setCompressionCandidate(null);
                    }}
                  >
                    {keepOriginalLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  const previewModal =
    isPreviewOpen && previewUrl && file && typeof document !== 'undefined'
      ? createPortal(
          <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/50 px-4 py-6" role="dialog" aria-modal="true" aria-label={previewTitle}>
            <div className="flex min-h-full items-center justify-center">
              <div className="w-full max-w-4xl rounded-[28px] bg-white p-6 shadow-2xl">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold text-slate-900">{previewTitle}</h2>
                  <p className="mt-2 truncate text-sm text-slate-600" title={file.name}>{file.name}</p>
                </div>

                <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                  {file.type.startsWith('image/') ? (
                    <img src={previewUrl} alt={file.name} className="max-h-[70vh] w-full object-contain" />
                  ) : (
                    <iframe title={file.name} src={previewUrl} className="h-[70vh] w-full bg-white" />
                  )}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <a
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                    href={previewUrl}
                    download={file.name}
                  >
                    {downloadLabel}
                  </a>
                  <a
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {openInNewTabLabel}
                  </a>
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={() => setIsPreviewOpen(false)}
                  >
                    {closeLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className={`text-sm text-slate-700 ${className ?? ''}`.trim()}>
        <div className={`mb-1 block font-medium ${labelClassName ?? ''}`.trim()}>{label}</div>

        <div
          className={`rounded-[26px] border bg-white p-4 shadow-sm transition ${isDragOver ? 'border-amber-400 bg-amber-50/60' : 'border-slate-200'}`}
          onDragOver={event => {
            event.preventDefault();
            if (!isProcessing) {
              setIsDragOver(true);
            }
          }}
          onDragEnter={event => {
            event.preventDefault();
            if (!isProcessing) {
              setIsDragOver(true);
            }
          }}
          onDragLeave={event => {
            event.preventDefault();
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
              return;
            }
            setIsDragOver(false);
          }}
          onDrop={event => {
            event.preventDefault();
            setIsDragOver(false);
            void handleDroppedFiles(event.dataTransfer.files);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={event => {
              const files = event.target.files;
              const filesCopy = files && files.length > 0 ? Array.from(files) : null;
              event.target.value = '';
              void handleSelectedFile(filesCopy?.[0] ?? null);
            }}
          />

          {file ? (
            <>
              <div className="min-w-0 text-center text-sm text-slate-700">
                <div className="truncate text-center font-medium text-slate-900" title={file.name}>
                  {file.name}
                </div>
                <div className="mt-1 text-xs text-slate-500">{formatFileSize(file.size)}</div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {previewUrl ? (
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    onClick={() => setIsPreviewOpen(true)}
                  >
                    {previewLabel}
                  </button>
                ) : null}

                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                  onClick={() => {
                    resetPicker();
                    setErrorMessage('');
                    setCompressionCandidate(null);
                    onChange(null);
                  }}
                >
                  {removeLabel}
                </button>
              </div>
            </>
          ) : existingStoredFile ? (
            <>
              <div className="min-w-0 text-center text-sm text-slate-700">
                <div className="truncate text-center font-medium text-slate-900" title={existingStoredFile.name}>
                  {existingStoredFile.name}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a
                  href={existingStoredFile.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {previewLabel}
                </a>
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                  onClick={() => onRemoveExisting?.()}
                >
                  {removeLabel}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="flex min-h-[112px] w-full items-center justify-center rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-wait disabled:opacity-70"
              onClick={openPicker}
              disabled={isProcessing}
            >
              {isProcessing ? processingLabel : selectLabel}
            </button>
          )}

          {errorMessage ? (
            <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-700">{errorMessage}</p>
          ) : null}
        </div>
      </div>

      {compressionReviewModal}
      {previewModal}
    </>
  );
}
