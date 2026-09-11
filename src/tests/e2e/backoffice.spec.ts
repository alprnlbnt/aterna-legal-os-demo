import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

const smokeRoutes = [
  ['/finans', 'Finans'],
  ['/gorevler/yeni', 'Manuel görev oluştur'],
  ['/durusmalar/yeni', 'Duruşma oluştur'],
  ['/denetim', 'Global denetim'],
  ['/kullanicilar', 'Persona yaşam döngüsü'],
  ['/kisiler/yeni', 'Kişi oluştur'],
] as const;

test('yeni back-office rotaları temiz storage ile pageerror olmadan açılır', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  for (const [route, heading] of smokeRoutes) {
    await page.goto(`/#${route}`);
    await expect(page.getByRole('heading', { level: 1, name: heading, exact: true })).toBeVisible();
  }

  expect(pageErrors).toEqual([]);
});

test('finans pano → rapor → A4 önizleme akışı', async ({ page }) => {
  await page.goto('/#/finans');
  await expect(page.getByRole('heading', { level: 1, name: 'Finans', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: /Son 6 ay tahsilat/ })).toBeVisible();
  await expect(page.getByRole('table', { name: /Son 6 ay tahsilat veri tablosu/ })).toHaveCount(1);
  await page.getByRole('tab', { name: 'Rapor' }).click();
  await page.getByRole('combobox', { name: 'Ay', exact: true }).selectOption('9');
  await page.getByRole('link', { name: 'A4 önizle' }).click();
  await expect(page).toHaveURL(/finans\/rapor\/onizleme/);
  await expect(page.getByText(/resmî mali belge değildir/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Yazdır' })).toBeVisible();
});

test('manuel görev oluşturulur, tamamlanır ve deadline olarak sunulmaz', async ({ page }) => {
  await page.goto('/#/gorevler/yeni');
  await page.getByLabel('Görev başlığı').fill('Yeni manuel müvekkil takibi');
  await page.getByLabel('Son tarih (isteğe bağlı)').fill('2026-09-12');
  await page.getByLabel('Hatırlatma zamanı (isteğe bağlı, UTC)').fill('2026-09-11T08:00');
  await page.getByRole('button', { name: 'Manuel görevi kaydet' }).click();
  await page.getByRole('tab', { name: 'Kesin görevler' }).click();
  const task = page.getByRole('article').filter({ hasText: 'Yeni manuel müvekkil takibi' });
  await expect(task).toContainText('Manuel');
  await task.getByRole('button', { name: 'Tamamlandı işaretle' }).click();
  await expect(task).toContainText('Tamamlandı');
});

test('duruşma oluşturulur ve takvim ajandasına yansır', async ({ page }) => {
  await page.goto('/#/durusmalar/yeni');
  await page.getByLabel('Mahkeme').fill('İstanbul Kurgu 9. İş Mahkemesi');
  await page.getByLabel('Tarih ve saat (UTC)').fill('2026-09-20T13:30');
  await page.getByLabel('Gündem').fill('Yeni kurgu duruşma gündemi');
  await page.getByLabel('Hatırlatma').selectOption('72');
  await page.getByRole('button', { name: 'Duruşmayı kaydet' }).click();
  await expect(page.getByRole('heading', { name: 'İstanbul Kurgu 9. İş Mahkemesi' })).toBeVisible();
  await page.goto('/#/takvim');
  await expect(page.getByText('İstanbul Kurgu 9. İş Mahkemesi')).toBeVisible();
  await expect(page.getByText(/Yeni kurgu duruşma gündemi/)).toBeVisible();
});

test('global denetim filtrelenir, temizlenir ve yönetici olmayan persona reddedilir', async ({
  page,
}) => {
  await page.goto('/#/denetim');
  await expect(page.getByRole('heading', { name: 'Global denetim' })).toBeVisible();
  await page.getByLabel('Kullanıcı').selectOption('user-nur');
  await expect(page.getByRole('row', { name: /Evrak kaydedildi/ })).toBeVisible();
  await page.getByRole('button', { name: 'Filtreleri temizle' }).click();
  await expect(page.getByLabel('Kullanıcı')).toHaveValue('');
  await page.goto('/#/demo');
  await page.getByLabel('Aktif persona').selectOption('user-ada');
  await page.goto('/#/denetim');
  await expect(page.getByTestId('unauthorized-state')).toBeVisible();
});

test('sentetik persona oluşturulur, pasifleştirilir ve seçilemez', async ({ page }) => {
  await page.goto('/#/kullanicilar');
  await page.getByRole('textbox', { name: 'Ad', exact: true }).fill('Kurgu Yaşam Döngüsü');
  await page.getByLabel('Sentetik e-posta (isteğe bağlı)').fill('yasam@example.test');
  await page.getByRole('button', { name: 'Sentetik persona oluştur' }).click();
  const row = page.getByRole('row').filter({ hasText: 'Kurgu Yaşam Döngüsü' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Pasif yap' }).click();
  await expect(row.getByRole('cell', { name: 'Pasif', exact: true })).toBeVisible();
  await page.goto('/#/demo');
  await expect(page.getByRole('option', { name: /Kurgu Yaşam Döngüsü.*Pasif/ })).toHaveAttribute(
    'disabled',
    '',
  );
});

test('kişi oluşturulur ve arama ile filtrelenir', async ({ page }) => {
  await page.goto('/#/kisiler/yeni');
  await page.getByLabel('Ad / unvan').fill('Kurgu Arama Kişisi');
  await page.getByLabel('İletişim').fill('arama@example.test');
  await page.getByRole('button', { name: 'Kişiyi kaydet' }).click();
  await expect(page.getByRole('heading', { name: 'Kurgu Arama Kişisi' })).toBeVisible();
  await page.goto('/#/kisiler');
  await page.getByLabel('Kişilerde ara').fill('arama@example.test');
  await expect(page.getByRole('heading', { name: 'Kurgu Arama Kişisi' })).toBeVisible();
  await page.getByRole('button', { name: 'Karşı taraf' }).click();
  await expect(page.getByRole('heading', { name: 'Kurgu Arama Kişisi' })).toHaveCount(0);
});
