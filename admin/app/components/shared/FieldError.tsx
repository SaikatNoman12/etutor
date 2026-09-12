/**
 * The message under an input, and the wiring that makes it reach a screen
 * reader as well as an eye.
 *
 * `role="alert"` so it is announced when it appears, and an `id` the input
 * points at with `aria-describedby` — an error only a sighted user can perceive
 * is half an error message.
 */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="mt-[4px] text-[13px] leading-[1.45] text-[var(--c-error)]"
      data-testid={id}
    >
      {message}
    </p>
  );
}

/** The props an input needs so the error is attached to it, not merely near it. */
export function fieldProps(name: string, errors: Record<string, string>) {
  const has = Boolean(errors[name]);
  return {
    'aria-invalid': has || undefined,
    'aria-describedby': has ? `${name}-error` : undefined,
    'data-invalid': has ? 'true' : undefined,
  } as const;
}

export default FieldError;
