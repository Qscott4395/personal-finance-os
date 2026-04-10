# Personal Finance OS — Build Plan

## Current State
A single-page personal finance dashboard with income/tax breakdowns, expense tracking, 401(k)/investment settings, and projected net worth. Deployed on Vercel. Built with Next.js, React, TypeScript, and Tailwind CSS. Deployed on Vercel.

---

## Phase 1: Budget Optimization Module
**Goal:** Turn static expense inputs into a dynamic budgeting tool with analysis and goal-setting.

### 1.1 — Spending Category Analysis
- Expand expense categories beyond the current 6 (Housing, Utilities, Food, Transportation, Debts, Miscellaneous)
- Add subcategories (e.g., Food → Groceries, Dining Out, Coffee)
- Visual breakdown: donut/pie chart of spending by category
- Month-over-month comparison bar charts

### 1.2 — Savings Goal Tracker
- Allow users to define named savings goals (e.g., "Emergency Fund," "Vacation," "Down Payment")
- Each goal has a target amount, target date, and current balance
- Progress bars and projected completion dates based on monthly surplus
- Priority ordering: allocate surplus across goals in user-defined order

### 1.3 — What-If Scenarios
- Interactive sliders to model changes: "What if I reduce food spending by $100/mo?" or "What if I get a 10% raise?"
- Side-by-side comparison of current plan vs. scenario
- Impact on monthly surplus, savings rate, and projected net worth

---

## Phase 1.5: Monthly Cash Flow Outlook (Tax Year Timeline)
**Goal:** Give a month-by-month view of income, expenses, and remaining earnings across the tax year — so at any point you know exactly where you stand.

### 1.5.1 — Paycheck Timeline
- Map all paychecks across the tax year (Jan–Dec) based on pay frequency (biweekly 26x or semimonthly 24x)
- Show: "Paycheck #X of 26 — $2,600 net" for the current period
- Running totals: gross earned YTD, taxes paid YTD, net received YTD
- Remaining: paychecks left, gross remaining, estimated net remaining
- Visual: horizontal timeline or progress bar showing position in the tax year

### 1.5.2 — Monthly Expense Outlook
- Project expenses month-by-month using budgeted amounts (or actuals when available from Phase 3)
- Flag months with known irregular expenses (e.g., insurance premiums, annual subscriptions, holidays)
- Allow manual overrides per month (e.g., "December will be $500 higher for gifts")
- Running total: spent YTD vs. budgeted YTD

### 1.5.3 — Monthly Net Summary Table
- Table view: one row per month (Jan–Dec) with columns for gross income, taxes, net income, total expenses, surplus/deficit, cumulative savings
- Current month highlighted
- Color coding: green for surplus months, red for deficit months
- Expandable rows to see category-level detail per month

### 1.5.4 — Tax Withholding Tracker
- Track federal + state tax withheld YTD vs. estimated annual liability
- "On track" / "Under-withheld" / "Over-withheld" indicator
- Estimated refund or amount owed projection updated each month
- Useful for adjusting W-4 mid-year if needed

---

## Phase 2: Investment Projections Module
**Goal:** Give users a clear picture of long-term wealth building with interactive charts and scenario modeling.

### 2.1 — Compound Growth Visualization
- Line chart showing projected portfolio growth over time (current age → retirement)
- Inputs: current balances, annual contributions, expected return rate, inflation rate
- Toggle between nominal and inflation-adjusted values
- Shade a confidence range (e.g., optimistic/expected/conservative return assumptions)

### 2.2 — Retirement Scenario Planning
- "Can I retire at age X?" calculator
- Inputs: desired retirement income, expected Social Security, retirement age
- Output: whether current savings rate supports the goal, and what adjustments are needed
- Monte Carlo simulation option for probability-based projections

### 2.3 — Asset Allocation Breakdown
- Visual allocation chart across account types (401k, Roth IRA, Brokerage, Cash)
- Suggested allocation based on age/risk tolerance (e.g., 110 - age = % stocks)
- Rebalancing recommendations when allocation drifts

---

## Phase 3: Transaction Tracker ("Quicken Module")
**Goal:** Import real financial data, auto-categorize transactions, and generate monthly snapshots. This is the biggest lift and transforms the app from a planning tool into a full personal finance system.

### 3.1 — Receipt & Statement Import
- File upload support: CSV, PDF (bank/CC statements), and photo receipts (OCR)
- Parse common bank/CC CSV export formats (Chase, Amex, BoA, etc.)
- PDF statement parser for major banks
- Receipt OCR: extract merchant, amount, date, and category from photos
- Manual transaction entry as fallback

### 3.2 — Auto-Categorization Engine
- Rule-based categorization: match merchant names to categories (e.g., "WHOLE FOODS" → Groceries)
- User-defined rules: "Any transaction containing 'UBER' goes to Transportation"
- Learning from corrections: when user re-categorizes, remember for future imports
- Uncategorized queue: surface transactions that need manual review

### 3.3 — Monthly Snapshots
- Each month gets its own snapshot: total income, total spending by category, savings, investments
- Dashboard view: calendar-style grid showing monthly health (green/yellow/red)
- Drill-down into any month to see all transactions
- Month-over-month trends and YTD summaries

### 3.4 — Expense Category Integration
- Actual spending from imported transactions auto-populates the existing expense categories
- Compare budgeted vs. actual spending per category
- Alerts when a category exceeds its budget
- Rolling averages to smooth out irregular expenses

---

## Data & Storage Architecture

### Option A: Local/Browser Storage (Simpler)
- Store all data in localStorage or IndexedDB
- Pros: No backend needed, privacy-first, works offline
- Cons: Data tied to one browser, no sync, storage limits
- Best for: MVP / solo use

### Option B: Backend + Database (Scalable)
- Supabase or Firebase for auth + database
- PostgreSQL for transaction data, user settings, snapshots
- Pros: Multi-device sync, data persistence, shareable
- Cons: More complexity, hosting costs, auth flow needed
- Best for: If you want to share this with others or use across devices

### Recommendation
Start with **Option A** (IndexedDB via something like Dexie.js) to keep momentum. Migrate to Option B later if needed — the data model will be the same either way.

---

## Suggested Build Order

| Priority | Feature | Effort | Dependencies |
|----------|---------|--------|-------------|
| 1 | Spending Category Expansion (1.1) | Small | None |
| 2 | **Paycheck Timeline (1.5.1)** | **Medium** | **None** |
| 3 | **Monthly Net Summary Table (1.5.3)** | **Medium** | **1.5.1** |
| 4 | Compound Growth Chart (2.1) | Medium | None |
| 5 | Savings Goal Tracker (1.2) | Medium | None |
| 6 | **Monthly Expense Outlook (1.5.2)** | **Medium** | **1.5.3** |
| 7 | **Tax Withholding Tracker (1.5.4)** | **Medium** | **1.5.1** |
| 8 | CSV Transaction Import (3.1 partial) | Medium | None |
| 9 | Auto-Categorization (3.2) | Medium | 3.1 |
| 10 | Monthly Snapshots (3.3) | Large | 3.1 + 3.2 |
| 11 | Budgeted vs. Actual (3.4) | Medium | 3.3 |
| 12 | What-If Scenarios (1.3) | Medium | 1.1 |
| 13 | Retirement Scenarios (2.2) | Large | 2.1 |
| 14 | Asset Allocation (2.3) | Medium | 2.1 |
| 15 | PDF/OCR Import (3.1 full) | Large | 3.1 partial |

---

## Recommended Libraries

- **Charts:** Recharts or Chart.js (if React), or D3 for full control
- **CSV Parsing:** Papa Parse
- **PDF Parsing:** pdf.js + pdf-parse (for statement import)
- **OCR:** Tesseract.js (client-side) or Claude API (for smarter receipt parsing)
- **Local DB:** Dexie.js (IndexedDB wrapper)
- **Date Handling:** date-fns
- **Financial Math:** financial.js or custom utils

---

## Notes
- The Quicken module (Phase 3) is the most ambitious piece. Starting with CSV import only and layering in PDF/OCR later keeps it manageable.
- Each phase can ship independently — no need to wait for everything to be done.
- The existing expense inputs should stay as the "budget" while imported transactions become the "actuals."
