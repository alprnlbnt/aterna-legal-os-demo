import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../../components/layout/AppShell';
import { AuditScreen } from '../../screens/Audit';
import { DemoPanelScreen } from '../../screens/DemoPanel';
import { FinanceDashboard, FinanceScreen } from '../../screens/Finance';
import { FinancePrintPreviewScreen } from '../../screens/FinancePrint';
import { SettingsScreen } from '../../screens/Settings';
import { NewManualTaskScreen, TasksScreen } from '../../screens/Tasks';
import { useStore } from '../../store/useStore';

const routed = (node: ReactNode, route = '/') =>
  render(<MemoryRouter initialEntries={[route]}>{node}</MemoryRouter>);

describe('back-office ekranları', () => {
  beforeEach(() => {
    useStore.getState().resetDemo();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  });

  it('finans panosunda beş metrik ve SVG grafiğin tablo alternatifini gösterir', () => {
    routed(<FinanceDashboard />);
    expect(screen.getByText('Toplam vekalet ücreti')).toBeInTheDocument();
    expect(screen.getByText('Tahsilat', { selector: 'small' })).toBeInTheDocument();
    expect(screen.getByText('Kalan alacak')).toBeInTheDocument();
    expect(screen.getByText('Gider')).toBeInTheDocument();
    expect(screen.getByText('Net nakit')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Son 6 ay tahsilat/i })).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: /Son 6 ay tahsilat veri tablosu/i }),
    ).toBeInTheDocument();
  });

  it('rapor filtresi tabloyu daraltır ve temizleme varsayılana döndürür', async () => {
    const user = userEvent.setup();
    routed(<FinanceScreen />, '/finans');
    await user.click(screen.getByRole('tab', { name: 'Rapor' }));
    await user.selectOptions(screen.getByLabelText('İşlem türü'), 'masraf');
    const table = screen.getByRole('table', { name: 'Sentetik cari hareketleri' });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    await user.type(screen.getByLabelText('Açıklamada ara'), 'eşleşmeyen');
    expect(screen.getByText('Bu filtrelerle eşleşen onaylı hareket yok.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Filtreleri temizle' }));
    expect(screen.getByLabelText('İşlem türü')).toHaveValue('');
  });

  it('A4 önizleme yerel yazdırmayı çağırır ve mali belge sınırını gösterir', async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    routed(<FinancePrintPreviewScreen />, '/finans/rapor/onizleme?year=2026');
    expect(screen.getByText(/resmî mali belge değildir/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Yazdır' }));
    expect(print).toHaveBeenCalledOnce();
  });

  it('manuel görev formu boş başlığı store guardıyla engeller', async () => {
    const user = userEvent.setup();
    routed(<NewManualTaskScreen />, '/gorevler/yeni');
    await user.click(screen.getByRole('button', { name: 'Manuel görevi kaydet' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Görev başlığı');
  });

  it('kesin görev listesinden görev tamamlar ve yeniden açma aksiyonunu gösterir', async () => {
    const user = userEvent.setup();
    routed(<TasksScreen />, '/gorevler');
    await user.click(screen.getByRole('tab', { name: 'Kesin görevler' }));
    await user.click(screen.getAllByRole('button', { name: 'Tamamlandı işaretle' })[0]);
    expect(screen.getByRole('button', { name: 'Yeniden aç' })).toBeInTheDocument();
  });

  it('global denetimi yöneticiye gösterir, stajyere yetkisiz durum döndürür', () => {
    const first = routed(<AuditScreen />, '/denetim');
    expect(screen.getByRole('heading', { name: 'Global denetim' })).toBeInTheDocument();
    first.unmount();
    useStore.getState().setPersona('user-ada');
    routed(<AuditScreen />, '/denetim');
    expect(screen.getByTestId('unauthorized-state')).toBeInTheDocument();
  });

  it('tema tercihi documentElement data-theme değerini günceller', async () => {
    const user = userEvent.setup();
    routed(
      <AppShell>
        <SettingsScreen />
      </AppShell>,
      '/ayarlar',
    );
    await user.click(screen.getByRole('button', { name: 'Koyu' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(useStore.getState().settings.theme).toBe('dark');
  });

  it('pasif persona demo seçicisinde seçilemez', () => {
    routed(<DemoPanelScreen />, '/demo');
    const option = screen.getByRole('option', { name: /Av. Ece Pasif.*Pasif/ });
    expect(option).toBeDisabled();
  });
});
