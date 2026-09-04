import type { ReactNode } from 'react';

interface IconProps {
  name:
    | 'home'
    | 'inbox'
    | 'files'
    | 'tasks'
    | 'more'
    | 'document'
    | 'hearing'
    | 'contacts'
    | 'settings'
    | 'demo'
    | 'calendar'
    | 'search'
    | 'bell'
    | 'plus'
    | 'mic'
    | 'lock'
    | 'check'
    | 'warning'
    | 'finance'
    | 'arrow';
  size?: number;
}

const paths: Record<IconProps['name'], ReactNode> = {
  home: (
    <>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10.5V20h13v-9.5M9 20v-6h6v6" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 5h16v14H4z" />
      <path d="M4 13h4l2 3h4l2-3h4" />
    </>
  ),
  files: (
    <>
      <path d="M3.5 7h7l2-2H20v14H3.5z" />
      <path d="M3.5 9h16" />
    </>
  ),
  tasks: (
    <>
      <path d="m5 7 1.5 1.5L9 5.5M12 7h7" />
      <path d="m5 13 1.5 1.5L9 11.5M12 13h7M5 19h14" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  document: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h5M9 12h6M9 16h6" />
    </>
  ),
  hearing: (
    <>
      <path d="M4 20h16M7 20v-9h10v9M5 9h14L12 4z" />
      <path d="M10 14h4" />
    </>
  ),
  contacts: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c.5-4 2.3-6 5.5-6s5 2 5.5 6M16 8h4M18 6v4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 13.5v-3l-2-.7-.7-1.7.9-1.9-2.1-2.1-1.9.9-1.7-.7-.7-2h-3l-.7 2-1.7.7-1.9-.9-2.1 2.1.9 1.9-.7 1.7-2 .7v3l2 .7.7 1.7-.9 1.9 2.1 2.1 1.9-.9 1.7.7.7 2h3l.7-2 1.7-.7 1.9.9 2.1-2.1-.9-1.9.7-1.7z" />
    </>
  ),
  demo: (
    <>
      <path d="M5 4h14v16H5z" />
      <path d="m10 9 5 3-5 3z" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4M17 3v4M3 10h18" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  bell: (
    <>
      <path d="M6 10a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
      <path d="M10 21h4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  mic: (
    <>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  check: <path d="m4 12 5 5L20 6" />,
  warning: (
    <>
      <path d="M12 3 2.5 20h19z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  finance: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18M7 15h3" />
    </>
  ),
  arrow: <path d="m9 18 6-6-6-6" />,
};

export function Icon({ name, size = 20 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
