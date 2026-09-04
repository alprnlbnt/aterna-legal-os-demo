import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = ['/bugun', '/gelen', '/gorevler', '/belgeler', '/durusmalar/durusma-118', '/demo'];

for (const route of routes) {
  test(`kritik erişilebilirlik ihlali yok: ${route}`, async ({ page }) => {
    await page.goto(`/#${route}`);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('klavye ile komut çubuğu açılır ve rotaya gidilir', async ({ page }) => {
  await page.goto('/#/bugun');
  await page.keyboard.press('Control+K');
  await expect(page.getByRole('dialog', { name: 'Komut çubuğu' })).toBeVisible();
  await page.getByLabel('Komut ara').fill('süre');
  await page.getByRole('button', { name: /Onay kuyruğunu aç/ }).click();
  await expect(page.getByRole('heading', { name: 'Görevler & Onay' })).toBeVisible();
});
