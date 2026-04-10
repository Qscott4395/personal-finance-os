import { test, expect, type Page } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fill a number input by its label text */
async function fillInput(page: Page, label: string, value: string) {
  await page.getByLabel(label, { exact: false }).fill(value);
}

/** Get a number from a visible text string like "$5,432" or "12.3%" */
function parseDollar(s: string) {
  return parseFloat(s.replace(/[$,%\s]/g, '').replace(/,/g, ''));
}

// ─── Page Load ────────────────────────────────────────────────────────────────

test.describe('Page load', () => {
  test('loads without errors', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Personal Finance OS/);
  });

  test('shows all four summary cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Monthly Take-Home')).toBeVisible();
    await expect(page.getByText('Monthly Surplus')).toBeVisible();
    await expect(page.getByText('Annual Invested')).toBeVisible();
    await expect(page.getByText('Projected Net Worth')).toBeVisible();
  });

  test('shows Income & Taxes and Monthly Expenses panels', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Income & Taxes')).toBeVisible();
    await expect(page.getByText('Monthly Expenses')).toBeVisible();
  });

  test('shows Net Worth Projection chart section', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Net Worth Projection')).toBeVisible();
  });
});

// ─── Income & Tax ─────────────────────────────────────────────────────────────

test.describe('Income & Tax', () => {
  test('increasing salary increases take-home', async ({ page }) => {
    await page.goto('/');

    const takeHomeBefore = parseDollar(
      await page.locator('.grid.grid-cols-2 .bg-slate-800').first().locator('p.text-2xl').textContent() ?? '0'
    );

    await fillInput(page, 'Annual Salary', '200000');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    const takeHomeAfter = parseDollar(
      await page.locator('.grid.grid-cols-2 .bg-slate-800').first().locator('p.text-2xl').textContent() ?? '0'
    );

    expect(takeHomeAfter).toBeGreaterThan(takeHomeBefore);
  });

  test('TX state shows $0 state tax', async ({ page }) => {
    await page.goto('/');
    await page.selectOption('select', 'TX');
    await page.waitForTimeout(300);
    await expect(page.getByText('State Tax')).toBeVisible();
    const stateTaxRow = page.locator('text=State Tax').locator('..').locator('span').last();
    const text = await stateTaxRow.textContent();
    expect(text).toContain('$0');
  });

  test('FL state shows $0 state tax', async ({ page }) => {
    await page.goto('/');
    await page.selectOption('select', 'FL');
    await page.waitForTimeout(300);
    const rows = page.locator('text=State Tax');
    const stateTaxText = await rows.first().locator('..').textContent();
    expect(stateTaxText).toContain('$0');
  });

  test('switching to Roth 401k increases federal tax', async ({ page }) => {
    await page.goto('/');
    await fillInput(page, 'Annual Salary', '150000');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    const federalBefore = parseDollar(
      await page.locator('text=Federal Tax').first().locator('..').textContent() ?? '0'
    );

    await page.getByRole('button', { name: /Roth.*Post-tax/ }).click();
    await page.waitForTimeout(300);

    const federalAfter = parseDollar(
      await page.locator('text=Federal Tax').first().locator('..').textContent() ?? '0'
    );

    expect(federalAfter).toBeGreaterThan(federalBefore);
  });

  test('pay schedule toggle changes per-check amount', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(300);

    // Get biweekly (26x) take-home
    await page.getByRole('button', { name: /Biweekly/ }).click();
    await page.waitForTimeout(200);
    const biweekly = parseDollar(
      await page.locator('text=Take-Home / Check').locator('..').locator('span.text-emerald-400').textContent() ?? '0'
    );

    // Get semimonthly (24x) take-home
    await page.getByRole('button', { name: /Semimonthly/ }).click();
    await page.waitForTimeout(200);
    const semimonthly = parseDollar(
      await page.locator('text=Take-Home / Check').locator('..').locator('span.text-emerald-400').textContent() ?? '0'
    );

    // Semimonthly check should be larger (fewer checks per year, same annual income)
    expect(semimonthly).toBeGreaterThan(biweekly);
  });
});

// ─── Expenses ─────────────────────────────────────────────────────────────────

test.describe('Expenses', () => {
  test('increasing housing reduces monthly surplus', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(300);

    const surplusCard = page.locator('text=Monthly Surplus').locator('..').locator('p.text-2xl');
    const before = parseDollar(await surplusCard.textContent() ?? '0');

    await fillInput(page, 'Housing', '5000');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    const after = parseDollar(await surplusCard.textContent() ?? '0');
    expect(after).toBeLessThan(before);
  });

  test('expense breakdown bars are visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Housing')).toBeVisible();
    await expect(page.getByText('Utilities')).toBeVisible();
    await expect(page.getByText('Food')).toBeVisible();
    await expect(page.getByText('Transportation')).toBeVisible();
    await expect(page.getByText('Debts')).toBeVisible();
    await expect(page.getByText('Miscellaneous')).toBeVisible();
  });

  test('investment settings are linked to monthly outflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(300);

    // Roth IRA line should appear in expense summary
    await expect(page.getByText(/Roth IRA.*Investment Settings/)).toBeVisible();
    await expect(page.getByText(/Brokerage.*Investment Settings/)).toBeVisible();
    await expect(page.getByText(/Cash Savings.*Investment Settings/)).toBeVisible();
  });
});

// ─── Investment Settings ──────────────────────────────────────────────────────

test.describe('Investment Settings', () => {
  test('increasing Roth IRA contribution increases annual invested', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(300);

    const annualInvestedCard = page.locator('text=Annual Invested').locator('..').locator('p.text-2xl');
    const before = parseDollar(await annualInvestedCard.textContent() ?? '0');

    await fillInput(page, 'Roth IRA / Year', '7000');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    const after = parseDollar(await annualInvestedCard.textContent() ?? '0');
    expect(after).toBeGreaterThan(before);
  });

  test('current balances section has 401k, Roth, Brokerage, Cash fields', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Current Balances')).toBeVisible();
    await expect(page.getByLabel('401(k)')).toBeVisible();
    await expect(page.getByLabel('Roth IRA').first()).toBeVisible();
    await expect(page.getByLabel('Brokerage').first()).toBeVisible();
    await expect(page.getByLabel('Cash Savings').first()).toBeVisible();
  });
});

// ─── Net Worth Projection ─────────────────────────────────────────────────────

test.describe('Net Worth Projection', () => {
  test('chart renders with area series', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    // Recharts renders SVG paths for area charts
    const paths = page.locator('.recharts-area-area');
    await expect(paths.first()).toBeVisible();
  });

  test('increasing return rate increases projected net worth', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(300);

    const netWorthCard = page.locator('text=Projected Net Worth').locator('..').locator('p.text-2xl');
    const before = parseDollar(await netWorthCard.textContent() ?? '0');

    // Move return rate slider up
    const slider = page.locator('input[type="range"]').filter({ hasText: '' }).nth(2);
    await slider.fill('12');
    await page.waitForTimeout(300);

    const after = parseDollar(await netWorthCard.textContent() ?? '0');
    expect(after).toBeGreaterThan(before);
  });

  test('insight cards are visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/you will have/)).toBeVisible();
    await expect(page.getByText(/Increasing return/)).toBeVisible();
    await expect(page.getByText(/Retiring 5 years/)).toBeVisible();
  });

  test('shows per-bucket final values', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('401(k)').first()).toBeVisible();
    await expect(page.getByText('Roth IRA').first()).toBeVisible();
    await expect(page.getByText('Brokerage').first()).toBeVisible();
    await expect(page.getByText('Cash').first()).toBeVisible();
  });
});

// ─── Savings Rates ────────────────────────────────────────────────────────────

test.describe('Savings Rates', () => {
  test('true savings rate is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/True Savings Rate/)).toBeVisible();
  });

  test('true savings rate increases when Roth contribution increases', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(300);

    const rateBefore = parseDollar(
      await page.locator('text=True Savings Rate').locator('..').locator('span').last().textContent() ?? '0'
    );

    await fillInput(page, 'Roth IRA / Year', '7000');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    const rateAfter = parseDollar(
      await page.locator('text=True Savings Rate').locator('..').locator('span').last().textContent() ?? '0'
    );

    expect(rateAfter).toBeGreaterThan(rateBefore);
  });
});
