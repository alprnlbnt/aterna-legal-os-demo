import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { formatDate } from '../../lib/format';
import { currentUser, selectVisibleAudit, selectVisibleNotifications } from '../../store/selectors';
import { roleLabel, useStore } from '../../store/useStore';
import { CommandBar } from '../command/CommandBar';
import { Icon } from '../forms/Icon';
import { Dialog } from '../overlays/Dialog';
import { OfflineBanner } from '../states/States';
import styles from './AppShell.module.css';

const navItems: {
  to: string;
  label: string;
  icon: Parameters<typeof Icon>[0]['name'];
  managerOnly?: boolean;
}[] = [
  { to: '/bugun', label: 'Bugün', icon: 'home' as const },
  { to: '/gelen', label: 'Gelen Kutusu', icon: 'inbox' as const },
  { to: '/dosyalar', label: 'Dosyalar', icon: 'files' as const },
  { to: '/gorevler', label: 'Görevler & Onay', icon: 'tasks' as const },
  { to: '/takvim', label: 'Takvim', icon: 'calendar' as const },
  { to: '/belgeler', label: 'Belgeler', icon: 'document' as const },
  { to: '/durusmalar', label: 'Duruşmalar', icon: 'hearing' as const },
  { to: '/kisiler', label: 'Kişiler', icon: 'contacts' as const },
  { to: '/finans', label: 'Finans', icon: 'finance' },
  { to: '/denetim', label: 'Denetim', icon: 'lock', managerOnly: true },
  { to: '/ayarlar', label: 'Ayarlar', icon: 'settings' as const },
  { to: '/demo', label: 'Demo Kontrolü', icon: 'demo' as const },
];

const titles: Record<string, string> = {
  bugun: 'Bugün',
  gelen: 'Gelen Kutusu',
  dosyalar: 'Dosyalar',
  gorevler: 'Görevler & Onay',
  takvim: 'Takvim',
  belgeler: 'Belgeler',
  durusmalar: 'Duruşmalar',
  kisiler: 'Kişiler',
  finans: 'Finans',
  denetim: 'Denetim',
  kullanicilar: 'Persona Yönetimi',
  ayarlar: 'Ayarlar',
  demo: 'Demo Kontrolü',
};

const contextByPath: Record<string, { title: string; text: string; rule: string }> = {
  gelen: {
    title: 'Karar, görüntüleme değil',
    text: 'Orijinal, OCR, bağlam ve eşleşme dayanağı aynı inceleme akışında görünür.',
    rule: 'Birden çok adayda varsayılan seçim yok; OCR orijinalin üzerine yazılmaz.',
  },
  gorevler: {
    title: 'Süre sorumluluğu',
    text: 'Öneri; kaynak pasajı, olay tarihi ve hesap açıklamasıyla değerlendirilir.',
    rule: 'Avukat gerekçesi ve ikinci doğrulama olmadan kesin takvim kaydı oluşmaz.',
  },
  belgeler: {
    title: 'İki ayrı kapı',
    text: 'Belge sürümü ve kritik farklar önce iç onaya gider.',
    rule: 'Gönderime hazır, gönderildi demek değildir. Dış gönderim ayrı karardır.',
  },
  durusmalar: {
    title: 'Kaynaklı hazırlık',
    text: 'Hazırlık özeti ve sesli nottan çıkan adaylar kaynaklarına bağlı kalır.',
    rule: 'Ses içindeki “sil/onayla/gönder” ifadeleri hiçbir eylemi tetiklemez.',
  },
  finans: {
    title: 'Onaylı ve sentetik',
    text: 'Pano ve rapor yalnız erişilebilen dosyalardaki onaylı fixture hareketlerinden türetilir.',
    rule: 'Ödeme yapılmaz; taslak hareketler finans özetine katılmaz.',
  },
  denetim: {
    title: 'Append-only görünürlük',
    text: 'Yönetici filtreleyebilir ve sayfalayabilir; denetim kayıtları değiştirilemez.',
    rule: 'Reddedilen hedefler kisitli-hedef olarak maskeli kalır.',
  },
  kullanicilar: {
    title: 'Yalnız sentetik persona',
    text: 'Rol ve aktiflik davranışı yerel fixture üzerinde simüle edilir.',
    rule: 'Şifre, oturum, token veya gerçek kimlik doğrulama yoktur.',
  },
  default: {
    title: 'Operate / Monitor',
    text: 'Önceliği tara, tek eylemle karar yüzeyine git ve sonucu audit kaydında gör.',
    rule: 'AI önerisi mor; insan kararı teal. Sistem avukatın yerine karar vermez.',
  },
};

export function AppShell({ children }: { children: ReactNode }) {
  const store = useStore();
  const user = currentUser(store);
  const location = useLocation();
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const section = location.pathname.split('/').filter(Boolean)[0] ?? 'bugun';
  const pageTitle = titles[section] ?? 'Aterna';
  const context = contextByPath[section] ?? contextByPath.default;
  const visibleNotifications = selectVisibleNotifications(store, user);
  const unreadCount = visibleNotifications.filter((item) => !item.read).length;
  const visibleNavItems = navItems.filter(
    (item) => !item.managerOnly || user.role === 'yonetici_avukat',
  );
  const recentAudit = useMemo(
    () => [...selectVisibleAudit(store, user)].slice(-3).reverse(),
    [store, user],
  );

  useEffect(() => {
    document.body.dataset.density = store.settings.density;
  }, [store.settings.density]);
  useEffect(() => {
    document.documentElement.dataset.theme = store.settings.theme;
  }, [store.settings.theme]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setMoreOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase('tr-TR') === 'k') {
        event.preventDefault();
        setMoreOpen(false);
        setNotificationsOpen(false);
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  return (
    <div className={styles.shell}>
      <div className={styles.demoBand}>
        <span className={styles.demoBandDesktop}>
          Sentetik demo · gerçek entegrasyon yok · tüm veriler kurgu
        </span>
        <span className={styles.demoBandMobile}>Sentetik demo · Veriler kurgu</span>
      </div>
      {store.settings.offline && (
        <OfflineBanner lastSync={formatDate(store.settings.lastSyncAt, true)} />
      )}
      <div className={styles.grid}>
        <aside className={styles.rail} aria-label="Ana navigasyon">
          <NavLink to="/bugun" className={styles.brand} aria-label="Aterna Bugün">
            <span className={styles.brandMark}>A</span>
            <span className={styles.brandText}>
              <strong>Aterna</strong>
              <span>Legal OS · Demo</span>
            </span>
          </NavLink>
          <nav className={styles.nav}>
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
              >
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className={styles.railFooter}>
            <span className="status-badge neutral">v1.0 · Yerel fixture</span>
            <p>
              Bu demo davranış ve akış örneğidir; production mimarisi veya güvenlik modeli değildir.
            </p>
          </div>
        </aside>
        <section className={styles.center}>
          <header className={styles.topbar}>
            <div className={styles.topbarTitle}>
              <span>{formatDate(store.settings.simulatedNow)}</span>
              <strong>{pageTitle}</strong>
            </div>
            <div className={styles.topbarActions}>
              <button
                className={styles.searchButton}
                type="button"
                onClick={() => setCommandOpen(true)}
                aria-label="Komut çubuğunu aç"
              >
                <span>
                  <Icon name="search" size={17} />
                  <span>Ekran veya eylem ara</span>
                </span>
                <kbd>⌘ K</kbd>
              </button>
              <button
                className="icon-button"
                style={{ position: 'relative' }}
                type="button"
                onClick={() => setNotificationsOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={notificationsOpen}
                aria-label={`${unreadCount} okunmamış güvenli bildirim`}
              >
                <Icon name="bell" size={18} />
                {unreadCount > 0 && <span className={styles.badgeDot}>{unreadCount}</span>}
              </button>
              <NavLink
                to="/demo"
                className={styles.profileButton}
                aria-label={`Persona: ${user.name}, ${roleLabel[user.role]}`}
              >
                <span className={styles.avatar}>{user.shortName}</span>
                <span>{user.name}</span>
              </NavLink>
            </div>
          </header>
          <main id="main-content" className={styles.content}>
            {children}
          </main>
        </section>
        <aside className={styles.context} aria-label="Bağlam ve karar açıklaması">
          <span className="eyebrow">Bu ekranda ne oluyor?</span>
          <h2>{context.title}</h2>
          <p>{context.text}</p>
          <div className={styles.contextRule}>
            <strong>Değişmez kural</strong>
            <br />
            {context.rule}
          </div>
          <span className="eyebrow">Son audit hareketleri</span>
          <div className={styles.auditMini}>
            {recentAudit.map((entry) => (
              <div className={styles.auditMiniItem} key={entry.id}>
                <strong>{entry.action}</strong>
                <span>
                  {entry.objectId} · {formatDate(entry.time, true)}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
      <nav className={styles.bottomNav} aria-label="Mobil ana navigasyon">
        {visibleNavItems.slice(0, 4).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `${styles.bottomLink} ${isActive ? styles.active : ''}`}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label.replace(' & Onay', '')}</span>
          </NavLink>
        ))}
        <button
          className={`${styles.bottomLink} ${!visibleNavItems.slice(0, 4).some((item) => location.pathname.startsWith(item.to)) ? styles.active : ''}`}
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
        >
          <Icon name="more" size={22} />
          <span>Daha</span>
        </button>
      </nav>
      <Dialog
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        backdropClassName={styles.moreSheet}
        contentClassName={styles.moreSheetContent}
        label="Daha fazla alan"
      >
        <div className="section-heading">
          <h2>Daha</h2>
          <button
            className="button quiet"
            type="button"
            data-autofocus
            onClick={() => setMoreOpen(false)}
          >
            Kapat
          </button>
        </div>
        <div className={styles.moreGrid}>
          {visibleNavItems.slice(4).map((item) => (
            <NavLink className={styles.moreLink} key={item.to} to={item.to}>
              <Icon name={item.icon} size={21} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </Dialog>
      <CommandBar open={commandOpen} onClose={() => setCommandOpen(false)} />
      <Dialog
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        labelledBy="notification-title"
      >
        <div className="modal__header">
          <div>
            <span className="eyebrow">İçeriksiz ve güvenli</span>
            <h2 id="notification-title">Bildirimler</h2>
          </div>
          <button
            className="button quiet"
            type="button"
            data-autofocus
            onClick={() => setNotificationsOpen(false)}
          >
            Kapat
          </button>
        </div>
        <div className="modal__body">
          <div className="notice info">
            Kilit ekranında müvekkil, mahkeme, belge veya tutar gösterilmez. Ayrıntı yalnız yetki
            kontrolünden sonra açılır.
          </div>
          {visibleNotifications.map((notification) => (
            <button
              className="command-item"
              type="button"
              key={notification.id}
              onClick={() => store.markNotificationRead(notification.id)}
            >
              <span>
                <strong>{notification.safeTitle}</strong>
                <br />
                <span className="micro muted">
                  {notification.time} · {notification.kind}
                </span>
              </span>
              <span>{notification.read ? 'Okundu' : 'Okundu işaretle'}</span>
            </button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
