import { expect, type Page } from '@playwright/test';

/** Wait for the resolved page and read its section registers in document order. */
export async function expectSheetSections(page: Page, items: Array<[string, string]>) {
  const heads = page.locator('section.sg-section > header.sg-head');
  await expect(heads.locator('h2.sg-title')).toHaveText(items.map(([, title]) => title));
  await expect(heads.locator('.sg-index[aria-hidden="true"]')).toHaveText(items.map(([id]) => `[${id}]`));
  await expect(heads.first()).toHaveCSS('border-bottom-style', 'none');
  return heads;
}
