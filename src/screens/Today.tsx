import { useState } from 'react';
import { Link } from 'react-router-dom';
import { WorkCard } from '../components/cards/WorkCard';
import { DemoAssumption } from '../components/forms/SourceLabel';
import { StatusBadge } from '../components/forms/StatusBadge';
import { Icon } from '../components/forms/Icon';
import { EmptyState } from '../components/states/States';
import { dueRisk, formatDate, utcDateKey } from '../lib/format';
import { canAccessFile } from '../store/invariants';
import { currentUser, selectVisibleCandidates, selectVisibleIncoming } from '../store/selectors';
import { useStore } from '../store/useStore';

type Filter = 'tumu' | 'acil' | 'onay' | 'durusma' | 'evrak' | 'gorev';

export function TodayScreen() {
  const store = useStore();
  const user = currentUser(store);
  const [filter, setFilter] = useState<Filter>('tumu');
  const now = store.settings.simulatedNow;
  const today = utcDateKey(now);
  const visibleCandidates = selectVisibleCandidates(store, user);
  const confirmed = visibleCandidates
    .filter((candidate) => ['teyit', 'duzeltildi'].includes(candidate.status))
    .sort(
      (left, right) =>
        dueRisk(now, left.suggestedDueDate).days - dueRisk(now, right.suggestedDueDate).days,
    );
  const urgentConfirmed = confirmed.filter(
    (candidate) => dueRisk(now, candidate.suggestedDueDate).days <= 0,
  );
  const pending = visibleCandidates
    .filter((candidate) => ['aday', 'onay_bekliyor'].includes(candidate.status))
    .sort(
      (left, right) =>
        dueRisk(now, left.suggestedDueDate).days - dueRisk(now, right.suggestedDueDate).days,
    );
  const visibleHearing = store.hearings
    .filter(
      (hearing) => canAccessFile(user, hearing.fileId) && utcDateKey(hearing.dateTime) === today,
    )
    .sort((left, right) => left.dateTime.localeCompare(right.dateTime))[0];
  const incoming = selectVisibleIncoming(store, user)
    .filter(
      (document) => document.status === 'inceleme_bekliyor' || document.status === 'eslesmemis',
    )
    .sort((left, right) => right.receivedAt.localeCompare(left.receivedAt));
  const visibleTasks = store.tasks
    .filter((task) => task.status === 'acik' && canAccessFile(user, task.fileId))
    .sort((left, right) => dueRisk(now, left.dueDate).days - dueRisk(now, right.dueDate).days);
  const urgentTasks = visibleTasks.filter((task) => dueRisk(now, task.dueDate).days <= 0);
  const show = (...types: Filter[]) => filter === 'tumu' || types.includes(filter);
  const ownerName = (id?: string) => store.users.find((item) => item.id === id)?.name ?? 'Atanmadı';
  return (
    <div className="stack today-screen">
      <header className="page-header today-header">
        <div>
          <span className="eyebrow">
            {formatDate(store.settings.simulatedNow)} · {user.name}
          </span>
          <h1>Bugün dikkat isteyenler</h1>
          <p>Rapor değil, çalışma yüzeyi: önceliği tara ve tek eylemle doğru karar akışına gir.</p>
        </div>
        <DemoAssumption>Acil eşiği son gün / gecikme olarak kabul edildi</DemoAssumption>
      </header>

      <section aria-labelledby="quick-actions-title">
        <h2 className="sr-only" id="quick-actions-title">
          Hızlı eylemler
        </h2>
        <div className="quick-actions">
          <Link className="quick-action" to="/gelen?yeni=1">
            <Icon name="plus" size={23} />+ Yeni evrak
          </Link>
          <Link className="quick-action" to="/durusmalar/durusma-118?ses=1">
            <Icon name="mic" size={23} />
            Sesli not
          </Link>
          <Link className="quick-action" to="/gorevler">
            <Icon name="tasks" size={23} />+ Görev
          </Link>
          <Link className="quick-action" to="/takvim">
            <Icon name="calendar" size={23} />
            Takvim
          </Link>
        </div>
      </section>

      <div className="chip-row today-filters" aria-label="Bugün filtreleri">
        {(
          [
            ['tumu', 'Tümü'],
            ['acil', 'Acil / gecikmiş'],
            ['onay', 'Onay bekliyor'],
            ['durusma', 'Duruşmalar'],
            ['evrak', 'Evraklar'],
            ['gorev', 'Görevler'],
          ] as [Filter, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            className="chip"
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {show('acil') && (
        <section aria-labelledby="urgent-title">
          <div className="section-heading">
            <h2 id="urgent-title">Acil / son günlü</h2>
            <span className="count">{urgentTasks.length + urgentConfirmed.length}</span>
          </div>
          <div className="stack-sm">
            {urgentConfirmed.map((candidate) => {
              const risk = dueRisk(now, candidate.suggestedDueDate);
              return (
                <WorkCard
                  key={candidate.id}
                  category="Kesin süre"
                  title={candidate.title}
                  context={
                    store.files.find((file) => file.id === candidate.fileId)?.name ??
                    candidate.fileId
                  }
                  time={`Son gün: ${candidate.suggestedDueDate}`}
                  status={risk.label}
                  statusTone="danger"
                  owner={ownerName(candidate.suggestedOwnerId)}
                  actionLabel="Takvimde gör"
                  actionTo="/takvim"
                  source={candidate.sourcePassage}
                  tone="danger"
                />
              );
            })}
            {urgentTasks.map((task) => {
              const risk = dueRisk(now, task.dueDate);
              return (
                <WorkCard
                  key={task.id}
                  category="Görev · Son gün"
                  title={task.title}
                  context={store.files.find((file) => file.id === task.fileId)?.name ?? task.fileId}
                  time={risk.days < 0 ? 'Gecikmiş görev' : 'Bugün kapanmalı'}
                  status={risk.label}
                  statusTone="danger"
                  owner={ownerName(task.ownerId)}
                  actionLabel="Dosyayı aç"
                  actionTo={`/dosyalar/${task.fileId}`}
                  tone="danger"
                />
              );
            })}
            {urgentConfirmed.length === 0 && urgentTasks.length === 0 && (
              <EmptyState
                title="Acil iş yok"
                description="Kesinleşmemiş adaylar bu bölüme son gün gibi taşınmaz."
              />
            )}
          </div>
        </section>
      )}

      {show('onay') && (
        <section aria-labelledby="pending-title">
          <div className="section-heading">
            <h2 id="pending-title">Onay bekliyor</h2>
            <span className="count">{pending.length}</span>
          </div>
          <div className="stack-sm">
            {pending.map((candidate) => (
              <WorkCard
                key={candidate.id}
                category={candidate.kind === 'sure' ? 'Süre adayı' : 'Görev adayı'}
                title={candidate.title}
                context={
                  store.files.find((file) => file.id === candidate.fileId)?.name ?? candidate.fileId
                }
                time={
                  candidate.suggestedDueDate
                    ? `Öneri: ${candidate.suggestedDueDate}`
                    : 'Tarih önerisi yok'
                }
                status={candidate.verificationRequired ? 'Doğrulama gerekli' : 'Onay bekliyor'}
                statusTone="pending"
                owner={ownerName(candidate.suggestedOwnerId)}
                actionLabel="Kaynağı ve kararı aç"
                actionTo={`/gorevler/${candidate.id}`}
                source={candidate.sourcePassage ?? candidate.audioRange}
                tone="candidate"
              />
            ))}
            {pending.length === 0 && (
              <EmptyState
                title="Onay kuyruğu boş"
                description="Teyit edilen işler güncel durumuyla yukarıdaki kesin işlere taşındı."
              />
            )}
          </div>
        </section>
      )}

      {show('durusma') && (
        <section aria-labelledby="hearings-title">
          <div className="section-heading">
            <h2 id="hearings-title">Bugünkü duruşmalar</h2>
            <span className="count">{visibleHearing ? 1 : 0}</span>
          </div>
          {visibleHearing ? (
            <WorkCard
              category="Duruşma"
              title={`${visibleHearing.court} · 10:30`}
              context={
                store.files.find((file) => file.id === visibleHearing.fileId)?.name ??
                visibleHearing.fileId
              }
              time={`${formatDate(visibleHearing.dateTime, true)} · olası çakışma`}
              status="Hazırlık güncellendi"
              statusTone="info"
              owner={ownerName(visibleHearing.lawyerId)}
              actionLabel="Hazırlığı aç"
              actionTo={`/durusmalar/${visibleHearing.id}`}
              tone="info"
            />
          ) : (
            <EmptyState
              title="Yetkili duruşma yok"
              description="Bu personanın görebildiği bugünkü duruşma bulunmuyor."
            />
          )}
        </section>
      )}

      {show('evrak') && (
        <section aria-labelledby="incoming-title">
          <div className="section-heading">
            <h2 id="incoming-title">Yeni gelenler</h2>
            <span className="count">{incoming.length}</span>
          </div>
          <div className="stack-sm">
            {incoming.slice(0, 4).map((document) => (
              <WorkCard
                key={document.id}
                category="Evrak"
                title={document.name}
                context={
                  document.status === 'eslesmemis'
                    ? 'Bağlam ve kişi bilgisi bekleniyor'
                    : document.userNote
                }
                time={formatDate(document.receivedAt, true)}
                status={
                  document.status === 'eslesmemis'
                    ? 'Eşleşmemiş'
                    : document.duplicateOf
                      ? 'Duplicate şüphesi'
                      : 'İnceleme bekliyor'
                }
                statusTone={
                  document.status === 'eslesmemis' || document.duplicateOf ? 'danger' : 'pending'
                }
                owner={ownerName(document.uploadedById)}
                actionLabel="Eşleşmeyi incele"
                actionTo={`/gelen/${document.id}`}
                tone={document.duplicateOf ? 'danger' : 'pending'}
              />
            ))}
          </div>
        </section>
      )}

      {show('gorev') && (
        <section aria-labelledby="tasks-title">
          <div className="section-heading">
            <h2 id="tasks-title">Takipteki görevler</h2>
            <span className="count">{visibleTasks.length}</span>
          </div>
          <div className="stack-sm">
            {visibleTasks.map((task) => (
              <WorkCard
                key={task.id}
                category="Görev"
                title={task.title}
                context={store.files.find((file) => file.id === task.fileId)?.name ?? task.fileId}
                time={`Son tarih: ${task.dueDate ?? 'belirlenmedi'}`}
                status={dueRisk(now, task.dueDate).label}
                statusTone={dueRisk(now, task.dueDate).days <= 0 ? 'danger' : 'info'}
                owner={ownerName(task.ownerId)}
                actionLabel="Dosyayı aç"
                actionTo={`/dosyalar/${task.fileId}`}
                tone="neutral"
              />
            ))}
          </div>
        </section>
      )}
      {user.role === 'yonetici_avukat' && (
        <div className="notice info">
          <StatusBadge label="Büro özeti" tone="info" /> Yönetici görünümü: {pending.length} karar,{' '}
          {incoming.length} yeni gelen ve {visibleTasks.length} açık görev. Dosya yetkisi bu özetle
          genişlemez.
        </div>
      )}
    </div>
  );
}
