import { AuditTable } from '../components/audit/AuditTable';
import { UnauthorizedState } from '../components/states/States';
import { usePagination } from '../lib/table';
import { currentUser, filterAudit } from '../store/selectors';
import type { AuditFilters } from '../store/selectors';
import { useStore } from '../store/useStore';
import { useState } from 'react';

const emptyFilters: AuditFilters = {
  actorId: '',
  objectType: '',
  action: '',
  dateFrom: '',
  dateTo: '',
  text: '',
};

export function AuditScreen() {
  const store = useStore();
  const user = currentUser(store);
  const [filters, setFilters] = useState<AuditFilters>(emptyFilters);
  const filtered = filterAudit(store.audit, filters);
  const pagination = usePagination(filtered, 20);
  const objectTypes = [...new Set(store.audit.map((entry) => entry.objectType))].sort();
  const invalidRange = Boolean(
    filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo,
  );
  if (user.role !== 'yonetici_avukat') return <UnauthorizedState />;
  const update = <K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    pagination.setPage(1);
  };
  const clear = () => {
    setFilters(emptyFilters);
    pagination.setPage(1);
  };
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Yönetici görünümü · Append-only</span>
          <h1>Global denetim</h1>
          <p>Sentetik hareketleri filtrele ve sayfala; kayıtlar düzenlenemez veya silinemez.</p>
        </div>
        <span className="status-badge neutral">{filtered.length} kayıt</span>
      </header>
      <section className="card stack-sm" aria-label="Denetim filtreleri">
        <div className="filter-grid">
          <label className="field">
            <span>Kullanıcı</span>
            <select
              value={filters.actorId ?? ''}
              onChange={(event) => update('actorId', event.target.value)}
            >
              <option value="">Tümü</option>
              {store.users.map((entry) => (
                <option value={entry.id} key={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Modül</span>
            <select
              value={filters.objectType ?? ''}
              onChange={(event) => update('objectType', event.target.value)}
            >
              <option value="">Tümü</option>
              {objectTypes.map((objectType) => (
                <option value={objectType} key={objectType}>
                  {objectType}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>İşlem</span>
            <input
              type="search"
              value={filters.action ?? ''}
              onChange={(event) => update('action', event.target.value)}
              placeholder="İşlem adında ara"
            />
          </label>
          <label className="field">
            <span>Başlangıç tarihi</span>
            <input
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(event) => update('dateFrom', event.target.value)}
            />
          </label>
          <label className="field">
            <span>Bitiş tarihi</span>
            <input
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(event) => update('dateTo', event.target.value)}
            />
          </label>
          <label className="field">
            <span>Açıklama</span>
            <input
              type="search"
              value={filters.text ?? ''}
              onChange={(event) => update('text', event.target.value)}
              placeholder="Eylem, gerekçe veya sonuç"
            />
          </label>
          <div className="filter-actions">
            <button className="button secondary" type="button" onClick={clear}>
              Filtreleri temizle
            </button>
          </div>
        </div>
        {invalidRange && (
          <div className="notice danger" role="alert">
            Başlangıç tarihi bitiş tarihinden sonra olamaz.
          </div>
        )}
      </section>
      <section className="panel">
        {pagination.items.length ? (
          <AuditTable entries={pagination.items} users={store.users} />
        ) : (
          <div className="panel-body">
            <p className="muted">Bu filtrelerle eşleşen denetim kaydı yok.</p>
          </div>
        )}
        <div className="pagination" aria-label="Denetim sayfalaması">
          <button
            className="button secondary"
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => pagination.setPage(pagination.page - 1)}
          >
            Önceki
          </button>
          <label className="field">
            <span>Sayfa</span>
            <input
              aria-label="Doğrudan sayfa"
              type="number"
              min="1"
              max={pagination.pageCount}
              value={pagination.page}
              onChange={(event) => pagination.setPage(Number(event.target.value))}
            />
            <span>/ {pagination.pageCount}</span>
          </label>
          <button
            className="button secondary"
            type="button"
            disabled={pagination.page >= pagination.pageCount}
            onClick={() => pagination.setPage(pagination.page + 1)}
          >
            Sonraki
          </button>
        </div>
      </section>
      <div className="notice info">
        Reddedilen işlemlerde hedef kimliği <code>kisitli-hedef</code> olarak maskeli kalır.
      </div>
    </div>
  );
}
