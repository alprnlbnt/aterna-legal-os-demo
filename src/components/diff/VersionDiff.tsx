import type { VersionDifference } from '../../store/types';
import { AiStrip } from '../forms/AiStrip';
import { StatusBadge } from '../forms/StatusBadge';

export function VersionDiff({ differences }: { differences: VersionDifference[] }) {
  if (differences.length === 0)
    return <div className="notice">Bu iki sürüm arasında fark yok.</div>;
  return (
    <div className="stack-sm">
      <AiStrip title="AI fark özeti · Yardımcı">
        Madde farkları asıl kaynaktır; bu özet avukat incelemesinin yerine geçmez.
      </AiStrip>
      <div className="diff-list" data-testid="version-diff">
        {differences.map((difference) => (
          <article
            className={`diff-row ${difference.critical ? 'critical' : ''}`}
            key={difference.clause}
          >
            <div className="section-heading">
              <strong>{difference.clause}</strong>
              <div className="inline-actions">
                <StatusBadge label={difference.kind} tone="info" />
                {difference.critical && <StatusBadge label="Kritik · yeniden onay" tone="danger" />}
              </div>
            </div>
            <div className="diff-values">
              <div className="diff-old">{difference.previous ?? 'Önceki sürümde yok'}</div>
              <div className="diff-new">{difference.next ?? 'Yeni sürümden çıkarıldı'}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
