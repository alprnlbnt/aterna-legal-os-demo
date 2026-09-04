import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { DemoAssumption } from '../components/forms/SourceLabel';
import { StatusBadge } from '../components/forms/StatusBadge';
import { SuccessToast } from '../components/states/States';
import { formatMoney } from '../lib/format';
import { useActionFeedback } from '../lib/useActionFeedback';
import { canAccessFile } from '../store/invariants';
import { currentUser, selectBalance } from '../store/selectors';
import type { LedgerEntry } from '../store/types';
import { useStore } from '../store/useStore';

export function FinanceScreen() {
  const store = useStore();
  const user = currentUser(store);
  const feedback = useActionFeedback();
  const files = store.files.filter(
    (file) => canAccessFile(user, file.id) && file.status !== 'kapali',
  );
  const [fileId, setFileId] = useState(files[0]?.id ?? '');
  const [kind, setKind] = useState<LedgerEntry['kind']>('tahsilat');
  const [amount, setAmount] = useState('10000');
  const [description, setDescription] = useState('Manuel kurgu tahsilat kaydı');
  const entries = store.ledger.filter((entry) => entry.fileId === fileId);
  const confirmedBalance = selectBalance(store, fileId);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    feedback.run(
      () =>
        store.addLedgerEntry({
          fileId,
          date: store.settings.simulatedNow.slice(0, 10),
          kind,
          description,
          amount: numericAmount,
          direction: kind === 'tahsilat' || kind === 'karsi_yan_ucreti' ? 'alacak' : 'borc',
          approvalStatus: 'onaylandi',
        }),
      'Manuel cari hareket yerel store’a eklendi; hiçbir ödeme yapılmadı.',
    );
  };
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Basit Faz 1 iskeleti · Entegrasyonsuz</span>
          <h1>Cari ve tahsilat</h1>
          <p>
            Vekalet ücreti, karşı yan vekalet ücreti, masraf ve tahsilatı ayrı kalemlerde izleyen
            sentetik yüzey.
          </p>
        </div>
        <DemoAssumption>Golden path ana omurgası dışı</DemoAssumption>
      </header>
      <div className="notice warning">
        <strong>Ödeme ve banka bağlantısı yok.</strong>&nbsp;Bu ekran yalnız yerel fixture
        kayıtlarını değiştirir; para transferi, canlı faiz, TCMB veya mali müşavir isteği yapmaz.
      </div>
      <label className="field">
        <span>Dosya</span>
        <select value={fileId} onChange={(event) => setFileId(event.target.value)}>
          {files.map((file) => (
            <option value={file.id} key={file.id}>
              {file.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid-3">
        <div className="metric">
          <small>Onaylı cari bakiye</small>
          <strong>{formatMoney(confirmedBalance)}</strong>
        </div>
        <div className="metric">
          <small>Taslak hareket</small>
          <strong>{entries.filter((entry) => entry.approvalStatus === 'taslak').length}</strong>
        </div>
        <div className="metric">
          <small>Hareket sayısı</small>
          <strong>{entries.length}</strong>
        </div>
      </div>
      <section className="panel">
        <div className="panel-header">
          <h2>Kalem bazlı cari</h2>
          <StatusBadge label="Üçlü ücret ayrımı" tone="info" />
        </div>
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
                  <td>{entry.kind.replaceAll('_', ' ')}</td>
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
      </section>
      <form className="human-decision stack-sm" onSubmit={submit}>
        <span className="eyebrow">Yönetici avukat kararı</span>
        <h2>Manuel cari hareket ekle</h2>
        <div className="grid-2">
          <label className="field">
            <span>Kalem türü</span>
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as LedgerEntry['kind'])}
            >
              <option value="tahsilat">Müvekkilden tahsilat</option>
              <option value="masraf">Masraf</option>
              <option value="vekalet_ucreti">Vekalet ücreti</option>
              <option value="karsi_yan_ucreti">Karşı yan vekalet ücreti</option>
            </select>
          </label>
          <label className="field">
            <span>Tutar (TL)</span>
            <input
              type="number"
              min="1"
              step="0.01"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
        </div>
        <label className="field">
          <span>Açıklama</span>
          <input
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <button className="button" type="submit" disabled={user.role !== 'yonetici_avukat'}>
          Onaylı manuel kayıt ekle
        </button>
        {user.role !== 'yonetici_avukat' && (
          <div className="notice warning">
            Cari hesaba kesin yansıtma yönetici avukat yetkisindedir.
          </div>
        )}
      </form>
      <Link className="button secondary" to={`/dosyalar/${fileId}`}>
        Dosya bağlamına dön
      </Link>
      {feedback.error && (
        <div className="notice danger" role="alert">
          {feedback.error}
        </div>
      )}
      {feedback.message && <SuccessToast message={feedback.message} />}
    </div>
  );
}
