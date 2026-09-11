import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { WorkCard } from '../components/cards/WorkCard';
import { DecisionSurface } from '../components/approval/DecisionSurface';
import { AiStrip } from '../components/forms/AiStrip';
import { StatusBadge, statusPresentation } from '../components/forms/StatusBadge';
import { SuccessToast, UnauthorizedState } from '../components/states/States';
import { useActionFeedback } from '../lib/useActionFeedback';
import { canAccessFile, isLawyer } from '../store/invariants';
import { currentUser } from '../store/selectors';
import { useStore } from '../store/useStore';

type TaskView = 'onay' | 'gorevler' | 'reddedilen';

export function TasksScreen() {
  const store = useStore();
  const user = currentUser(store);
  const feedback = useActionFeedback();
  const [view, setView] = useState<TaskView>('onay');
  const pending = store.candidates.filter(
    (candidate) =>
      ['aday', 'onay_bekliyor'].includes(candidate.status) && canAccessFile(user, candidate.fileId),
  );
  const rejected = store.candidates.filter(
    (candidate) => candidate.status === 'reddedildi' && canAccessFile(user, candidate.fileId),
  );
  const tasks = store.tasks.filter((task) => canAccessFile(user, task.fileId));
  const owner = (id?: string) => store.users.find((item) => item.id === id)?.name ?? 'Atanmadı';
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Karar kuyruğu + kalıcı iş listesi</span>
          <h1>Görevler & Onay</h1>
          <p>
            Adayları kaynaklarıyla değerlendir; yalnız avukat teyidi kesin görev ve takvim kaydı
            üretir.
          </p>
        </div>
        <div className="page-actions">
          <StatusBadge label={`${pending.length} karar bekliyor`} tone="pending" />
          <Link className="button" to="/gorevler/yeni">
            + Manuel görev
          </Link>
        </div>
      </header>
      {!isLawyer(user.role) && (
        <div className="notice warning">
          Bu persona aday hazırlayabilir ancak hukuki süreyi kesinleştiremez. Onay eylemleri
          kilitlidir.
        </div>
      )}
      <div className="segmented" role="tablist" aria-label="Görev görünümü">
        {(
          [
            ['onay', 'Onay kuyruğu'],
            ['gorevler', 'Kesin görevler'],
            ['reddedilen', 'Reddedilen / geçmiş'],
          ] as [TaskView, string][]
        ).map(([value, label]) => (
          <button
            className="tab-button"
            type="button"
            role="tab"
            aria-selected={view === value}
            key={value}
            onClick={() => setView(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {view === 'onay' && (
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
                  ? `Önerilen: ${candidate.suggestedDueDate}`
                  : 'Tarih belirsiz'
              }
              status={
                candidate.verificationRequired
                  ? 'Doğrulama gerekli'
                  : statusPresentation(candidate.status).label
              }
              statusTone="pending"
              owner={owner(candidate.suggestedOwnerId)}
              actionLabel="Karar kartını aç"
              actionTo={`/gorevler/${candidate.id}`}
              source={candidate.sourcePassage ?? candidate.audioRange}
              tone="candidate"
            />
          ))}
        </div>
      )}
      {view === 'gorevler' && (
        <div className="stack-sm">
          {tasks.map((task) => (
            <article className="card task-list-card" key={task.id}>
              <div>
                <div className="inline-actions">
                  <StatusBadge
                    label={task.origin === 'manuel' ? 'Manuel' : 'Adaydan kesinleşti'}
                    tone={task.origin === 'manuel' ? 'info' : 'candidate'}
                  />
                  <StatusBadge
                    label={task.status === 'acik' ? 'Açık · görünür kalır' : 'Tamamlandı'}
                    tone={task.status === 'acik' ? 'info' : 'success'}
                  />
                </div>
                <h3>{task.title}</h3>
                <p className="muted small">
                  {store.files.find((file) => file.id === task.fileId)?.name ?? task.fileId} ·
                  Sahip: {owner(task.ownerId)} · Son tarih: {task.dueDate ?? 'Belirlenmedi'}
                </p>
                {task.reminderAt && (
                  <p className="micro muted">Sentetik hatırlatma: {task.reminderAt}</p>
                )}
              </div>
              <div className="stack-sm">
                <button
                  className="button"
                  type="button"
                  onClick={() =>
                    feedback.run(
                      () =>
                        task.status === 'acik'
                          ? store.completeTask(task.id)
                          : store.reopenTask(task.id),
                      task.status === 'acik'
                        ? 'Görev tamamlandı işaretlendi.'
                        : 'Görev yeniden açıldı.',
                    )
                  }
                >
                  {task.status === 'acik' ? 'Tamamlandı işaretle' : 'Yeniden aç'}
                </button>
                <Link className="button secondary" to={`/dosyalar/${task.fileId}`}>
                  Dosyayı aç
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
      {view === 'reddedilen' && (
        <div className="stack-sm">
          {rejected.map((candidate) => (
            <WorkCard
              key={candidate.id}
              category="Korunan aday geçmişi"
              title={candidate.title}
              context="Eski öneri ve ret gerekçesi audit kaydında kalır."
              time={candidate.suggestedDueDate ?? 'Tarih yok'}
              status="Reddedildi"
              statusTone="danger"
              owner={owner(candidate.suggestedOwnerId)}
              actionLabel="Kaydı aç"
              actionTo={`/gorevler/${candidate.id}`}
              tone="danger"
            />
          ))}
        </div>
      )}
      <div className="notice info">
        Görev adayında alt görev zinciri teyit sonrasında oluşturulur: kaynak belgeler → taslak →
        son kontrol. Süre adayı yalnız ana görev ve kesin takvim kaydı üretir. Sahip ataması
        otomatik değildir.
      </div>
      {feedback.error && (
        <div className="notice danger" role="alert">
          {feedback.error}
        </div>
      )}
      {feedback.message && <SuccessToast message={feedback.message} />}
    </div>
  );
}

export function NewManualTaskScreen() {
  const store = useStore();
  const user = currentUser(store);
  const navigate = useNavigate();
  const feedback = useActionFeedback();
  const files = store.files.filter(
    (file) => file.status !== 'kapali' && canAccessFile(user, file.id),
  );
  const owners = store.users.filter((candidate) => candidate.active);
  const [fileId, setFileId] = useState(files[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [ownerId, setOwnerId] = useState(user.id);
  const [startDate, setStartDate] = useState(store.settings.simulatedNow.slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [reminderAt, setReminderAt] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const id = feedback.run(
      () =>
        store.createManualTask({
          fileId,
          title,
          ownerId,
          startDate,
          dueDate: dueDate || undefined,
          reminderAt: reminderAt ? `${reminderAt}:00Z` : undefined,
        }),
      store.settings.offline
        ? 'Manuel görev oluşturuldu; senkronizasyon bekliyor.'
        : 'Manuel görev oluşturuldu.',
    );
    if (id) navigate('/gorevler');
  };
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Kaynak: kullanıcı · Süre değildir</span>
          <h1>Manuel görev oluştur</h1>
          <p>Bu kayıt iş takibi içindir; hukuki deadline oluşturmaz veya dört kapıyı atlamaz.</p>
        </div>
        <Link className="button secondary" to="/gorevler">
          Vazgeç
        </Link>
      </header>
      <form className="card stack" onSubmit={submit} noValidate>
        <label className="field">
          <span>Dosya</span>
          <select required value={fileId} onChange={(event) => setFileId(event.target.value)}>
            {files.map((file) => (
              <option value={file.id} key={file.id}>
                {file.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Görev başlığı</span>
          <input required value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <div className="grid-2">
          <label className="field">
            <span>Sahip</span>
            <select value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
              {owners.map((owner) => (
                <option value={owner.id} key={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Başlangıç</span>
            <input
              type="date"
              required
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Son tarih (isteğe bağlı)</span>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Hatırlatma zamanı (isteğe bağlı, UTC)</span>
            <input
              type="datetime-local"
              value={reminderAt}
              onChange={(event) => setReminderAt(event.target.value)}
            />
          </label>
        </div>
        <div className="notice info">
          Hatırlatma yalnız içeriksiz yerel bildirim üretir; gerçek e-posta veya dış kanal yoktur.
        </div>
        <button className="button" type="submit">
          Manuel görevi kaydet
        </button>
        {feedback.error && (
          <div className="notice danger" role="alert">
            {feedback.error}
          </div>
        )}
      </form>
    </div>
  );
}

export function TaskApprovalScreen() {
  const store = useStore();
  const { adayId = '' } = useParams();
  const candidate = store.candidates.find((item) => item.id === adayId);
  const user = currentUser(store);
  const feedback = useActionFeedback();
  const [chosenDate, setChosenDate] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [explanationReason, setExplanationReason] = useState(
    'Kaynak olay tarihinin açıklanması gerekiyor.',
  );
  if (!candidate)
    return (
      <div className="state-block">
        <div>
          <h1>Aday bulunamadı</h1>
          <Link className="button" to="/gorevler">
            Kuyruğa dön
          </Link>
        </div>
      </div>
    );
  if (!canAccessFile(user, candidate.fileId))
    return <UnauthorizedState onRequest={() => store.requestAccess(candidate.fileId)} />;
  const file = store.files.find((item) => item.id === candidate.fileId);
  const document = store.incomingDocuments.find((item) => item.id === candidate.sourceDocumentId);
  const status = statusPresentation(candidate.status);
  const effectiveDate =
    manualDate ||
    chosenDate ||
    (!candidate.alternativeDates?.length ? candidate.suggestedDueDate : '');
  const locked =
    store.settings.offline ||
    !isLawyer(user.role) ||
    candidate.status !== 'onay_bekliyor' ||
    ['teyit', 'duzeltildi', 'reddedildi'].includes(candidate.status) ||
    (candidate.kind === 'sure' && !effectiveDate);
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Karar kartı · {candidate.id}</span>
          <h1>{candidate.title}</h1>
          <p>{file?.name}</p>
        </div>
        <div className="inline-actions">
          <StatusBadge label={status.label} tone={status.tone} />
          {candidate.verificationRequired && (
            <StatusBadge label="Doğrulama gerekli" tone="pending" />
          )}
        </div>
      </header>
      <AiStrip>
        Bu tarih ve görev, yerel fixture içindeki kaynaklardan çıkarılmış bir{' '}
        <strong>adaydır</strong>. Kesin hukuk sonucu değildir.
      </AiStrip>
      <section className="card decision-surface">
        <div className="decision-summary">
          <div className="metric">
            <small>Olay tarihi</small>
            <strong>{candidate.eventDate ?? 'Belirsiz'}</strong>
          </div>
          <div className="metric">
            <small>Önerilen son tarih</small>
            <strong>{candidate.suggestedDueDate ?? 'Seçilmedi'}</strong>
          </div>
          <div className="metric">
            <small>Önerilen sahip</small>
            <strong>
              {store.users.find((item) => item.id === candidate.suggestedOwnerId)?.name ??
                'Atanmadı'}
            </strong>
          </div>
        </div>
        <div>
          <span className="eyebrow">Kaynak belge / ses</span>
          <h2>{document?.name ?? 'Duruşma sonrası sesli not'}</h2>
          <div className="source-passage">“{candidate.sourcePassage ?? candidate.audioRange}”</div>
        </div>
        <div className="notice warning" role="alert">
          <strong>Belirsizlik:</strong>&nbsp;{candidate.uncertainty}
        </div>
        <div>
          <span className="eyebrow">Hesap açıklaması</span>
          <p>{candidate.calculationExplanation}</p>
        </div>
        {candidate.alternativeDates?.length && (
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="eyebrow">Birden fazla tarih · Otomatik seçim yok</legend>
            <div className="stack-sm">
              {candidate.alternativeDates.map((item) => (
                <label className="radio-row card" key={item.date}>
                  <input
                    aria-label={`${item.date} — ${item.context}`}
                    type="radio"
                    name="date-choice"
                    checked={chosenDate === item.date}
                    onChange={() => {
                      setChosenDate(item.date);
                      setManualDate('');
                    }}
                  />
                  <span>
                    <strong>{item.date}</strong>
                    <br />
                    <span className="small muted">{item.context}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <label className="field">
          <span>Tarihi manuel düzelt (isteğe bağlı)</span>
          <input
            type="date"
            value={manualDate}
            onChange={(event) => {
              setManualDate(event.target.value);
              if (event.target.value) setChosenDate('');
            }}
          />
          <small>
            Manuel tarih eski aday değerini silmez; düzeltme ve gerekçe audit’e yazılır.
          </small>
        </label>
        {candidate.status === 'aday' && (
          <button
            className="button ai"
            type="button"
            onClick={() =>
              feedback.run(
                () => store.sendCandidateForApproval(candidate.id),
                'Aday onay kuyruğuna gönderildi; kesin görev oluşturulmadı.',
              )
            }
          >
            Öneriyi avukat onayına al
          </button>
        )}
      </section>
      {!['teyit', 'duzeltildi', 'reddedildi'].includes(candidate.status) && (
        <DecisionSurface
          actionLabel={
            candidate.kind === 'gorev'
              ? 'Teyit et ve görevlere ekle'
              : manualDate
                ? 'Tarihi düzelt ve takvime işle'
                : 'Teyit et ve takvime işle'
          }
          disabled={locked}
          onApprove={(reason, confirmed) =>
            feedback.run(
              () =>
                store.approveCandidate(
                  candidate.id,
                  reason,
                  confirmed,
                  candidate.kind === 'sure' ? effectiveDate || undefined : manualDate || undefined,
                ),
              candidate.kind === 'sure'
                ? 'Süre teyit edildi; kesin görev, takvim kaydı ve tek audit satırı oluştu.'
                : 'Görev teyit edildi; deadline oluşturmadan görev zinciri oluştu.',
            )
          }
          onReject={(reason) =>
            feedback.run(
              () => store.rejectCandidate(candidate.id, reason),
              'Aday reddedildi; önceki değer ve gerekçe korundu.',
            )
          }
        />
      )}
      {!['teyit', 'duzeltildi', 'reddedildi'].includes(candidate.status) && (
        <section className="card stack-sm">
          <span className="eyebrow">Alternatif karar</span>
          <h2>Açıklama iste</h2>
          <label className="field">
            <span>İstek gerekçesi</span>
            <input
              value={explanationReason}
              onChange={(event) => setExplanationReason(event.target.value)}
            />
          </label>
          <button
            className="button secondary"
            type="button"
            onClick={() =>
              feedback.run(
                () => store.requestCandidateExplanation(candidate.id, explanationReason),
                'Açıklama isteği audit’e yazıldı; aday kesinleşmedi.',
              )
            }
          >
            Hazırlayana açıklama gönder
          </button>
        </section>
      )}
      {['teyit', 'duzeltildi'].includes(candidate.status) && (
        <div className="notice success">
          <strong>Teyit edildi.</strong>&nbsp;Bu iş{' '}
          {candidate.kind === 'sure' ? 'kesin görev ve takvim kaydı' : 'kesin görev'} olarak
          görünür; kart geçmişten kaybolmaz.
        </div>
      )}
      {candidate.status === 'reddedildi' && (
        <div className="notice danger">
          Aday reddedildi. Öneri ve karar gerekçesi audit geçmişinde korunur.
        </div>
      )}
      <div className="notice warning">
        Duruşma çakışması: önerilen tarihte 10:30 duruşma kaydı olabilir. Sistem iptal veya yeniden
        atama yapmaz.
      </div>
      {feedback.error && (
        <div className="notice danger" role="alert">
          {feedback.error}
        </div>
      )}
      {feedback.message && <SuccessToast message={feedback.message} />}
    </div>
  );
}
