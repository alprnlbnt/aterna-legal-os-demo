import type { ReactNode } from 'react';
import { Icon } from '../forms/Icon';

export function LoadingState({ label = 'Veriler hazırlanıyor' }: { label?: string }) {
  return (
    <div className="state-block" aria-live="polite" aria-busy="true">
      <div className="state-block__content stack-sm">
        <span className="eyebrow">Yerel fixture yükleniyor</span>
        <div className="skeleton wide" />
        <div className="skeleton medium" />
        <div className="skeleton short" />
        <span className="muted small">{label}</span>
      </div>
    </div>
  );
}

export function EmptyState({
  title = 'Bu bölümde iş yok',
  description = 'Yeni kayıt ekleyebilir veya başka bir filtre seçebilirsin.',
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="state-block">
      <div className="state-block__content">
        <Icon name="check" size={26} />
        <h2>{title}</h2>
        <p>{description}</p>
        {action}
      </div>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="state-block" role="alert">
      <div className="state-block__content">
        <Icon name="warning" size={27} />
        <h2>Bu bölüm hazırlanamadı</h2>
        <p>Sentetik demo verisi okunamadı. Diğer bölümler kullanılmaya devam edebilir.</p>
        {onRetry && (
          <button className="button secondary" type="button" onClick={onRetry}>
            Tekrar dene
          </button>
        )}
      </div>
    </div>
  );
}

export function UnauthorizedState({ onRequest }: { onRequest?: () => void }) {
  return (
    <div className="state-block" role="alert" data-testid="unauthorized-state">
      <div className="state-block__content">
        <Icon name="lock" size={28} />
        <h2>Bu içeriği görme yetkin yok</h2>
        <p>Dosya adı, kişi, belge, OCR, ücret ve gizli notlar maskelendi.</p>
        {onRequest && (
          <button className="button secondary" type="button" onClick={onRequest}>
            Sorumlu avukata yönlendir
          </button>
        )}
      </div>
    </div>
  );
}

export function OfflineBanner({ lastSync }: { lastSync: string }) {
  return (
    <div className="offline-banner" role="status" data-testid="offline-banner">
      <Icon name="warning" size={16} />
      Çevrimdışı demo · Son senkronizasyon: {lastSync} · Final onay ve dış gönderim kilitli
    </div>
  );
}

export function SuccessToast({ message }: { message: string }) {
  return (
    <div className="toast" role="status" aria-live="polite">
      <Icon name="check" size={18} /> {message}
    </div>
  );
}
