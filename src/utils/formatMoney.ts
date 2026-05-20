const CURRENCY_PREFIX: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function currencyPrefix(currency?: string | null): string {
  const code = String(currency || '').trim().toUpperCase();
  if (!code) return '';
  return CURRENCY_PREFIX[code] || `${code} `;
}

export function parseMoneyAmount(amount: unknown): number | null {
  if (amount === null || amount === undefined || amount === '') return null;
  if (typeof amount === 'number') return Number.isFinite(amount) ? amount : null;
  const cleaned = String(amount).replace(/,/g, '').trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatMoney(currency: string | undefined | null, amount: unknown): string | null {
  const parsed = parseMoneyAmount(amount);
  if (parsed === null) return null;
  const hasDecimals = Math.abs(parsed % 1) > 0;
  return `${currencyPrefix(currency)}${parsed.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  })}`;
}
