import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  HiAcademicCap,
  HiBadgeCheck,
  HiBriefcase,
  HiCheckCircle,
  HiChevronDown,
  HiExclamationCircle,
  HiFolder,
  HiLocationMarker,
} from 'react-icons/hi';
import { api } from '@/services/api';

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
};

const WORK_MODE_LABELS: Record<string, string> = {
  on_site: 'On-site',
  remote: 'Remote',
  hybrid: 'Hybrid',
  global_remote: 'Global Remote',
  location: 'Location remote',
};

const WORK_SALARY_FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  annually: 'Annually',
  weekly: 'Weekly',
  hourly: 'Hourly',
  one_time: 'One-time',
};

const RESIDENCE_TYPE_LABELS: Record<string, string> = {
  own_home: 'I own my home',
  tenant: 'I am a registered tenant of a rental property',
  hotel: 'I am staying in a hotel apartment for at least 3 months',
  company: 'I live in a company sponsored residence',
};

const PROGRAM_LEVEL_LABELS: Record<string, string> = {
  postgraduate: 'Postgraduate',
  undergraduate: 'Undergraduate',
};

const EDUCATION_LEVEL_LABELS: Record<string, string> = {
  high_school: 'High School',
  associate: 'Associate',
  bachelor: 'Bachelor',
  master: 'Master',
  doctorate: 'Doctorate',
  certificate: 'Certificate',
  diploma: 'Diploma',
};

const SCHOOL_TYPE_LABELS: Record<string, string> = {
  university: 'University',
  polytechnic: 'Polytechnic',
  college: 'College',
  institute: 'Institute',
  academy: 'Academy',
  high_school: 'High School',
  secondary_school: 'Secondary School',
  primary_school: 'Primary School',
  kindergarten: 'Kindergarten',
  nursery_school: 'Nursery School',
  accelerator: 'Accelerator',
  secondary: 'Secondary school',
  primary: 'Primary school',
  technical: 'Technical / vocational',
  other: 'Other',
};

const QUALIFICATION_LABELS: Record<string, string> = {
  BSc: 'B.Sc.',
  BA: 'B.A.',
  BTech: 'B.Tech.',
  MSc: 'M.Sc.',
  MA: 'M.A.',
  MBA: 'MBA',
  PhD: 'Ph.D.',
  MD: 'M.D.',
  LLB: 'LL.B.',
  LLM: 'LL.M.',
  HND: 'HND',
  ND: 'ND',
  Certificate: 'Certificate',
  Diploma: 'Diploma',
  WAEC_SSCE: 'WAEC / SSCE',
  Other: 'Other',
};

const MONTH_NUM_LABELS: Record<string, string> = {
  '01': 'January',
  '02': 'February',
  '03': 'March',
  '04': 'April',
  '05': 'May',
  '06': 'June',
  '07': 'July',
  '08': 'August',
  '09': 'September',
  '10': 'October',
  '11': 'November',
  '12': 'December',
};

const COST_FREQUENCY_LABELS: Record<string, string> = {
  one_time: 'One-time',
  monthly: 'Monthly',
  annually: 'Annually',
  semester: 'Per semester',
  weekly: 'Weekly',
};

const LOCATION_DOC_LABELS: Record<string, string> = {
  utility_bill: 'Utility bill',
  bank_statement: 'Bank statement',
  lease_agreement: 'Lease agreement',
  government_letter: 'Government letter',
  other: 'Other',
};

function displayText(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string' ? v.trim() : String(v);
  return s;
}

function formatProfileDateTime(v: unknown): string {
  if (v == null) return '—';
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? '—' : v.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }
  const raw = displayText(v as string);
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Prisma `VerificationStatus` and similar string values from the API. */
function educationVerificationStatusDisplay(v: unknown): string {
  const key = String(v ?? '')
    .toLowerCase()
    .trim();
  if (!key) return '';
  const map: Record<string, string> = {
    pending: 'Pending',
    under_review: 'Under review',
    verified: 'Verified',
    rejected: 'Rejected',
    not_activated: 'Not activated',
  };
  if (map[key]) return map[key];
  return key.replace(/_/g, ' ');
}

function educationVerificationDocumentsDd(doc: unknown): ReactNode {
  if (doc == null) return '—';
  if (!Array.isArray(doc)) {
    if (typeof doc === 'object') {
      try {
        const s = JSON.stringify(doc);
        return s.length > 280 ? `${s.slice(0, 277)}…` : s;
      } catch {
        return '—';
      }
    }
    const t = displayText(doc as string);
    return t || '—';
  }
  const rows = doc.filter((x) => x && typeof x === 'object');
  if (rows.length === 0) return '—';
  return (
    <ul className="mt-0.5 list-none space-y-1 p-0">
      {rows.map((item: any, i: number) => {
        const url = displayText(item?.fileUrl);
        const name = displayText(item?.fileName) || `Document ${i + 1}`;
        const typeLabel = displayText(item?.type);
        const label = typeLabel ? `${typeLabel}: ${name}` : name;
        return (
          <li key={i} className="text-[15px] font-bold leading-snug text-gray-900">
            {url ? (
              <a
                href={resolveUrl(url)}
                target="_blank"
                rel="noopener noreferrer"
                className={PROFILE_FIELD_LINK_CLASS}
              >
                {label}
              </a>
            ) : (
              label
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Label + value stack for profile tab cards: uppercase label, bold value (matches profile spec). */
const PROFILE_FIELD_LABEL_CLASS =
  'mb-1 block text-[11px] font-medium uppercase tracking-wider text-gray-500 leading-tight';
const PROFILE_FIELD_VALUE_CLASS = 'text-[15px] font-bold leading-snug text-gray-900';
const PROFILE_FIELD_LINK_CLASS =
  'text-[15px] font-bold text-brand-600 leading-snug hover:underline break-all';
/** Pills for comma / list skills (light blue treatment). */
const PROFILE_CHIP_CLASS =
  'inline-flex max-w-full rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-900';
/** Inset panels for milestones, long address blocks, etc. */
const PROFILE_INSET_SECTION_CLASS = 'rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5';

function formatIsoDate(s: string | undefined | null): string {
  const raw = displayText(s);
  if (!raw) return '—';
  const d = raw.slice(0, 10);
  const t = Date.parse(`${d}T12:00:00`);
  if (Number.isNaN(t)) return raw;
  return new Date(t).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function monthYearFromIso(iso: string | undefined | null): string {
  const raw = displayText(iso);
  if (!raw) return '—';
  const m = raw.match(/^(\d{4})-(\d{2})/);
  if (!m) return formatIsoDate(raw);
  const month = MONTH_NUM_LABELS[m[2]] || m[2];
  return `${month} ${m[1]}`;
}

/** Compact duration label e.g. `Apr/2030` (profile education spec). */
function shortSlashMonthYearFromIso(iso: string | undefined | null): string {
  const raw = displayText(iso);
  if (!raw) return '—';
  const m = raw.match(/^(\d{4})-(\d{2})/);
  if (!m) return '—';
  const y = Number(m[1]);
  const monthNum = parseInt(m[2], 10);
  if (!Number.isFinite(y) || monthNum < 1 || monthNum > 12) return '—';
  const mon = new Date(y, monthNum - 1, 1).toLocaleDateString('en-US', { month: 'short' });
  return `${mon}/${y}`;
}

function splitTextToProfileChips(raw: string): string[] | null {
  const t = raw.trim();
  if (!t) return null;
  const parts = t
    .split(/[,;]|\n+|(?:\s*•\s*)+/u)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1 && parts[0].length > 140) return null;
  return parts;
}

function ProfileChipList({ text }: { text: string }) {
  const raw = displayText(text);
  if (!raw) return <>—</>;
  const chips = splitTextToProfileChips(raw);
  if (!chips) {
    return <MultilineFieldValue text={raw} />;
  }
  return (
    <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
      {chips.map((c, i) => (
        <li key={i} className={PROFILE_CHIP_CLASS}>
          {c}
        </li>
      ))}
    </ul>
  );
}

function resolveUrl(pathOrUrl: string): string {
  const u = pathOrUrl.trim();
  if (!u) return '';
  if (u.startsWith('http')) return u;
  const base = api.defaults.baseURL || '';
  return `${base.replace(/\/$/, '')}${u.startsWith('/') ? '' : '/'}${u}`;
}

function Field({
  label,
  value,
  span2,
}: {
  label: string;
  value: ReactNode;
  span2?: boolean;
}) {
  const empty =
    value === null ||
    value === undefined ||
    value === '' ||
    (typeof value === 'string' && !value.trim());
  return (
    <div className={span2 ? 'col-span-full' : 'min-w-0'}>
      <dt className={PROFILE_FIELD_LABEL_CLASS}>{label}</dt>
      <dd className={`min-w-0 ${PROFILE_FIELD_VALUE_CLASS}`}>{empty ? '—' : value}</dd>
    </div>
  );
}

function MultilineFieldValue({ text }: { text: string }) {
  const t = displayText(text);
  if (!t) return <>—</>;
  return <span className="whitespace-pre-wrap break-words text-[15px] font-normal leading-relaxed text-gray-900">{t}</span>;
}

/** Record card shell + 2-col primary grid + generous vertical rhythm. */
const CARD_SHELL = 'space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5';
const DETAIL_GRID = 'grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2';
const DETAIL_STACK_FULL = 'grid grid-cols-1 gap-y-5';

function formatWorkCardSubtitle(exp: any): string {
  const industry = displayText(exp.industry) || '—';
  const et =
    EMPLOYMENT_TYPE_LABELS[displayText(exp.employmentType)] ||
    displayText(exp.employmentType) ||
    '—';
  const wm = WORK_MODE_LABELS[displayText(exp.workMode)] || displayText(exp.workMode) || '—';
  return [industry, et, wm].join(' · ');
}

function resolveWorkVerificationRowStatus(exp: any): 'pending' | 'verified' {
  if (exp.workVerificationStatus === 'verified') return 'verified';
  if (displayText(exp.verificationStatus).toLowerCase() === 'verified') return 'verified';
  if (exp.verified === true) return 'verified';
  return 'pending';
}

function isWorkSelfDeclaredForProfile(exp: any): boolean {
  const m = String(exp?.verificationMethod ?? '')
    .toLowerCase()
    .replace(/-/g, '_');
  if (m === 'self_declaration' || m === 'self_declared') return true;
  if (m === 'work_email' || m === 'upload_document') return false;
  return exp.selfDeclared === true;
}

function formatEducationProfileSubtitle(edu: any): string {
  const level =
    EDUCATION_LEVEL_LABELS[displayText(edu.levelOfEducation)] ||
    displayText(edu.levelOfEducation) ||
    '—';
  const field = displayText(edu.fieldOfStudy) || '—';
  const start = monthYearFromIso(edu.startDate);
  const end = edu.currentlyAttending ? 'ongoing' : monthYearFromIso(edu.endDate);
  let datePart = '—';
  if (start !== '—' && end !== '—') datePart = `${start} — ${end}`;
  else if (start !== '—') datePart = start;
  else if (end !== '—') datePart = end;
  const country = displayText(edu.country) || '—';
  return [level, field, datePart, country].join(' · ');
}

function resolveEducationRowStatus(edu: any): 'pending' | 'verified' {
  if (edu.eduVerificationStatus === 'verified') return 'verified';
  if (displayText(edu.verificationStatus).toLowerCase() === 'verified') return 'verified';
  if (edu.verified === true) return 'verified';
  return 'pending';
}

function educationVerificationMethodDisplay(m: string | undefined | null): string {
  const key = String(m ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  const map: Record<string, string> = {
    student_email: 'Student email',
    upload_document: 'Uploaded document',
    digital_verify: 'Digital verification',
    self_declaration: 'Self declared',
    self_declared: 'Self declared',
  };
  if (map[key]) return map[key];
  const raw = displayText(m);
  return raw ? raw.replace(/_/g, ' ') : '';
}

function isEducationSelfDeclaredForProfile(edu: any): boolean {
  const key = String(edu?.verificationMethod ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  if (key === 'self_declaration' || key === 'self_declared') return true;
  return edu?.selfDeclared === true;
}

function programLevelDisplay(pl: string | undefined | null): string {
  const raw = displayText(pl).toLowerCase().replace(/-/g, '_');
  if (PROGRAM_LEVEL_LABELS[raw]) return PROGRAM_LEVEL_LABELS[raw];
  const t = displayText(pl);
  return t ? t.replace(/_/g, ' ') : '';
}

function workVerificationMethodDisplay(m: string | undefined | null): string {
  const key = String(m ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  const map: Record<string, string> = {
    work_email: 'Work email',
    upload_document: 'Uploaded document',
    self_declaration: 'Self declared',
    self_declared: 'Self declared',
  };
  if (map[key]) return map[key];
  const raw = displayText(m);
  return raw ? raw.replace(/_/g, ' ') : '';
}

function projectVerificationMethodDisplay(m: string | undefined | null): string {
  const key = String(m ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  const map: Record<string, string> = {
    upload_document: 'Uploaded document',
    self_declaration: 'Self declared',
    self_declared: 'Self declared',
    digital_verify: 'Digital verification',
  };
  if (map[key]) return map[key];
  const raw = displayText(m);
  return raw ? raw.replace(/_/g, ' ') : '';
}

function salaryFrequencyLabel(v: string | undefined | null): string {
  const key = displayText(v).toLowerCase();
  return WORK_SALARY_FREQUENCY_LABELS[key] || displayText(v) || '—';
}

function parseWorkResponsibilities(resp: unknown): { body: string; otherRolesDetail: string } {
  const arr = Array.isArray(resp) ? resp.filter((x): x is string => typeof x === 'string') : [];
  const otherIdx = arr.findIndex((a) => /^Other roles:\s*/i.test(a));
  const main =
    otherIdx >= 0 ? [...arr.slice(0, otherIdx), ...arr.slice(otherIdx + 1)] : [...arr];
  const otherLine = otherIdx >= 0 ? String(arr[otherIdx]).replace(/^Other roles:\s*/i, '').trim() : '';
  return { body: main.map((s) => s.trim()).filter(Boolean).join('\n'), otherRolesDetail: otherLine };
}

function parseWorkAchievements(ach: unknown): { body: string; skills: string } {
  const arr = Array.isArray(ach)
    ? ach.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
    : [];
  let skills = '';
  const body: string[] = [];
  for (const line of arr) {
    const sm = line.match(/^Skills:\s*(.+)$/i);
    if (sm) skills = sm[1].trim();
    else body.push(line);
  }
  return { body: body.join('\n'), skills };
}

function maskIdNumber(raw: string | undefined | null): string {
  const s = displayText(raw);
  if (!s) return '';
  if (s.length <= 4) return '••••';
  return `••••${s.slice(-4)}`;
}

const ID_TYPE_LABELS: Record<string, string> = {
  national_id: 'National ID',
  passport: 'Passport',
  drivers_license: "Driver's License",
  voters_card: "Voter's Card",
};

type LocationRowStatus = 'pending' | 'verified' | 'self_declared';

function resolveLocationRowStatus(loc: any): LocationRowStatus {
  const s = displayText(loc.verificationStatus).toLowerCase();
  if (s === 'verified') return 'verified';
  if (s === 'self_declared') return 'self_declared';
  return 'pending';
}

function formatProjectCardSubtitle(entry: any): string {
  const parts: string[] = [];
  const desc = displayText(entry.description);
  if (desc) parts.push(desc.length > 100 ? `${desc.slice(0, 97)}…` : desc);
  const link = displayText(entry.projectLink);
  if (link) parts.push(link);
  if (displayText(entry.mediaUrl)) parts.push('Media attached');
  const team: { name?: string; role?: string }[] = Array.isArray(entry.teamMembers)
    ? entry.teamMembers
    : [];
  const n = team.filter((m) => displayText(m?.name) || displayText(m?.role)).length;
  if (n > 0) parts.push(`${n} team member${n === 1 ? '' : 's'}`);
  return parts.length ? parts.join(' · ') : 'No details yet';
}

function resolveProjectRowStatus(proj: any): 'pending' | 'verified' {
  if (proj.projectVerificationStatus === 'verified') return 'verified';
  if (displayText(proj.verificationStatus).toLowerCase() === 'verified') return 'verified';
  if (proj.verified === true) return 'verified';
  return 'pending';
}

function formatCertificateProfileSubtitle(c: any): string {
  const parts: string[] = [];
  if (displayText(c.issuedBy)) parts.push(`Issued by ${displayText(c.issuedBy)}`);
  const id = formatIsoDate(c.issuedDate);
  if (id !== '—') parts.push(`Issued ${id}`);
  const ex = formatIsoDate(c.expirationDate);
  if (ex !== '—') parts.push(`Expires ${ex}`);
  if (displayText(c.credentialId)) parts.push(`ID ${displayText(c.credentialId)}`);
  return parts.length ? parts.join(' · ') : 'No dates or credential ID';
}

function resolveCertRowVerified(cert: any): boolean {
  return cert.certVerificationStatus === 'verified' || cert.verified === true;
}

function ProfileWorkRecordCard({ exp }: { exp: any }) {
  const [open, setOpen] = useState(false);
  const loc = exp.location && typeof exp.location === 'object' ? exp.location : {};
  const city = displayText((loc as any).city);
  const state = displayText((loc as any).state);
  const country = displayText((loc as any).country);
  const locLine = [city, state, country].filter(Boolean).join(', ') || '—';
  const sr = exp.salaryRange && typeof exp.salaryRange === 'object' ? exp.salaryRange : null;
  let salaryLine = '—';
  if (sr && (sr.min != null || sr.max != null)) {
    const cur = displayText(exp.currency) || '';
    const a = sr.min != null ? Number(sr.min) : null;
    const b = sr.max != null ? Number(sr.max) : null;
    if (a != null && b != null && a === b) {
      salaryLine = cur ? `${cur} ${a}` : String(a);
    } else if (a != null || b != null) {
      salaryLine = cur ? `${cur} ${a ?? '—'} – ${b ?? '—'}` : `${a ?? '—'} – ${b ?? '—'}`;
    }
  }
  const selfDeclared = isWorkSelfDeclaredForProfile(exp);
  const { body: respBody, otherRolesDetail } = parseWorkResponsibilities(exp.responsibilities);
  const { body: achBody, skills: achSkills } = parseWorkAchievements(exp.achievements);
  const rowStatus = resolveWorkVerificationRowStatus(exp);
  const org = displayText(exp.organisationName);
  const role = displayText(exp.role);
  const title = org || role || 'Work experience';
  const subtitle =
    org && role ? `${role} · ${formatWorkCardSubtitle(exp)}` : formatWorkCardSubtitle(exp);

  return (
    <li className={CARD_SHELL}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full flex-col gap-2 rounded-xl text-left outline-none ring-brand-500/0 transition-shadow focus-visible:ring-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 -m-px p-px sm:-mx-0.5"
      >
        <div className="flex min-w-0 flex-1 gap-2 sm:gap-2.5">
          <HiBriefcase className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 sm:h-5 sm:w-5" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold leading-snug text-gray-900">{title}</p>
            <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">{subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-stretch sm:self-start">
          <div className="flex flex-wrap justify-end gap-1">
            {selfDeclared && (
              <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-900">
                Self Declared
              </span>
            )}
            {rowStatus === 'pending' && (
              <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                Pending
              </span>
            )}
            {rowStatus === 'verified' && (
              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                Verified
              </span>
            )}
          </div>
          <HiChevronDown
            className={`mt-0.5 h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </div>
      </button>

      {open ? (
        <div className="mt-4 space-y-6 border-t border-gray-100 pt-4">
          {selfDeclared ? (
            <>
              <p className="text-[11px] font-medium text-gray-500">Self declared — optional full verification</p>
              <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
                <HiExclamationCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <span>
                  Self Declaration — limited network access. Use the Verification Center to verify with work email or a
                  supporting document.
                </span>
              </div>
            </>
          ) : null}

          <dl className={DETAIL_GRID}>
            <Field label="Name of organisation" value={displayText(exp.organisationName)} />
            <Field label="Industry / Sector" value={displayText(exp.industry)} />
            <Field label="Role / Position" value={displayText(exp.role)} />
            <Field
              label="Employment type"
              value={EMPLOYMENT_TYPE_LABELS[exp.employmentType] || displayText(exp.employmentType)}
            />
            <Field label="Work mode" value={WORK_MODE_LABELS[exp.workMode] || displayText(exp.workMode)} />
            <Field label="Start date" value={formatIsoDate(exp.startDate)} />
            <Field
              label="End date"
              value={
                exp.currentlyWorking || !displayText(exp.endDate) ? 'Present' : formatIsoDate(exp.endDate)
              }
            />
            <Field label="Work location" value={locLine} />
            <Field label="Salary" value={salaryLine} />
            <Field label="Pay frequency" value={salaryFrequencyLabel(exp.paymentMode)} />
          </dl>

          <div className={PROFILE_INSET_SECTION_CLASS}>
            <p className={PROFILE_FIELD_LABEL_CLASS}>Job description</p>
            <div className="mt-2">
              <MultilineFieldValue text={displayText(exp.jobDescription)} />
            </div>
          </div>

          <dl className={DETAIL_STACK_FULL}>
            <Field label="Responsibilities" value={<ProfileChipList text={respBody} />} span2 />
            <Field label="Other roles" value={<MultilineFieldValue text={otherRolesDetail} />} span2 />
            <Field
              label="Achievements & additional notes"
              value={<ProfileChipList text={achBody} />}
              span2
            />
            <Field
              label="Associated skills"
              value={
                <ProfileChipList text={displayText(achSkills || exp.associatedSkills)} />
              }
              span2
            />
            <div className="col-span-full">
              <dt className={PROFILE_FIELD_LABEL_CLASS}>Verification</dt>
              <dd className={PROFILE_FIELD_VALUE_CLASS}>
                {selfDeclared ? (
                  'Self declared'
                ) : (
                  <span className="space-y-1 text-[15px] font-bold leading-snug text-gray-900">
                    {workVerificationMethodDisplay(exp.verificationMethod) ? (
                      <div>Method: {workVerificationMethodDisplay(exp.verificationMethod)}</div>
                    ) : null}
                    {displayText(exp.workVerificationEmail) ? (
                      <div>Work email: {displayText(exp.workVerificationEmail)}</div>
                    ) : null}
                    {displayText(exp.supportingMediaUrl) ? (
                      <div>
                        Document:{' '}
                        <a
                          href={resolveUrl(displayText(exp.supportingMediaUrl))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={PROFILE_FIELD_LINK_CLASS}
                        >
                          Open
                        </a>
                      </div>
                    ) : null}
                    {!workVerificationMethodDisplay(exp.verificationMethod) &&
                    !displayText(exp.workVerificationEmail) &&
                    !displayText(exp.supportingMediaUrl) ? (
                      <span>—</span>
                    ) : null}
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </li>
  );
}

export function ProfileWorkSection({ items }: { items: any[] }) {
  return (
    <ul className="space-y-3">
      {items.map((exp, index) => (
        <ProfileWorkRecordCard key={exp.id ?? index} exp={exp} />
      ))}
    </ul>
  );
}

function ProfileEducationRecordCard({ edu }: { edu: any }) {
  const [open, setOpen] = useState(false);
  const milestones = Array.isArray(edu.programProgression) ? edu.programProgression : [];
  const eduStatus = resolveEducationRowStatus(edu);
  const eduSelfDeclared = isEducationSelfDeclaredForProfile(edu);
  const title = displayText(edu.institutionName) || 'Education';
  const subtitle = formatEducationProfileSubtitle(edu);
  const vMethodLabel = educationVerificationMethodDisplay(edu.verificationMethod);
  const rowVs =
    educationVerificationStatusDisplay(edu.verificationStatus) ||
    educationVerificationStatusDisplay(edu.eduVerificationStatus) ||
    '—';
  const costStr =
    edu.costOfEducation != null && edu.costOfEducation !== ''
      ? `${displayText(edu.currency) || ''} ${String(edu.costOfEducation)}`.trim()
      : '—';
  const loanStr =
    edu.pendingLoanAmount != null && edu.pendingLoanAmount !== ''
      ? `${displayText(edu.loanCurrency) || ''} ${String(edu.pendingLoanAmount)}`.trim()
      : 'Has no loan';
  /** When explicitly false, omit loan amount and repayment rows (matches Verification Center). */
  const hideLoanFields =
    edu.hasLoan === false || displayText(edu.hasLoan).toLowerCase() === 'false';
  const dA = shortSlashMonthYearFromIso(edu.startDate);
  const dB = edu.currentlyAttending ? 'Ongoing' : shortSlashMonthYearFromIso(edu.endDate);
  let durationLine = '—';
  if (dA !== '—' && dB !== '—') durationLine = `${dA} — ${dB}`;
  else if (dA !== '—') durationLine = dA;
  else if (dB !== '—') durationLine = dB;

  return (
    <li className={CARD_SHELL}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full flex-col gap-2 rounded-xl text-left outline-none ring-brand-500/0 transition-shadow focus-visible:ring-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 -m-px p-px sm:-mx-0.5"
      >
        <div className="flex min-w-0 flex-1 gap-2 sm:gap-2.5">
          <HiAcademicCap className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 sm:h-5 sm:w-5" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold leading-snug text-gray-900">{title}</p>
            <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">{subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-stretch sm:self-start">
          <div className="flex flex-wrap justify-end gap-1">
            {edu.isDefault === true && (
              <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-800">
                Default
              </span>
            )}
            {eduSelfDeclared && (
              <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-900">
                Self declared
              </span>
            )}
            {eduStatus === 'pending' && (
              <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                Pending
              </span>
            )}
            {eduStatus === 'verified' && (
              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                Verified
              </span>
            )}
          </div>
          <HiChevronDown
            className={`mt-0.5 h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </div>
      </button>

      {open ? (
        <div className="mt-4 space-y-6 border-t border-gray-100 pt-4">
          {eduSelfDeclared ? (
            <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
              <HiExclamationCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <span>
                Self Declaration — limited network access. Use the Verification Center to verify with student email or
                a supporting document.
              </span>
            </div>
          ) : null}

          <dl className={DETAIL_GRID}>
            <Field label="Institution" value={displayText(edu.institutionName)} />
            <Field
              label="School type"
              value={
                SCHOOL_TYPE_LABELS[displayText(edu.schoolType)] || displayText(edu.schoolType) || '—'
              }
            />
            <Field
              label="Level"
              value={
                EDUCATION_LEVEL_LABELS[displayText(edu.levelOfEducation)] ||
                displayText(edu.levelOfEducation) ||
                '—'
              }
            />
            <Field
              label="Qualification"
              value={
                QUALIFICATION_LABELS[displayText(edu.degreeType)] ||
                displayText(edu.degreeType) ||
                '—'
              }
            />
            <Field label="Field of study" value={displayText(edu.fieldOfStudy)} span2 />
            <Field label="Grade" value={displayText(edu.grade)} />
            <Field label="Duration" value={durationLine} />
            <Field label="Country" value={displayText(edu.country)} />
            <Field label="Cost" value={costStr} />
            <Field
              label="Cost frequency"
              value={
                COST_FREQUENCY_LABELS[displayText(edu.costFrequency)] ||
                displayText(edu.costFrequency) ||
                '—'
              }
            />
            <Field label="Industry / sector" value={displayText(edu.institutionIndustry)} />
            <Field label="Currently attending" value={edu.currentlyAttending ? 'Yes' : 'No'} />
            {!hideLoanFields ? (
              <>
                <Field label="Pending loan" value={loanStr} />
                <Field label="Program level" value={programLevelDisplay(edu.programLevel)} />
                <Field
                  label="Loan repayment frequency"
                  value={
                    COST_FREQUENCY_LABELS[displayText(edu.loanRepaymentFrequency)] ||
                    displayText(edu.loanRepaymentFrequency) ||
                    '—'
                  }
                />
              </>
            ) : (
              <Field label="Program level" value={programLevelDisplay(edu.programLevel)} />
            )}
          </dl>

          <dl className={DETAIL_STACK_FULL}>
            <Field label="Verification method" value={vMethodLabel || '—'} span2 />
            <Field label="Row verification status" value={rowVs} span2 />
            <Field label="Student verification email" value={displayText(edu.studentVerificationEmail)} span2 />
            <Field label="Scholarships & aid" value={displayText(edu.scholarshipsAndAid)} span2 />
            <Field
              label="Program description"
              value={<MultilineFieldValue text={displayText(edu.programDescription)} />}
              span2
            />
            <Field
              label="Coursework / responsibilities"
              value={<ProfileChipList text={displayText(edu.academicResponsibilities)} />}
              span2
            />
            <Field
              label="Honors / achievements"
              value={<MultilineFieldValue text={displayText(edu.academicAchievements)} />}
              span2
            />
          </dl>

          <div className={PROFILE_INSET_SECTION_CLASS}>
            <p className={PROFILE_FIELD_LABEL_CLASS}>Program milestones</p>
            {milestones.length === 0 ? (
              <p className="mt-2 text-[15px] font-bold leading-snug text-gray-900">—</p>
            ) : (
              <ul className="mt-2 space-y-3">
                {milestones.map((m: any, mi: number) => (
                  <li
                    key={mi}
                    className="border-b border-gray-200/90 pb-3 text-sm last:border-0 last:pb-0"
                  >
                    <p className="font-bold text-gray-900">{displayText(m.title) || '—'}</p>
                    <p className="mt-1 text-xs font-medium text-gray-600">
                      {formatIsoDate(m.startDate)} – {m.currentlyActive ? 'Active' : formatIsoDate(m.endDate)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={PROFILE_INSET_SECTION_CLASS}>
            <p className={PROFILE_FIELD_LABEL_CLASS}>Activities & societies</p>
            <div className="mt-2">
              <MultilineFieldValue text={displayText(edu.activitiesSocieties)} />
            </div>
          </div>

          <dl className={DETAIL_STACK_FULL}>
            <Field
              label="Associated skills"
              value={<ProfileChipList text={displayText(edu.associatedSkills)} />}
              span2
            />
          </dl>

          {displayText(edu.supportingMediaUrl) ? (
              <div className="col-span-full">
                <dt className={PROFILE_FIELD_LABEL_CLASS}>Supporting media</dt>
                <dd>
                  <a
                    href={resolveUrl(edu.supportingMediaUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={PROFILE_FIELD_LINK_CLASS}
                  >
                    View file
                  </a>
                </dd>
              </div>
            ) : (
              <Field label="Supporting media" value="—" span2 />
            )}
            <div className="col-span-full">
              <dt className={PROFILE_FIELD_LABEL_CLASS}>Verification documents</dt>
              <dd className="min-w-0 text-[15px] font-bold leading-snug text-gray-900">
                {educationVerificationDocumentsDd(edu.verificationDocuments)}
              </dd>
            </div>

            <div className="col-span-full grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <Field label="Verified at" value={formatProfileDateTime(edu.verifiedAt)} />
              <Field label="Reviewed by" value={displayText(edu.reviewedBy)} />
            </div>

          <div className="col-span-full grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            <Field label="Created" value={formatProfileDateTime(edu.createdAt)} />
            <Field label="Last updated" value={formatProfileDateTime(edu.updatedAt)} />
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function ProfileEducationSection({ items }: { items: any[] }) {
  return (
    <ul className="space-y-3">
      {items.map((edu, index) => (
        <ProfileEducationRecordCard key={edu.id ?? index} edu={edu} />
      ))}
    </ul>
  );
}

export function ProfileLocationsSection({ items }: { items: any[] }) {
  return (
    <ul className="space-y-3">
      {items.map((loc, index) => {
        const dt = displayText(loc.documentType);
        const docLabel = LOCATION_DOC_LABELS[dt] || dt || '—';
        const docUrl = displayText(loc.documentUrl);
        const status = resolveLocationRowStatus(loc);
        const title =
          [displayText(loc.city), displayText(loc.state)].filter(Boolean).join(', ') || 'Location';
        const subtitle = `${displayText(loc.country) || '—'} · ${displayText(loc.address) || '—'}`;

        return (
          <li key={loc.id ?? `loc-${index}`} className={CARD_SHELL}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="flex gap-2 min-w-0 sm:gap-2.5">
                <HiLocationMarker className="w-4 h-4 text-brand-600 shrink-0 mt-0.5 sm:w-5 sm:h-5" />
                <div className="min-w-0">
                  <p className="text-[15px] font-bold leading-snug text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 sm:text-sm">{subtitle}</p>
                </div>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-0.5 shrink-0">
                <div className="flex flex-wrap gap-1 justify-end">
                  {loc.isDefault && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100 text-indigo-800">
                      Default
                    </span>
                  )}
                  {status === 'pending' && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-900">
                      Pending
                    </span>
                  )}
                  {status === 'self_declared' && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-100 text-orange-900">
                      Self Declared
                    </span>
                  )}
                  {status === 'verified' && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                      Verified
                    </span>
                  )}
                </div>
                {status === 'self_declared' ? (
                  <p className="text-[11px] text-gray-400">via Self Declaration</p>
                ) : null}
              </div>
            </div>

            {status === 'self_declared' ? (
              <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
                <HiExclamationCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <span>
                  Self Declaration — limited network access. Upgrade by verifying with a document in the Verification
                  Center.
                </span>
              </div>
            ) : null}

            <dl className={DETAIL_GRID}>
              <Field label="Country of residence" value={displayText(loc.country)} />
              <Field label="City" value={displayText(loc.city)} />
              <Field label="State" value={displayText(loc.state)} />
              <Field
                label="Residence type"
                value={
                  RESIDENCE_TYPE_LABELS[displayText(loc.residenceType).toLowerCase()] ||
                  displayText(loc.residenceType) ||
                  '—'
                }
              />
              <Field
                label="Address"
                value={
                  displayText(loc.address) ? (
                    <div className={PROFILE_INSET_SECTION_CLASS}>
                      <MultilineFieldValue text={displayText(loc.address)} />
                    </div>
                  ) : (
                    '—'
                  )
                }
                span2
              />
              <Field label="Document type" value={docLabel} />
              {docUrl ? (
                <div className="col-span-full">
                  <dt className={PROFILE_FIELD_LABEL_CLASS}>Proof document</dt>
                  <dd>
                    <a
                      href={resolveUrl(docUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={PROFILE_FIELD_LINK_CLASS}
                    >
                      View document
                    </a>
                  </dd>
                </div>
              ) : (
                <Field label="Proof document" value="—" span2 />
              )}
            </dl>
          </li>
        );
      })}
    </ul>
  );
}

export function ProfileCertificationsSection({ items }: { items: any[] }) {
  return (
    <ul className="space-y-3">
      {items.map((cert, index) => {
        const c = typeof cert === 'object' && cert !== null ? cert : { name: String(cert) };
        const media = displayText((c as any).supportingMediaUrl);
        const certVerified = resolveCertRowVerified(c);
        const name = displayText((c as any).name) || 'Certificate';

        return (
          <li key={(c as any).id ?? index} className={CARD_SHELL}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 sm:h-9 sm:w-9 sm:rounded-lg">
                  <HiBadgeCheck className="h-4 w-4 text-brand-600 sm:h-[18px] sm:w-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold leading-snug text-gray-900">{name}</p>
                  <p className="mt-0.5 text-xs text-gray-500 line-clamp-2 sm:text-sm">
                    {formatCertificateProfileSubtitle(c)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:justify-end sm:shrink-0">
                {certVerified ? (
                  <span className="inline-flex items-center gap-0.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-900">
                    Pending verification
                  </span>
                )}
              </div>
            </div>
            <dl className={DETAIL_GRID}>
              <Field label="Issued by" value={displayText((c as any).issuedBy)} />
              <Field label="Issued date" value={formatIsoDate((c as any).issuedDate)} />
              <Field label="Expiration date" value={formatIsoDate((c as any).expirationDate)} />
              <Field label="Credential ID" value={displayText((c as any).credentialId)} />
              <Field
                label="Associated skills"
                value={<ProfileChipList text={displayText((c as any).associatedSkills)} />}
              />
              <Field
                label="Verification method"
                value={projectVerificationMethodDisplay((c as any).verificationMethod) || '—'}
              />
              {(c as any).reportingUrl ? (
                <div className="col-span-full">
                  <dt className={PROFILE_FIELD_LABEL_CLASS}>Reporting URL</dt>
                  <dd>
                    <a
                      href={resolveUrl((c as any).reportingUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={PROFILE_FIELD_LINK_CLASS}
                    >
                      {(c as any).reportingUrl}
                    </a>
                  </dd>
                </div>
              ) : (
                <Field label="Reporting URL" value="—" span2 />
              )}
              {media ? (
                <div className="col-span-full">
                  <dt className={PROFILE_FIELD_LABEL_CLASS}>Supporting media</dt>
                  <dd>
                    <a
                      href={resolveUrl(media)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={PROFILE_FIELD_LINK_CLASS}
                    >
                      View file
                    </a>
                  </dd>
                </div>
              ) : (
                <Field label="Supporting media" value="—" span2 />
              )}
            </dl>
          </li>
        );
      })}
    </ul>
  );
}

export function ProfileIdentitySection({ profile }: { profile: any }) {
  const u = profile?.user && typeof profile.user === 'object' ? profile.user : {};
  const addrObj = profile?.address && typeof profile.address === 'object' ? profile.address : null;
  const street =
    addrObj && typeof (addrObj as any).address === 'string'
      ? displayText((addrObj as any).address)
      : typeof profile?.address === 'string'
        ? displayText(profile.address)
        : '';
  const city =
    addrObj && typeof (addrObj as any).city === 'string'
      ? displayText((addrObj as any).city)
      : displayText(profile?.city);
  const state =
    addrObj && typeof (addrObj as any).state === 'string'
      ? displayText((addrObj as any).state)
      : displayText(profile?.state);
  const addressCombined = [street, city, state].filter(Boolean).join(', ');
  const idTypeLabel = ID_TYPE_LABELS[displayText(profile?.idType)] || displayText(profile?.idType);
  const idMasked = maskIdNumber(profile?.idNumber);
  const identityLine =
    profile?.identityStatus === 'verified' || profile?.identityVerified
      ? 'Verified'
      : displayText(profile?.identityStatus) || '—';
  const idDoc = displayText(profile?.idDocumentUrl);

  return (
    <div className={CARD_SHELL}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <p className="text-[15px] font-bold text-gray-900">Identity & contact</p>
        <span className="text-xs font-medium text-gray-500">Read-only · edit in Verification Center</span>
      </div>
      <dl className={`${DETAIL_GRID} mt-1`}>
        <Field label="First name" value={displayText(u.firstName)} />
        <Field label="Last name" value={displayText(u.lastName)} />
        <Field label="Other names" value={displayText(profile?.middleName)} />
        <Field label="Email" value={displayText(u.email)} />
        <Field label="Phone" value={displayText(u.phoneNumber)} />
        <Field label="Nationality" value={displayText(profile?.nationality)} />
        <Field label="Gender" value={displayText(profile?.gender)} />
        <Field label="Date of birth" value={formatIsoDate(profile?.dateOfBirth)} />
        <Field label="Country (signup)" value={displayText(profile?.country)} />
        <Field
          label="Residential address"
          value={
            addressCombined ? (
              <div className={PROFILE_INSET_SECTION_CLASS}>
                <MultilineFieldValue text={addressCombined} />
              </div>
            ) : (
              '—'
            )
          }
          span2
        />
        <Field label="Identity status" value={identityLine} />
        <Field label="Government ID type" value={idTypeLabel} />
        <Field label="ID reference" value={idMasked || '—'} />
        {idDoc ? (
          <div className="col-span-full">
            <dt className={PROFILE_FIELD_LABEL_CLASS}>ID document</dt>
            <dd>
              <a href={resolveUrl(idDoc)} target="_blank" rel="noopener noreferrer" className={PROFILE_FIELD_LINK_CLASS}>
                View document
              </a>
            </dd>
          </div>
        ) : (
          <Field label="ID document" value="—" span2 />
        )}
      </dl>
    </div>
  );
}

export function ProfileProjectsSection({ items }: { items: any[] }) {
  return (
    <ul className="space-y-3">
      {items.map((proj, index) => {
        const rawTeam = proj.teamMembers;
        const team: { name?: string; role?: string }[] = Array.isArray(rawTeam) ? rawTeam : [];
        const projStatus = resolveProjectRowStatus(proj);
        const title = displayText(proj.title) || 'Project';

        return (
          <li key={proj.id ?? index} className={CARD_SHELL}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 sm:h-9 sm:w-9 sm:rounded-lg">
                  <HiFolder className="h-4 w-4 text-brand-600 sm:h-[18px] sm:w-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold leading-snug text-gray-900">{title}</p>
                  <p className="mt-0.5 text-xs text-gray-500 line-clamp-2 sm:text-sm">
                    {formatProjectCardSubtitle(proj)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:justify-end sm:shrink-0">
                {projStatus === 'verified' ? (
                  <span className="inline-flex items-center gap-0.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                    <HiCheckCircle className="h-3.5 w-3.5" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-900">
                    Pending verification
                  </span>
                )}
              </div>
            </div>
            <dl className={DETAIL_GRID}>
              <Field
                label="Project description"
                value={
                  displayText(proj.description) ? (
                    <div className={PROFILE_INSET_SECTION_CLASS}>
                      <MultilineFieldValue text={displayText(proj.description)} />
                    </div>
                  ) : (
                    '—'
                  )
                }
                span2
              />
              <Field
                label="Verification method"
                value={projectVerificationMethodDisplay(proj.verificationMethod) || '—'}
                span2
              />
              {displayText(proj.projectLink) ? (
                <div className="col-span-full">
                  <dt className={PROFILE_FIELD_LABEL_CLASS}>Project link</dt>
                  <dd>
                    <a
                      href={resolveUrl(proj.projectLink)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={PROFILE_FIELD_LINK_CLASS}
                    >
                      {proj.projectLink}
                    </a>
                  </dd>
                </div>
              ) : (
                <Field label="Project link" value="—" span2 />
              )}
              {displayText(proj.mediaUrl) ? (
                <div className="col-span-full">
                  <dt className={PROFILE_FIELD_LABEL_CLASS}>Media URL</dt>
                  <dd>
                    <a
                      href={resolveUrl(proj.mediaUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={PROFILE_FIELD_LINK_CLASS}
                    >
                      {proj.mediaUrl}
                    </a>
                  </dd>
                </div>
              ) : (
                <Field label="Media URL" value="—" span2 />
              )}
            </dl>
            <div>
              <p className={PROFILE_FIELD_LABEL_CLASS}>Team members</p>
              {team.length === 0 ? (
                <p className="mt-0.5 text-[15px] font-bold leading-snug text-gray-500">—</p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {team.map((m, mi) => (
                    <li key={mi} className={PROFILE_CHIP_CLASS}>
                      <span className="truncate font-medium">{displayText(m.name) || '—'}</span>
                      {displayText(m.role) ? (
                        <span className="font-normal text-sky-800/90"> · {m.role}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
