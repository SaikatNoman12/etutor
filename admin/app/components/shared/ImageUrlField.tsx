/**
 * A cover image, given as a URL, with the picture shown next to the box.
 *
 * A URL rather than an upload: nothing in this system stores files, and adding
 * object storage to set a course thumbnail would be a deployment decision, not a
 * form field. The preview is the point — pasting a link and seeing nothing is
 * how a course ends up shipped with a broken image.
 */
import { useState } from 'react';
import { ImageOff } from 'lucide-react';

export interface ImageUrlFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  emptyLabel?: string;
  invalidLabel?: string;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  testId?: string;
}

export function ImageUrlField({
  name,
  label,
  value,
  onChange,
  hint,
  emptyLabel = 'No image yet',
  invalidLabel = 'That link did not load',
  className = '',
  inputClassName = '',
  labelClassName = '',
  testId = 'image-url',
}: ImageUrlFieldProps) {
  const [broken, setBroken] = useState(false);
  const url = value.trim();

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className={labelClassName}>{label}</span>
      <div className="flex items-start gap-3">
        <div
          className="flex h-[72px] w-[112px] shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--c-hairline)] bg-[var(--c-surface-soft)]"
          data-testid={`${testId}-preview`}
        >
          {url && !broken ? (
            <img
              key={url}
              src={url}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setBroken(true)}
              onLoad={() => setBroken(false)}
            />
          ) : (
            <span className="flex flex-col items-center gap-1 px-2 text-center text-[11px] leading-[1.3] text-[var(--c-muted)]">
              <ImageOff className="h-4 w-4" aria-hidden="true" />
              {url ? invalidLabel : emptyLabel}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <input
            name={name}
            type="url"
            inputMode="url"
            value={value}
            onChange={(e) => {
              setBroken(false);
              onChange(e.target.value);
            }}
            placeholder="https://…/cover.jpg"
            className={inputClassName}
            data-testid={`${testId}-input`}
          />
          {hint ? <span className="text-[12px] text-muted-foreground">{hint}</span> : null}
        </div>
      </div>
    </div>
  );
}
