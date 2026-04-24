/** Shared work experience display + API → editor/display row mapping (Profile, Verification Center). */

export type WorkRoleEntry = {
  title: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
};

export type WorkEntry = {
  id?: string;
  organisationName: string;
  industry: string;
  roleLocation: string;
  role: string;
  employmentType: string;
  workMode: string;
  startDate: string;
  endDate: string;
  currency: string;
  salary: string;
  salaryFrequency: string;
  workRoles: WorkRoleEntry[];
  jobDescription: string;
  responsibilitiesText: string;
  achievementsText: string;
  associatedSkills: string;
  otherCompensation: string[];
  otherCompensationInput: string;
  otherCompensationNotes: string;
  selfDeclared: boolean;
  workVerificationStatus?: 'pending' | 'verified';
  verificationMethod?: string | null;
  workVerificationEmail?: string;
  supportingMediaUrl?: string;
};

export const WORK_SALARY_FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'one_time', label: 'One-time' },
] as const;

export function workEmploymentTypeLabel(value: string): string {
  const map: Record<string, string> = {
    full_time: 'Full-time',
    part_time: 'Part-time',
    contract: 'Contract',
    internship: 'Internship',
  };
  return map[value] || value || '—';
}

export function workModeLabel(value: string): string {
  const map: Record<string, string> = {
    global_remote: 'Global Remote',
    remote: 'Location Remote',
    hybrid: 'Hybrid',
    on_site: 'Onsite',
    location: 'Location Remote',
  };
  return map[value] || value || '—';
}

/** Subtitle under job title: organisation · employment type · work mode. */
export function formatWorkExperienceHeaderSubtitle(entry: WorkEntry): string {
  const org = entry.organisationName?.trim() || '—';
  return [org, workEmploymentTypeLabel(entry.employmentType), workModeLabel(entry.workMode)].join(' · ');
}

export function parseWorkYmd(dateStr: string): Date | null {
  const s = dateStr?.trim();
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const d = new Date(`${s.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** ISO `YYYY-MM-DD` first, then `Date.parse` for legacy or imported values. */
export function parseWorkDateForTenure(dateStr: string | undefined): Date | null {
  const s = dateStr?.trim();
  if (!s) return null;
  const iso = parseWorkYmd(s);
  if (iso) return iso;
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t);
  return null;
}

/** Every `YYYY-MM-DD` substring in order (handles values like `06-14 - 2024-09-04`). */
export function extractIsoDatesInOrder(raw: string | undefined): Date[] {
  if (!raw?.trim()) return [];
  const out: Date[] = [];
  const re = /\d{4}-\d{2}-\d{2}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const d = parseWorkYmd(m[0]);
    if (d) out.push(d);
  }
  return out;
}

export function parseSlashMdyAtStart(raw: string | undefined): Date | null {
  const m = raw?.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const mm = parseInt(m[1], 10);
  const dd = parseInt(m[2], 10);
  const yy = parseInt(m[3], 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const d = new Date(yy, mm - 1, dd, 12, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function workRoleIsOngoing(role: WorkRoleEntry): boolean {
  if (role.currentlyWorking) return true;
  const e = (role.endDate ?? '').trim().toLowerCase();
  if (!e) return false;
  return /\bpresent\b|\bcurrent\b|\bnow\b/i.test(e);
}

export function workRoleResolvedStart(role: WorkRoleEntry): Date | null {
  const s = role.startDate?.trim();
  if (!s) return null;
  return (
    parseWorkYmd(s) ||
    parseSlashMdyAtStart(s) ||
    parseWorkDateForTenure(s) ||
    extractIsoDatesInOrder(s)[0] ||
    null
  );
}

export function workRoleResolvedEnd(role: WorkRoleEntry): Date | null {
  if (workRoleIsOngoing(role)) return new Date();
  const raw = (role.endDate ?? '').trim();
  if (!raw) return null;
  const stripped = raw.replace(/\s*[–-]\s*(present|current)\s*$/i, '').trim();
  return (
    parseWorkYmd(stripped) ||
    parseSlashMdyAtStart(stripped) ||
    parseWorkDateForTenure(stripped) ||
    extractIsoDatesInOrder(raw).slice(-1)[0] ||
    null
  );
}

export function workExperienceEffectiveEndDate(entry: WorkEntry): Date {
  const rootEnd = parseWorkYmd(entry.endDate ?? '');
  if (rootEnd) return rootEnd;
  const primary = entry.workRoles[0];
  if (primary && workRoleIsOngoing(primary)) return new Date();
  if (primary?.currentlyWorking) return new Date();
  const roleEnd = parseWorkYmd(primary?.endDate ?? '') || (primary ? workRoleResolvedEnd(primary) : null);
  if (roleEnd) return roleEnd;
  return new Date();
}

function workRoleTimelineSortEndMs(role: WorkRoleEntry): number {
  if (workRoleIsOngoing(role)) return Number.MAX_SAFE_INTEGER;
  return workRoleResolvedEnd(role)?.getTime() ?? 0;
}

/** Roles with titles: ongoing first, then newest end first (for timeline UI). */
export function workRolesForTimelineDisplay(entry: WorkEntry): WorkRoleEntry[] {
  const filtered = entry.workRoles.filter((r) => r.title?.trim());
  return [...filtered].sort((a, b) => {
    const oa = workRoleIsOngoing(a);
    const ob = workRoleIsOngoing(b);
    if (oa !== ob) return ob ? 1 : -1;
    const eb = workRoleTimelineSortEndMs(b);
    const ea = workRoleTimelineSortEndMs(a);
    if (eb !== ea) return eb - ea;
    const sb = workRoleResolvedStart(b)?.getTime() ?? 0;
    const sa = workRoleResolvedStart(a)?.getTime() ?? 0;
    return sb - sa;
  });
}

/**
 * Card header job title: first row of the roles timeline (ongoing first, then newest end) —
 * not necessarily the API primary `role` field (e.g. legacy "Test Engineer" while CCO is current).
 */
export function workLatestRoleTitleForHeader(entry: WorkEntry): string {
  const rows = workRolesForTimelineDisplay(entry);
  const t = rows[0]?.title?.trim();
  if (t) return t;
  return entry.role?.trim() || '';
}

/**
 * Calendar tenure at the organisation: earliest resolved role (or entry) start to latest resolved end
 * (today when any role is ongoing).
 */
export function workTenureYearsAtOrganisation(entry: WorkEntry): number | null {
  const starts: Date[] = [];
  const ends: Date[] = [];

  const pushSpan = (s: Date | null, e: Date | null) => {
    if (s && e && e.getTime() > s.getTime()) {
      starts.push(s);
      ends.push(e);
    }
  };

  for (const r of entry.workRoles.filter((x) => x.title?.trim())) {
    pushSpan(workRoleResolvedStart(r), workRoleResolvedEnd(r));
  }

  const entryRow: WorkRoleEntry = {
    title: ' ',
    startDate: entry.startDate,
    endDate: entry.endDate,
    currentlyWorking: !!(entry.workRoles[0]?.currentlyWorking && !entry.endDate?.trim()),
  };
  const entryStart = workRoleResolvedStart(entryRow);
  let entryEnd = workRoleResolvedEnd(entryRow);
  if (!entryEnd && entryStart) {
    entryEnd = workExperienceEffectiveEndDate(entry);
  }
  pushSpan(entryStart, entryEnd);

  if (!starts.length || !ends.length) return null;
  const minStart = new Date(Math.min(...starts.map((d) => d.getTime())));
  const maxEnd = new Date(Math.max(...ends.map((d) => d.getTime())));
  const ms = maxEnd.getTime() - minStart.getTime();
  if (ms <= 0) return 0;
  return ms / (365.25 * 24 * 60 * 60 * 1000);
}

/** Parses `Other roles: Title (start – end); …` produced when syncing multiple roles to the API. */
export function parseOtherRolesLine(line: string): WorkRoleEntry[] {
  const m = line.trim().match(/^Other roles:\s*(.+)$/i);
  if (!m?.[1]) return [];
  const segments = m[1]
    .split(/;\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: WorkRoleEntry[] = [];
  for (const seg of segments) {
    const inner = seg.match(/^(.+?)\s*\(\s*(.*?)\s*[–-]\s*(.*?)\s*\)\s*$/);
    if (!inner) continue;
    const title = inner[1].trim();
    const d1 = inner[2].trim();
    const d2 = inner[3].trim();
    const currentlyWorking = d2.toLowerCase() === 'present';
    out.push({
      title,
      startDate: d1 === '?' ? '' : d1,
      endDate: currentlyWorking ? '' : d2 === '?' ? '' : d2,
      currentlyWorking,
    });
  }
  return out;
}

export function formatWorkRoleDateRange(role: WorkRoleEntry): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const start = workRoleResolvedStart(role);
  const startStr = start ? fmt(start) : role.startDate?.trim() || '—';
  if (workRoleIsOngoing(role)) {
    return `${startStr} — Present`;
  }
  const end = workRoleResolvedEnd(role);
  const endStr = end ? fmt(end) : role.endDate?.trim() || '—';
  return `${startStr} — ${endStr}`;
}

export function workSalaryFrequencyDisplay(value: string): string {
  const opt = WORK_SALARY_FREQUENCY_OPTIONS.find((o) => o.value === value);
  if (opt) return opt.label;
  const v = value?.trim();
  return v || '—';
}

export function formatWorkRemunerationLine(entry: WorkEntry): string {
  const cur = entry.currency?.trim() || 'USD';
  const sal = entry.salary?.trim();
  if (!sal) return '—';
  return `${cur} ${sal} / ${workSalaryFrequencyDisplay(entry.salaryFrequency)}`;
}

export function formatWorkCompensationSummary(entry: WorkEntry): string {
  const notes = entry.otherCompensationNotes?.trim();
  if (notes) return notes;
  const parts = (entry.otherCompensation ?? []).map((p) => p?.trim()).filter(Boolean);
  if (parts.length) return parts.join(', ');
  return '—';
}

export function workAssociatedSkillTags(entry: WorkEntry): string[] {
  const raw = entry.associatedSkills?.trim();
  if (!raw) return [];
  return raw
    .split(/[,;|\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Map API / profile `workExperience` row to the display shape used by Verification Center. */
export function apiWorkExperienceToWorkEntry(w: Record<string, unknown>): WorkEntry {
  const sr = w.salaryRange && typeof w.salaryRange === 'object' ? (w.salaryRange as Record<string, unknown>) : null;
  const startD = w.startDate ? (typeof w.startDate === 'string' ? w.startDate.slice(0, 10) : '') : '';
  const endD = w.endDate ? (typeof w.endDate === 'string' ? w.endDate.slice(0, 10) : '') : '';
  const respArr = Array.isArray(w.responsibilities)
    ? w.responsibilities.filter((x: unknown): x is string => typeof x === 'string')
    : [];
  const otherIdx = respArr.findIndex((a: string) => /^Other roles:\s*/i.test(a));
  const respWithoutOther =
    otherIdx >= 0 ? [...respArr.slice(0, otherIdx), ...respArr.slice(otherIdx + 1)] : [...respArr];
  const parsedExtras =
    otherIdx >= 0 && typeof respArr[otherIdx] === 'string' ? parseOtherRolesLine(respArr[otherIdx] as string) : [];
  const achArr = Array.isArray(w.achievements)
    ? w.achievements.filter((x: unknown): x is string => typeof x === 'string')
    : [];
  const ocIdxAch = achArr.findIndex((a: string) => /^Other compensation:\s*/i.test(a));
  let otherCompensationFromApi: string[] = [];
  let achForSkillsAndText = achArr;
  if (ocIdxAch >= 0) {
    const line = achArr[ocIdxAch] as string;
    const m = line.match(/^Other compensation:\s*(.+)$/i);
    if (m?.[1]) {
      otherCompensationFromApi = m[1]
        .split(/\s*\|\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    achForSkillsAndText = [...achArr.slice(0, ocIdxAch), ...achArr.slice(ocIdxAch + 1)];
  }
  const skillsLine = achForSkillsAndText.find((a: string) => /^Skills:\s*/i.test(a));
  const achievementsOnly = achForSkillsAndText.filter((a: string) => !/^Skills:\s*/i.test(a));
  const vMethod = typeof w.verificationMethod === 'string' ? w.verificationMethod : '';
  const verified = w.verificationStatus === 'verified';
  const selfDeclared = !verified && vMethod === 'self_declaration';
  const jobDescFromApi =
    typeof (w as { jobDescription?: unknown }).jobDescription === 'string'
      ? String((w as { jobDescription?: string }).jobDescription).trim()
      : '';
  const locRaw = w.location && typeof w.location === 'object' ? w.location : {};
  const loc = locRaw as Record<string, unknown>;
  const roleLocFromApi = typeof loc.roleLocation === 'string' ? String(loc.roleLocation).trim() : '';
  const legacyLocLine = [loc.city, loc.state, loc.country]
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean)
    .join(', ');

  return {
    id: typeof w.id === 'string' ? w.id : undefined,
    organisationName: typeof w.organisationName === 'string' ? w.organisationName : '',
    industry: typeof w.industry === 'string' ? w.industry : '',
    roleLocation: roleLocFromApi || legacyLocLine,
    role: typeof w.role === 'string' ? w.role : '',
    employmentType: typeof w.employmentType === 'string' ? w.employmentType : '',
    workMode: typeof w.workMode === 'string' ? w.workMode : '',
    startDate: startD,
    endDate: endD,
    currency: typeof w.currency === 'string' ? w.currency : 'USD',
    salary: sr != null && (sr.min != null || sr.max != null) ? String(sr.min ?? sr.max ?? '') : '',
    salaryFrequency: typeof w.paymentMode === 'string' ? w.paymentMode : 'monthly',
    workRoles: [
      {
        title: typeof w.role === 'string' ? w.role : '',
        startDate: startD,
        endDate: endD,
        currentlyWorking: !!(w.currentlyWorking as boolean) || !endD,
      },
      ...parsedExtras,
    ],
    jobDescription: jobDescFromApi,
    responsibilitiesText: respWithoutOther.join('\n'),
    achievementsText: achievementsOnly.join('\n'),
    associatedSkills: skillsLine ? skillsLine.replace(/^Skills:\s*/i, '').trim() : '',
    otherCompensation: otherCompensationFromApi,
    otherCompensationInput: '',
    otherCompensationNotes: '',
    selfDeclared,
    workVerificationStatus: verified ? 'verified' : 'pending',
    verificationMethod: vMethod || undefined,
    workVerificationEmail: typeof w.workVerificationEmail === 'string' ? w.workVerificationEmail : '',
    supportingMediaUrl: typeof w.supportingMediaUrl === 'string' ? w.supportingMediaUrl : '',
  };
}
