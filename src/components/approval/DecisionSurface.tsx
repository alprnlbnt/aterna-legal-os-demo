import { useState } from 'react';
import { StatusBadge } from '../forms/StatusBadge';

export function DecisionSurface({
  actionLabel,
  disabled,
  onApprove,
  onReject,
}: {
  actionLabel: string;
  disabled?: boolean;
  onApprove: (reason: string, confirmed: boolean) => void;
  onReject?: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const reasonReady = reason.trim().length >= 8;
  return (
    <section className="human-decision decision-surface" aria-labelledby="human-decision-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">İnsan kararı</span>
          <h3 id="human-decision-title">Yetkili avukat onay kapısı</h3>
        </div>
        <StatusBadge label="Audit’e yazılır" tone="info" />
      </div>
      <div className="field">
        <label htmlFor="decision-reason">Karar gerekçesi</label>
        <textarea
          id="decision-reason"
          aria-describedby="decision-reason-help"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Kaynağı nasıl kontrol ettiğinizi ve karar gerekçenizi yazın…"
        />
        <small id="decision-reason-help">
          En az 8 karakter; onay, ret ve düzeltmede eski değer korunur.
        </small>
      </div>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        <span>
          Kaynak belgeyi ve kritik sonucu yeniden kontrol ettim. Bu ikinci doğrulama yalnız insan
          kararını temsil eder.
        </span>
      </label>
      <div className="inline-actions primary-mobile">
        <button
          className="button"
          type="button"
          disabled={disabled || !reasonReady || !confirmed}
          onClick={() => onApprove(reason, confirmed)}
        >
          {actionLabel}
        </button>
        {onReject && (
          <button
            className="button secondary"
            type="button"
            disabled={!reasonReady}
            onClick={() => onReject(reason)}
          >
            Reddet
          </button>
        )}
      </div>
      {disabled && (
        <div className="notice warning">
          Bu final eylem mevcut persona veya çevrimdışı durum nedeniyle kilitli.
        </div>
      )}
    </section>
  );
}
