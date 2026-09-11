import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SvgBarChart } from '../components/charts/SvgBarChart';
import { DemoAssumption } from '../components/forms/SourceLabel';
import { StatusBadge } from '../components/forms/StatusBadge';
import { EmptyState } from '../components/states/States';
import { formatMoney } from '../lib/format';
import { canAccessFile } from '../store/invariants';
import {
  currentUser,
  filterLedger,
  selectCashflow,
  selectFinanceScope,
  selectFinanceSummary,
  selectMonthlyCollections,
} from '../store/selectors';
import type { LedgerFilters } from '../store/selectors';
import type { LedgerEntry } from '../store/types';
import { useStore } from '../store/useStore';
import { CurrentAccount } from './FinanceCurrent';

type FinanceTab = 'pano' | 'cari' | 'rapor';

export const ledgerKindLabel: Record<LedgerEntry['kind'], string> = {
  tahsilat: 'Müvekkilden tahsilat',
  masraf: 'Masraf',
  vekalet_ucreti: 'Vekalet ücreti',
  karsi_yan_ucreti: 'Karşı yan vekalet ücreti',
};

export function FinanceScreen() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('sekme');
  const [tab, setTab] = useState<FinanceTab>(
    initialTab === 'cari' || initialTab === 'rapor' ? initialTab : 'pano',
  );
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Sentetik ledger · Salt türetilmiş pano ve rapor</span>
          <h1>Finans</h1>
          <p>
            Vekalet, tahsilat, alacak, gider ve net nakit yalnız erişilebilen onaylı kurgu
            hareketlerinden hesaplanır.
          </p>
        </div>
        <DemoAssumption>Ödeme ve banka bağlantısı yok</DemoAssumption>
      </header>
      <div className="notice warning">
        <strong>Gerçek mali işlem yok.</strong>&nbsp;Bu ekran para transferi, canlı faiz, TCMB,
        Makbuztek veya harici servis isteği yapmaz.
      </div>
      <div className="segmented" role="tablist" aria-label="Finans görünümü">
        {(
          [
            ['pano', 'Pano'],
            ['cari', 'Cari'],
            ['rapor', 'Rapor'],
          ] as [FinanceTab, string][]
        ).map(([value, label]) => (
          <button
            className="tab-button"
            type="button"
            role="tab"
            aria-selected={tab === value}
            key={value}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'pano' && <FinanceDashboard />}
      {tab === 'cari' && <CurrentAccount />}
      {tab === 'rapor' && <FinanceReport />}
    </div>
  );
}

export function FinanceDashboard() {
  const store = useStore();
  const user = currentUser(store);
  const files = store.files.filter(
    (file) => canAccessFile(user, file.id) && file.status !== 'kapali',
  );
  const [scope, setScope] = useState('all');
  const entries = selectFinanceScope(store, user, scope);
  const summary = selectFinanceSummary(entries);
  const monthly = selectMonthlyCollections(entries, store.settings.simulatedNow, 6);
  return (
    <section className="stack" aria-labelledby="finance-dashboard-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Büro finans görünümü</span>
          <h2 id="finance-dashboard-title">Finans panosu</h2>
        </div>
        <label className="field">
          <span>Dosya kapsamı</span>
          <select value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="all">Tüm erişilebilir dosyalar</option>
            {files.map((file) => (
              <option value={file.id} key={file.id}>
                {file.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {entries.length === 0 ? (
        <EmptyState
          title="Bu kapsamda cari hareket yok"
          description="Başka bir erişilebilir dosya kapsamı seçebilirsin."
        />
      ) : (
        <>
          <div className="finance-metrics">
            <div className="metric">
              <small>Toplam vekalet ücreti</small>
              <strong>{formatMoney(summary.vekalet)}</strong>
            </div>
            <div className="metric">
              <small>Tahsilat</small>
              <strong>{formatMoney(summary.tahsilat)}</strong>
            </div>
            <div className="metric">
              <small>Kalan alacak</small>
              <strong>{formatMoney(summary.kalanAlacak)}</strong>
            </div>
            <div className="metric">
              <small>Gider</small>
              <strong>{formatMoney(summary.gider)}</strong>
            </div>
            <div className="metric">
              <small>Net nakit</small>
              <strong>{formatMoney(summary.netNakit)}</strong>
            </div>
          </div>
          <section className="panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Onaylı hareketler</span>
                <h2>Son 6 ay tahsilat</h2>
              </div>
              <StatusBadge label="SVG · yerel" tone="info" />
            </div>
            <div className="panel-body">
              <SvgBarChart data={monthly} />
            </div>
          </section>
        </>
      )}
    </section>
  );
}

function FinanceReport() {
  const store = useStore();
  const user = currentUser(store);
  const now = new Date(store.settings.simulatedNow);
  const initialFilters: LedgerFilters = {
    year: now.getUTCFullYear(),
    month: null,
    dateFrom: '',
    dateTo: '',
    clientId: '',
    kind: '',
    text: '',
  };
  const [filters, setFilters] = useState<LedgerFilters>(initialFilters);
  const scope = selectFinanceScope(store, user, 'all');
  const visibleFiles = store.files.filter(
    (file) => file.status !== 'kapali' && canAccessFile(user, file.id),
  );
  const clients = store.contacts.filter((contact) =>
    visibleFiles.some((file) => file.clientId === contact.id),
  );
  const dateInvalid = Boolean(
    filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo,
  );
  const entries = filterLedger(scope, visibleFiles, filters);
  const cashflow = selectCashflow(entries, {});
  const update = <K extends keyof LedgerFilters>(key: K, value: LedgerFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) query.set(key, String(value));
  });

  return (
    <section className="stack" aria-labelledby="finance-report-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Dönem ve gelişmiş filtreler</span>
          <h2 id="finance-report-title">Finans raporu</h2>
        </div>
        <Link className="button" to={`/finans/rapor/onizleme?${query.toString()}`}>
          A4 önizle
        </Link>
      </div>
      <section className="card stack-sm" aria-label="Finans raporu filtreleri">
        <div className="filter-grid">
          <label className="field">
            <span>Yıl</span>
            <select
              value={filters.year ?? ''}
              onChange={(event) =>
                update('year', event.target.value ? Number(event.target.value) : null)
              }
            >
              <option value="">Tüm zamanlar</option>
              {[2026, 2025, 2024].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Ay</span>
            <select
              value={filters.month ?? ''}
              disabled={!filters.year}
              onChange={(event) =>
                update('month', event.target.value ? Number(event.target.value) : null)
              }
            >
              <option value="">Tüm aylar</option>
              {Array.from({ length: 12 }, (_, index) => (
                <option value={index + 1} key={index + 1}>
                  {new Intl.DateTimeFormat('tr-TR', {
                    month: 'long',
                    timeZone: 'UTC',
                  }).format(new Date(Date.UTC(2026, index, 1)))}
                </option>
              ))}
            </select>
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
            <span>Müvekkil</span>
            <select
              value={filters.clientId ?? ''}
              onChange={(event) => update('clientId', event.target.value)}
            >
              <option value="">Tümü</option>
              {clients.map((client) => (
                <option value={client.id} key={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>İşlem türü</span>
            <select
              value={filters.kind ?? ''}
              onChange={(event) => update('kind', event.target.value as LedgerFilters['kind'])}
            >
              <option value="">Tümü</option>
              {Object.entries(ledgerKindLabel).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Açıklamada ara</span>
            <input
              type="search"
              value={filters.text ?? ''}
              onChange={(event) => update('text', event.target.value)}
              placeholder="Kurgu açıklama"
            />
          </label>
          <div className="filter-actions">
            <button
              className="button secondary"
              type="button"
              onClick={() => setFilters(initialFilters)}
            >
              Filtreleri temizle
            </button>
          </div>
        </div>
        {dateInvalid && (
          <div className="notice danger" role="alert">
            Başlangıç tarihi bitiş tarihinden sonra olamaz.
          </div>
        )}
      </section>
      <div className="grid-3">
        <div className="metric">
          <small>Gelen</small>
          <strong>{formatMoney(cashflow.gelen)}</strong>
        </div>
        <div className="metric">
          <small>Giden</small>
          <strong>{formatMoney(cashflow.giden)}</strong>
        </div>
        <div className="metric">
          <small>Net nakit</small>
          <strong>{formatMoney(cashflow.net)}</strong>
        </div>
      </div>
      <LedgerTable entries={entries} emptyText="Bu filtrelerle eşleşen onaylı hareket yok." />
    </section>
  );
}

export function LedgerTable({
  entries,
  emptyText,
}: {
  entries: LedgerEntry[];
  emptyText?: string;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Kalem bazlı cari</h2>
        <span className="count">{entries.length}</span>
      </div>
      {entries.length === 0 ? (
        <div className="panel-body">
          <p className="muted">{emptyText ?? 'Bu kapsamda hareket yok.'}</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <caption className="sr-only">Sentetik cari hareketleri</caption>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Tür</th>
                <th>Açıklama</th>
                <th>Yön</th>
                <th>Tutar</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.date}</td>
                  <td>{ledgerKindLabel[entry.kind]}</td>
                  <td>{entry.description}</td>
                  <td>{entry.direction}</td>
                  <td>{formatMoney(entry.amount)}</td>
                  <td>
                    <StatusBadge
                      label={entry.approvalStatus === 'onaylandi' ? 'Onaylı' : 'Taslak'}
                      tone={entry.approvalStatus === 'onaylandi' ? 'success' : 'pending'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
