// @ts-check
/**
 * E2E tests: onboarding choice, generator flow, profile → generator,
 * and behaviour when Gemini API key is not configured.
 * Plan ref: section 6 — Test end-to-end e checklist finale.
 */
const { test, expect } = require('@playwright/test');

const LANDING_OFFLINE_TIMEOUT = 15000; // Firebase fallback ~8s
const DEFAULT_PROFILE = { age: 30, weight: 70, height: 170 };

test.describe('NutriPlan E2E — Onboarding + Generatore + Profilo', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('first access: onboarding choice → genera piano → applica → visualizza in Piano Alimentare', async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    await page.goto('/');

    await page.getByRole('button', { name: /Continua senza account/i }).waitFor({ state: 'visible', timeout: LANDING_OFFLINE_TIMEOUT });

    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /Continua senza account/i }).click();

    await expect(page.locator('#onboardingOverlay.active')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Configura il tuo piano/i)).toBeVisible();

    await page.getByRole('button', { name: /Genera un nuovo piano/i }).click();

    await expect(page.locator('#page-piano-gen.active')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#pianoGenContent')).toBeVisible();

    await page.locator('#pgAge').fill(String(DEFAULT_PROFILE.age));
    await page.locator('#pgWeight').fill(String(DEFAULT_PROFILE.weight));
    await page.locator('#pgHeight').fill(String(DEFAULT_PROFILE.height));
    await page.getByRole('button', { name: /Prosegui/i }).click();

    await expect(page.getByText(/Fabbisogno|2 • Fabbisogno/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Vedi piano proposto/i }).click();

    await expect(page.getByText(/3\. Piano proposto/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /Applica piano/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Applica piano/i }).click();

    await expect(page.locator('#page-piano-alimentare.active')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#pianoAlimentarePage')).toBeVisible();
  });

  test('no Gemini API key: flow does not block, shows informative message', async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');

    await page.getByRole('button', { name: /Continua senza account/i }).waitFor({ state: 'visible', timeout: LANDING_OFFLINE_TIMEOUT });
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /Continua senza account/i }).click();

    await expect(page.locator('#onboardingOverlay.active')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Genera un nuovo piano/i }).click();

    await expect(page.locator('#page-piano-gen.active')).toBeVisible({ timeout: 5000 });
    await page.locator('#pgAge').fill(String(DEFAULT_PROFILE.age));
    await page.locator('#pgWeight').fill(String(DEFAULT_PROFILE.weight));
    await page.locator('#pgHeight').fill(String(DEFAULT_PROFILE.height));
    await page.getByRole('button', { name: /Prosegui/i }).click();
    await page.getByRole('button', { name: /Vedi piano proposto/i }).click();

    await expect(page.getByText(/3\. Piano proposto/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /Applica piano/i })).toBeVisible({ timeout: 15000 });

    const badge = page.locator('.rc-badge').filter({ hasText: /Verifica AI non attiva|Verifica AI opzionale|Verifica AI in corso/i });
    await expect(badge).toBeVisible({ timeout: 12000 });

    const badgeText = await badge.textContent();
    expect(badgeText).toMatch(/Verifica AI non attiva|Verifica AI opzionale|Verifica AI in corso/);

    await page.getByRole('button', { name: /Applica piano/i }).click();
    await expect(page.locator('#page-piano-alimentare.active')).toBeVisible({ timeout: 5000 });
  });

  test('user with existing plan: profile → genera piano → confirm overwrite → plan replaced', async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');

    await page.getByRole('button', { name: /Continua senza account/i }).waitFor({ state: 'visible', timeout: LANDING_OFFLINE_TIMEOUT });
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /Continua senza account/i }).click();

    await expect(page.locator('#onboardingOverlay.active')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Genera un nuovo piano/i }).click();

    await page.locator('#pgAge').fill(String(DEFAULT_PROFILE.age));
    await page.locator('#pgWeight').fill(String(DEFAULT_PROFILE.weight));
    await page.locator('#pgHeight').fill(String(DEFAULT_PROFILE.height));
    await page.getByRole('button', { name: /Prosegui/i }).click();
    await page.getByRole('button', { name: /Vedi piano proposto/i }).click();
    await expect(page.getByRole('button', { name: /Applica piano/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Applica piano/i }).click();

    await expect(page.locator('#page-piano-alimentare.active')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: /Profilo/i }).first().click();
    await expect(page.locator('#page-profilo.active')).toBeVisible({ timeout: 5000 });

    page.once('dialog', (d) => d.accept());
    await page.getByText('Genera nuovo piano alimentare').click();

    await expect(page.locator('#page-piano-gen.active')).toBeVisible({ timeout: 5000 });
    await page.locator('#pgAge').fill('25');
    await page.locator('#pgWeight').fill('65');
    await page.locator('#pgHeight').fill('175');
    await page.getByRole('button', { name: /Prosegui/i }).click();
    await page.getByRole('button', { name: /Vedi piano proposto/i }).click();
    await expect(page.getByRole('button', { name: /Applica piano/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Applica piano/i }).click();

    await expect(page.locator('#page-piano-alimentare.active')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#pianoAlimentarePage')).toBeVisible();
  });
});
