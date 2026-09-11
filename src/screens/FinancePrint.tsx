import { Link, useSearchParams } from 'react-router-dom';
import { formatMoney } from '../lib/format';
import { canAccessFile } from '../store/invariants';
import { currentUser, filterLedger, selectCashflow, selectFinanceScope } from '../store/selectors';
import type { LedgerFilters } from '../store/selectors';
import { useStore } from '../store/useStore';
import { ledgerKindLabel } from './Finance';

export function FinancePrintPreviewScreen() {
  const store = useStore();
  const user = currentUser(store);
  const [searchParams] = useSearchParams();
  const filters: LedgerFilters = {
    year: searchParams.get('year') ? Number(searchParams.get('year')) : null,
    month: searchParams.get('month') ? Number(searchParams.get('month')) : null,
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
    clientId: searchParams.get('clientId') ?? '',
    kind: (searchParams.get('kind') as LedgerFilters['kind']) ?? '',
    text: searchParams.get('text') ?? '',
  };
  const scope = selectFinanceScope(store, user, 'all');
  const files = store.files.filter(
    (file) => file.status !== 'kapali' && canAccessFile(user, file.id),
  );
  const entries = filterLedger(scope, files, filters);
  const cashflow = selectCashflow(entries, {});
  const period = filters.year
    ? `${filters.month ? `${String(filters.month).padStart(2, '0')}/` : ''}${filters.year}`
    : 'Tüm zamanlar';
  return (
    <div className="print-preview">
      <div className="print-toolbar">
        <Link className="button secondary" to={`/finans?sekme=rapor&${searchParams.toString()}`}>
          Rapora dön
        </Link>
        <button className="button" type="button" onClick={() => window.print()}>
          Yazdır
        </button>
      </div>
      <article className="a4-sheet" aria-labelledby="print-report-title">
        <header className="a4-sheet__header">
          <div>
            <span className="eyebrow">{store.office.letterhead}</span>
            <h1 id="print-report-title">Sentetik finans raporu</h1>
          </div>
          <div>
            <strong>Dönem</strong>
            <br />
            {period}
          </div>
        </header>
        <div className="notice warning">
          Sentetik — resmî mali belge değildir; fatura değildir ve dış gönderim yapılmaz.
        </div>
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
            <small>Net</small>
            <strong>{formatMoney(cashflow.net)}</strong>
          </div>
        </div>
        <table className="data-table">
          <caption>Filtrelenmiş onaylı sentetik cari kalemleri</caption>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Tür</th>
              <th>Açıklama</th>
              <th>Tutar</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.date}</td>
                <td>{ledgerKindLabel[entry.kind]}</td>
                <td>{entry.description}</td>
                <td>{formatMoney(entry.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <footer className="a4-sheet__footer">
          <span>{store.office.name}</span>
          <span>Yerel yazdırma önizlemesi · ağ isteği yok</span>
        </footer>
      </article>
    </div>
  );
}
