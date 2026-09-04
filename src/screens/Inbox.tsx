import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MatchCandidateCard } from '../components/cards/MatchCandidateCard';
import { DocViewer, OcrPane } from '../components/document/DocViewer';
import { DemoAssumption, SourceLabel } from '../components/forms/SourceLabel';
import { StatusBadge, statusPresentation } from '../components/forms/StatusBadge';
import { Dialog } from '../components/overlays/Dialog';
import { SuccessToast, UnauthorizedState } from '../components/states/States';
import { fakeProgress } from '../lib/async';
import { formatDate } from '../lib/format';
import { useActionFeedback } from '../lib/useActionFeedback';
import { currentUser, selectVisibleCandidates, selectVisibleIncoming } from '../store/selectors';
import type { IncomingDocument } from '../store/types';
import { useStore } from '../store/useStore';

type InboxFilter = 'tumu' | 'eslesmemis' | 'onay';

function NewIncomingModal({ onClose }: { onClose: () => void }) {
  const ingest = useStore((state) => state.ingestDemoDocument);
  const navigate = useNavigate();
  const [channel, setChannel] = useState<IncomingDocument['channel']>('fotograf');
  const [note, setNote] = useState(
    'Kurgu Metal dosyası olabilir; tarih ve kaynak kontrol edilsin.',
  );
  const [scenario, setScenario] = useState<
    'normal' | 'ocr_hata' | 'guvenlik' | 'duplicate' | 'belirsiz'
  >('normal');
  const [progress, setProgress] = useState<string[]>([]);
  const [active, setActive] = useState('');
  const [working, setWorking] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setWorking(true);
    const completed: string[] = [];
    await fakeProgress(
      (step) => {
        setActive(step);
        completed.push(step);
        setProgress([...completed]);
      },
      undefined,
      180,
    );
    const id = ingest(channel, note, scenario);
    navigate(`/gelen/${id}`);
    onClose();
  };
  const steps = ['Alındı', 'Güvenlik kontrolü', 'Metin çıkarılıyor', 'İnceleme bekliyor'];
  return (
    <Dialog open onClose={onClose} labelledBy="new-incoming-title">
      <form onSubmit={submit}>
        <div className="modal__header">
          <div>
            <span className="eyebrow">Tamamen yerel fixture</span>
            <h2 id="new-incoming-title">Yeni evrak al</h2>
          </div>
          <button className="button quiet" type="button" onClick={onClose}>
            Kapat
          </button>
        </div>
        <div className="modal__body">
          <label className="field">
            <span>Kanal</span>
            <select
              data-autofocus
              value={channel}
              onChange={(event) => setChannel(event.target.value as IncomingDocument['channel'])}
            >
              <option value="fotograf">Fotoğraf / Kamera</option>
              <option value="dosya">Dosya</option>
              <option value="e-posta">Kontrollü e-posta (simüle)</option>
              <option value="mesaj">Mesajdan aktar (simüle)</option>
              <option value="ses-ve-evrak">Sesli not + evrak</option>
            </select>
          </label>
          <label className="field">
            <span>Müvekkil ve bağlam notu</span>
            <textarea required value={note} onChange={(event) => setNote(event.target.value)} />
            <small>
              Belgede ad geçmeyebileceği için kişi, evrak ve aciliyet bağlamını kısa yazın.
            </small>
          </label>
          <label className="field">
            <span>Görünür demo senaryosu</span>
            <select
              value={scenario}
              onChange={(event) => setScenario(event.target.value as typeof scenario)}
            >
              <option value="normal">Normal · OCR ve iki eşleşme adayı</option>
              <option value="ocr_hata">A3 · OCR başarısız</option>
              <option value="guvenlik">A4 · Parolalı / güvenlik olayı</option>
              <option value="duplicate">A5 · Duplicate şüphesi</option>
              <option value="belirsiz">A1 · Müvekkil/dosya belirsiz</option>
            </select>
          </label>
          {working && (
            <ol className="progress-steps" aria-live="polite">
              {steps.map((step) => (
                <li
                  key={step}
                  className={progress.includes(step) ? 'done' : active === step ? 'active' : ''}
                >
                  {step}
                </li>
              ))}
            </ol>
          )}
          <div className="notice info">
            Gerçek cihaz dosyası alınmaz, hiçbir servis çağrılmaz. İlerleme yalnız{' '}
            <code>setTimeout</code> ile taklit edilir.
          </div>
        </div>
        <div className="modal__footer">
          <button className="button secondary" type="button" onClick={onClose}>
            Vazgeç
          </button>
          <button className="button" type="submit" disabled={working || !note.trim()}>
            {working ? 'Yerel işlem sürüyor…' : 'Sentetik evrakı al'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function InboxScreen() {
  const store = useStore();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<InboxFilter>('tumu');
  const [newOpen, setNewOpen] = useState(params.get('yeni') === '1');
  useEffect(() => {
    if (params.get('yeni') === '1') setNewOpen(true);
  }, [params]);
  const close = () => {
    setNewOpen(false);
    setParams({});
  };
  const documents = selectVisibleIncoming(store).filter((document) => {
    if (filter === 'eslesmemis') return document.status === 'eslesmemis';
    if (filter === 'onay') return document.status === 'onay_bekliyor';
    return true;
  });
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Triage · Evrak + eşleşmemiş + onay</span>
          <h1>Gelen Kutusu</h1>
          <p>
            Dağınık kanaldan alınan sentetik evraklar tek güvenlik, OCR, eşleşme ve karar hattında.
          </p>
        </div>
        <button
          className="button"
          type="button"
          aria-haspopup="dialog"
          onClick={() => setNewOpen(true)}
        >
          + Yeni evrak
        </button>
      </header>
      <div className="chip-row" aria-label="Gelen kutusu filtreleri">
        {(
          [
            ['tumu', 'Tümü'],
            ['eslesmemis', 'Eşleşmemiş'],
            ['onay', 'Onay bekleyen'],
          ] as [InboxFilter, string][]
        ).map(([value, label]) => (
          <button
            className="chip"
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="panel">
        <div className="panel-header">
          <h2>Evrak kuyruğu</h2>
          <span className="count">{documents.length}</span>
        </div>
        <div className="panel-body">
          {documents.map((document) => {
            const status = statusPresentation(document.status);
            return (
              <Link className="list-row" to={`/gelen/${document.id}`} key={document.id}>
                <span className="contact-avatar">EV</span>
                <span className="list-row__main">
                  <h3>{document.name}</h3>
                  <p>
                    {document.userNote} · {formatDate(document.receivedAt, true)}
                  </p>
                  <span className="inline-actions" style={{ marginTop: 8 }}>
                    <StatusBadge label={status.label} tone={status.tone} />
                    {document.duplicateOf && (
                      <StatusBadge label="Duplicate şüphesi" tone="danger" />
                    )}
                    {document.securityStatus !== 'guvenli' && (
                      <StatusBadge label="İşlenmedi · güvenlik" tone="danger" />
                    )}
                  </span>
                </span>
                <span aria-hidden="true">›</span>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="notice">
        <DemoAssumption>İlk kanal vurgusu manuel/fotoğraf</DemoAssumption> Kontrollü e-posta ve
        mesaj seçenekleri yalnız simüle edilmiş kaynak etiketidir.
      </div>
      {newOpen && <NewIncomingModal onClose={close} />}
    </div>
  );
}

export function InboxReviewScreen() {
  const store = useStore();
  const { evrakId = '' } = useParams();
  const user = currentUser(store);
  const rawDocument = store.incomingDocuments.find((item) => item.id === evrakId);
  const document = selectVisibleIncoming(store, user).find((item) => item.id === evrakId);
  const feedback = useActionFeedback();
  const [view, setView] = useState<'original' | 'ocr' | 'side'>('side');
  const [selectedFileId, setSelectedFileId] = useState('');
  const [duplicateChoice, setDuplicateChoice] = useState<'ayni' | 'yeni_surum' | 'iliskisiz' | ''>(
    '',
  );
  if (!rawDocument)
    return (
      <div className="state-block">
        <div>
          <h1>Evrak bulunamadı</h1>
          <Link className="button" to="/gelen">
            Gelen kutusuna dön
          </Link>
        </div>
      </div>
    );
  if (!document) {
    return (
      <UnauthorizedState
        onRequest={() =>
          feedback.run(
            () => store.requestAccess('kisitli-evrak'),
            'Yetki talebi audit’e yazıldı; hassas içerik açılmadı.',
          )
        }
      />
    );
  }
  const ocr = store.ocrResults.find((item) => item.id === document.ocrId);
  const visibleCandidates = selectVisibleCandidates(store, user);
  const candidates = document.taskCandidateIds
    .map((id) => visibleCandidates.find((item) => item.id === id))
    .filter(Boolean);
  const selectedFile = store.files.find((file) => file.id === selectedFileId);
  const status = statusPresentation(document.status);
  return (
    <div className="stack inbox-review">
      <header className="page-header inbox-review__header">
        <div>
          <span className="eyebrow">Gelen Evrak · {document.groupOrder ?? 'Tek belge'}</span>
          <h1>{document.name}</h1>
          <p>{document.userNote}</p>
        </div>
        <div className="inline-actions">
          <StatusBadge label={status.label} tone={status.tone} />
          <StatusBadge
            label={
              document.securityStatus === 'guvenli' ? 'Güvenlik kontrolü tamam' : 'Güvenlik olayı'
            }
            tone={document.securityStatus === 'guvenli' ? 'success' : 'danger'}
          />
        </div>
      </header>
      <div className="grid-3 inbox-review__metadata desktop-only">
        <div className="metric">
          <small>Kanal</small>
          <strong>{document.channel.replaceAll('-', ' ')}</strong>
        </div>
        <div className="metric">
          <small>Alınma</small>
          <strong>{formatDate(document.receivedAt, true)}</strong>
        </div>
        <div className="metric">
          <small>Orijinal hash</small>
          <strong>{document.hash}</strong>
        </div>
      </div>
      <div className="inbox-review__metadata-mobile mobile-only" aria-label="Evrak bilgileri">
        <dl>
          <div>
            <dt>Kanal</dt>
            <dd>{document.channel.replaceAll('-', ' ')}</dd>
          </div>
          <div>
            <dt>Alınma</dt>
            <dd>{formatDate(document.receivedAt, true)}</dd>
          </div>
        </dl>
        <details>
          <summary>Orijinal hash</summary>
          <code>{document.hash}</code>
        </details>
      </div>
      {document.securityStatus !== 'guvenli' ? (
        <div className="state-block" role="alert">
          <div className="state-block__content">
            <StatusBadge label="İşlenmedi" tone="danger" />
            <h2>Parolalı veya riskli dosya</h2>
            <p>
              Dosya OCR/AI işlemine gönderilmedi. Güvenlik olayı kaydı açıldı; güvenli alternatif
              istenmeli.
            </p>
            <Link className="button secondary" to="/gelen">
              Kuyruğa dön
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section className="inbox-review__workspace" aria-labelledby="document-workspace-title">
            <div className="section-heading inbox-review__workspace-heading">
              <div>
                <span className="eyebrow">Kaynak çalışma alanı</span>
                <h2 id="document-workspace-title">Orijinal ≠ OCR</h2>
              </div>
              <div className="segmented" role="tablist" aria-label="Belge görünümü">
                <button
                  className="tab-button"
                  type="button"
                  role="tab"
                  aria-selected={view === 'original'}
                  onClick={() => setView('original')}
                >
                  Orijinal
                </button>
                <button
                  className="tab-button"
                  type="button"
                  role="tab"
                  aria-selected={view === 'ocr'}
                  onClick={() => setView('ocr')}
                >
                  OCR
                </button>
                <button
                  className="tab-button"
                  type="button"
                  role="tab"
                  aria-selected={view === 'side'}
                  onClick={() => setView('side')}
                >
                  Yan yana
                </button>
              </div>
            </div>
            <div className={`document-workspace ${view !== 'side' ? 'grid-1' : ''}`}>
              {(view === 'original' || view === 'side') && (
                <DocViewer documentRef={document.originalRef} />
              )}
              {(view === 'ocr' || view === 'side') && <OcrPane result={ocr} />}
            </div>
          </section>
          {document.duplicateOf && (
            <section className="panel" aria-labelledby="duplicate-title">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">Alternatif akış A5</span>
                  <h2 id="duplicate-title">Duplicate şüphesi</h2>
                </div>
                <StatusBadge label="Sistem silmedi" tone="danger" />
              </div>
              <div className="panel-body stack-sm">
                <p>
                  Benzer evrak: <strong>{document.duplicateOf}</strong>. Hash farklı olabilir; karar
                  kullanıcıya aittir.
                </p>
                <div className="chip-row">
                  {(
                    [
                      ['ayni', 'Aynı belge'],
                      ['yeni_surum', 'Yeni sürüm'],
                      ['iliskisiz', 'İlişkisiz'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      className="chip"
                      type="button"
                      aria-pressed={duplicateChoice === value}
                      onClick={() => setDuplicateChoice(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  className="button"
                  type="button"
                  disabled={!duplicateChoice}
                  onClick={() =>
                    feedback.run(
                      () =>
                        store.resolveDuplicate(
                          document.id,
                          duplicateChoice as 'ayni' | 'yeni_surum' | 'iliskisiz',
                        ),
                      'Duplicate kararı audit’e yazıldı; hiçbir kayıt sessizce silinmedi.',
                    )
                  }
                >
                  Kararı kaydet
                </button>
              </div>
            </section>
          )}
          <section aria-labelledby="match-title">
            <div className="section-heading">
              <div>
                <span className="eyebrow">AI önerisi · İnsan seçimi bekleniyor</span>
                <h2 id="match-title">Dosya eşleşmesi</h2>
              </div>
              <StatusBadge label="Varsayılan seçim yok" tone="candidate" />
            </div>
            {document.matchCandidates.length ? (
              <div className="stack-sm">
                {document.matchCandidates.map((candidate) => {
                  const file = store.files.find((item) => item.id === candidate.fileId);
                  return file ? (
                    <MatchCandidateCard
                      key={candidate.fileId}
                      candidate={candidate}
                      file={file}
                      selected={selectedFileId === candidate.fileId}
                      onSelect={() => setSelectedFileId(candidate.fileId)}
                    />
                  ) : null;
                })}
                <div className="human-decision">
                  <span className="eyebrow">İnsan kararı</span>
                  <p>
                    Seçiminiz doğrudan bağlantı değildir; <strong>onay bekleyen</strong> bir karar
                    üretir.
                  </p>
                  <div className="inline-actions primary-mobile">
                    <button
                      className="button"
                      type="button"
                      disabled={!selectedFile}
                      onClick={() =>
                        selectedFile &&
                        feedback.run(
                          () => store.stageMatch(document.id, selectedFile.id),
                          `${selectedFile.name} seçimi onay kuyruğuna alındı.`,
                        )
                      }
                    >
                      Seçimi onaya gönder
                    </button>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() =>
                        feedback.run(
                          () => store.markUnmatched(document.id),
                          'Evrak eşleşmemiş kuyruğunda görünür kalacak.',
                        )
                      }
                    >
                      Eşleşmedi
                    </button>
                    <Link className="button secondary" to="/dosyalar/yeni-potansiyel">
                      Yeni potansiyel dosya
                    </Link>
                    <Link className="button quiet" to="/gelen">
                      Sonra incele
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="state-block">
                <div className="state-block__content">
                  <h2>Eşleşme adayı üretilemedi</h2>
                  <p>
                    Hiçbir dosya tahminle bağlanmadı. Bağlam ekleyin veya yeni potansiyel dosya
                    açın.
                  </p>
                  <div className="inline-actions">
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() =>
                        feedback.run(
                          () => store.markUnmatched(document.id),
                          'Eşleşmemiş kuyruk durumu korundu.',
                        )
                      }
                    >
                      Eşleşmemişte tut
                    </button>
                    <Link className="button" to="/dosyalar/yeni-potansiyel">
                      Yeni potansiyel
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </section>
          {candidates.length > 0 && (
            <section className="panel" aria-labelledby="candidate-title">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">AI önerisi · Kesin görev değil</span>
                  <h2 id="candidate-title">Görev / süre adayı</h2>
                </div>
                <StatusBadge label="Avukat teyidi gerekli" tone="pending" />
              </div>
              <div className="panel-body stack-sm">
                {candidates.map(
                  (candidate) =>
                    candidate && (
                      <article className="ai-strip" key={candidate.id}>
                        <strong>◇ {candidate.title}</strong>
                        <p>{candidate.calculationExplanation}</p>
                        <div style={{ marginTop: 10 }}>
                          <SourceLabel>
                            {candidate.sourcePassage ?? candidate.audioRange}
                          </SourceLabel>
                        </div>
                        <div className="inline-actions" style={{ marginTop: 12 }}>
                          <button
                            className="button ai"
                            type="button"
                            onClick={() =>
                              feedback.run(
                                () => store.sendCandidateForApproval(candidate.id),
                                'Aday avukat onay kuyruğuna gönderildi; henüz kesinleşmedi.',
                              )
                            }
                          >
                            Görev/süre onayına gönder
                          </button>
                          <Link className="button secondary" to={`/gorevler/${candidate.id}`}>
                            Karar kartını aç
                          </Link>
                        </div>
                      </article>
                    ),
                )}
              </div>
            </section>
          )}
        </>
      )}
      {feedback.error && (
        <div className="notice danger" role="alert">
          {feedback.error}
        </div>
      )}
      {feedback.message && <SuccessToast message={feedback.message} />}
    </div>
  );
}
