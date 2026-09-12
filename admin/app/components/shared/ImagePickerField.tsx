/**
 * A picture for a record: pick a file, or paste a link.
 *
 * Nothing in this deployment stores files, so a picked file is downscaled in the
 * browser and kept as a data URL on the row itself (see utils/imageFile). That
 * is fine for an icon or an avatar — small, one per record — and deliberately
 * not offered for course media, which takes a URL.
 *
 * The value is mirrored into a hidden input so a plain form read still finds it.
 */
import { useRef, useState } from 'react';
import { ImageOff, Loader2, Upload, X } from 'lucide-react';
import { fileToAvatarDataUrl, ImageFileError, MAX_SOURCE_BYTES } from '~/utils/imageFile';

export interface ImagePickerFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Shown under the control. */
  hint?: string;
  labels?: {
    choose?: string;
    working?: string;
    remove?: string;
    empty?: string;
    tooLarge?: string;
    notImage?: string;
    unreadable?: string;
  };
  round?: boolean;
  className?: string;
  labelClassName?: string;
  testId: string;
}

export function ImagePickerField({
  name,
  label,
  value,
  onChange,
  hint,
  labels = {},
  round = false,
  className = '',
  labelClassName = '',
  testId,
}: ImagePickerFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = {
    choose: labels.choose ?? 'Choose image',
    working: labels.working ?? 'Working…',
    remove: labels.remove ?? 'Remove',
    empty: labels.empty ?? 'No image',
    tooLarge: labels.tooLarge ?? `That image is larger than ${Math.round(MAX_SOURCE_BYTES / (1024 * 1024))}MB.`,
    notImage: labels.notImage ?? 'That file is not an image.',
    unreadable: labels.unreadable ?? 'That image could not be read.',
  };

  async function onPicked(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await fileToAvatarDataUrl(file));
    } catch (err) {
      setError(
        err instanceof ImageFileError
          ? err.message === 'too-large'
            ? L.tooLarge
            : err.message === 'not-an-image'
              ? L.notImage
              : L.unreadable
          : L.unreadable,
      );
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className={labelClassName}>{label}</span>
      <div className="flex items-start gap-3">
        <span
          className={`flex h-[64px] w-[64px] shrink-0 items-center justify-center overflow-hidden border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] ${round ? 'rounded-full' : 'rounded-[var(--radius-md)]'}`}
          data-testid={`${testId}-preview`}
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageOff className="h-4 w-4 text-[var(--c-muted)]" aria-hidden="true" />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
          <input type="hidden" name={name} value={value} />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => { void onPicked(e.target.files?.[0]); }}
            data-testid={`${testId}-file`}
          />
          <div className="flex flex-wrap items-center gap-[8px]">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex min-h-[36px] cursor-pointer items-center gap-[6px] rounded-[var(--radius-pill)] border border-[var(--c-hairline-strong)] bg-[var(--c-surface)] px-[14px] text-[13px] font-semibold text-[var(--c-primary)] hover:bg-[var(--c-surface-soft)] disabled:cursor-not-allowed disabled:opacity-60"
              data-testid={`${testId}-choose`}
            >
              {busy ? <Loader2 className="h-[14px] w-[14px] animate-spin" aria-hidden="true" /> : <Upload className="h-[14px] w-[14px]" aria-hidden="true" />}
              {busy ? L.working : L.choose}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => { onChange(''); setError(null); }}
                className="inline-flex min-h-[36px] cursor-pointer items-center gap-[6px] rounded-[var(--radius-pill)] px-[10px] text-[13px] font-medium text-[var(--c-muted)] hover:text-[var(--c-error)]"
                data-testid={`${testId}-clear`}
              >
                <X className="h-[13px] w-[13px]" aria-hidden="true" />
                {L.remove}
              </button>
            )}
          </div>
          {error ? (
            <span className="text-[12px] text-[var(--c-error)]" role="alert" data-testid={`${testId}-error`}>{error}</span>
          ) : hint ? (
            <span className="text-[12px] text-muted-foreground">{hint}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
