import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function Dialog({
  open,
  onClose,
  children,
  contentClassName = 'modal',
  backdropClassName = 'modal-backdrop',
  labelledBy,
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  contentClassName?: string;
  backdropClassName?: string;
  labelledBy?: string;
  label?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const appRoot = document.getElementById('root');
    const previousAriaHidden = appRoot?.getAttribute('aria-hidden');
    const previousOverflow = document.body.style.overflow;
    if (appRoot) {
      appRoot.setAttribute('inert', '');
      appRoot.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = 'hidden';

    const focusInitial = window.setTimeout(() => {
      const dialog = dialogRef.current;
      const initial =
        dialog?.querySelector<HTMLElement>('[data-autofocus]') ??
        dialog?.querySelector<HTMLElement>(focusableSelector) ??
        dialog;
      initial?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)];
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1) as HTMLElement;
      if (
        event.shiftKey &&
        (document.activeElement === first || !dialogRef.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusInitial);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (appRoot) {
        appRoot.removeAttribute('inert');
        if (previousAriaHidden === null) appRoot.removeAttribute('aria-hidden');
        else appRoot.setAttribute('aria-hidden', previousAriaHidden ?? '');
      }
      triggerRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div
      className={backdropClassName}
      role="presentation"
      data-testid="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={contentClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={label}
        ref={dialogRef}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
