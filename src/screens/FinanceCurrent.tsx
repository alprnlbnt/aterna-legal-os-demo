import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../components/forms/StatusBadge';
import { SuccessToast } from '../components/states/States';
import { formatMoney } from '../lib/format';
import { useActionFeedback } from '../lib/useActionFeedback';
import { canAccessFile } from '../store/invariants';
import { currentUser, selectBalance } from '../store/selectors';
import type { LedgerEntry } from '../store/types';
import { useStore } from '../store/useStore';
import { ledgerKindLabel, LedgerTable } from './Finance';

export function CurrentAccount() {
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
    feedback.run(
      () =>
        store.addLedgerEntry({
          fileId,
          date: store.settings.simulatedNow.slice(0, 10),
          kind,
          description,
          amount: Number(amount),
          direction: kind === 'tahsilat' || kind === 'karsi_yan_ucreti' ? 'alacak' : 'borc',
          approvalStatus: 'onaylandi',
        }),
      'Manuel cari hareket yerel store’a eklendi; hiçbir ödeme yapılmadı.',
    );
  };
  return (
    <section className="stack" aria-labelledby="current-account-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Mevcut yüzey · Entegrasyonsuz</span>
          <h2 id="current-account-title">Cari ve tahsilat</h2>
        </div>
        <StatusBadge label="Üçlü ücret ayrımı" tone="info" />
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
      <LedgerTable entries={entries} />
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
              {Object.entries(ledgerKindLabel).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
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
      {fileId && (
        <Link className="button secondary" to={`/dosyalar/${fileId}`}>
          Dosya bağlamına dön
        </Link>
      )}
      {feedback.error && (
        <div className="notice danger" role="alert">
          {feedback.error}
        </div>
      )}
      {feedback.message && <SuccessToast message={feedback.message} />}
    </section>
  );
}
