import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AiStrip } from '../components/forms/AiStrip';
import { SourceLabel } from '../components/forms/SourceLabel';
import { StatusBadge } from '../components/forms/StatusBadge';
import { SuccessToast, UnauthorizedState } from '../components/states/States';
import { VoiceRecorder } from '../components/voice/VoiceRecorder';
import { formatDate } from '../lib/format';
import { useActionFeedback } from '../lib/useActionFeedback';
import { canAccessFile, voiceCommandsArePassive } from '../store/invariants';
import { currentUser } from '../store/selectors';
import { useStore } from '../store/useStore';

export function HearingsScreen() {
  const store = useStore();
  const user = currentUser(store);
  const hearings = store.hearings.filter((hearing) => canAccessFile(user, hearing.fileId));
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Önce hazırlık · Sonra kaynaklı not</span>
          <h1>Duruşmalar</h1>
          <p>Telefondan kritik özet, çevrimdışı sabitleme ve duruşma sonrası sesli not.</p>
        </div>
        <StatusBadge label="Bugün 1" tone="info" />
      </header>
      <div className="stack-sm">
        {hearings.map((hearing) => (
          <Link className="work-card info" to={`/durusmalar/${hearing.id}`} key={hearing.id}>
            <div>
              <span className="eyebrow">{formatDate(hearing.dateTime, true)}</span>
              <h3>{hearing.court}</h3>
              <p>
                {store.files.find((file) => file.id === hearing.fileId)?.name} · {hearing.agenda}
              </p>
              <div className="work-card__meta">
                <StatusBadge label={`Hazırlık ${hearing.preparationStatus}`} tone="info" />
                {hearing.pinnedOffline && <StatusBadge label="Çevrimdışı sabit" tone="success" />}
              </div>
            </div>
            <span className="button secondary">Hazırlığı aç</span>
          </Link>
        ))}
      </div>
      <div className="notice warning">
        Çakışma uyarısı: aynı avukatın yakın saatte başka işlemi var. Sistem duruşmayı iptal etmez
        veya vekil atamaz.
      </div>
    </div>
  );
}

export function HearingDetailScreen() {
  const store = useStore();
  const { durusmaId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const hearing = store.hearings.find((item) => item.id === durusmaId);
  const user = currentUser(store);
  const feedback = useActionFeedback();
  const [showVoice, setShowVoice] = useState(searchParams.get('ses') === '1');
  const [showReport, setShowReport] = useState(Boolean(hearing?.preparationReport));
  const [recorded, setRecorded] = useState(false);
  if (!hearing)
    return (
      <div className="state-block">
        <div>
          <h1>Duruşma bulunamadı</h1>
          <Link className="button" to="/durusmalar">
            Listeye dön
          </Link>
        </div>
      </div>
    );
  if (!canAccessFile(user, hearing.fileId))
    return <UnauthorizedState onRequest={() => store.requestAccess(hearing.fileId)} />;
  const file = store.files.find((item) => item.id === hearing.fileId);
  const lawyer = store.users.find((item) => item.id === hearing.lawyerId);
  const note = store.voiceNotes.find((item) => item.hearingId === hearing.id);
  const voiceCandidates =
    note?.taskCandidateIds
      .map((id) => store.candidates.find((item) => item.id === id))
      .filter(Boolean) ?? [];
  const passiveCommands = note ? voiceCommandsArePassive(note.transcriptDraft) : [];
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Duruşma hazırlığı · {formatDate(hearing.dateTime, true)}</span>
          <h1>{hearing.court}</h1>
          <p>
            {file?.name} · {hearing.agenda}
          </p>
        </div>
        <div className="inline-actions">
          <StatusBadge label={`Hazırlık ${hearing.preparationStatus}`} tone="info" />
          {hearing.pinnedOffline && <StatusBadge label="Çevrimdışı sabit" tone="success" />}
        </div>
      </header>
      <div className="grid-3">
        <div className="metric">
          <small>Saat</small>
          <strong>10:30</strong>
        </div>
        <div className="metric">
          <small>Duruşmaya girecek</small>
          <strong>{lawyer?.name}</strong>
        </div>
        <div className="metric">
          <small>Açık görev</small>
          <strong>
            {
              store.tasks.filter((task) => task.fileId === hearing.fileId && task.status === 'acik')
                .length
            }
          </strong>
        </div>
      </div>
      <section className="grid-2">
        <article className="card">
          <span className="eyebrow">Son işlem</span>
          <h2>Dosya bağlamı</h2>
          <p>{hearing.lastAction}</p>
          <SourceLabel>Bilirkişi raporu + dosya zaman çizelgesi</SourceLabel>
        </article>
        <article className="card">
          <span className="eyebrow">Hazırlık eksiği</span>
          <h2>Uydurulmadı</h2>
          {hearing.missingPreparation.map((item) => (
            <div className="notice warning" key={item}>
              {item}
            </div>
          ))}
        </article>
      </section>
      <div className="inline-actions primary-mobile">
        <button className="button ai" type="button" onClick={() => setShowReport(true)}>
          Hazırlık raporu oluştur / aç
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() =>
            feedback.run(
              () => store.pinHearingOffline(hearing.id),
              'Kritik özet ve sınırlı belgeler çevrimdışı sabitlendi.',
            )
          }
        >
          Çevrimdışı sabitle
        </button>
        <button className="button" type="button" onClick={() => setShowVoice(true)}>
          Duruşma sonrası not
        </button>
      </div>
      {showReport && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">AI önerisi · Taslak</span>
              <h2>Hazırlık raporu</h2>
            </div>
            <StatusBadge label="Avukat düzenlemesi gerekli" tone="candidate" />
          </div>
          <div className="panel-body stack-sm">
            <AiStrip>
              Yalnız mevcut yetkili belge ve notlardan oluşturuldu. Eksik ücret pusulası için metin
              uydurulmadı.
            </AiStrip>
            {hearing.preparationReport?.map((item) => (
              <article className="card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <SourceLabel>{item.source}</SourceLabel>
              </article>
            ))}
          </div>
        </section>
      )}
      {showVoice && (
        <section className="stack" aria-labelledby="voice-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Duruşma çıkışı · Klavyesiz</span>
              <h2 id="voice-title">Sesli not</h2>
            </div>
            <StatusBadge label="Ses ≠ metin" tone="candidate" />
          </div>
          <VoiceRecorder
            onComplete={() => {
              setRecorded(true);
              if (note)
                feedback.run(
                  () => store.completeVoiceNote(note.id),
                  store.settings.offline
                    ? 'Sesli not senkronizasyon bekliyor.'
                    : 'Orijinal ses ve metin taslağı ayrı kaydedildi.',
                );
            }}
            onCancel={() => setRecorded(false)}
          />
          {(recorded || note) && note && (
            <>
              <section className="card">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Metin dönüşümü · Kesin tutanak değil</span>
                    <h2>Transkript taslağı</h2>
                  </div>
                  <StatusBadge
                    label={
                      note.status === 'senkronizasyon_bekliyor'
                        ? 'Senkronizasyon bekliyor'
                        : 'Taslak'
                    }
                    tone={note.status === 'senkronizasyon_bekliyor' ? 'pending' : 'candidate'}
                  />
                </div>
                <p>{note.transcriptDraft}</p>
                <div className="chip-row">
                  {note.uncertainPhrases.map((phrase) => (
                    <span className="status-badge pending" key={phrase}>
                      ⚠ Belirsiz: {phrase}
                    </span>
                  ))}
                </div>
                <p className="small muted" style={{ marginTop: 12 }}>
                  Orijinal ses: {note.audioDuration} · Metin düzeltilebilir; ses ayrıca korunur.
                </p>
              </section>
              <div className="notice warning" data-testid="passive-voice-commands">
                <strong>Pasif komut ifadeleri:</strong>&nbsp;{passiveCommands.join(', ')}. Bu
                kelimeler hiçbir silme, onay veya gönderim eylemi tetiklemedi.
              </div>
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <span className="eyebrow">Ayrı karar kartları</span>
                    <h2>Görev / tarih adayları</h2>
                  </div>
                  <StatusBadge label="Avukat teyidi gerekli" tone="pending" />
                </div>
                <div className="panel-body stack-sm">
                  {voiceCandidates.map(
                    (candidate) =>
                      candidate && (
                        <article className="ai-strip" key={candidate.id}>
                          <strong>◇ {candidate.title}</strong>
                          <p>
                            Kaynak ses: {candidate.audioRange} · {candidate.sourcePassage}
                          </p>
                          <div className="inline-actions" style={{ marginTop: 12 }}>
                            <button
                              className="button ai"
                              type="button"
                              onClick={() =>
                                feedback.run(
                                  () => store.queueVoiceCandidates(note.id),
                                  user.id === file?.responsibleLawyerId
                                    ? 'Adaylar avukat onay kuyruğuna gönderildi.'
                                    : 'Adaylar yalnız sorumlu avukat kuyruğuna gönderildi; kesinleşmedi.',
                                )
                              }
                            >
                              Onay akışına gönder
                            </button>
                            <Link className="button secondary" to={`/gorevler/${candidate.id}`}>
                              Adayı incele
                            </Link>
                          </div>
                        </article>
                      ),
                  )}
                </div>
              </section>
            </>
          )}
        </section>
      )}
      <div className="notice info">
        Tevkil paketi ve dış paylaşım ayrı yetkili onay gerektirir; bu demo otomatik paylaşım
        yapmaz.
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
