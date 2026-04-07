import type { ReactNode } from 'react';
import { HiAcademicCap, HiFolder } from 'react-icons/hi';
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
    <div className={span2 ? 'md:col-span-2' : ''}>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{empty ? '—' : value}</dd>
    </div>
  );
}

export function ProfileWorkSection({ items }: { items: any[] }) {
  return (
    <ul className="space-y-6">
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
        const vc =
          exp.verificationContact && typeof exp.verificationContact === 'object'
            ? exp.verificationContact
            : {};
        const website = displayText((vc as any).website);
        const hrEmail = displayText((vc as any).email);
        const selfDeclared = !website && !hrEmail;
        const otherComp = Array.isArray(exp.achievements) ? exp.achievements : [];

        return (
          <li
            key={exp.id ?? index}
            className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4"
          >
            <p className="text-sm font-medium text-gray-700">Work experience {index + 1}</p>
            <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 md:gap-x-6">
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
                <div className="md:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Other compensation
                  </dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {otherComp.map((chip: string, i: number) => (
                      <span
                        key={`${chip}-${i}`}
                        className="inline-flex rounded-full bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-800"
                      >
                        {chip}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : (
                <Field label="Other compensation" value="—" />
              )}
              <div className="md:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Verification
                </dt>
                <dd className="mt-0.5 text-sm text-gray-900">
                  {selfDeclared ? (
                    'Self declared'
                  ) : (
                    <span className="space-y-1">
                      {website ? (
                        <div>
                          Website:{' '}
                          <a
                            href={resolveUrl(website)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-brand-600 hover:underline"
                          >
                            {website}
                          </a>
                        </div>
                      ) : null}
                      {hrEmail ? <div>HR email: {hrEmail}</div> : null}
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
    <ul className="space-y-6">
      {items.map((edu, index) => {
        const milestones = Array.isArray(edu.programProgression) ? edu.programProgression : [];

        return (
          <li
            key={edu.id ?? index}
            className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <HiAcademicCap className="h-5 w-5 shrink-0 text-brand-600" />
              <h3 className="text-lg font-semibold text-brand-700">
                {index === 0 ? 'Education' : `Education ${index + 1}`}
              </h3>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 md:gap-x-6">
              <Field label="Institution / School" value={displayText(edu.institutionName)} />
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
                <div className="md:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
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
              <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-4">
                <p className="text-sm font-medium text-gray-800">Program milestones</p>
                <ul className="mt-3 space-y-3">
                  {milestones.map((m: any, mi: number) => (
                    <li key={mi} className="border-b border-gray-200 pb-3 text-sm last:border-0 last:pb-0">
                      <p className="font-medium text-gray-900">{displayText(m.title) || '—'}</p>
                      <p className="mt-1 text-xs text-gray-600">
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
    <ul className="space-y-6">
      {items.map((loc, index) => {
        const dt = displayText(loc.documentType);
        const docLabel = LOCATION_DOC_LABELS[dt] || dt || '—';
        const docUrl = displayText(loc.documentUrl);

        return (
          <li
            key={index}
            className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4"
          >
            <p className="text-sm font-medium text-gray-700">Location {index + 1}</p>
            <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 md:gap-x-6">
              <Field label="Country of residence" value={displayText(loc.country)} />
              <Field label="City" value={displayText(loc.city)} />
              <Field label="State" value={displayText(loc.state)} />
              <Field label="Address" value={displayText(loc.address)} span2 />
              <Field label="Document type" value={docLabel} />
              {docUrl ? (
                <div className="md:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
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
    <ul className="space-y-6">
      {items.map((cert, index) => {
        const c = typeof cert === 'object' && cert !== null ? cert : { name: String(cert) };
        const media = displayText((c as any).supportingMediaUrl);

        return (
          <li
            key={(c as any).id ?? index}
            className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4"
          >
            <p className="text-sm font-medium text-gray-700">Certificate {index + 1}</p>
            <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 md:gap-x-6">
              <Field label="Name of certificate" value={displayText((c as any).name)} />
              <Field label="Issued by" value={displayText((c as any).issuedBy)} />
              <Field label="Issued date" value={formatIsoDate((c as any).issuedDate)} />
              <Field label="Expiration date" value={formatIsoDate((c as any).expirationDate)} />
              <Field label="Credential ID" value={displayText((c as any).credentialId)} />
              {(c as any).reportingUrl ? (
                <div className="md:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
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
                <div className="md:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
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
    <ul className="space-y-6">
      {items.map((proj, index) => {
        const rawTeam = proj.teamMembers;
        const team: { name?: string; role?: string }[] = Array.isArray(rawTeam) ? rawTeam : [];

        return (
          <li
            key={proj.id ?? index}
            className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <HiFolder className="h-5 w-5 shrink-0 text-brand-600" />
              <h3 className="text-lg font-semibold text-brand-700">
                {index === 0 ? 'Project' : `Project ${index + 1}`}
              </h3>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 md:gap-x-6">
              <Field label="Project title" value={displayText(proj.title)} span2 />
              <Field label="Project description" value={displayText(proj.description)} span2 />
              {displayText(proj.projectLink) ? (
                <div className="md:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
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
                <div className="md:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
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
              <p className="text-sm font-medium text-gray-800">Team members</p>
              {team.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">—</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {team.map((m, mi) => (
                    <li key={mi} className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-sm">
                      <span className="font-medium text-gray-900">{displayText(m.name) || '—'}</span>
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
