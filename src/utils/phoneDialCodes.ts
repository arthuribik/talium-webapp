/** ISO 3166-1 alpha-2 → regional indicator flag emoji */
export function dialCodeFlagEmoji(iso2: string): string {
  const u = iso2.toUpperCase();
  if (u.length !== 2) return '🏳️';
  const A = 0x41;
  const regional = (c: string) => 0x1f1e6 - A + c.charCodeAt(0);
  try {
    return String.fromCodePoint(regional(u[0]), regional(u[1]));
  } catch {
    return '🏳️';
  }
}

export type PhoneDialOption = {
  dial: string;
  iso2: string;
  country: string;
};

/** Unique value for SearchableList: dial|ISO2 (e.g. +1|US) */
export function phoneDialOptionValue(o: PhoneDialOption): string {
  return `${o.dial}|${o.iso2}`;
}

export function parsePhoneDialValue(v: string): { dial: string; iso2: string } {
  const i = v.indexOf('|');
  if (i === -1) return { dial: v || '+1', iso2: 'US' };
  return { dial: v.slice(0, i), iso2: v.slice(i + 1) };
}

export function phoneDialLabel(o: PhoneDialOption): string {
  return `${dialCodeFlagEmoji(o.iso2)} ${o.dial} ${o.country}`;
}

/** Common countries / territories; duplicate dial codes use distinct ISO rows */
export const PHONE_DIAL_OPTIONS: PhoneDialOption[] = [
  { dial: '+1', iso2: 'US', country: 'United States' },
  { dial: '+1', iso2: 'CA', country: 'Canada' },
  { dial: '+44', iso2: 'GB', country: 'United Kingdom' },
  { dial: '+61', iso2: 'AU', country: 'Australia' },
  { dial: '+49', iso2: 'DE', country: 'Germany' },
  { dial: '+33', iso2: 'FR', country: 'France' },
  { dial: '+39', iso2: 'IT', country: 'Italy' },
  { dial: '+34', iso2: 'ES', country: 'Spain' },
  { dial: '+31', iso2: 'NL', country: 'Netherlands' },
  { dial: '+32', iso2: 'BE', country: 'Belgium' },
  { dial: '+41', iso2: 'CH', country: 'Switzerland' },
  { dial: '+43', iso2: 'AT', country: 'Austria' },
  { dial: '+45', iso2: 'DK', country: 'Denmark' },
  { dial: '+46', iso2: 'SE', country: 'Sweden' },
  { dial: '+47', iso2: 'NO', country: 'Norway' },
  { dial: '+358', iso2: 'FI', country: 'Finland' },
  { dial: '+353', iso2: 'IE', country: 'Ireland' },
  { dial: '+351', iso2: 'PT', country: 'Portugal' },
  { dial: '+30', iso2: 'GR', country: 'Greece' },
  { dial: '+48', iso2: 'PL', country: 'Poland' },
  { dial: '+420', iso2: 'CZ', country: 'Czech Republic' },
  { dial: '+36', iso2: 'HU', country: 'Hungary' },
  { dial: '+40', iso2: 'RO', country: 'Romania' },
  { dial: '+7', iso2: 'RU', country: 'Russia' },
  { dial: '+380', iso2: 'UA', country: 'Ukraine' },
  { dial: '+90', iso2: 'TR', country: 'Turkey' },
  { dial: '+972', iso2: 'IL', country: 'Israel' },
  { dial: '+971', iso2: 'AE', country: 'United Arab Emirates' },
  { dial: '+966', iso2: 'SA', country: 'Saudi Arabia' },
  { dial: '+20', iso2: 'EG', country: 'Egypt' },
  { dial: '+27', iso2: 'ZA', country: 'South Africa' },
  { dial: '+234', iso2: 'NG', country: 'Nigeria' },
  { dial: '+254', iso2: 'KE', country: 'Kenya' },
  { dial: '+256', iso2: 'UG', country: 'Uganda' },
  { dial: '+250', iso2: 'RW', country: 'Rwanda' },
  { dial: '+255', iso2: 'TZ', country: 'Tanzania' },
  { dial: '+233', iso2: 'GH', country: 'Ghana' },
  { dial: '+225', iso2: 'CI', country: "Côte d'Ivoire" },
  { dial: '+212', iso2: 'MA', country: 'Morocco' },
  { dial: '+91', iso2: 'IN', country: 'India' },
  { dial: '+92', iso2: 'PK', country: 'Pakistan' },
  { dial: '+880', iso2: 'BD', country: 'Bangladesh' },
  { dial: '+94', iso2: 'LK', country: 'Sri Lanka' },
  { dial: '+977', iso2: 'NP', country: 'Nepal' },
  { dial: '+86', iso2: 'CN', country: 'China' },
  { dial: '+852', iso2: 'HK', country: 'Hong Kong' },
  { dial: '+886', iso2: 'TW', country: 'Taiwan' },
  { dial: '+81', iso2: 'JP', country: 'Japan' },
  { dial: '+82', iso2: 'KR', country: 'South Korea' },
  { dial: '+65', iso2: 'SG', country: 'Singapore' },
  { dial: '+60', iso2: 'MY', country: 'Malaysia' },
  { dial: '+66', iso2: 'TH', country: 'Thailand' },
  { dial: '+84', iso2: 'VN', country: 'Vietnam' },
  { dial: '+63', iso2: 'PH', country: 'Philippines' },
  { dial: '+62', iso2: 'ID', country: 'Indonesia' },
  { dial: '+64', iso2: 'NZ', country: 'New Zealand' },
  { dial: '+52', iso2: 'MX', country: 'Mexico' },
  { dial: '+55', iso2: 'BR', country: 'Brazil' },
  { dial: '+54', iso2: 'AR', country: 'Argentina' },
  { dial: '+56', iso2: 'CL', country: 'Chile' },
  { dial: '+57', iso2: 'CO', country: 'Colombia' },
  { dial: '+51', iso2: 'PE', country: 'Peru' },
];

export const DEFAULT_PHONE_DIAL_VALUE = phoneDialOptionValue(PHONE_DIAL_OPTIONS[0]);

export function searchablePhoneDialOptions(): { value: string; label: string }[] {
  return PHONE_DIAL_OPTIONS.map((o) => ({
    value: phoneDialOptionValue(o),
    label: phoneDialLabel(o),
  }));
}

/** Stable reference for list props */
export const PHONE_DIAL_SEARCH_OPTIONS = searchablePhoneDialOptions();

/** E.164 from country dial (e.g. +234) and national digits only. */
export function buildE164FromDialAndNational(dial: string, national: string): string {
  const d = dial.trim().replace(/\s/g, '');
  const dialPart = d.startsWith('+') ? d : `+${d.replace(/^\+/, '')}`;
  const n = national.replace(/\D/g, '');
  if (!n) {
    throw new Error('National number is required');
  }
  return `${dialPart}${n}`;
}

/**
 * Parse a pasted / full international number starting with "+".
 * Uses longest matching dial code from {@link PHONE_DIAL_OPTIONS}.
 */
export function splitPlusPrefixedPhone(raw: string): { dialValue: string; nationalNumber: string } | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('+')) return null;
  const digitsOnly = trimmed.slice(1).replace(/\D/g, '');
  if (!digitsOnly) return null;
  const sorted = [...PHONE_DIAL_OPTIONS].sort(
    (a, b) => b.dial.replace(/\D/g, '').length - a.dial.replace(/\D/g, '').length,
  );
  for (const o of sorted) {
    const prefix = o.dial.replace(/\D/g, '');
    if (digitsOnly.startsWith(prefix)) {
      let national = digitsOnly.slice(prefix.length);
      national = national.replace(/^0+/, '') || national;
      return { dialValue: phoneDialOptionValue(o), nationalNumber: national };
    }
  }
  return null;
}
