import { useNavigate } from 'react-router-dom';
import { DemoAssumption } from '../components/forms/SourceLabel';
import { StatusBadge } from '../components/forms/StatusBadge';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  OfflineBanner,
  UnauthorizedState,
} from '../components/states/States';
import { formatDate } from '../lib/format';
import { useActionFeedback } from '../lib/useActionFeedback';
import { roleLabel, useStore } from '../store/useStore';

export function DemoPanelScreen() {
  const store = useStore();
  const navigate = useNavigate();
  const feedback = useActionFeedback();
  const reset = () => {
    if (!window.confirm('Tüm yerel demo değişiklikleri silinip başlangıç fixture’ına dönülsün mü?'))
      return;
    store.resetDemo();
    navigate('/bugun');
  };
  const startTour = () => {
    store.setTour(true, 0);
    navigate('/bugun');
  };
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Persona · Offline · Saat · Reset · Tur</span>
          <h1>Demo kontrol paneli</h1>
          <p>
            Tüm durumlar yerel store ve localStorage üzerinde deterministik olarak simüle edilir.
          </p>
        </div>
        <StatusBadge label="Gerçek entegrasyon yok" tone="neutral" />
      </header>
      <div className="demo-control-grid">
        <section className="card stack-sm">
          <span className="eyebrow">Persona ve yetki</span>
          <h2>Rol değiştir</h2>
          <label className="field">
            <span>Aktif persona</span>
            <select
              value={store.settings.personaId}
              disabled={store.settings.offline}
              onChange={(event) =>
                feedback.run(
                  () => store.setPersona(event.target.value),
                  'Persona değişti; dosya yetkileri yeni role göre yeniden uygulanıyor.',
                )
              }
            >
              {store.users.map((user) => (
                <option value={user.id} key={user.id}>
                  {user.name} · {roleLabel[user.role]}
                </option>
              ))}
            </select>
          </label>
          {store.settings.offline && (
            <div className="notice warning">Çevrimdışıyken rol değişikliği kilitli.</div>
          )}
          <p className="small muted">
            Stajyer Ada ile 2024/118 dosyasını açarak hassas alan maskelemesini deneyin.
          </p>
        </section>
        <section className="card stack-sm">
          <span className="eyebrow">Bağlantı simülasyonu</span>
          <h2>{store.settings.offline ? 'Çevrimdışı' : 'Çevrimiçi (yerel)'}</h2>
          <p>Son güvenli senkronizasyon: {formatDate(store.settings.lastSyncAt, true)}</p>
          <button
            className={`button ${store.settings.offline ? '' : 'secondary'}`}
            type="button"
            onClick={() =>
              feedback.run(
                store.toggleOffline,
                store.settings.offline
                  ? 'Çevrimdışı simülasyonu kapandı.'
                  : 'Çevrimdışı simülasyonu açıldı; final eylemler kilitlendi.',
              )
            }
          >
            {store.settings.offline ? 'Bağlantıyı geri getir' : 'Çevrimdışı yap'}
          </button>
        </section>
        <section className="card stack-sm">
          <span className="eyebrow">Süre yaklaşımı / eskalasyon</span>
          <h2>Simüle saat</h2>
          <p className="serif">{formatDate(store.settings.simulatedNow, true)}</p>
          <div className="inline-actions">
            <button
              className="button secondary"
              type="button"
              onClick={() =>
                feedback.run(
                  () => store.advanceTime(6),
                  'Saat 6 saat ilerledi; yaklaşan işler yeniden sıralandı.',
                )
              }
            >
              +6 saat
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() =>
                feedback.run(
                  () => store.advanceTime(24),
                  'Saat 1 gün ilerledi; eskalasyon rozeti simüle edildi.',
                )
              }
            >
              +1 gün
            </button>
          </div>
          <DemoAssumption>Bildirim eşikleri 7 / 3 / 1 gün</DemoAssumption>
        </section>
        <section className="card stack-sm">
          <span className="eyebrow">Golden path</span>
          <h2>Rehberli tur</h2>
          <p>Yeni evrak → OCR/eşleşme → süre onayı → takvim → belge → sesli not.</p>
          <button className="button" type="button" onClick={startTour}>
            Rehberli turu başlat
          </button>
        </section>
      </div>
      <section className="card stack-sm">
        <span className="eyebrow">Tüm rotalarda durum kataloğu</span>
        <h2>Ekran durumunu simüle et</h2>
        <div className="chip-row">
          {(['default', 'loading', 'empty', 'error'] as const).map((state) => (
            <button
              className="chip"
              type="button"
              aria-pressed={store.settings.screenState === state}
              key={state}
              onClick={() =>
                feedback.run(() => store.setScreenState(state), `${state} ekran durumu seçildi.`)
              }
            >
              {state === 'default'
                ? 'Varsayılan'
                : state === 'loading'
                  ? 'Yükleniyor'
                  : state === 'empty'
                    ? 'Boş'
                    : 'Hata'}
            </button>
          ))}
        </div>
        <p className="small muted">
          Seçim Demo panelini kapatmaz. Başka bir rotaya geçerek yeniden kullanılabilir Loading /
          Empty / Error bileşenini görün.
        </p>
      </section>
      <section className="stack-sm">
        <div className="section-heading">
          <h2>Durum bileşeni kataloğu</h2>
          <StatusBadge label="7 kanonik durum" tone="info" />
        </div>
        <div className="grid-2">
          <LoadingState label="İskelet, sahte sayı yok" />
          <EmptyState />
          <ErrorState />
          <UnauthorizedState />
          <div className="card">
            <OfflineBanner lastSync="3 Eyl 2026 08:12" />
          </div>
          <div className="notice success">
            Başarı · Kalıcı durum karta yazılır, kısa teyit kaybolur.
          </div>
        </div>
      </section>
      <section className="card stack-sm">
        <span className="eyebrow">Geri alınamaz demo temizliği</span>
        <h2>Başlangıç fixture’ına dön</h2>
        <p>
          <code>aterna-demo-state</code> localStorage kaydı temizlenir; tüm sentetik kararlar,
          eklenen dosyalar ve audit olayları seed’e döner.
        </p>
        <button className="button danger" type="button" onClick={reset}>
          Demoyu sıfırla
        </button>
      </section>
      {feedback.error && (
        <div className="notice danger" role="alert">
          {feedback.error}
        </div>
      )}
    </div>
  );
}
