import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DecisionSurface } from '../components/approval/DecisionSurface';
import { AuditTable } from '../components/audit/AuditTable';
import { DemoAssumption } from '../components/forms/SourceLabel';
import { StatusBadge, statusPresentation } from '../components/forms/StatusBadge';
import { SuccessToast, UnauthorizedState } from '../components/states/States';
import { daysBetween, formatDate } from '../lib/format';
import { useActionFeedback } from '../lib/useActionFeedback';
import { isLawyer } from '../store/invariants';
import {
  canViewPrivateNotes,
  currentUser,
  selectPrivateNotes,
  selectSensitiveCase,
  selectVisibleAudit,
  selectVisibleContacts,
  selectVisibleFiles,
} from '../store/selectors';
import type { CaseFile } from '../store/types';
import { useStore } from '../store/useStore';

type FileFilter = 'aktif' | 'potansiyel' | 'kapali';

export function FilesScreen() {
  const store = useStore();
  const [filter, setFilter] = useState<FileFilter>('aktif');
  const allVisibleFiles = selectVisibleFiles(store);
  const visibleFiles = allVisibleFiles.filter((file) => file.status === filter);
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Matter merkezli çalışma</span>
          <h1>Dosyalar</h1>
          <p>Evrak, görev, süre, belge, duruşma, not ve cari aynı dosya bağlamında kalır.</p>
        </div>
        <Link className="button" to="/dosyalar/yeni-potansiyel">
          + Yeni potansiyel
        </Link>
      </header>
      <div className="segmented" role="tablist" aria-label="Dosya statüsü">
        {(
          [
            ['aktif', 'Aktif'],
            ['potansiyel', 'Potansiyel'],
            ['kapali', 'Kapalı'],
          ] as [FileFilter, string][]
        ).map(([value, label]) => (
          <button
            className="tab-button"
            type="button"
            role="tab"
            aria-selected={filter === value}
            key={value}
            onClick={() => setFilter(value)}
          >
            {label}{' '}
            <span className="count">
              {allVisibleFiles.filter((file) => file.status === value).length}
            </span>
          </button>
        ))}
      </div>
      <div className="panel">
        <div className="panel-body">
          {visibleFiles.map((file) => {
            const masked = 'masked' in file && file.masked;
            const presentation = statusPresentation(file.status);
            return (
              <Link className="list-row" key={file.id} to={`/dosyalar/${file.id}`}>
                <span className="contact-avatar">{masked ? '🔒' : 'D'}</span>
                <span className="list-row__main">
                  <div className="inline-actions">
                    <h3>{file.name}</h3>
                    <StatusBadge label={presentation.label} tone={presentation.tone} />
                  </div>
                  <p>
                    {file.subject}
                    {!masked && 'caseNumber' in file && file.caseNumber
                      ? ` · ${file.caseNumber}`
                      : ''}
                  </p>
                </span>
                <span aria-hidden="true">›</span>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="notice">
        <DemoAssumption>Dosya listesi statüye göre basit sıralı</DemoAssumption> Filtre kalıcılığı
        ve birleşik risk sırası ürün kararıdır.
      </div>
    </div>
  );
}

export function NewPotentialScreen() {
  const store = useStore();
  const visibleContacts = selectVisibleContacts(store);
  const navigate = useNavigate();
  const feedback = useActionFeedback();
  const [form, setForm] = useState({
    name: 'Yeni kira uyuşmazlığı (Kurgu)',
    clientId: 'kisi-aday-c',
    opposingPartyId: 'kisi-karsi-x',
    subject: 'Kira alacağı ve tahliye ön incelemesi',
    responsibleLawyerId: 'user-alper',
    firstContact: '03.09.2026 · telefon görüşmesi',
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const id = feedback.run(() => store.createPotential(form), 'Potansiyel dosya oluşturuldu.');
    if (id) navigate(`/dosyalar/${id}`);
  };
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Senaryo 3 · Kısa başlangıç</span>
          <h1>Yeni potansiyel dosya</h1>
          <p>Mahkeme ve esas numarası olmadan yeni iş ihtimalini güvenle kaydet.</p>
        </div>
        <StatusBadge label="Aktif dava değildir" tone="candidate" />
      </header>
      {store.settings.offline && (
        <div className="notice warning">
          Kayıt “Potansiyel · Senkronizasyon bekliyor” olarak tutulur; kesin aktif dosya olmaz.
        </div>
      )}
      <form className="panel" onSubmit={submit}>
        <div className="panel-header">
          <h2>Başlangıç bilgileri</h2>
          <DemoAssumption>Mahkeme ve esas isteğe bağlı</DemoAssumption>
        </div>
        <div className="panel-body stack">
          <label className="field">
            <span>İşin kısa adı</span>
            <input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>
          <div className="grid-2">
            <label className="field">
              <span>Müvekkil / aday kişi</span>
              <select
                value={form.clientId}
                onChange={(event) => setForm({ ...form, clientId: event.target.value })}
              >
                {visibleContacts
                  .filter((contact) => contact.kind !== 'karsi_taraf')
                  .map((contact) => (
                    <option value={contact.id} key={contact.id}>
                      {contact.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              <span>Karşı taraf (biliniyorsa)</span>
              <select
                value={form.opposingPartyId}
                onChange={(event) => setForm({ ...form, opposingPartyId: event.target.value })}
              >
                <option value="">Bilinmiyor</option>
                {visibleContacts
                  .filter((contact) => contact.kind === 'karsi_taraf')
                  .map((contact) => (
                    <option value={contact.id} key={contact.id}>
                      {contact.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Kısa olay özeti</span>
            <textarea
              required
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
            />
          </label>
          <div className="grid-2">
            <label className="field">
              <span>Sorumlu avukat</span>
              <select
                value={form.responsibleLawyerId}
                onChange={(event) => setForm({ ...form, responsibleLawyerId: event.target.value })}
              >
                {store.users
                  .filter((user) => user.role.includes('avukat'))
                  .map((user) => (
                    <option value={user.id} key={user.id}>
                      {user.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              <span>İlk temas</span>
              <input
                required
                value={form.firstContact}
                onChange={(event) => setForm({ ...form, firstContact: event.target.value })}
              />
            </label>
          </div>
          <div className="grid-2">
            <label className="field">
              <span>Mahkeme</span>
              <input placeholder="Boş bırakılabilir" disabled />
              <small>Potansiyel dosyada hata değildir.</small>
            </label>
            <label className="field">
              <span>Esas numarası</span>
              <input placeholder="Boş bırakılabilir" disabled />
              <small>Dava açılınca eklenir; geçmiş korunur.</small>
            </label>
          </div>
          <div className="notice warning">
            Aynı kişi için kayıt adayı bulundu. Sistem otomatik birleştirme yapmaz; kişi kararını
            dosya detayında gösterir.
          </div>
          {feedback.error && (
            <div className="notice danger" role="alert">
              {feedback.error}
            </div>
          )}
        </div>
        <div className="modal__footer">
          <Link className="button secondary" to="/dosyalar">
            Vazgeç
          </Link>
          <button className="button" type="submit">
            Potansiyel olarak oluştur
          </button>
        </div>
      </form>
    </div>
  );
}

type FileTab = 'ozet' | 'zaman' | 'belgeler' | 'gorev' | 'notlar' | 'gizli' | 'finans';

function FileDetailContent({ file }: { file: CaseFile }) {
  const store = useStore();
  const user = currentUser(store);
  const feedback = useActionFeedback();
  const [tab, setTab] = useState<FileTab>('ozet');
  const [deadlineKind, setDeadlineKind] = useState<
    'zamanasimi' | 'hak_dusurucu' | 'vekaletname_bitis'
  >('hak_dusurucu');
  const [dueDate, setDueDate] = useState('2026-11-15');
  const [basis, setBasis] = useState('Avukatın manuel inceleme notu; otomatik hesap değildir.');
  const [caseNumber, setCaseNumber] = useState('2026/501 E. (Kurgu)');
  const [court, setCourt] = useState('İstanbul Kurgu Sulh Hukuk Mahkemesi');
  const client = store.contacts.find((contact) => contact.id === file.clientId);
  const owner = store.users.find((user) => user.id === file.responsibleLawyerId);
  const deadlines = store.deadlines.filter((deadline) => deadline.fileId === file.id);
  const tasks = store.tasks.filter((task) => task.fileId === file.id);
  const documents = store.generatedDocuments.filter((document) => document.fileId === file.id);
  const mayViewPrivateNotes = canViewPrivateNotes(store, user, file.id);
  const privateNotes = selectPrivateNotes(store, user, file.id);
  const tabNames: [FileTab, string][] = [
    ['ozet', 'Özet'],
    ['zaman', 'Zaman çizelgesi'],
    ['belgeler', 'Belgeler'],
    ['gorev', 'Görev / Süre'],
    ['notlar', 'Notlar'],
    ...(mayViewPrivateNotes ? ([['gizli', 'Gizli notlar']] as [FileTab, string][]) : []),
    ['finans', 'Cari'],
  ];
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Dosya · {file.id}</span>
          <h1>{file.name}</h1>
          <p>{file.subject}</p>
        </div>
        <StatusBadge {...statusPresentation(file.status)} />
      </header>
      <div className="grid-3">
        <div className="metric">
          <small>Müvekkil</small>
          <strong>{client?.name}</strong>
        </div>
        <div className="metric">
          <small>Sorumlu</small>
          <strong>{owner?.name}</strong>
        </div>
        <div className="metric">
          <small>Mahkeme / esas</small>
          <strong>
            {file.court ?? 'Henüz yok'}
            <br />
            {file.caseNumber ?? ''}
          </strong>
        </div>
      </div>
      <div className="segmented" role="tablist" aria-label="Dosya bölümleri">
        {tabNames.map(([value, label]) => (
          <button
            className="tab-button"
            type="button"
            role="tab"
            aria-selected={tab === value}
            key={value}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'ozet' && (
        <div className="grid-2">
          <section className="card">
            <span className="eyebrow">Durum özeti</span>
            <h2>
              {file.status === 'potansiyel'
                ? 'Potansiyel — aktif dava değil'
                : 'Aktif dosya bağlamı'}
            </h2>
            <p>{file.notes[0]}</p>
            {file.status === 'potansiyel' && (
              <div className="notice warning">
                Mahkeme/esas alanlarının boş olması hata değildir. Manuel süre girilmezse sistem
                sahte geri sayım üretmez.
              </div>
            )}
          </section>
          <section className="card">
            <span className="eyebrow">Eksik belge listesi</span>
            <h2>Kalıcı hazırlık</h2>
            {file.missingDocuments?.length ? (
              <ul>
                {file.missingDocuments.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">Kayıtlı eksik belge yok.</p>
            )}
          </section>
        </div>
      )}
      {tab === 'zaman' && (
        <section className="card">
          <div className="section-heading">
            <h2>Zaman çizelgesi</h2>
            <Link className="button secondary" to={`/dosyalar/${file.id}/audit`}>
              Tam audit
            </Link>
          </div>
          <div className="timeline">
            {file.timeline.map((item) => (
              <div className="timeline-item" key={item.id}>
                <strong>{item.title}</strong>
                <span className="micro muted"> · {formatDate(item.date, true)}</span>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        </section>
      )}
      {tab === 'belgeler' && (
        <section className="panel">
          <div className="panel-header">
            <h2>Üretilen belgeler</h2>
            <Link className="button secondary" to="/belgeler/yeni">
              + Belge
            </Link>
          </div>
          <div className="panel-body">
            {documents.map((document) => (
              <Link className="list-row" to={`/belgeler/${document.id}`} key={document.id}>
                <span className="contact-avatar">B</span>
                <span className="list-row__main">
                  <h3>{document.name}</h3>
                  <p>{document.versions.length} sürüm · önceki sürümler korunur</p>
                </span>
                <StatusBadge {...statusPresentation(document.status)} />
              </Link>
            ))}
          </div>
        </section>
      )}
      {tab === 'gorev' && (
        <div className="stack">
          <section className="panel">
            <div className="panel-header">
              <h2>Kesin görev ve süreler</h2>
              <span className="count">{tasks.length + deadlines.length}</span>
            </div>
            <div className="panel-body">
              {tasks.map((task) => (
                <div className="list-row" key={task.id}>
                  <span className="contact-avatar">G</span>
                  <span className="list-row__main">
                    <h3>{task.title}</h3>
                    <p>Son: {task.dueDate ?? 'belirlenmedi'} · tamamlanana kadar görünür</p>
                  </span>
                  <StatusBadge label="Açık" tone="info" />
                </div>
              ))}
              {deadlines.map((deadline) => (
                <div className="list-row" key={deadline.id}>
                  <span className="contact-avatar">S</span>
                  <span className="list-row__main">
                    <h3>{deadline.kind.replaceAll('_', ' ')}</h3>
                    <p>
                      {deadline.dueDate} · {deadline.legalBasis} ·{' '}
                      {daysBetween(store.settings.simulatedNow, deadline.dueDate)} gün
                    </p>
                  </span>
                  <StatusBadge
                    label={deadline.manual ? 'Manuel giriş · Teyit' : 'Teyit'}
                    tone="success"
                  />
                </div>
              ))}
            </div>
          </section>
          {file.status === 'potansiyel' && (
            <section className="card stack-sm">
              <span className="eyebrow">Avukat manuel girişi</span>
              <h2>Süre ekle</h2>
              <div className="grid-2">
                <label className="field">
                  <span>Tür</span>
                  <select
                    value={deadlineKind}
                    onChange={(event) => setDeadlineKind(event.target.value as typeof deadlineKind)}
                  >
                    <option value="zamanasimi">Zamanaşımı</option>
                    <option value="hak_dusurucu">Hak düşürücü süre</option>
                    <option value="vekaletname_bitis">Vekaletname bitişi</option>
                  </select>
                </label>
                <label className="field">
                  <span>Son tarih</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    required
                  />
                </label>
              </div>
              <label className="field">
                <span>Dayanak / not</span>
                <textarea
                  value={basis}
                  onChange={(event) => setBasis(event.target.value)}
                  required
                />
              </label>
              <DecisionSurface
                actionLabel="Manuel süreyi kesinleştir"
                disabled={store.settings.offline || !isLawyer(user.role)}
                onApprove={(reason, confirmed) =>
                  feedback.run(
                    () =>
                      store.addManualDeadline(
                        file.id,
                        deadlineKind,
                        dueDate,
                        basis,
                        reason,
                        confirmed,
                      ),
                    'Manuel süre, avukat gerekçesi ve ikinci doğrulamayla audit’e eklendi.',
                  )
                }
              />
            </section>
          )}
        </div>
      )}
      {tab === 'notlar' && (
        <section className="card">
          <h2>Normal notlar</h2>
          <ul>
            {file.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          {!mayViewPrivateNotes && (
            <div className="notice info">
              <p>
                Gizli not sekmesi yalnız dosyaya erişen sorumlu avukata veya yönetici avukata
                gösterilir.
              </p>
              <button
                className="button secondary"
                type="button"
                onClick={() =>
                  feedback.run(
                    () => store.requestPrivateNotes(file.id),
                    'Gizli not erişim talebi içerik göstermeden audit’e yazıldı.',
                  )
                }
              >
                Gizli not erişimi iste
              </button>
            </div>
          )}
        </section>
      )}
      {tab === 'gizli' && mayViewPrivateNotes && (
        <section className="card">
          <div className="section-heading">
            <h2>Gizli notlar</h2>
            <StatusBadge label="Sorumlu / yönetici avukat" tone="pending" />
          </div>
          {privateNotes.map((note) => (
            <div className="notice warning" key={note}>
              {note}
            </div>
          ))}
        </section>
      )}
      {tab === 'finans' && (
        <section className="card">
          <span className="eyebrow">Golden path dışında basit kapsam</span>
          <h2>Cari ve tahsilat</h2>
          <p>
            Vekalet ücreti, karşı yan vekalet ücreti ve müvekkilden alınacak kalemleri ayrı görmek
            için basit fixture yüzeyi.
          </p>
          <Link className="button" to="/finans">
            Cariyi aç
          </Link>
        </section>
      )}
      {file.status === 'potansiyel' && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Alternatif A7</span>
              <h2>Dava açıldı mı?</h2>
            </div>
            <StatusBadge label="Geçmiş korunur" tone="info" />
          </div>
          <div className="panel-body stack-sm">
            <p>
              Dönüşüm otomatik değildir. Aktif dosyaya geçildiğinde başlangıç notları, belgeler,
              süreler ve audit aynı kayıtta kalır.
            </p>
            <div className="grid-2">
              <label className="field">
                <span>Yeni esas numarası</span>
                <input value={caseNumber} onChange={(event) => setCaseNumber(event.target.value)} />
              </label>
              <label className="field">
                <span>Mahkeme</span>
                <input value={court} onChange={(event) => setCourt(event.target.value)} />
              </label>
            </div>
            <button
              className="button"
              type="button"
              disabled={user.role !== 'yonetici_avukat'}
              onClick={() =>
                feedback.run(
                  () => store.convertPotential(file.id, caseNumber, court),
                  'Potansiyel kayıt aktif dosyaya dönüştü; geçmiş korundu.',
                )
              }
            >
              Aktif dosyaya dönüştür
            </button>
          </div>
        </section>
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

export function FileDetailScreen() {
  const store = useStore();
  const { dosyaId = '' } = useParams();
  const user = currentUser(store);
  const file = selectSensitiveCase(store, user, dosyaId);
  const feedback = useActionFeedback();
  if (!file)
    return (
      <UnauthorizedState
        onRequest={() =>
          feedback.run(
            () => store.requestAccess(dosyaId),
            'Yetki talebi audit’e yazıldı; hassas alanlar kapalı kaldı.',
          )
        }
      />
    );
  return <FileDetailContent file={file} />;
}

export function FileAuditScreen() {
  const store = useStore();
  const { dosyaId = '' } = useParams();
  const user = currentUser(store);
  const file = selectSensitiveCase(store, user, dosyaId);
  const relatedIds = useMemo(() => {
    if (!file) return new Set<string>();
    return new Set([
      file.id,
      ...file.incomingDocumentIds,
      ...file.documentIds,
      ...file.taskIds,
      ...file.deadlineIds,
    ]);
  }, [file]);
  if (!file) return <UnauthorizedState onRequest={() => store.requestAccess(dosyaId)} />;
  const entries = selectVisibleAudit(store, user).filter(
    (entry) =>
      relatedIds.has(entry.objectId) ||
      store.candidates.find(
        (candidate) => candidate.id === entry.objectId && candidate.fileId === file.id,
      ),
  );
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Değiştirilemez kayıt defteri</span>
          <h1>{file.name} · Audit</h1>
          <p>
            Onay, ret, düzeltme, sürüm, gönderim ve yetki denemeleri eklenir; mevcut satırlar
            düzenlenmez.
          </p>
        </div>
        <StatusBadge label="Append-only demo" tone="neutral" />
      </header>
      <section className="panel">
        <div className="panel-header">
          <h2>Denetim kayıtları</h2>
          <span className="count">{entries.length}</span>
        </div>
        <AuditTable entries={entries} users={store.users} />
      </section>
      <Link className="button secondary" to={`/dosyalar/${file.id}`}>
        Dosyaya dön
      </Link>
    </div>
  );
}
