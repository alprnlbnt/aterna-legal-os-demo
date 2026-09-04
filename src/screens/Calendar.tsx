import { Link } from 'react-router-dom';
import { DemoAssumption } from '../components/forms/SourceLabel';
import { StatusBadge } from '../components/forms/StatusBadge';
import { dueRisk, formatDate, formatMonthYear, utcDateKey } from '../lib/format';
import { canAccessFile } from '../store/invariants';
import { currentUser, selectFinalDeadlines, selectVisibleCandidates } from '../store/selectors';
import type { Deadline, Hearing, Task } from '../store/types';
import { useStore } from '../store/useStore';

type AgendaItem =
  | { type: 'hearing'; date: string; item: Hearing }
  | { type: 'deadline'; date: string; item: Deadline }
  | { type: 'task'; date: string; item: Task };

const riskTone = (days: number) => (days <= 0 ? 'danger' : days <= 3 ? 'pending' : 'success');

export function CalendarScreen() {
  const store = useStore();
  const user = currentUser(store);
  const now = store.settings.simulatedNow;
  const nowDate = new Date(now);
  const year = nowDate.getUTCFullYear();
  const monthIndex = nowDate.getUTCMonth();
  const today = nowDate.getUTCDate();
  const monthTitle = formatMonthYear(now);
  const dayCount = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const leadingBlankCount = (new Date(Date.UTC(year, monthIndex, 1)).getUTCDay() + 6) % 7;
  const days = Array.from({ length: dayCount }, (_, index) => index + 1);
  const dateForDay = (day: number) =>
    `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const deadlines = selectFinalDeadlines(store).filter((deadline) =>
    canAccessFile(user, deadline.fileId),
  );
  const tasks = store.tasks.filter(
    (task) => task.status === 'acik' && canAccessFile(user, task.fileId),
  );
  const hearings = store.hearings.filter((hearing) => canAccessFile(user, hearing.fileId));
  const eventForDay = (day: number) => {
    const date = dateForDay(day);
    return {
      deadlines: deadlines.filter((item) => item.dueDate === date),
      tasks: tasks.filter((item) => item.dueDate === date),
      hearings: hearings.filter((item) => utcDateKey(item.dateTime) === date),
    };
  };
  const agenda: AgendaItem[] = [
    ...hearings.map((item) => ({ type: 'hearing' as const, date: item.dateTime, item })),
    ...deadlines.map((item) => ({ type: 'deadline' as const, date: item.dueDate, item })),
    ...tasks.map((item) => ({
      type: 'task' as const,
      date: item.dueDate ?? '9999-12-31',
      item,
    })),
  ].sort((left, right) => left.date.localeCompare(right.date));
  const pendingCount = selectVisibleCandidates(store, user).filter((candidate) =>
    ['aday', 'onay_bekliyor'].includes(candidate.status),
  ).length;

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Ay + ajanda · {monthTitle}</span>
          <h1>Takvim ve süreler</h1>
          <p>
            Yalnız avukat teyidi bulunan süreler kesin kayıt olarak görünür; adaylar onay kuyruğunda
            kalır.
          </p>
        </div>
        <DemoAssumption>Takvim simüle saate göre UTC gösterilir</DemoAssumption>
      </header>
      <div className="calendar-month" aria-label={`${monthTitle} aylık takvim`}>
        {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'].map((day) => (
          <div className="calendar-day" key={day}>
            <span className="calendar-day__number">{day}</span>
          </div>
        ))}
        {Array.from({ length: leadingBlankCount }, (_, index) => (
          <div className="calendar-day" aria-hidden="true" key={`blank-${index}`} />
        ))}
        {days.map((day) => {
          const events = eventForDay(day);
          return (
            <div
              className="calendar-day"
              aria-current={day === today ? 'date' : undefined}
              key={day}
            >
              <span className="calendar-day__number">{day}</span>
              {events.hearings.map((item) => (
                <span className="calendar-event hearing" key={item.id}>
                  {new Date(item.dateTime).toISOString().slice(11, 16)} · Duruşma
                </span>
              ))}
              {events.deadlines.map((item) => (
                <span className="calendar-event" key={item.id}>
                  Kesin · {item.kind.replaceAll('_', ' ')}
                </span>
              ))}
              {events.tasks.map((item) => (
                <span className="calendar-event" key={item.id}>
                  Görev · {item.title.slice(0, 18)}
                </span>
              ))}
            </div>
          );
        })}
      </div>
      <section aria-labelledby="agenda-title">
        <div className="section-heading">
          <h2 id="agenda-title">Ajanda</h2>
          <span className="count">{agenda.length}</span>
        </div>
        <div className="stack-sm">
          {agenda.map((entry) => {
            if (entry.type === 'hearing') {
              return (
                <Link
                  className="work-card info"
                  to={`/durusmalar/${entry.item.id}`}
                  key={entry.item.id}
                >
                  <div>
                    <span className="eyebrow">Duruşma</span>
                    <h3>{entry.item.court}</h3>
                    <p>
                      {formatDate(entry.item.dateTime, true)} · {entry.item.agenda}
                    </p>
                  </div>
                  <StatusBadge
                    label={
                      utcDateKey(entry.item.dateTime) === utcDateKey(now) ? 'Bugün' : 'Planlandı'
                    }
                    tone="info"
                  />
                </Link>
              );
            }
            const risk = dueRisk(now, entry.date);
            if (entry.type === 'deadline') {
              return (
                <Link
                  className={`work-card ${riskTone(risk.days)}`}
                  to={`/dosyalar/${entry.item.fileId}`}
                  key={entry.item.id}
                >
                  <div>
                    <span className="eyebrow">
                      Kesin süre · {entry.item.manual ? 'Manuel' : 'Türev'}
                    </span>
                    <h3>{entry.item.kind.replaceAll('_', ' ')}</h3>
                    <p>
                      {entry.item.dueDate} · {entry.item.legalBasis}
                    </p>
                  </div>
                  <StatusBadge
                    label={`Avukat teyitli · ${risk.label}`}
                    tone={riskTone(risk.days)}
                  />
                </Link>
              );
            }
            return (
              <Link className="work-card" to={`/dosyalar/${entry.item.fileId}`} key={entry.item.id}>
                <div>
                  <span className="eyebrow">Görev</span>
                  <h3>{entry.item.title}</h3>
                  <p>
                    {entry.item.dueDate ?? 'Son tarih belirlenmedi'} · tamamlanana kadar görünür
                  </p>
                </div>
                <StatusBadge label={risk.label} tone={riskTone(risk.days)} />
              </Link>
            );
          })}
        </div>
      </section>
      <div className="notice warning">
        Onay kuyruğundaki {pendingCount} aday bu kesin takvimde gösterilmez.
      </div>
    </div>
  );
}
