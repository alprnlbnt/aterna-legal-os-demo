import { StatusBadge } from '../components/forms/StatusBadge';
import { SuccessToast } from '../components/states/States';
import { useActionFeedback } from '../lib/useActionFeedback';
import { currentUser } from '../store/selectors';
import type { ApprovalLevel } from '../store/types';
import { useStore } from '../store/useStore';

const lockedOperations = ['Süreyi takvime yaz', 'Dış belge gönderimi', 'Feragat'];

export function SettingsScreen() {
  const store = useStore();
  const user = currentUser(store);
  const canManageApprovals = user.role === 'yonetici_avukat';
  const feedback = useActionFeedback();
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Büro profili · Bilinçli gevşetme</span>
          <h1>Ayarlar</h1>
          <p>
            Onay seviyesi işlem tipine göre görünür; sistem hiçbir seviyeyi kendiliğinden gevşetmez.
          </p>
        </div>
        <StatusBadge label="Başlangıç: tek tek onay" tone="pending" />
      </header>
      <section className="grid-2">
        <article className="card">
          <span className="eyebrow">Kurgu büro</span>
          <h2>{store.office.name}</h2>
          <p>{store.office.letterhead}</p>
          <p className="small muted">Dil: {store.office.languageProfile}</p>
        </article>
        <article className="card">
          <span className="eyebrow">Görünüm yoğunluğu</span>
          <h2>Ferah / Sıkı</h2>
          <div className="segmented">
            <button
              className="tab-button"
              type="button"
              aria-pressed={store.settings.density === 'ferah'}
              onClick={() =>
                feedback.run(() => store.setDensity('ferah'), 'Ferah görünüm seçildi.')
              }
            >
              Ferah
            </button>
            <button
              className="tab-button"
              type="button"
              aria-pressed={store.settings.density === 'siki'}
              onClick={() => feedback.run(() => store.setDensity('siki'), 'Sıkı görünüm seçildi.')}
            >
              Sıkı
            </button>
          </div>
        </article>
      </section>
      <section className="stack-sm">
        <div className="section-heading">
          <div>
            <span className="eyebrow">İşlem tipi bazında</span>
            <h2>Onay seviyeleri</h2>
          </div>
          <StatusBadge label="Demo varsayımı" tone="neutral" />
        </div>
        {!canManageApprovals && (
          <div className="notice warning">
            Onay seviyeleri bu persona için salt okunur; yalnız yönetici avukat değiştirebilir.
          </div>
        )}
        <div className="approval-matrix">
          {Object.entries(store.settings.approvalLevels).map(([operation, level]) => {
            const locked = lockedOperations.includes(operation);
            return (
              <div className="approval-row" key={operation}>
                <div>
                  <strong>{operation}</strong>
                  <br />
                  <span className="small muted">
                    {locked ? 'Hiçbir zaman otomatiğe çevrilemez' : 'Büro bilinçli seçim yapabilir'}
                  </span>
                </div>
                <div className="segmented">
                  {(['tek', 'toplu', 'bilgi'] as ApprovalLevel[]).map((value) => (
                    <button
                      className="chip"
                      type="button"
                      key={value}
                      aria-pressed={level === value}
                      disabled={!canManageApprovals || (locked && value !== 'tek')}
                      onClick={() =>
                        feedback.run(
                          () => store.setApprovalLevel(operation, value),
                          `${operation} seviyesi ${value} olarak kaydedildi.`,
                        )
                      }
                    >
                      {value === 'tek'
                        ? 'Tek tek onay'
                        : value === 'toplu'
                          ? 'Toplu onay'
                          : 'Bilgilendirme'}
                    </button>
                  ))}
                </div>
                {locked ? (
                  <span className="locked">🔒 Kilitli</span>
                ) : (
                  <span className="locked">Bilinçli ayar</span>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <section className="card">
        <span className="eyebrow">Kırmızı çizgiler</span>
        <h2>Değiştirilemez ürün sınırları</h2>
        <div className="grid-2">
          <div className="notice warning">Sistem UYAP’a belge yüklemez ve ödeme yapmaz.</div>
          <div className="notice warning">Her dış belge en az bir avukat onayı ister.</div>
          <div className="notice warning">Feragat için dijital onay yeterli sayılmaz.</div>
          <div className="notice warning">
            İçtihat tam metin ve yetkili doğrulama olmadan dış belgeye girmez.
          </div>
        </div>
      </section>
      {feedback.error && (
        <div className="notice danger" role="alert">
          {feedback.error}
        </div>
      )}
      {feedback.message && <SuccessToast message={feedback.message} />}
    </div>
  );
}
