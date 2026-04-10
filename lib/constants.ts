import type { State } from './tax';

export const STATES: { value: State; label: string }[] = [
  { value: 'IL', label: 'Illinois (IL) — 4.95% flat' },
  { value: 'CA', label: 'California (CA) — up to 12.3%' },
  { value: 'NY', label: 'New York (NY) — up to 9.65%' },
  { value: 'TX', label: 'Texas (TX) — no income tax' },
  { value: 'FL', label: 'Florida (FL) — no income tax' },
];

export const CHART_COLORS = {
  federal:  '#f87171',
  state:    '#fb923c',
  fica:     '#fbbf24',
  k401:     '#60a5fa',
  net:      '#34d399',
  roth:     '#34d399',
  brokerage:'#fbbf24',
  cash:     '#94a3b8',
  medical:  '#a78bfa',
};
