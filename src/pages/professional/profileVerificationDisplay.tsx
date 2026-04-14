import type { ReactNode } from 'react';
import {
  HiAcademicCap,
  HiBadgeCheck,
  HiBriefcase,
  HiCheckCircle,
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
  college: 'College',
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
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm leading-snug text-gray-900">{empty ? '—' : value}</dd>
    </div>
  );
}

/** Compact card + responsive 3-col facts grid on xl to reduce vertical scroll. */
const CARD_SHELL = 'space-y-3 rounded-lg border border-gray-200 bg-white p-3 sm:p-4';
const DETAIL_GRID = 'grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2 xl:grid-cols-3';

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

export function ProfileWorkSection({ items }: { items: any[] }) {
  return (
    <ul className="space-y-3">
      {items.map((exp, index) => {
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
            salaryLine = cur
              ? `${cur} ${a ?? '—'} – ${b ?? '—'}`
              : `${a ?? '—'} – ${b ?? '—'}`;
          }
        }
        const selfDeclared = isWorkSelfDeclaredForProfile(exp);
        const otherComp = Array.isArray(exp.achievements) ? exp.achievements : [];
        const rowStatus = resolveWorkVerificationRowStatus(exp);
        const org = displayText(exp.organisationName);
        const role = displayText(exp.role);
        const title = org || role || 'Work experience';
        const subtitle =
          org && role ? `${role} · ${formatWorkCardSubtitle(exp)}` : formatWorkCardSubtitle(exp);

        return (
          <li key={exp.id ?? index} className={CARD_SHELL}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="flex gap-2 min-w-0 sm:gap-2.5">
                <HiBriefcase className="w-4 h-4 text-brand-600 shrink-0 mt-0.5 sm:w-5 sm:h-5" />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold leading-snug text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 sm:text-sm">{subtitle}</p>
                </div>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-0.5 shrink-0">
                <div className="flex flex-wrap gap-1 justify-end">
                  {selfDeclared && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-100 text-orange-900">
                      Self Declared
                    </span>
                  )}
                  {rowStatus === 'pending' && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-900">
                      Pending
                    </span>
                  )}
                  {rowStatus === 'verified' && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                      Verified
                    </span>
                  )}
                </div>
                {selfDeclared ? (
                  <p className="text-[11px] text-gray-400">Self declared — optional full verification</p>
                ) : null}
              </div>
            </div>

            {selfDeclared ? (
              <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs leading-relaxed text-amber-950">
                <HiExclamationCircle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                <span>
                  Self Declaration — limited network access. Use the Verification Center to verify with work email
                  or a supporting document.
                </span>
              </div>
            ) : null}

            <dl className={DETAIL_GRID}>
              <Field label="Name of organisation" value={displayText(exp.organisationName)} />
              <Field label="Industry / Sector" value={displayText(exp.industry)} />
              <Field label="Role / Position" value={displayText(exp.role)} />
              <Field
                label="Employment type"
                value={EMPLOYMENT_TYPE_LABELS[exp.employmentType] || displayText(exp.employmentType)}
              />
              <Field
                label="Work mode"
                value={WORK_MODE_LABELS[exp.workMode] || displayText(exp.workMode)}
              />
              <Field label="Start date" value={formatIsoDate(exp.startDate)} />
              <Field
                label="End date"
                value={
                  exp.currentlyWorking || !displayText(exp.endDate)
                    ? 'Present'
                    : formatIsoDate(exp.endDate)
                }
              />
              <Field label="Work location" value={locLine} />
              <Field label="Salary" value={salaryLine} />
              {otherComp.length > 0 ? (
                <div className="col-span-full">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Other compensation
                  </dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {otherComp.map((chip: string, i: number) => (
                      <span
                        key={`${chip}-${i}`}
                        className="inline-flex rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-800"
                      >
                        {chip}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : (
                <Field label="Other compensation" value="—" />
              )}
              <div className="col-span-full">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Verification
                </dt>
                <dd className="mt-0.5 text-sm text-gray-900">
                  {selfDeclared ? (
                    'Self declared'
                  ) : (
                    <span className="space-y-1">
                      {displayText(exp.verificationMethod) ? (
                        <div>Method: {displayText(exp.verificationMethod)}</div>
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
                            className="font-medium text-brand-600 hover:underline"
                          >
                            Open
                          </a>
                        </div>
                      ) : null}
                      {!displayText(exp.verificationMethod) &&
                      !displayText(exp.workVerificationEmail) &&
                      !displayText(exp.supportingMediaUrl) ? (
                        <span>—</span>
                      ) : null}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}

export function ProfileEducationSection({ items }: { items: any[] }) {
  return (
    <ul className="space-y-3">
      {items.map((edu, index) => {
        const milestones = Array.isArray(edu.programProgression) ? edu.programProgression : [];
        const eduStatus = resolveEducationRowStatus(edu);
        const title = displayText(edu.institutionName) || 'Education';
        const subtitle = formatEducationProfileSubtitle(edu);

        return (
          <li key={edu.id ?? index} className={CARD_SHELL}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="flex gap-2 min-w-0 sm:gap-2.5">
                <HiAcademicCap className="w-4 h-4 text-brand-600 shrink-0 mt-0.5 sm:w-5 sm:h-5" />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold leading-snug text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 sm:text-sm">{subtitle}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 justify-end shrink-0">
                {eduStatus === 'pending' && (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-900">
                    Pending
                  </span>
                )}
                {eduStatus === 'verified' && (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                    Verified
                  </span>
                )}
              </div>
            </div>
            <dl className={DETAIL_GRID}>
              <Field label="Industry / sector" value={displayText(edu.institutionIndustry)} />
              <Field
                label="School type"
                value={
                  SCHOOL_TYPE_LABELS[displayText(edu.schoolType)] ||
                  displayText(edu.schoolType) ||
                  '—'
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
              <Field label="Field of study" value={displayText(edu.fieldOfStudy)} />
              <Field label="Country" value={displayText(edu.country)} />
              <Field label="Grade" value={displayText(edu.grade)} />
              <Field label="Start date" value={monthYearFromIso(edu.startDate)} />
              <Field
                label="End / Expected end"
                value={
                  edu.currentlyAttending
                    ? 'Ongoing'
                    : monthYearFromIso(edu.endDate) !== '—'
                      ? monthYearFromIso(edu.endDate)
                      : '—'
                }
              />
              <Field
                label="Cost of education"
                value={
                  edu.costOfEducation != null && edu.costOfEducation !== ''
                    ? `${displayText(edu.currency) || ''} ${String(edu.costOfEducation)}`.trim()
                    : '—'
                }
              />
              <Field
                label="Cost frequency"
                value={
                  COST_FREQUENCY_LABELS[displayText(edu.costFrequency)] ||
                  displayText(edu.costFrequency) ||
                  '—'
                }
              />
              <Field
                label="Pending loan amount"
                value={
                  edu.pendingLoanAmount != null && edu.pendingLoanAmount !== ''
                    ? `${displayText(edu.loanCurrency) || ''} ${String(edu.pendingLoanAmount)}`.trim()
                    : '—'
                }
              />
              <Field
                label="Loan repayment frequency"
                value={
                  COST_FREQUENCY_LABELS[displayText(edu.loanRepaymentFrequency)] ||
                  displayText(edu.loanRepaymentFrequency) ||
                  '—'
                }
              />
              <Field label="Scholarships & aid" value={displayText(edu.scholarshipsAndAid)} span2 />
              <Field label="Program description" value={displayText(edu.programDescription)} span2 />
              <Field
                label="Coursework / responsibilities"
                value={displayText(edu.academicResponsibilities)}
                span2
              />
              <Field label="Honors / achievements" value={displayText(edu.academicAchievements)} span2 />
              <Field label="Activities & societies" value={displayText(edu.activitiesSocieties)} span2 />
              <Field label="Associated skills" value={displayText(edu.associatedSkills)} span2 />
              {displayText(edu.supportingMediaUrl) ? (
                <div className="col-span-full">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Supporting media
                  </dt>
                  <dd className="mt-0.5">
                    <a
                      href={resolveUrl(edu.supportingMediaUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      View file
                    </a>
                  </dd>
                </div>
              ) : (
                <Field label="Supporting media" value="—" span2 />
              )}
            </dl>
            {milestones.length > 0 ? (
              <div className="rounded-md border border-gray-100 bg-gray-50/70 p-2.5 sm:p-3">
                <p className="text-xs font-semibold text-gray-800">Program milestones</p>
                <ul className="mt-2 space-y-2">
                  {milestones.map((m: any, mi: number) => (
                    <li
                      key={mi}
                      className="border-b border-gray-200/80 pb-2 text-xs last:border-0 last:pb-0 sm:text-sm"
                    >
                      <p className="font-medium text-gray-900">{displayText(m.title) || '—'}</p>
                      <p className="mt-0.5 text-[11px] text-gray-600 sm:text-xs">
                        {formatIsoDate(m.startDate)} –{' '}
                        {m.currentlyActive ? 'Active' : formatIsoDate(m.endDate)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        );
      })}
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
                  <p className="text-[15px] font-semibold leading-snug text-gray-900">{title}</p>
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
              <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs leading-relaxed text-amber-950">
                <HiExclamationCircle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
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
              <Field label="Address" value={displayText(loc.address)} span2 />
              <Field label="Document type" value={docLabel} />
              {docUrl ? (
                <div className="col-span-full">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Proof document
                  </dt>
                  <dd className="mt-0.5">
                    <a
                      href={resolveUrl(docUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-brand-600 hover:underline"
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
                  <p className="text-[15px] font-semibold leading-snug text-gray-900">{name}</p>
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
              {(c as any).reportingUrl ? (
                <div className="col-span-full">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Reporting URL
                  </dt>
                  <dd className="mt-0.5">
                    <a
                      href={resolveUrl((c as any).reportingUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-brand-600 hover:underline break-all"
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
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Supporting media
                  </dt>
                  <dd className="mt-0.5">
                    <a
                      href={resolveUrl(media)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-brand-600 hover:underline"
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
                  <p className="text-[15px] font-semibold leading-snug text-gray-900">{title}</p>
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
              <Field label="Project description" value={displayText(proj.description)} span2 />
              {displayText(proj.projectLink) ? (
                <div className="col-span-full">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Project link
                  </dt>
                  <dd className="mt-0.5">
                    <a
                      href={resolveUrl(proj.projectLink)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-brand-600 hover:underline break-all"
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
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Media URL
                  </dt>
                  <dd className="mt-0.5">
                    <a
                      href={resolveUrl(proj.mediaUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-brand-600 hover:underline break-all"
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
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Team members</p>
              {team.length === 0 ? (
                <p className="mt-1 text-sm text-gray-500">—</p>
              ) : (
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {team.map((m, mi) => (
                    <li
                      key={mi}
                      className="inline-flex max-w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-800"
                    >
                      <span className="truncate font-medium">{displayText(m.name) || '—'}</span>
                      {displayText(m.role) ? (
                        <span className="text-gray-600"> · {m.role}</span>
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
