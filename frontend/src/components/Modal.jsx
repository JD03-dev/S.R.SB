import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

// Accessible modal built on the native <dialog>: focus trap, Escape and backdrop click close it.
export function Modal({ open, onClose, title, description, children, size = 'md' }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const width = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' }[size];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => { if (event.target === dialogRef.current) onClose(); }}
      className={`m-auto max-h-[90dvh] w-[calc(100%-1.5rem)] ${width} overflow-y-auto rounded-[28px] bg-surface p-0 text-ink shadow-2xl`}
    >
      {open && (
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
              {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 transition hover:bg-neutral-200" aria-label="Cerrar">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
