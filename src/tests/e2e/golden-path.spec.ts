import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/#/bugun');
});

test('golden path: evrak → eşleşme → süre teyidi → kesin takvim', async ({ page }) => {
  await page.goto('/#/gelen/evrak-001');
  await expect(page.getByRole('heading', { name: 'Bilirkişi_Raporu.pdf' })).toBeVisible();
  await page.getByRole('radio', { name: /Kurgu Metal.*eşleşme adayı/ }).check();
  await page.getByRole('button', { name: 'Seçimi onaya gönder' }).click();
  await page.getByRole('button', { name: 'Görev/süre onayına gönder' }).click();
  await page.getByRole('link', { name: 'Karar kartını aç' }).click();
  await page.getByRole('radio', { name: /2026-09-16/ }).check();
  await page
    .getByLabel('Karar gerekçesi')
    .fill('Orijinal rapor ve olay tarihi avukatça kontrol edildi.');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Teyit et ve takvime işle' }).click();
  await expect(page.getByText(/kesin görev, takvim kaydı/i)).toBeVisible();
  await page.goto('/#/takvim');
  await expect(page.getByText('Avukat teyitli').first()).toBeVisible();
  await expect(page.getByText(/aday bu kesin takvimde gösterilmez/i)).toBeVisible();
});

test('çevrimdışı final onayı kilitler', async ({ page }) => {
  await page.goto('/#/demo');
  await page.getByRole('button', { name: 'Çevrimdışı yap' }).click();
  await page.goto('/#/gorevler/aday-sure-002');
  await expect(page.getByTestId('offline-banner')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Teyit et ve takvime işle' })).toBeDisabled();
});

test('yetkisiz persona hassas dosyayı maskeler ve talebi audit eder', async ({ page }) => {
  await page.goto('/#/demo');
  await page.getByLabel('Aktif persona').selectOption('user-ada');
  await page.goto('/#/dosyalar/dosya-2024-118');
  await expect(page.getByTestId('unauthorized-state')).toBeVisible();
  await expect(page.getByText('Kurgu Metal')).toHaveCount(0);
  await page.getByRole('button', { name: 'Sorumlu avukata yönlendir' }).click();
});

test('duplicate belgesini otomatik silmez ve kullanıcı kararı ister', async ({ page }) => {
  await page.goto('/#/gelen/evrak-005');
  await expect(page.getByRole('heading', { name: 'Duplicate şüphesi' })).toBeVisible();
  await page.getByRole('button', { name: 'Yeni sürüm' }).click();
  await page.getByRole('button', { name: 'Kararı kaydet' }).click();
  await expect(page.getByText(/hiçbir kayıt sessizce silinmedi/i)).toBeVisible();
});

test('kritik belge farkı yeniden iç onay ister; gönderim ayrı kalır', async ({ page }) => {
  await page.goto('/#/belgeler/belge-teklif-2');
  await page.getByRole('tab', { name: /Farklar/ }).click();
  await expect(page.getByText('Kritik · yeniden onay').first()).toBeVisible();
  await page
    .getByLabel('Karar gerekçesi')
    .fill('Ücret, kapsam ve fesih maddeleri tek tek kontrol edildi.');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /İç onayı ver/ }).click();
  await expect(page.getByText(/yalnız gönderime hazır, gönderilmedi/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Dış gönderimi ayrıca onayla/ })).toBeVisible();
});

test('sesli nottaki komut sözleri eylem tetiklemez', async ({ page }) => {
  await page.goto('/#/durusmalar/durusma-118?ses=1');
  await expect(page.getByTestId('passive-voice-commands')).toContainText('sil, gönder');
  await page.getByRole('button', { name: 'Onay akışına gönder' }).click();
  await expect(page.getByText(/kesinleşmedi|onay kuyruğuna/).first()).toBeVisible();
  await expect(
    page.getByText(/hiçbir silme, onay veya gönderim eylemi tetiklemedi/i),
  ).toBeVisible();
});

test('reset local değişiklikleri başlangıç fixture’ına döndürür', async ({ page }) => {
  await page.goto('/#/demo');
  await page.getByRole('button', { name: 'Çevrimdışı yap' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Demoyu sıfırla' }).click();
  await expect(page.getByRole('heading', { name: 'Bugün dikkat isteyenler' })).toBeVisible();
  await expect(page.getByTestId('offline-banner')).toHaveCount(0);
});

test('uygulama dış hosta network isteği yapmaz', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1') external.push(request.url());
  });
  await page.goto('/#/bugun');
  await page.goto('/#/gelen/evrak-001');
  await page.goto('/#/belgeler/belge-teklif-2');
  await page.goto('/#/finans');
  await page.goto('/#/finans/rapor/onizleme?year=2026');
  await page.goto('/#/denetim');
  await page.goto('/#/kullanicilar');
  expect(external).toEqual([]);
});
