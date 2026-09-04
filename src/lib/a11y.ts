export const focusFirstInteractive = (root: HTMLElement | null) => {
  root
    ?.querySelector<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
    )
    ?.focus();
};
