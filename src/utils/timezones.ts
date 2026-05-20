/** Fallback when `Intl.supportedValuesOf` is unavailable */
const FALLBACK_IANA_TIMEZONES = [
  'UTC',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
  'Pacific/Honolulu',
];

export function listIanaTimezones(): string[] {
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    if (typeof fn === 'function') {
      return fn.call(Intl, 'timeZone');
    }
  } catch {
    /* ignore */
  }
  return [...FALLBACK_IANA_TIMEZONES];
}

function utcOffsetLabel(iana: string, date = new Date()): string {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: iana,
      timeZoneName: 'shortOffset',
    });
    const part = dtf.formatToParts(date).find((p) => p.type === 'timeZoneName');
    if (part?.value && /^GMT[+-]/.test(part.value)) {
      return part.value.replace('GMT', 'UTC');
    }
  } catch {
    /* ignore */
  }
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: iana,
      timeZoneName: 'longOffset',
    });
    const part = formatter.formatToParts(date).find((p) => p.type === 'timeZoneName');
    if (part?.value) return part.value.replace('GMT', 'UTC');
  } catch {
    /* ignore */
  }
  return 'UTC';
}

/** Long TZ name for display, e.g. "West Africa Standard Time" */
export function timezoneFriendlyName(iana: string): string {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: iana,
      timeZoneName: 'long',
    });
    const part = dtf.formatToParts(new Date()).find((p) => p.type === 'timeZoneName');
    if (part?.value) return part.value;
  } catch {
    /* ignore */
  }
  return iana.replace(/_/g, ' ');
}

export type TimezoneOption = {
  iana: string;
  /** e.g. West Africa Standard Time */
  regionLabel: string;
  /** e.g. UTC+01:00 */
  offsetLabel: string;
};

export function buildTimezoneOption(iana: string): TimezoneOption {
  return {
    iana,
    regionLabel: timezoneFriendlyName(iana),
    offsetLabel: utcOffsetLabel(iana),
  };
}

/** Compact offset only, e.g. `UTC+01:00` / `UTC-10:00` (for saved profile row). */
export function formatTimezoneUtcOffset(iana: string): string {
  return utcOffsetLabel(iana);
}

export function formatTimezoneRowDisplay(iana: string): string {
  const { regionLabel, offsetLabel } = buildTimezoneOption(iana);
  return `${regionLabel} · ${offsetLabel}`;
}

let cachedSorted: TimezoneOption[] | null = null;

export function getSortedTimezoneOptions(): TimezoneOption[] {
  if (cachedSorted) return cachedSorted;
  const ids = listIanaTimezones();
  const options = ids.map((iana) => buildTimezoneOption(iana));
  options.sort((a, b) => {
    const off = a.offsetLabel.localeCompare(b.offsetLabel, undefined, { numeric: true });
    if (off !== 0) return off;
    return a.regionLabel.localeCompare(b.regionLabel);
  });
  cachedSorted = options;
  return cachedSorted;
}
