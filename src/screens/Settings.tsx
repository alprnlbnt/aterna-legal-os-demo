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
      <section className="grid-2">
        <article className="card stack-sm">
          <span className="eyebrow">Token tabanlı görünüm</span>
          <h2>Tema</h2>
          <div className="segmented" aria-label="Tema seçimi">
            {(
              [
                ['light', 'Açık'],
                ['dark', 'Koyu'],
              ] as const
            ).map(([value, label]) => (
              <button
                className="chip"
                type="button"
                key={value}
                aria-pressed={store.settings.theme === value}
                onClick={() => feedback.run(() => store.setTheme(value), `${label} tema seçildi.`)}
              >
                {label}
              </button>
            ))}
          </div>
        </article>
        <article className="card stack-sm">
          <span className="eyebrow">Kişisel yerel tercih</span>
          <h2>Bildirim ve hatırlatma</h2>
          <fieldset className="stack-sm">
            <legend className="field-label">Görev hatırlatması</legend>
            <div className="chip-row">
              {[1, 3, 7].map((day) => {
                const selected =
                  store.settings.notificationPrefs.taskReminderLeadDays.includes(day);
                return (
                  <button
                    className="chip"
                    type="button"
                    key={day}
                    aria-pressed={selected}
                    onClick={() =>
                      feedback.run(
                        () =>
                          store.setNotificationPrefs({
                            taskReminderLeadDays: selected
                              ? store.settings.notificationPrefs.taskReminderLeadDays.filter(
                                  (value) => value !== day,
                                )
                              : [
                                  ...store.settings.notificationPrefs.taskReminderLeadDays,
                                  day,
                                ].sort((left, right) => left - right),
                          }),
                        'Görev hatırlatma tercihi kaydedildi.',
                      )
                    }
                  >
                    {day} gün önce
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset className="stack-sm">
            <legend className="field-label">Duruşma hatırlatması</legend>
            <div className="chip-row">
              {[1, 3, 7].map((day) => {
                const selected =
                  store.settings.notificationPrefs.hearingReminderLeadDays.includes(day);
                return (
                  <button
                    className="chip"
                    type="button"
                    key={day}
                    aria-pressed={selected}
                    onClick={() =>
                      feedback.run(
                        () =>
                          store.setNotificationPrefs({
                            hearingReminderLeadDays: selected
                              ? store.settings.notificationPrefs.hearingReminderLeadDays.filter(
                                  (value) => value !== day,
                                )
                              : [
                                  ...store.settings.notificationPrefs.hearingReminderLeadDays,
                                  day,
                                ].sort((left, right) => left - right),
                          }),
                        'Duruşma hatırlatma tercihi kaydedildi.',
                      )
                    }
                  >
                    {day} gün önce
                  </button>
                );
              })}
            </div>
          </fieldset>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={store.settings.notificationPrefs.muted}
              onChange={(event) =>
                feedback.run(
                  () => store.setNotificationPrefs({ muted: event.target.checked }),
                  event.target.checked
                    ? 'Sessiz bildirim tercihi açıldı.'
                    : 'Sessiz bildirim tercihi kapandı.',
                )
              }
            />
            <span>Sessiz bildirimleri kullan</span>
          </label>
          <div className="chip-row" aria-label="Devre dışı gerçek kanallar">
            <button className="chip" type="button" disabled>
              E-posta kapalı
            </button>
            <button className="chip" type="button" disabled>
              SMS kapalı
            </button>
          </div>
          <p className="small muted">
            Demo — gerçek gönderim yok; kilit ekranı içeriği her zaman güvenli ve içeriksizdir.
          </p>
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
