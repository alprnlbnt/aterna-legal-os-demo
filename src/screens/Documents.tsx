import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DecisionSurface } from '../components/approval/DecisionSurface';
import { VersionDiff } from '../components/diff/VersionDiff';
import { DemoAssumption, SourceLabel } from '../components/forms/SourceLabel';
import { StatusBadge, statusPresentation } from '../components/forms/StatusBadge';
import { SuccessToast, UnauthorizedState } from '../components/states/States';
import { formatDate } from '../lib/format';
import { useActionFeedback } from '../lib/useActionFeedback';
import { canAccessFile } from '../store/invariants';
import { currentUser } from '../store/selectors';
import type { GeneratedDocument } from '../store/types';
import { useStore } from '../store/useStore';

const documentTypeLabel: Record<GeneratedDocument['kind'], string> = {
  teklif: 'Müvekkile Teklif Formu',
  sozlesme: 'Avukatlık Hizmet Sözleşmesi',
  dava_hazirlik: 'Dava Hazırlık Raporu',
};

export function DocumentsScreen() {
  const store = useStore();
  const user = currentUser(store);
  const visible = store.generatedDocuments.filter((document) =>
    canAccessFile(user, document.fileId),
  );
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Teklif · Sözleşme · Hazırlık raporu</span>
          <h1>Belgeler</h1>
          <p>Kaynak etiketi, sürüm geçmişi, kritik fark ve iki ayrı onay kapısı aynı yüzeyde.</p>
        </div>
        <Link className="button" to="/belgeler/yeni">
          + Yeni belge
        </Link>
      </header>
      <div className="notice info">
        Büro profili: <strong>{store.office.letterhead}</strong> · Dil:{' '}
        {store.office.languageProfile}
      </div>
      <section className="panel">
        <div className="panel-header">
          <h2>Belge karar kuyruğu</h2>
          <span className="count">{visible.length}</span>
        </div>
        <div className="panel-body">
          {visible.map((document) => {
            const status = statusPresentation(document.status);
            const latest = document.versions.at(-1);
            const critical = latest?.differences?.filter((item) => item.critical).length ?? 0;
            return (
              <Link className="list-row" key={document.id} to={`/belgeler/${document.id}`}>
                <span className="contact-avatar">B</span>
                <span className="list-row__main">
                  <div className="inline-actions">
                    <h3>{document.name}</h3>
                    <StatusBadge label={status.label} tone={status.tone} />
                    {critical > 0 && (
                      <StatusBadge label={`${critical} kritik fark`} tone="danger" />
                    )}
                  </div>
                  <p>
                    {documentTypeLabel[document.kind]} · Sürüm {latest?.number} ·{' '}
                    {latest ? formatDate(latest.createdAt, true) : ''}
                  </p>
                </span>
                <span aria-hidden="true">›</span>
              </Link>
            );
          })}
        </div>
      </section>
      <div className="grid-3">
        <div className="card">
          <span className="eyebrow">1 · İçerik</span>
          <h3>Kaynağı ayır</h3>
          <p className="small muted">Kullanıcı, şablon ve AI katkısı ayrı görünür.</p>
        </div>
        <div className="card">
          <span className="eyebrow">2 · İç onay</span>
          <h3>Avukat kararı</h3>
          <p className="small muted">Kritik fark önceki onayı geçersiz kılar.</p>
        </div>
        <div className="card">
          <span className="eyebrow">3 · Dış kapı</span>
          <h3>Ayrı gönderim</h3>
          <p className="small muted">Gönderime hazır ≠ gönderildi.</p>
        </div>
      </div>
    </div>
  );
}

export function NewDocumentScreen() {
  const store = useStore();
  const user = currentUser(store);
  const navigate = useNavigate();
  const feedback = useActionFeedback();
  const files = store.files.filter(
    (file) => file.status !== 'kapali' && canAccessFile(user, file.id),
  );
  const [kind, setKind] = useState<GeneratedDocument['kind']>('teklif');
  const [fileId, setFileId] = useState(files[0]?.id ?? '');
  const [template, setTemplate] = useState(store.office.templates[0]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const id = feedback.run(
      () => store.createGeneratedDocument(kind, fileId, template),
      'Belge Sürüm 1 olarak oluşturuldu; eksik rakam uydurulmadı.',
    );
    if (id) navigate(`/belgeler/${id}`);
  };
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Yeni belge · Sürüm 1</span>
          <h1>Tür ve şablon seç</h1>
          <p>Üç belge türü ayrı kalır; ilk taslak eski bir sürümün üzerine yazmaz.</p>
        </div>
        <DemoAssumption>Yerel şablon fixture’ları</DemoAssumption>
      </header>
      <form className="panel" onSubmit={submit}>
        <div className="panel-body stack">
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="eyebrow">Belge türü</legend>
            <div className="grid-3">
              {(Object.entries(documentTypeLabel) as [GeneratedDocument['kind'], string][]).map(
                ([value, label]) => (
                  <label className="radio-row card" key={value}>
                    <input
                      aria-label={label}
                      type="radio"
                      name="document-kind"
                      value={value}
                      checked={kind === value}
                      onChange={() => setKind(value)}
                    />
                    <span>
                      <strong>{label}</strong>
                      <br />
                      <span className="small muted">Ayrı durum ve onay geçmişi</span>
                    </span>
                  </label>
                ),
              )}
            </div>
          </fieldset>
          <div className="grid-2">
            <label className="field">
              <span>İlgili dosya</span>
              <select required value={fileId} onChange={(event) => setFileId(event.target.value)}>
                {files.map((file) => (
                  <option value={file.id} key={file.id}>
                    {file.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Büro şablonu</span>
              <select value={template} onChange={(event) => setTemplate(event.target.value)}>
                {store.office.templates.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="notice warning">
            Ücret ve masraf bilgisi boş başlayacak. AI rakam üretmeyecek; eksik bilgi tamamlanana
            kadar dış gönderim kilitli kalacak.
          </div>
        </div>
        <div className="modal__footer">
          <Link className="button secondary" to="/belgeler">
            Vazgeç
          </Link>
          <button className="button" type="submit" disabled={!fileId}>
            Yerel taslağı oluştur
          </button>
        </div>
      </form>
    </div>
  );
}

type DocumentTab = 'icerik' | 'fark' | 'surumler';

export function DocumentDetailScreen() {
  const store = useStore();
  const { belgeId = '' } = useParams();
  const document = store.generatedDocuments.find((item) => item.id === belgeId);
  const user = currentUser(store);
  const feedback = useActionFeedback();
  const [tab, setTab] = useState<DocumentTab>('icerik');
  const [fee, setFee] = useState('45.000 TL + KDV');
  if (!document)
    return (
      <div className="state-block">
        <div>
          <h1>Belge bulunamadı</h1>
          <Link className="button" to="/belgeler">
            Belgelere dön
          </Link>
        </div>
      </div>
    );
  if (!canAccessFile(user, document.fileId))
    return <UnauthorizedState onRequest={() => store.requestAccess(document.fileId)} />;
  const file = store.files.find((item) => item.id === document.fileId);
  const latest = document.versions.at(-1);
  const differences = latest?.differences ?? [];
  const status = statusPresentation(document.status);
  const manager = user.role === 'yonetici_avukat';
  const finalLocked = store.settings.offline || !manager;
  const addRevision = () => {
    if (!latest) return;
    feedback.run(
      () =>
        store.addDocumentVersion(document.id, {
          number: latest.number + 1,
          createdAt: store.settings.simulatedNow,
          sourceDescription: 'Müvekkilden gelen sentetik revizyon · yerel fixture',
          fields: latest.fields.map((field) => ({
            ...field,
            value: field.label === 'Fesih' ? 'Yazılı bildirimle 7 gün' : field.value,
          })),
          differences: [
            {
              clause: 'Fesih',
              kind: 'degisti',
              previous: 'Yazılı bildirimle 15 gün',
              next: 'Yazılı bildirimle 7 gün',
              critical: true,
            },
          ],
        }),
      'Müvekkil revizyonu yeni sürüm olarak eklendi; önceki onay geçersizleşti.',
    );
    setTab('fark');
  };
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            {documentTypeLabel[document.kind]} · Sürüm {latest?.number}
          </span>
          <h1>{document.name}</h1>
          <p>
            {file?.name} · {latest?.sourceDescription}
          </p>
        </div>
        <div className="inline-actions">
          <StatusBadge label={status.label} tone={status.tone} />
          {differences.some((item) => item.critical) && (
            <StatusBadge label="Kritik fark · yeniden onay" tone="danger" />
          )}
        </div>
      </header>
      <div className="notice info">
        <strong>{store.office.letterhead}</strong> · Şablon ve dil profili yerel büro fixture’ından
        gelir. Yasaklı ifadeler: {store.office.prohibitedWords.join(', ')}.
      </div>
      <div className="segmented" role="tablist" aria-label="Belge görünümü">
        <button
          className="tab-button"
          type="button"
          role="tab"
          aria-selected={tab === 'icerik'}
          onClick={() => setTab('icerik')}
        >
          İçerik
        </button>
        <button
          className="tab-button"
          type="button"
          role="tab"
          aria-selected={tab === 'fark'}
          onClick={() => setTab('fark')}
        >
          Farklar ({differences.length})
        </button>
        <button
          className="tab-button"
          type="button"
          role="tab"
          aria-selected={tab === 'surumler'}
          onClick={() => setTab('surumler')}
        >
          Sürümler ({document.versions.length})
        </button>
      </div>
      {tab === 'icerik' && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Karar yüzeyi · metin editörü değil</span>
              <h2>Belge alanları</h2>
            </div>
            <StatusBadge label="Kaynaklar görünür" tone="info" />
          </div>
          <div className="panel-body stack-sm">
            {latest?.fields.map((field) => (
              <article className={field.source === 'ai' ? 'ai-strip' : 'card'} key={field.label}>
                <div className="section-heading">
                  <strong>{field.label}</strong>
                  <span
                    className={`status-badge ${field.source === 'ai' ? 'candidate' : field.source === 'sablon' ? 'neutral' : 'info'}`}
                  >
                    {field.source === 'ai'
                      ? 'AI taslağı'
                      : field.source === 'sablon'
                        ? 'Şablon metni'
                        : 'Kullanıcı girdisi'}
                    {field.critical ? ' · Kritik' : ''}
                  </span>
                </div>
                <p>{field.value ?? 'Bilgi eksik — sistem rakam veya koşul uydurmadı.'}</p>
              </article>
            ))}
          </div>
        </section>
      )}
      {tab === 'fark' && <VersionDiff differences={differences} />}
      {tab === 'surumler' && (
        <section className="panel">
          <div className="panel-body">
            <div className="timeline">
              {[...document.versions].reverse().map((version) => (
                <div className="timeline-item" key={version.number}>
                  <strong>Sürüm {version.number}</strong>
                  <span className="micro muted"> · {formatDate(version.createdAt, true)}</span>
                  <p>{version.sourceDescription}. Önceki sürüm silinmedi.</p>
                </div>
              ))}
            </div>
            <button className="button secondary" type="button" onClick={addRevision}>
              Müvekkil revizyonunu yeni sürüm ekle
            </button>
          </div>
        </section>
      )}
      {document.status === 'eksik_bilgi' && (
        <section className="human-decision stack-sm">
          <span className="eyebrow">İnsan girdisi gerekli</span>
          <h2>Eksik ücreti tamamla</h2>
          <label className="field">
            <span>Ücret / masraf</span>
            <input value={fee} onChange={(event) => setFee(event.target.value)} />
            <small>Bu rakam kullanıcı girdisi etiketiyle kaydedilir.</small>
          </label>
          <button
            className="button"
            type="button"
            onClick={() =>
              feedback.run(
                () => store.completeDocumentInformation(document.id, fee),
                'Eksik bilgi kullanıcı girdisiyle tamamlandı; belge hâlâ dışarı gönderilmedi.',
              )
            }
          >
            Bilgiyi tamamla
          </button>
          <div className="notice warning">
            Eksik bilgi varken iç onay ve dış gönderim kilitlidir.
          </div>
        </section>
      )}
      {document.status === 'taslak' && (
        <section className="human-decision">
          <span className="eyebrow">İnsan kararı · İlk kapı</span>
          <h2>İç onaya gönder</h2>
          <p>Belge sorumlu/yönetici avukat kuyruğuna düşer. Bu işlem dış gönderim değildir.</p>
          <button
            className="button"
            type="button"
            onClick={() =>
              feedback.run(
                () => store.submitDocumentForApproval(document.id),
                'Belge iç onay kuyruğuna alındı.',
              )
            }
          >
            İç onaya gönder
          </button>
        </section>
      )}
      {document.status === 'ic_onay_bekliyor' && (
        <DecisionSurface
          actionLabel="İç onayı ver · gönderime hazırla"
          disabled={finalLocked}
          onApprove={(reason, confirmed) =>
            feedback.run(
              () => store.approveDocumentInternally(document.id, reason, confirmed),
              'İç onay tamamlandı; belge yalnız gönderime hazır, gönderilmedi.',
            )
          }
        />
      )}
      {document.status === 'gonderime_hazir' && (
        <>
          <div className="notice success">
            <strong>İç onay tamam.</strong>&nbsp;Belge gönderime hazır; hiçbir kanala henüz
            gönderilmedi.
          </div>
          <DecisionSurface
            actionLabel="Dış gönderimi ayrıca onayla"
            disabled={finalLocked}
            onApprove={(reason, confirmed) =>
              feedback.run(
                () => store.sendDocumentExternally(document.id, reason, confirmed),
                'Dış gönderim yalnız demo durumu olarak kaydedildi; gerçek istek yapılmadı.',
              )
            }
          />
        </>
      )}
      {document.status === 'gonderildi' && (
        <div className="notice success">
          <strong>Gönderildi durumu.</strong>&nbsp;Bu yalnız yerel store değişimidir; gerçek kişi,
          kanal veya servise veri gitmedi. <SourceLabel>Audit · {document.sentAt}</SourceLabel>
        </div>
      )}
      <div className="inline-actions">
        <button className="button secondary" type="button" onClick={addRevision}>
          Yeni sürüm olarak ekle
        </button>
        <Link className="button quiet" to={`/dosyalar/${document.fileId}/audit`}>
          Audit geçmişi
        </Link>
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
