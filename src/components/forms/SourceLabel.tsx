import type { ReactNode } from 'react';

export function SourceLabel({ children }: { children: ReactNode }) {
  return <span className="source-label">↗ Kaynak: {children}</span>;
}

export function DemoAssumption({ children }: { children: ReactNode }) {
  return <span className="demo-assumption">Demo varsayımı · {children}</span>;
}
