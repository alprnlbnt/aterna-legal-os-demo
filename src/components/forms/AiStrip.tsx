import type { ReactNode } from 'react';

export function AiStrip({
  children,
  title = 'AI önerisi · Taslak',
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <div className="ai-strip">
      <strong>◇ {title}</strong>
      <p>{children}</p>
    </div>
  );
}
