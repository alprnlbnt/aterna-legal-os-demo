import type { StatusTone } from '../../store/types';

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  const symbol = {
    candidate: '◇',
    pending: '◷',
    success: '✓',
    danger: '!',
    neutral: '•',
    info: 'i',
  }[tone];
  return (
    <span className={`status-badge ${tone}`}>
      <span aria-hidden="true">{symbol}</span>
      {label}
    </span>
  );
}

export const statusPresentation = (status: string): { label: string; tone: StatusTone } => {
  const map: Record<string, { label: string; tone: StatusTone }> = {
    aday: { label: 'Aday', tone: 'candidate' },
    onay_bekliyor: { label: 'Onay bekliyor', tone: 'pending' },
    inceleme_bekliyor: { label: 'İnceleme bekliyor', tone: 'pending' },
    eslesmemis: { label: 'Eşleşmemiş', tone: 'danger' },
    baglandi: { label: 'Dosyaya bağlı', tone: 'success' },
    teyit: { label: 'Kesinleşti / Teyit', tone: 'success' },
    duzeltildi: { label: 'Düzeltilip teyit edildi', tone: 'success' },
    reddedildi: { label: 'Reddedildi', tone: 'danger' },
    eksik_bilgi: { label: 'Bilgi eksik', tone: 'danger' },
    taslak: { label: 'Taslak', tone: 'neutral' },
    ic_onay_bekliyor: { label: 'İç onay bekliyor', tone: 'pending' },
    gonderime_hazir: { label: 'Gönderime hazır', tone: 'info' },
    gonderildi: { label: 'Gönderildi', tone: 'success' },
    aktif: { label: 'Aktif', tone: 'success' },
    potansiyel: { label: 'Potansiyel', tone: 'candidate' },
    kapali: { label: 'Kapalı', tone: 'neutral' },
    senkronizasyon_bekliyor: { label: 'Senkronizasyon bekliyor', tone: 'pending' },
    kaydedildi: { label: 'Kaydedildi', tone: 'success' },
    guvenli: { label: 'Güvenlik kontrolü tamam', tone: 'success' },
  };
  return map[status] ?? { label: status.replaceAll('_', ' '), tone: 'neutral' };
};
