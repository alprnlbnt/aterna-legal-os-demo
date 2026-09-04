import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '../overlays/Dialog';

const commands = [
  { label: 'Bugün çalışma yüzeyine git', route: '/bugun', keywords: 'ana sayfa operate' },
  { label: 'Gelen evrakları incele', route: '/gelen', keywords: 'ocr eşleşme' },
  { label: 'Yeni potansiyel dosya aç', route: '/dosyalar/yeni-potansiyel', keywords: 'matter' },
  { label: 'Onay kuyruğunu aç', route: '/gorevler', keywords: 'süre görev' },
  { label: 'Takvimi aç', route: '/takvim', keywords: 'ajanda son gün' },
  { label: 'Yeni belge başlat', route: '/belgeler/yeni', keywords: 'teklif sözleşme rapor' },
  { label: 'Duruşma hazırlığını aç', route: '/durusmalar/durusma-118', keywords: 'sesli not' },
  { label: 'Müvekkilleri ve kişileri aç', route: '/kisiler', keywords: 'kişi' },
  { label: 'Basit cari ve tahsilatı aç', route: '/finans', keywords: 'para masraf' },
  { label: 'Demo kontrol panelini aç', route: '/demo', keywords: 'reset persona offline' },
];

export function CommandBar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const filtered = useMemo(() => {
    const normalized = query.toLocaleLowerCase('tr-TR');
    return commands.filter((command) =>
      `${command.label} ${command.keywords}`.toLocaleLowerCase('tr-TR').includes(normalized),
    );
  }, [query]);
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      contentClassName="modal command-dialog"
      label="Komut çubuğu"
    >
      <input
        className="command-input"
        data-autofocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Ekran veya eylem ara…"
        aria-label="Komut ara"
      />
      <div className="command-list">
        {filtered.map((command) => (
          <button
            className="command-item"
            key={command.route}
            type="button"
            onClick={() => {
              navigate(command.route);
              onClose();
            }}
          >
            <span>{command.label}</span>
            <span aria-hidden="true">↵</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="notice">Bu aramayla eşleşen yerel komut yok.</div>
        )}
      </div>
    </Dialog>
  );
}
