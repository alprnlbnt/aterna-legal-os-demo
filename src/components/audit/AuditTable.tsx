import { formatDate } from '../../lib/format';
import type { AuditEntry, User } from '../../store/types';
import { StatusBadge } from '../forms/StatusBadge';

export function AuditTable({ entries, users }: { entries: AuditEntry[]; users: User[] }) {
  return (
    <div className="table-scroll">
      <table className="audit-table">
        <caption className="sr-only">Değiştirilemez sentetik denetim kayıtları</caption>
        <thead>
          <tr>
            <th>Zaman</th>
            <th>Eylem</th>
            <th>Aktör</th>
            <th>Nesne</th>
            <th>Değişim / gerekçe</th>
          </tr>
        </thead>
        <tbody>
          {[...entries].reverse().map((entry) => (
            <tr key={entry.id}>
              <td>{formatDate(entry.time, true)}</td>
              <td>
                <strong>{entry.action}</strong>
                <br />
                <StatusBadge label="Append-only" tone="neutral" />
              </td>
              <td>
                {users.find((user) => user.id === entry.actorId)?.name ?? entry.actorId}
                <br />
                <span className="micro muted">{entry.actorRole}</span>
              </td>
              <td>
                {entry.objectType}
                <br />
                <span className="micro muted">{entry.objectId}</span>
              </td>
              <td>
                {entry.previousValue && (
                  <>
                    <span className="muted">{entry.previousValue}</span> →{' '}
                  </>
                )}
                {entry.nextValue}
                <br />
                <span className="micro muted">{entry.reason}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
