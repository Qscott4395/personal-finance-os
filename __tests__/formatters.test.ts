import { fmt, fmtShort, fmtPct } from '../lib/formatters';

// ─── fmt (dollar formatting) ─────────────────────────────────────────────────

describe('fmt', () => {
  test('Formats positive dollars with $ sign and commas', () => {
    expect(fmt(1_234_567)).toBe('$1,234,567');
  });

  test('Formats zero as $0', () => {
    expect(fmt(0)).toBe('$0');
  });

  test('Rounds to nearest dollar (no decimals)', () => {
    expect(fmt(1_234.56)).toBe('$1,235');
    expect(fmt(1_234.49)).toBe('$1,234');
  });

  test('Formats negative numbers', () => {
    const result = fmt(-5_000);
    // Intl format may use -$5,000 or ($5,000)
    expect(result).toContain('5,000');
  });

  test('Formats small numbers', () => {
    expect(fmt(42)).toBe('$42');
  });
});

// ─── fmtShort (abbreviated) ──────────────────────────────────────────────────

describe('fmtShort', () => {
  test('Formats millions with M suffix', () => {
    expect(fmtShort(1_500_000)).toBe('$1.5M');
    expect(fmtShort(2_000_000)).toBe('$2.0M');
  });

  test('Formats thousands with K suffix', () => {
    expect(fmtShort(50_000)).toBe('$50K');
    expect(fmtShort(1_000)).toBe('$1K');
  });

  test('Formats numbers below 1000 with just $', () => {
    expect(fmtShort(500)).toBe('$500');
    expect(fmtShort(0)).toBe('$0');
  });

  test('K suffix rounds to nearest thousand', () => {
    expect(fmtShort(1_499)).toBe('$1K');
    expect(fmtShort(1_500)).toBe('$2K');
  });

  test('M suffix shows one decimal', () => {
    expect(fmtShort(1_234_567)).toBe('$1.2M');
    expect(fmtShort(10_000_000)).toBe('$10.0M');
  });
});

// ─── fmtPct (percentage) ─────────────────────────────────────────────────────

describe('fmtPct', () => {
  test('Formats with one decimal and % sign', () => {
    expect(fmtPct(25)).toBe('25.0%');
    expect(fmtPct(4.5)).toBe('4.5%');
  });

  test('Formats zero', () => {
    expect(fmtPct(0)).toBe('0.0%');
  });

  test('Rounds to one decimal', () => {
    expect(fmtPct(33.333)).toBe('33.3%');
    expect(fmtPct(66.666)).toBe('66.7%');
  });

  test('Handles 100%', () => {
    expect(fmtPct(100)).toBe('100.0%');
  });

  test('Handles negative percentages', () => {
    expect(fmtPct(-5.5)).toBe('-5.5%');
  });
});
