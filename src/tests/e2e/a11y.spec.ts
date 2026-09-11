import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

const routes = [
  '/bugun',
  '/gelen',
  '/gorevler',
  '/gorevler/yeni',
  '/belgeler',
  '/durusmalar/durusma-118',
  '/durusmalar/yeni',
  '/kisiler',
  '/kisiler/yeni',
  '/finans',
  '/finans/rapor/onizleme?year=2026',
  '/denetim',
  '/ayarlar',
  '/kullanicilar',
  '/demo',
];

for (const route of routes) {
  test(`kritik erişilebilirlik ihlali yok: ${route}`, async ({ page }) => {
    await page.goto(`/#${route}`);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('grafik erişilebilir tablo alternatifi sunar', async ({ page }) => {
  await page.goto('/#/finans');
  await expect(page.getByRole('img', { name: /Son 6 ay tahsilat/ })).toBeVisible();
  await expect(page.getByRole('table', { name: /Son 6 ay tahsilat veri tablosu/ })).toHaveCount(1);
});

test('koyu tema yeni ekranlarda erişilebilirlik ihlali üretmez', async ({ page }) => {
  await page.goto('/#/ayarlar');
  await page.getByRole('button', { name: 'Koyu' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.goto('/#/finans');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});

test('klavye ile komut çubuğu açılır ve rotaya gidilir', async ({ page }) => {
  await page.goto('/#/bugun');
  await page.keyboard.press('Control+K');
  await expect(page.getByRole('dialog', { name: 'Komut çubuğu' })).toBeVisible();
  await page.getByLabel('Komut ara').fill('süre');
  await page.getByRole('button', { name: /Onay kuyruğunu aç/ }).click();
  await expect(page.getByRole('heading', { name: 'Görevler & Onay' })).toBeVisible();
});
