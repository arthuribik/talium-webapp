import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { LivenessSelfieModal } from '@/components/professional/LivenessSelfieModal';
import { SelfDeclarationModal } from '@/components/professional/SelfDeclarationModal';
import { api, apiProfessionalProjectByIdUrl, apiProfessionalProjectCreateUrl } from '@/services/api';
import toast from 'react-hot-toast';
import {
  HiAcademicCap,
  HiShare,
  HiBriefcase,
  HiBadgeCheck,
  HiCalendar,
  HiUsers,
  HiPlus,
  HiX,
  HiShieldCheck,
  HiCheckCircle,
  HiLocationMarker,
  HiLockClosed,
  HiPencil,
  HiHeart,
  HiChevronDown,
  HiChevronRight,
  HiFolder,
  HiMail,
  HiPhone,
  HiVideoCamera,
  HiDocumentText,
  HiArrowLeft,
  HiUpload,
  HiExclamationCircle,
  HiPaperAirplane,
  HiTrash,
  HiUserCircle,
  HiClock,
  HiArrowUp,
} from 'react-icons/hi';
import { COUNTRIES } from '@/utils/countries';

/** Same option list as signup country field; first row label reflects nationality. */
const NATIONALITY_SEARCHABLE_OPTIONS = [
  { value: '', label: 'Select nationality' },
  ...COUNTRIES.map((c) => ({ value: c, label: c })),
];

function resolvedNationalityFromApi(data: {
  nationality?: unknown;
  country?: unknown;
  identityVerification?: { nationality?: unknown } | null;
}): string {
  const fromProf = typeof data.nationality === 'string' ? data.nationality.trim() : '';
  if (fromProf) return fromProf;
  const fromIv =
    typeof data.identityVerification?.nationality === 'string'
      ? data.identityVerification.nationality.trim()
      : '';
  if (fromIv) return fromIv;
  const fromSignupCountry = typeof data.country === 'string' ? data.country.trim() : '';
  if (fromSignupCountry && COUNTRIES.includes(fromSignupCountry)) return fromSignupCountry;
  return '';
}
import {
  DEFAULT_PHONE_DIAL_VALUE,
  buildE164FromDialAndNational,
  parsePhoneDialValue,
  splitPlusPrefixedPhone,
} from '@/utils/phoneDialCodes';
import { PhoneDialCodeSelect } from '@/components/common/PhoneDialCodeSelect';
import {
  verificationPersonalBasicSchema,
  verificationPersonalGovSchema,
  verificationLocationDraftSchema,
  verificationSocialSchema,
  prefixZodFieldErrors,
} from '@/schemas/verificationCenter.schema';
import {
  VERIFICATION_TABS,
  mergeVerificationStatusFromSources,
  verificationProgressFromMerged,
  type VerificationSectionKey,
} from '@/utils/verificationProgress';

/** Avoid splitting "+1" as US while the user is still typing the area code. */
const MIN_NATIONAL_DIGITS_FOR_PHONE_AUTO_SPLIT = 8;

function storedUserPhoneToDialAndNational(raw: string | undefined | null): {
  dialValue: string;
  national: string;
} {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) {
    return { dialValue: DEFAULT_PHONE_DIAL_VALUE, national: '' };
  }
  if (trimmed.startsWith('+')) {
    const split = splitPlusPrefixedPhone(trimmed);
    if (split) {
      return { dialValue: split.dialValue, national: split.nationalNumber };
    }
  }
  return { dialValue: DEFAULT_PHONE_DIAL_VALUE, national: trimmed };
}

function tryAutoSplitPhoneInputValue(value: string): { dialValue: string; national: string } | null {
  const t = value.trim();
  if (!t.startsWith('+')) return null;
  const split = splitPlusPrefixedPhone(t);
  if (!split) return null;
  const nd = split.nationalNumber.replace(/\D/g, '');
  if (nd.length < MIN_NATIONAL_DIGITS_FOR_PHONE_AUTO_SPLIT) return null;
  return { dialValue: split.dialValue, national: split.nationalNumber };
}

type SectionKey = VerificationSectionKey;

const VALID_SECTION_KEYS: SectionKey[] = VERIFICATION_TABS.map((t) => t.id);

function isSectionKey(value: string | null): value is SectionKey {
  return value !== null && VALID_SECTION_KEYS.includes(value as SectionKey);
}

const GENDERS = ['Male', 'Female'];
const ID_TYPE_OPTIONS = [
  { value: 'national_id', label: 'National ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'voters_card', label: "Voter's Card" },
];

type PersonalFlowStep = 'add_data' | 'identity' | 'contact' | 'liveness' | 'complete';

type SelfDeclarationFlow =
  | { open: false }
  | { open: true; kind: 'personal' }
  | { open: true; kind: 'address'; locationIndex: number }
  | { open: true; kind: 'education'; educationIndex: number }
  | { open: true; kind: 'work_card'; workIndex: number }
  | { open: true; kind: 'project_card'; projectIndex: number }
  | { open: true; kind: 'cert_card'; certIndex: number };

/** Pills shown above personal flow (identity verification has no separate tab — grouped under Add data). */
const PERSONAL_FLOW_UI_GROUPS: { label: string; steps: readonly PersonalFlowStep[] }[] = [
  { label: 'Add data', steps: ['add_data', 'identity'] },
  { label: 'Email & phone', steps: ['contact'] },
  { label: 'Liveness', steps: ['liveness'] },
];

const PERSONAL_FLOW_STEP_STORAGE_KEY = 'taldium:verification:personalFlowStep';
const PERSONAL_IDENTITY_AWAITING_STORAGE_KEY = 'taldium:verification:personalIdentityAwaiting';
const PERSONAL_IDENTITY_PATH_STORAGE_KEY = 'taldium:verification:personalIdentityPath';
/** Set when the user confirms personal identity self-declaration (so we do not treat "path chosen" alone as done). */
const PERSONAL_SELF_DECLARATION_ACK_KEY = 'taldium:verification:personalSelfDeclarationAck';

function readPersonalSelfDeclarationAcknowledged(): boolean {
  try {
    return sessionStorage.getItem(PERSONAL_SELF_DECLARATION_ACK_KEY) === '1';
  } catch {
    return false;
  }
}

function setPersonalSelfDeclarationAcknowledgedStorage() {
  try {
    sessionStorage.setItem(PERSONAL_SELF_DECLARATION_ACK_KEY, '1');
  } catch {
    /* ignore */
  }
}

function clearPersonalSelfDeclarationAcknowledgedStorage() {
  try {
    sessionStorage.removeItem(PERSONAL_SELF_DECLARATION_ACK_KEY);
  } catch {
    /* ignore */
  }
}

function parseStoredPersonalFlowStep(raw: string | null): PersonalFlowStep | null {
  if (!raw) return null;
  const v = raw.trim();
  if (v === 'add_data' || v === 'identity' || v === 'contact' || v === 'liveness' || v === 'complete') return v;
  return null;
}

function computeCanonicalPersonalFlowStep(
  personalBasicComplete: boolean,
  identityFlowComplete: boolean,
  userEmailVerified: boolean,
  userPhoneVerified: boolean,
  livenessCompleteLocal: boolean,
): PersonalFlowStep {
  if (!personalBasicComplete) return 'add_data';
  if (!identityFlowComplete) return 'identity';
  if (!userEmailVerified || !userPhoneVerified) return 'contact';
  if (!livenessCompleteLocal) return 'liveness';
  return 'complete';
}

function isPersonalFlowStepValidForProgress(
  step: PersonalFlowStep,
  personalBasicComplete: boolean,
  identityFlowComplete: boolean,
  userEmailVerified: boolean,
  userPhoneVerified: boolean,
  livenessCompleteLocal: boolean,
): boolean {
  if (step === 'add_data' || step === 'identity') {
    // Do not keep stale "add data" in session after liveness (or identity) is done — canonical step advances on refresh.
    if (
      step === 'add_data' &&
      personalBasicComplete &&
      (livenessCompleteLocal || identityFlowComplete)
    ) {
      return false;
    }
    return !identityFlowComplete;
  }
  if (step === 'contact') {
    return identityFlowComplete && (!userEmailVerified || !userPhoneVerified);
  }
  if (step === 'liveness') {
    return identityFlowComplete && userEmailVerified && userPhoneVerified && !livenessCompleteLocal;
  }
  if (step === 'complete') {
    return (
      personalBasicComplete &&
      identityFlowComplete &&
      userEmailVerified &&
      userPhoneVerified &&
      livenessCompleteLocal
    );
  }
  return false;
}

/** True when an identity verification record exists and is waiting on admin (not yet verified). */
function personalIdentityAwaitingAdminReview(profile: unknown): boolean {
  if (!profile || typeof profile !== 'object') return false;
  const p = profile as Record<string, unknown>;
  const iv = p.identityVerification;
  if (iv && typeof iv === 'object') {
    const row = iv as Record<string, unknown>;
    if (row.verifiedAt) return false;
    const st = String(row.status ?? '')
      .trim()
      .toLowerCase();
    if (st === 'pending' || st === 'under_review') return true;
  }
  const is = String(p.identityStatus ?? '')
    .trim()
    .toLowerCase();
  if (is === 'pending' || is === 'under_review') return true;
  return false;
}

function resolvePersonalFlowStepFromStorage(
  stored: PersonalFlowStep | null,
  personalBasicComplete: boolean,
  identityFlowComplete: boolean,
  userEmailVerified: boolean,
  userPhoneVerified: boolean,
  livenessCompleteLocal: boolean,
): PersonalFlowStep {
  const canonical = computeCanonicalPersonalFlowStep(
    personalBasicComplete,
    identityFlowComplete,
    userEmailVerified,
    userPhoneVerified,
    livenessCompleteLocal,
  );
  if (
    !stored ||
    !isPersonalFlowStepValidForProgress(
      stored,
      personalBasicComplete,
      identityFlowComplete,
      userEmailVerified,
      userPhoneVerified,
      livenessCompleteLocal,
    )
  ) {
    return canonical;
  }
  return stored;
}

function clearPersonalIdentityAwaitingStorage() {
  try {
    sessionStorage.removeItem(PERSONAL_IDENTITY_AWAITING_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function clearPersonalIdentityPathStorage() {
  try {
    sessionStorage.removeItem(PERSONAL_IDENTITY_PATH_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Personal tab "Request Data Edit" modal — keys must match api-engine PROFILE_EDIT_ALLOWED_FIELDS */
const PROFILE_REQUEST_EDIT_FIELDS: { label: string; key: string }[][] = [
  [
    { label: 'First Name', key: 'firstName' },
    { label: 'Middle Name', key: 'middleName' },
    { label: 'Nationality', key: 'nationality' },
    { label: 'Email', key: 'email' },
  ],
  [
    { label: 'Last Name', key: 'lastName' },
    { label: 'Date of Birth', key: 'dateOfBirth' },
    { label: 'Gender', key: 'gender' },
    { label: 'Phone Number', key: 'phoneNumber' },
  ],
];

const PROFILE_REQUEST_EDIT_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Select reason' },
  { value: 'legal_name_change', label: 'Legal name change' },
  { value: 'clerical_error', label: 'Clerical error' },
  { value: 'outdated_information', label: 'Outdated information' },
  { value: 'government_id_reissued', label: 'Government ID reissued' },
  { value: 'other', label: 'Other' },
];

type LocationVerificationStatus = 'pending' | 'self_declared' | 'verified' | 'rejected';

type LocationEntry = {
  country: string;
  address: string;
  city: string;
  state: string;
  documentType: string;
  documentUrl: string;
  verificationStatus?: LocationVerificationStatus;
  isDefault?: boolean;
  residenceType?: string;
};

const emptyLocation = (): LocationEntry => ({
  country: '',
  address: '',
  city: '',
  state: '',
  documentType: '',
  documentUrl: '',
  verificationStatus: 'pending',
  isDefault: false,
});

const RESIDENCE_TYPE_OPTIONS = [
  { value: 'own_home', label: 'I own my home' },
  { value: 'tenant', label: 'I am a registered tenant of a rental property' },
  { value: 'hotel', label: 'I am staying in a hotel apartment for at least 3 months' },
  { value: 'company', label: 'I live in a company sponsored residence' },
];

type VerifyAddressModalStep = 'method' | 'residence' | 'document';

function mapApiLocationToEntry(loc: any, index: number, length: number): LocationEntry {
  const docUrl = (loc.documentUrl || '').trim();
  const docTypeRaw = (loc.documentType || '').trim();
  const adminVs = String(loc.verificationStatus ?? '').trim().toLowerCase();

  let verificationStatus: LocationVerificationStatus = 'pending';
  let documentType = docTypeRaw;

  if (docTypeRaw === 'self_declaration' || docTypeRaw === 'self_declared') {
    verificationStatus = 'self_declared';
    documentType = '';
  } else if (docTypeRaw === 'digital_verify') {
    verificationStatus = 'verified';
  } else if (adminVs === 'verified') {
    verificationStatus = 'verified';
    if (!documentType && docUrl) documentType = 'other';
  } else if (adminVs === 'rejected') {
    verificationStatus = 'rejected';
    if (!documentType && docUrl) documentType = 'other';
  } else if (docUrl) {
    verificationStatus = 'pending';
    if (!documentType) documentType = 'other';
  }

  let isDefault: boolean;
  if (length === 1) {
    isDefault = true;
  } else if (typeof loc.isDefault === 'boolean') {
    isDefault = loc.isDefault;
  } else {
    isDefault = index === 0;
  }

  return {
    country: loc.country || '',
    address: loc.address || '',
    city: loc.city || '',
    state: loc.state || '',
    documentType,
    documentUrl: loc.documentUrl || '',
    verificationStatus,
    isDefault,
    residenceType: typeof loc.residenceType === 'string' ? loc.residenceType : undefined,
  };
}

function locationVerificationMethodLabel(loc: LocationEntry): string | null {
  const t = (loc.documentType || '').trim().toLowerCase();
  const st = loc.verificationStatus ?? 'pending';
  const map: Record<string, string> = {
    utility_bill: 'Utility bill',
    bank_statement: 'Bank statement',
    lease_agreement: 'Lease or tenancy agreement',
    digital_verify: 'Digital verification',
    other: 'Proof document',
  };
  if (t && map[t]) return map[t];
  if ((st === 'pending' || st === 'verified') && loc.documentUrl?.trim()) return 'Proof document';
  return null;
}

type EducationEntry = {
  id?: string;
  schoolType: string;
  levelOfEducation: string;
  degreeType: string;
  institutionName: string;
  institutionIndustry: string;
  fieldOfStudy: string;
  country: string;
  grade: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  expectedEndOngoing: boolean;
  costOfEducation: string;
  currency: string;
  costFrequency: string;
  /** UI only: when false, loan fields are hidden and loan values are not sent to the API. */
  hasLoan?: boolean;
  pendingLoanAmount: string;
  loanCurrency: string;
  loanRepaymentFrequency: string;
  scholarshipsAndAid: string;
  programDescription: string;
  academicResponsibilities: string;
  academicAchievements: string;
  activitiesSocieties: string;
  associatedSkills: string;
  supportingMediaUrl: string;
  /** Shown on profile as the primary education row when multiple exist. */
  isDefault?: boolean;
  /** How the user chose to verify (persisted on the education record). */
  verificationMethod?: string | null;
  /** Institution email used for student-email verification (from API after send/verify). */
  studentVerificationEmail?: string;
  /** Local UI: education row verification (not necessarily from API). */
  eduVerificationStatus?: 'pending' | 'verified';
  verificationDocuments?: unknown;
  verifiedAt?: string | null;
  reviewedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

const emptyEducation = (): EducationEntry => ({
  schoolType: '',
  levelOfEducation: '',
  degreeType: '',
  institutionName: '',
  institutionIndustry: '',
  fieldOfStudy: '',
  country: '',
  grade: '',
  startMonth: '',
  startYear: '',
  endMonth: '',
  endYear: '',
  expectedEndOngoing: false,
  costOfEducation: '',
  currency: 'USD',
  costFrequency: '',
  hasLoan: false,
  pendingLoanAmount: '',
  loanCurrency: 'USD',
  loanRepaymentFrequency: '',
  scholarshipsAndAid: '',
  programDescription: '',
  academicResponsibilities: '',
  academicAchievements: '',
  activitiesSocieties: '',
  associatedSkills: '',
  supportingMediaUrl: '',
  isDefault: false,
  verificationMethod: undefined,
  studentVerificationEmail: '',
  eduVerificationStatus: 'pending',
});

function formatEducationVerificationDateTime(v: unknown): string {
  if (v == null || v === '') return '—';
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? '—' : v.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }
  const raw = typeof v === 'string' ? v.trim() : String(v);
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function educationVerificationDocumentsBlock(doc: unknown): ReactNode {
  if (doc == null) return '—';
  if (!Array.isArray(doc) || doc.length === 0) return '—';
  const rows = doc.filter((x) => x && typeof x === 'object') as Array<Record<string, unknown>>;
  if (rows.length === 0) return '—';
  const base = api.defaults.baseURL || '';
  return (
    <ul className="mt-0.5 list-none space-y-1 p-0">
      {rows.map((item, i) => {
        const url = typeof item.fileUrl === 'string' ? item.fileUrl.trim() : '';
        const name =
          (typeof item.fileName === 'string' && item.fileName.trim()) || `Document ${i + 1}`;
        const typeLabel = typeof item.type === 'string' ? item.type.trim() : '';
        const label = typeLabel ? `${typeLabel}: ${name}` : name;
        const href =
          url && !url.startsWith('http') ? `${base}${url.startsWith('/') ? url : `/${url}`}` : url;
        return (
          <li key={i} className="text-sm font-semibold text-gray-900">
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-brand-600 hover:underline"
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

function educationVerificationMethodLabel(entry: EducationEntry): string | null {
  const st = entry.eduVerificationStatus ?? 'pending';
  const m = (entry.verificationMethod || '').trim().toLowerCase();
  if (m === 'self_declaration' && st !== 'verified') return null;
  const map: Record<string, string> = {
    student_email: 'Student email',
    upload_document: 'Uploaded document',
    digital_verify: 'Digital verification',
  };
  if (m && map[m]) return map[m];
  if (entry.supportingMediaUrl?.trim() && (st === 'pending' || st === 'verified')) {
    return 'Supporting document';
  }
  return null;
}

type WorkRoleEntry = {
  title: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
};

const emptyWorkRole = (): WorkRoleEntry => ({
  title: '',
  startDate: '',
  endDate: '',
  currentlyWorking: false,
});

type WorkEntry = {
  id?: string;
  organisationName: string;
  industry: string;
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
  /** How the user chose to verify (synced with API `verificationMethod`). */
  verificationMethod?: string | null;
  /** Work email used for OTP verification (from API after send/verify). */
  workVerificationEmail?: string;
  supportingMediaUrl?: string;
};

function workVerificationMethodLabel(entry: WorkEntry): string | null {
  const st = entry.workVerificationStatus ?? 'pending';
  const m = (entry.verificationMethod || '').trim().toLowerCase();
  if (m === 'self_declaration' && st !== 'verified') return null;
  const map: Record<string, string> = {
    work_email: 'Work email',
    upload_document: 'Uploaded document',
  };
  if (m && map[m]) return map[m];
  if (entry.supportingMediaUrl?.trim() && (st === 'pending' || st === 'verified')) {
    return 'Supporting document';
  }
  return null;
}

const emptyWork = (): WorkEntry => ({
  organisationName: '',
  industry: '',
  role: '',
  employmentType: '',
  workMode: '',
  startDate: '',
  endDate: '',
  currency: 'USD',
  salary: '',
  salaryFrequency: 'monthly',
  workRoles: [emptyWorkRole()],
  jobDescription: '',
  responsibilitiesText: '',
  achievementsText: '',
  associatedSkills: '',
  otherCompensation: [],
  otherCompensationInput: '',
  otherCompensationNotes: '',
  selfDeclared: false,
  workVerificationStatus: 'pending',
  verificationMethod: undefined,
  workVerificationEmail: '',
  supportingMediaUrl: '',
});

const WORK_SALARY_FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'one_time', label: 'One-time' },
];

function cloneWorkEntry(e: WorkEntry): WorkEntry {
  return {
    ...e,
    workRoles: e.workRoles.map((r) => ({ ...r })),
    otherCompensation: [...e.otherCompensation],
  };
}

function workEmploymentTypeLabel(value: string): string {
  const map: Record<string, string> = {
    full_time: 'Full-time',
    part_time: 'Part-time',
    contract: 'Contract',
    internship: 'Internship',
  };
  return map[value] || value || '—';
}

function workModeLabel(value: string): string {
  const map: Record<string, string> = {
    global_remote: 'Global Remote',
    remote: 'Location Remote',
    hybrid: 'Hybrid',
    on_site: 'Onsite',
    location: 'Location Remote',
  };
  return map[value] || value || '—';
}

/** Subtitle under job title: organisation · employment type · work mode (matches work card mock). */
function formatWorkExperienceHeaderSubtitle(entry: WorkEntry): string {
  const org = entry.organisationName?.trim() || '—';
  return [org, workEmploymentTypeLabel(entry.employmentType), workModeLabel(entry.workMode)].join(' · ');
}

function parseWorkYmd(dateStr: string): Date | null {
  const s = dateStr?.trim();
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const d = new Date(`${s.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function workExperienceEffectiveEndDate(entry: WorkEntry): Date {
  const rootEnd = parseWorkYmd(entry.endDate ?? '');
  if (rootEnd) return rootEnd;
  const primary = entry.workRoles[0];
  if (primary?.currentlyWorking) return new Date();
  const roleEnd = parseWorkYmd(primary?.endDate ?? '');
  if (roleEnd) return roleEnd;
  return new Date();
}

/** Years between entry start and end (or today if current); null if no valid start. */
function workTenureYearsAtOrganisation(entry: WorkEntry): number | null {
  const start = parseWorkYmd(entry.startDate ?? '');
  if (!start) return null;
  const end = workExperienceEffectiveEndDate(entry);
  const ms = end.getTime() - start.getTime();
  if (ms < 0) return 0;
  return ms / (365.25 * 24 * 60 * 60 * 1000);
}

/** Parses `Other roles: Title (start – end); …` produced when syncing multiple roles to the API. */
function parseOtherRolesLine(line: string): WorkRoleEntry[] {
  const m = line.trim().match(/^Other roles:\s*(.+)$/i);
  if (!m?.[1]) return [];
  const segments = m[1].split(/;\s+/).map((s) => s.trim()).filter(Boolean);
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

function formatWorkRoleDateRange(role: WorkRoleEntry): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const start = parseWorkYmd(role.startDate ?? '');
  const startStr = start ? fmt(start) : role.startDate?.trim() || '—';
  const endExplicit = parseWorkYmd(role.endDate ?? '');
  if (role.currentlyWorking && !role.endDate?.trim()) {
    return `${startStr} — Present`;
  }
  const endStr = endExplicit ? fmt(endExplicit) : role.endDate?.trim() || '—';
  return `${startStr} — ${endStr}`;
}

function workSalaryFrequencyDisplay(value: string): string {
  const opt = WORK_SALARY_FREQUENCY_OPTIONS.find((o) => o.value === value);
  if (opt) return opt.label;
  const v = value?.trim();
  return v || '—';
}

function formatWorkRemunerationLine(entry: WorkEntry): string {
  const cur = entry.currency?.trim() || 'USD';
  const sal = entry.salary?.trim();
  if (!sal) return '—';
  return `${cur} ${sal} / ${workSalaryFrequencyDisplay(entry.salaryFrequency)}`;
}

function formatWorkCompensationSummary(entry: WorkEntry): string {
  const notes = entry.otherCompensationNotes?.trim();
  if (notes) return notes;
  const parts = (entry.otherCompensation ?? []).map((p) => p?.trim()).filter(Boolean);
  if (parts.length) return parts.join(', ');
  return '—';
}

function workAssociatedSkillTags(entry: WorkEntry): string[] {
  const raw = entry.associatedSkills?.trim();
  if (!raw) return [];
  return raw
    .split(/[,;|\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

type ProjectTeamMemberEntry = { name: string; role: string };

type ProjectEntry = {
  id?: string;
  title: string;
  description: string;
  projectLink: string;
  mediaUrl: string;
  teamMembers: ProjectTeamMemberEntry[];
  projectVerificationStatus?: 'pending' | 'verified';
  /** Persisted via API as `verificationMethod` (e.g. self_declaration). */
  verificationMethod?: string | null;
  /** Optimistic flag until sync completes. */
  projectSelfDeclared?: boolean;
};

const emptyProjectTeamMember = (): ProjectTeamMemberEntry => ({ name: '', role: '' });

const emptyProject = (): ProjectEntry => ({
  title: '',
  description: '',
  projectLink: '',
  mediaUrl: '',
  teamMembers: [emptyProjectTeamMember()],
  projectVerificationStatus: 'pending',
  projectSelfDeclared: false,
  verificationMethod: null,
});

function cloneProjectEntry(p: ProjectEntry): ProjectEntry {
  return {
    ...p,
    teamMembers: p.teamMembers.map((m) => ({ ...m })),
  };
}

function formatProjectCardSubtitle(entry: ProjectEntry): string {
  const parts: string[] = [];
  const desc = entry.description?.trim();
  if (desc) {
    parts.push(desc.length > 100 ? `${desc.slice(0, 97)}…` : desc);
  }
  const link = entry.projectLink?.trim();
  if (link) parts.push(link);
  if (entry.mediaUrl?.trim()) parts.push('Media attached');
  const n = entry.teamMembers.filter((m) => m.name.trim() || m.role.trim()).length;
  if (n > 0) parts.push(`${n} team member${n === 1 ? '' : 's'}`);
  return parts.length ? parts.join(' · ') : 'No details yet';
}

function normalizeProjectVerificationMethodKey(v: string | null | undefined): string {
  return String(v ?? '')
    .toLowerCase()
    .replace(/-/g, '_');
}

function isProjectMethodSelfDeclaration(v: string | null | undefined): boolean {
  const s = normalizeProjectVerificationMethodKey(v);
  return s === 'self_declaration' || s === 'self_declared';
}

function projectVerificationSubtext(entry: ProjectEntry): string | null {
  const status = entry.projectVerificationStatus ?? 'pending';
  if (status === 'verified') return null;
  if (isProjectMethodSelfDeclaration(entry.verificationMethod)) return 'Self Declaration';
  return null;
}

function projectEntryIsSelfDeclared(entry: ProjectEntry): boolean {
  const status = entry.projectVerificationStatus ?? 'pending';
  const viaMethod = isProjectMethodSelfDeclaration(entry.verificationMethod);
  const viaFlag = !!entry.projectSelfDeclared;
  return (viaMethod || viaFlag) && status !== 'verified';
}

/** Only send `self_declaration` when the user opted in; new rows stay pending without it. */
function projectVerificationMethodForApi(entry: ProjectEntry): string | null {
  const t = entry.verificationMethod?.trim() ?? '';
  if (entry.projectSelfDeclared === true) {
    return t || 'self_declaration';
  }
  if (!t) return null;
  if (isProjectMethodSelfDeclaration(t)) return null;
  return t;
}

/** Level dropdown (Verification Center education); values are persisted as API strings. */
const EDUCATION_LEVELS = [
  { value: 'degree', label: 'Degree' },
  { value: 'college', label: 'College' },
  { value: 'primary_school', label: 'Primary School' },
  { value: 'secondary_school', label: 'Secondary School' },
  { value: 'training_institute', label: 'Training Institute' },
];

/** Display labels for stored level (includes legacy enum values from older rows). */
const EDUCATION_LEVEL_DISPLAY: Record<string, string> = {
  degree: 'Degree',
  college: 'College',
  primary_school: 'Primary School',
  secondary_school: 'Secondary School',
  training_institute: 'Training Institute',
  high_school: 'High School',
  associate: 'Associate',
  bachelor: 'Bachelor',
  master: 'Master',
  doctorate: 'Doctorate',
  certificate: 'Certificate',
  diploma: 'Diploma',
};
const MONTH_OPTIONS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const EDUCATION_YEAR_OPTIONS = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 85 }, (_, i) => {
    const year = y + 8 - i;
    return { value: String(year), label: String(year) };
  });
})();

const SCHOOL_TYPE_OPTIONS = [
  { value: 'university', label: 'University' },
  { value: 'polytechnic', label: 'Polytechnic' },
  { value: 'college', label: 'College' },
  { value: 'institute', label: 'Institute' },
  { value: 'academy', label: 'Academy' },
  { value: 'high_school', label: 'High School' },
  { value: 'secondary_school', label: 'Secondary School' },
  { value: 'primary_school', label: 'Primary School' },
  { value: 'kindergarten', label: 'Kindergarten' },
  { value: 'nursery_school', label: 'Nursery School' },
  { value: 'accelerator', label: 'Accelerator' },
];

/** Qualification dropdown (education tab); label text matches product copy exactly. */
const QUALIFICATION_OPTIONS = [
  { value: 'PhD', label: 'PhD' },
  { value: 'MSc', label: 'MSc' },
  { value: 'MA', label: 'MA' },
  { value: 'MBA', label: 'MBA' },
  { value: 'BSc', label: 'BSc' },
  { value: 'BA', label: 'BA' },
  { value: 'BEng', label: 'BEng' },
  { value: 'HND', label: 'HND' },
  { value: 'OND', label: 'OND' },
  { value: 'Diploma', label: 'Diploma' },
  { value: 'Certificate', label: 'Certificate' },
  { value: 'SSCE', label: 'SSCE' },
  { value: 'FSLC', label: 'FSLC' },
  { value: 'Other', label: 'Other' },
];

const EDUCATION_CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD' },
  { value: 'NGN', label: 'NGN' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'CAD', label: 'CAD' },
  { value: 'AUD', label: 'AUD' },
  { value: 'ZAR', label: 'ZAR' },
  { value: 'KES', label: 'KES' },
  { value: 'GHS', label: 'GHS' },
];

/** Matches `costFrequency` / `loanRepaymentFrequency` on education records (API). */
const EDUCATION_PAYMENT_FREQUENCY_OPTIONS = [
  { value: 'one_time', label: 'One-time' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' },
  { value: 'semester', label: 'Per semester' },
  { value: 'weekly', label: 'Weekly' },
];

function educationPaymentFrequencyLabel(value: string | undefined): string {
  const v = (value || '').trim().toLowerCase();
  const row = EDUCATION_PAYMENT_FREQUENCY_OPTIONS.find((o) => o.value === v);
  return row?.label || (value?.trim() ? value.trim() : '—');
}

function monthShortCode(monthValue: string): string {
  const opt = MONTH_OPTIONS.find((o) => o.value === monthValue);
  return opt ? opt.label.slice(0, 3) : '';
}

function schoolTypeDisplayLabel(value: string): string {
  if (!value?.trim()) return '—';
  const fromList = SCHOOL_TYPE_OPTIONS.find((o) => o.value === value)?.label;
  if (fromList) return fromList;
  const legacy: Record<string, string> = {
    secondary: 'Secondary school',
    primary: 'Primary school',
    technical: 'Technical / vocational',
    other: 'Other',
  };
  return legacy[value] || value;
}

function formatEducationCardSubtitle(entry: EducationEntry): string {
  const sm = monthShortCode(entry.startMonth);
  const sy = entry.startYear;
  const em = monthShortCode(entry.endMonth);
  const ey = entry.endYear;
  const start = sm && sy ? `${sm}/${sy}` : sy || sm || '';
  let datePart = '';
  if (entry.expectedEndOngoing) {
    datePart = start ? `${start} — ongoing` : 'ongoing';
  } else {
    const end = em && ey ? `${em}/${ey}` : [em, ey].filter(Boolean).join('/') || '';
    datePart = start && end ? `${start} — ${end}` : start || end || '';
  }
  return [
    schoolTypeDisplayLabel(entry.schoolType),
    entry.fieldOfStudy?.trim() || '—',
    datePart || '—',
    entry.country?.trim() || '—',
  ].join(' · ');
}

function formatEducationDurationLine(entry: EducationEntry): string {
  const sm = monthShortCode(entry.startMonth);
  const sy = entry.startYear;
  const em = monthShortCode(entry.endMonth);
  const ey = entry.endYear;
  const start = sm && sy ? `${sm}/${sy}` : sy || sm || '';
  if (entry.expectedEndOngoing) {
    return start ? `${start} — Present` : 'Present';
  }
  const end = em && ey ? `${em}/${ey}` : [em, ey].filter(Boolean).join('/');
  if (start && end) return `${start} — ${end}`;
  if (start) return `${start} — …`;
  if (end) return end;
  return '—';
}

function educationLevelLabel(value: string): string {
  const v = value?.trim();
  if (!v) return '—';
  return EDUCATION_LEVEL_DISPLAY[v] || v.replace(/_/g, ' ');
}

function educationQualificationDisplay(value: string): string {
  const v = value?.trim();
  if (!v) return '—';
  return QUALIFICATION_OPTIONS.find((o) => o.value === v)?.label || v;
}

/** Split stored comma/semicolon/pipe/newline-separated tokens into chip labels. */
function educationChipsFromDelimitedText(text: string | undefined): string[] {
  return (text || '')
    .split(/[,;|\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function educationSkillChipsFromEntry(entry: EducationEntry): string[] {
  return educationChipsFromDelimitedText(entry.associatedSkills);
}

function educationCourseworkChipsFromEntry(entry: EducationEntry): string[] {
  return educationChipsFromDelimitedText(entry.academicResponsibilities);
}

/** Tag input styling for education list fields (lavender pills + white input). */
const EDU_VERIF_TAG_INPUT_CLASS =
  'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';
const EDU_VERIF_TAG_CHIP_CLASS =
  'inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-900 ring-1 ring-indigo-200';
const EDU_VERIF_TAG_CHIP_REMOVE_BTN_CLASS =
  'rounded-full p-0.5 text-indigo-600 hover:bg-indigo-100';
const EDU_VERIF_TAG_CHIP_STATIC_CLASS =
  'inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-900 ring-1 ring-indigo-200';

function formatEducationMoneyLine(currency: string | undefined, amount: string | undefined): string | null {
  const a = amount?.trim();
  if (!a) return null;
  return `${(currency || 'USD').trim()} ${a}`;
}

function cloneEducationEntry(e: EducationEntry): EducationEntry {
  return { ...e };
}

function parseYearMonthFromIso(iso: string | undefined): { month: string; year: string } {
  if (!iso || typeof iso !== 'string') return { month: '', year: '' };
  const m = iso.match(/^(\d{4})-(\d{2})/);
  if (m) return { year: m[1], month: m[2] };
  return { month: '', year: '' };
}

function buildMonthYear(month: string, year: string): string | undefined {
  if (!month || !year) return undefined;
  return `${year}-${month}-01`;
}

function deriveProgramLevel(level: string): string | undefined {
  if (level === 'master' || level === 'doctorate') return 'postgraduate';
  if (level === 'primary_school') return undefined;
  if (level) return 'undergraduate';
  return undefined;
}

type CertificateEntry = {
  name: string;
  issuedBy: string;
  issuedDate: string;
  expirationDate: string;
  credentialId: string;
  reportingUrl: string;
  supportingMediaUrl: string;
  /** Comma-separated skills linked to this credential (optional). */
  associatedSkills?: string;
  /** When true, the credential has no expiry date (not sent to API). */
  noExpiration?: boolean;
  certVerificationStatus?: 'pending' | 'verified';
  /** Local: user chose self-declaration path for this certification row. */
  certSelfDeclared?: boolean;
  /** Persisted on profile JSON; mirrors projects/work (e.g. self_declaration). */
  verificationMethod?: string | null;
};

const emptyCertificate = (): CertificateEntry => ({
  name: '',
  issuedBy: '',
  issuedDate: '',
  expirationDate: '',
  credentialId: '',
  reportingUrl: '',
  supportingMediaUrl: '',
  associatedSkills: '',
  noExpiration: false,
  certVerificationStatus: 'pending',
});

function cloneCertificate(c: CertificateEntry): CertificateEntry {
  return { ...c };
}

function formatCertificateCardSubtitle(c: CertificateEntry): string {
  const parts: string[] = [];
  if (c.issuedBy?.trim()) parts.push(`Issued by ${c.issuedBy.trim()}`);
  if (c.issuedDate?.trim()) parts.push(`Issued ${c.issuedDate}`);
  if (!c.noExpiration && c.expirationDate?.trim()) parts.push(`Expires ${c.expirationDate}`);
  if (c.noExpiration) parts.push('No expiration');
  if (c.credentialId?.trim()) parts.push(`ID ${c.credentialId.trim()}`);
  if (c.associatedSkills?.trim()) parts.push(`Skills: ${c.associatedSkills.trim()}`);
  return parts.length ? parts.join(' · ') : 'No dates or credential ID';
}

const MARITAL_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widow/Widower' },
  { value: 'separated', label: 'Separated' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const RELATION_TYPE_OPTIONS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'parent', label: 'Parent' },
  { value: 'other', label: 'Other' },
];

type FamilyRelationEntry = { relationType: string; fullName: string };

const emptyFamilyRelation = (): FamilyRelationEntry => ({
  relationType: '',
  fullName: '',
});

function validateOptionalHttpUrl(label: string, value: string | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  const normalized = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(normalized);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return `${label} must use http or https`;
    }
    return null;
  } catch {
    return `${label} is not a valid URL`;
  }
}

function validateAmountField(label: string, raw: string | undefined): string | null {
  const v = raw?.trim();
  if (!v) return null;
  const n = parseFloat(v.replace(/,/g, ''));
  if (!Number.isFinite(n) || n < 0) {
    return `${label} must be a non-negative number`;
  }
  return null;
}

function yearMonthSortKey(year: string, month: string): number | null {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  return y * 12 + (m - 1);
}

function omitKeysMatching(obj: Record<string, string>, re: RegExp): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!re.test(k)) out[k] = v;
  }
  return out;
}

function locationEntryFieldErrors(loc: LocationEntry, index: number): Record<string, string> {
  const k = (f: string) => `loc_${index}_${f}`;
  const o: Record<string, string> = {};
  if (!loc.country?.trim()) o[k('country')] = 'Country is required';
  if (!loc.address?.trim()) o[k('address')] = 'Address is required';
  if (!loc.city?.trim()) o[k('city')] = 'City is required';
  if (!loc.state?.trim()) o[k('state')] = 'State / region is required';
  const status = loc.verificationStatus ?? 'pending';
  if (status === 'verified') {
    const digital = loc.documentType === 'digital_verify';
    if (!digital && !loc.documentUrl?.trim()) o[k('documentUrl')] = 'Upload a proof-of-address document';
    if (!digital && !loc.documentType?.trim()) o[k('documentType')] = 'Document type is required';
  }
  return o;
}

function locationsListFieldErrors(list: LocationEntry[]): Record<string, string> {
  if (list.length === 0) return { loc_list: 'Add at least one location.' };
  const defaults = list.filter((l) => l.isDefault);
  if (defaults.length !== 1) return { loc_default: 'Select exactly one default location.' };
  for (let i = 0; i < list.length; i++) {
    const fe = locationEntryFieldErrors(list[i], i);
    if (Object.keys(fe).length) return fe;
  }
  return {};
}

function educationEntryFieldErrors(entry: EducationEntry, slug: string): Record<string, string> {
  const k = (f: string) => `edu_${slug}_${f}`;
  const o: Record<string, string> = {};
  if (!entry.institutionName?.trim()) o[k('institutionName')] = 'Institution / school is required';
  if (!entry.grade?.trim()) o[k('grade')] = 'Grade is required';
  if (!entry.fieldOfStudy?.trim()) o[k('fieldOfStudy')] = 'Field of study is required';
  if (!entry.country?.trim()) o[k('country')] = 'Country is required';
  if (!entry.levelOfEducation) o[k('levelOfEducation')] = 'Level is required';
  if (!entry.degreeType) o[k('degreeType')] = 'Qualification is required';
  if (!entry.startMonth || !entry.startYear) o[k('startDate')] = 'Start month and year are required';
  if (!entry.expectedEndOngoing && (!entry.endMonth || !entry.endYear)) {
    o[k('endDate')] = 'End month and year are required, or mark ongoing';
  }
  const startKey = yearMonthSortKey(entry.startYear, entry.startMonth);
  const endKey = yearMonthSortKey(entry.endYear, entry.endMonth);
  if (startKey != null && endKey != null && endKey < startKey) {
    o[k('endDate')] = 'End date cannot be before start date';
  }
  const costErr = validateAmountField('Cost of education', entry.costOfEducation);
  if (costErr) o[k('costOfEducation')] = costErr.replace(/^Cost of education /, '');
  if (entry.hasLoan) {
    const loanErr = validateAmountField('Pending loan', entry.pendingLoanAmount);
    if (loanErr) o[k('pendingLoanAmount')] = loanErr.replace(/^Pending loan /, '');
  }
  const mediaErr = validateOptionalHttpUrl('Supporting media URL', entry.supportingMediaUrl);
  if (mediaErr) o[k('supportingMediaUrl')] = mediaErr;
  const stuEmail = entry.studentVerificationEmail?.trim();
  if (stuEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stuEmail)) {
    o[k('studentVerificationEmail')] = 'Enter a valid email or leave blank';
  }
  return o;
}

function workEntryFieldErrors(entry: WorkEntry, slug: string): Record<string, string> {
  const k = (f: string) => `work_${slug}_${f}`;
  const o: Record<string, string> = {};
  if (!entry.organisationName?.trim()) o[k('organisationName')] = 'Organisation name is required';
  if (!entry.industry?.trim()) o[k('industry')] = 'Industry is required';
  if (!entry.employmentType) o[k('employmentType')] = 'Employment type is required';
  if (!entry.workMode) o[k('workMode')] = 'Work mode is required';
  if (!entry.workRoles?.length) o[k('workRoles')] = 'Add at least one role';
  const primary = entry.workRoles[0];
  if (primary) {
    if (!primary.title?.trim()) o[k('role0_title')] = 'Role title is required';
    if (!primary.startDate?.trim()) o[k('role0_startDate')] = 'Start date is required for the role';
    if (!primary.currentlyWorking && !primary.endDate?.trim()) {
      o[k('role0_endDate')] = 'End date is required, or mark “Currently working here”';
    }
  }
  for (let ri = 1; ri < entry.workRoles.length; ri++) {
    const r = entry.workRoles[ri];
    if (!r.title?.trim()) continue;
    if (!r.startDate?.trim()) o[k(`role${ri}_startDate`)] = 'Start date is required';
    if (!r.currentlyWorking && !r.endDate?.trim()) {
      o[k(`role${ri}_endDate`)] = 'End date is required, or mark as current';
    }
  }
  const salErr = validateAmountField('Salary', entry.salary);
  if (salErr) o[k('salary')] = salErr.replace(/^Salary /, '');
  return o;
}

function projectEntryFieldErrors(entry: ProjectEntry, slug: string): Record<string, string> {
  const k = (f: string) => `proj_${slug}_${f}`;
  const o: Record<string, string> = {};
  if (!entry.title?.trim()) o[k('title')] = 'Title is required';
  const linkErr = validateOptionalHttpUrl('Project link', entry.projectLink);
  if (linkErr) o[k('projectLink')] = linkErr;
  const mediaErr = validateOptionalHttpUrl('Media URL', entry.mediaUrl);
  if (mediaErr) o[k('mediaUrl')] = mediaErr;
  for (let mi = 0; mi < entry.teamMembers.length; mi++) {
    const m = entry.teamMembers[mi];
    const hasN = !!m.name?.trim();
    const hasR = !!m.role?.trim();
    if (hasN !== hasR) {
      o[k(`team_${mi}`)] = 'Team member needs both name and role, or leave the row empty';
      break;
    }
  }
  return o;
}

function certificateEntryFieldErrors(c: CertificateEntry, slug: string): Record<string, string> {
  const k = (f: string) => `cert_${slug}_${f}`;
  const o: Record<string, string> = {};
  if (!c.name?.trim()) o[k('name')] = 'Certificate name is required';
  if (!c.issuedBy?.trim()) o[k('issuedBy')] = 'Issued by is required';
  const reportErr = validateOptionalHttpUrl('Reporting URL', c.reportingUrl);
  if (reportErr) o[k('reportingUrl')] = reportErr;
  const mediaErr = validateOptionalHttpUrl('Supporting media URL', c.supportingMediaUrl);
  if (mediaErr) o[k('supportingMediaUrl')] = mediaErr;
  if (
    !c.noExpiration &&
    c.issuedDate &&
    c.expirationDate &&
    c.issuedDate > c.expirationDate
  ) {
    o[k('expirationDate')] = 'Expiration date cannot be before issued date';
  }
  return o;
}

function familyFieldErrors(
  maritalStatus: string,
  spouseName: string,
  relationsList: FamilyRelationEntry[],
): Record<string, string> {
  const o: Record<string, string> = {};
  if (maritalStatus === 'married' && !spouseName?.trim()) {
    o.fam_spouseName = 'Spouse name is required when marital status is Married.';
  }
  for (let i = 0; i < relationsList.length; i++) {
    const r = relationsList[i];
    const hasT = !!r.relationType?.trim();
    const hasN = !!r.fullName?.trim();
    if (!hasT && !hasN) continue;
    if (!hasT) o[`fam_rel_${i}_type`] = 'Select a relation type';
    if (!hasN) o[`fam_rel_${i}_name`] = 'Enter full name';
  }
  return o;
}

function familyRelationDraftFieldErrors(r: FamilyRelationEntry): Record<string, string> {
  const o: Record<string, string> = {};
  if (!r.relationType?.trim()) o.fam_draft_type = 'Select a relationship type.';
  if (!r.fullName?.trim()) o.fam_draft_name = 'Enter relation full name.';
  return o;
}

function socialFieldErrors(social: {
  linkedin: string;
  twitter: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  snapchat: string;
}): Record<string, string> {
  const parsed = verificationSocialSchema.safeParse(social);
  if (parsed.success) return {};
  return prefixZodFieldErrors('soc', parsed.error);
}

function educationListFieldErrors(list: EducationEntry[]): Record<string, string> {
  const toSave = list.filter((e) => e.id || e.institutionName.trim());
  if (toSave.length === 0) {
    return { edu_list: 'Add at least one education entry with an institution name.' };
  }
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!e.id && !e.institutionName.trim()) continue;
    const fe = educationEntryFieldErrors(e, String(i));
    if (Object.keys(fe).length) return fe;
  }
  return {};
}

function workListFieldErrors(list: WorkEntry[]): Record<string, string> {
  const toSave = list.filter((e) => e.id || e.organisationName.trim());
  if (toSave.length === 0) {
    return { work_list: 'Add at least one work experience with an organisation name.' };
  }
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!e.id && !e.organisationName.trim()) continue;
    const fe = workEntryFieldErrors(e, String(i));
    if (Object.keys(fe).length) return fe;
  }
  return {};
}

function projectListFieldErrors(list: ProjectEntry[]): Record<string, string> {
  const toSave = list.filter((p) => p.id || p.title.trim());
  if (toSave.length === 0) {
    return { proj_list: 'Add at least one project with a title.' };
  }
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (!p.id && !p.title.trim()) continue;
    const fe = projectEntryFieldErrors(p, String(i));
    if (Object.keys(fe).length) return fe;
  }
  return {};
}

function certificationListFieldErrors(list: CertificateEntry[]): Record<string, string> {
  if (list.length === 0) return { cert_list: 'Add at least one certification.' };
  for (let i = 0; i < list.length; i++) {
    const fe = certificateEntryFieldErrors(list[i], String(i));
    if (Object.keys(fe).length) return fe;
  }
  return {};
}

export default function VerificationCenter() {
  const [loading, setLoading] = useState(true);
  /** After the first profile load, refreshes use `soft` mode so saves do not flash the full-page loader. */
  const profileInitialFetchCompletedRef = useRef(false);
  const [profile, setProfile] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState<Record<SectionKey, { completed: boolean; verified: boolean }>>({
    personal: { completed: false, verified: false },
    location: { completed: false, verified: false },
    education: { completed: false, verified: false },
    social: { completed: false, verified: false },
    work: { completed: false, verified: false },
    projects: { completed: false, verified: false },
    certification: { completed: false, verified: false },
    family: { completed: false, verified: false },
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: SectionKey = isSectionKey(tabParam) ? tabParam : 'personal';
  const { completedVerificationSteps, progressPct } = useMemo(
    () => verificationProgressFromMerged(verificationStatus),
    [verificationStatus],
  );
  const [saving, setSaving] = useState(false);
  const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string>>({});

  // Personal
  const [personal, setPersonal] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    nationality: '',
    country: '',
    address: '',
    city: '',
    state: '',
    idType: '',
    idNumber: '',
    idDocumentUrl: '',
  });
  const [sectionEditMode, setSectionEditMode] = useState<Partial<Record<SectionKey, boolean>>>({});
  const [verifyPersonalModalOpen, setVerifyPersonalModalOpen] = useState(false);
  /** After "Add data" succeeds: keep the same form visible with a "Verify Data" CTA until identity is verified. */
  const [personalIdentityAwaitingVerification, setPersonalIdentityAwaitingVerification] = useState(false);
  const [verifyGovIdModalOpen, setVerifyGovIdModalOpen] = useState(false);
  const [identityVerificationPath, setIdentityVerificationPath] = useState<'none' | 'self' | 'gov'>('none');
  const [phoneDialSelection, setPhoneDialSelection] = useState(DEFAULT_PHONE_DIAL_VALUE);
  /** After number is submitted: choose SMS vs email, then OTP. */
  const [phoneVerifyPhase, setPhoneVerifyPhase] = useState<'enter_number' | 'choose_delivery' | 'enter_otp'>(
    'enter_number',
  );
  const [phoneOtpChannel, setPhoneOtpChannel] = useState<'sms' | 'email' | null>(null);
  const [phoneOtpDigits, setPhoneOtpDigits] = useState(['', '', '', '', '', '']);
  const [userEmailVerified, setUserEmailVerified] = useState(false);
  const [userPhoneVerified, setUserPhoneVerified] = useState(false);
  const [phoneOtpSending, setPhoneOtpSending] = useState(false);
  const [emailVerifyPhase, setEmailVerifyPhase] = useState<'idle' | 'enter_otp'>('idle');
  const [emailOtpDigits, setEmailOtpDigits] = useState(['', '', '', '', '', '']);
  const [emailCodeSending, setEmailCodeSending] = useState(false);
  const [livenessCompleteLocal, setLivenessCompleteLocal] = useState(false);
  /** True after user confirms self-declaration in the modal (persisted in session). */
  const [personalSelfDeclarationAcknowledged, setPersonalSelfDeclarationAcknowledged] = useState(false);
  const [livenessSelfieModalOpen, setLivenessSelfieModalOpen] = useState(false);
  const [requestDataEditModalOpen, setRequestDataEditModalOpen] = useState(false);
  const [requestDataEditSelected, setRequestDataEditSelected] = useState<Record<string, boolean>>({});
  const [requestDataEditReason, setRequestDataEditReason] = useState('');
  const [requestDataEditFile, setRequestDataEditFile] = useState<File | null>(null);
  const [requestDataEditSubmitting, setRequestDataEditSubmitting] = useState(false);
  const requestDataEditFileInputRef = useRef<HTMLInputElement>(null);
  const [selfDeclarationFlow, setSelfDeclarationFlow] = useState<SelfDeclarationFlow>({ open: false });
  const [personalFlowStep, setPersonalFlowStep] = useState<PersonalFlowStep>('add_data');

  const isSectionEditable = (id: SectionKey): boolean => {
    const status = verificationStatus[id];
    if (!status?.completed) return true;
    if (status?.verified) return true;
    return !!sectionEditMode[id];
  };
  const [locationsList, setLocationsList] = useState<LocationEntry[]>([]);
  const [locationDraft, setLocationDraft] = useState({
    country: '',
    state: '',
    city: '',
    address: '',
  });
  /** When false, the add-location form is hidden behind an "Add new" control (like other sections). */
  const [locationAddFormOpen, setLocationAddFormOpen] = useState(false);
  const [verifyAddressModal, setVerifyAddressModal] = useState<{
    open: boolean;
    locationIndex: number | null;
    step: VerifyAddressModalStep;
  }>({ open: false, locationIndex: null, step: 'method' });
  const locationVerifyFileInputRef = useRef<HTMLInputElement>(null);
  const locationVerifyUploadIndexRef = useRef<number | null>(null);
  const [uploadingLocationIndex, setUploadingLocationIndex] = useState<number | null>(null);
  const [locationRemoveConfirm, setLocationRemoveConfirm] = useState<{
    open: boolean;
    index: number | null;
  }>({ open: false, index: null });

  // Social (from profile.socialMedia)
  const [social, setSocial] = useState({
    linkedin: '',
    twitter: '',
    facebook: '',
    instagram: '',
    tiktok: '',
    snapchat: '',
  });
  // Education (list of entries like Location)
  const [educationEntriesList, setEducationEntriesList] = useState<EducationEntry[]>([]);
  const [educationDraft, setEducationDraft] = useState<EducationEntry>(() => emptyEducation());
  const [educationSaving, setEducationSaving] = useState(false);
  const [educationAddFormOpen, setEducationAddFormOpen] = useState(false);
  const [educationSkillInput, setEducationSkillInput] = useState('');
  const [educationCourseworkInput, setEducationCourseworkInput] = useState('');
  const [educationScholarshipInput, setEducationScholarshipInput] = useState('');
  const [educationAchievementInput, setEducationAchievementInput] = useState('');
  const [educationActivitiesInput, setEducationActivitiesInput] = useState('');
  const educationDraftSkillChips = useMemo(
    () => educationChipsFromDelimitedText(educationDraft.associatedSkills),
    [educationDraft.associatedSkills],
  );
  const educationDraftCourseworkChips = useMemo(
    () => educationChipsFromDelimitedText(educationDraft.academicResponsibilities),
    [educationDraft.academicResponsibilities],
  );
  const educationDraftScholarshipChips = useMemo(
    () => educationChipsFromDelimitedText(educationDraft.scholarshipsAndAid),
    [educationDraft.scholarshipsAndAid],
  );
  const educationDraftAchievementChips = useMemo(
    () => educationChipsFromDelimitedText(educationDraft.academicAchievements),
    [educationDraft.academicAchievements],
  );
  const educationDraftActivitiesChips = useMemo(
    () => educationChipsFromDelimitedText(educationDraft.activitiesSocieties),
    [educationDraft.activitiesSocieties],
  );
  const [verifyEducationModal, setVerifyEducationModal] = useState<{
    open: boolean;
    index: number | null;
    screen: 'pick' | 'student_email' | 'student_success';
    studentEmail: string;
    otp: string;
    otpSent: boolean;
    studentFlowBusy: boolean;
  }>({
    open: false,
    index: null,
    screen: 'pick',
    studentEmail: '',
    otp: '',
    otpSent: false,
    studentFlowBusy: false,
  });
  const [educationRemoveConfirm, setEducationRemoveConfirm] = useState<{
    open: boolean;
    index: number | null;
  }>({ open: false, index: null });
  /** Collapsible education cards on verification tab; omitted key defaults to collapsed. */
  const [educationCardExpanded, setEducationCardExpanded] = useState<Record<string, boolean>>({});
  const educationVerifyFileInputRef = useRef<HTMLInputElement>(null);
  const educationVerifyUploadIndexRef = useRef<number | null>(null);
  const [uploadingEducationIndex, setUploadingEducationIndex] = useState<number | null>(null);

  // Work (list of entries like Location)
  const [workEntriesList, setWorkEntriesList] = useState<WorkEntry[]>([]);
  const [workDraft, setWorkDraft] = useState<WorkEntry>(() => emptyWork());
  const [workSaving, setWorkSaving] = useState(false);
  const [workAddFormOpen, setWorkAddFormOpen] = useState(false);
  const [verifyWorkModal, setVerifyWorkModal] = useState<{
    open: boolean;
    index: number | null;
    screen: 'pick' | 'work_email' | 'work_email_success';
    workEmail: string;
    otp: string;
    otpSent: boolean;
    workEmailFlowBusy: boolean;
  }>({
    open: false,
    index: null,
    screen: 'pick',
    workEmail: '',
    otp: '',
    otpSent: false,
    workEmailFlowBusy: false,
  });
  const [workRemoveConfirm, setWorkRemoveConfirm] = useState<{
    open: boolean;
    index: number | null;
  }>({ open: false, index: null });
  /** Collapsible work cards on verification tab; omitted key defaults to collapsed. */
  const [workCardExpanded, setWorkCardExpanded] = useState<Record<string, boolean>>({});
  const workVerifyFileInputRef = useRef<HTMLInputElement>(null);
  const workVerifyUploadIndexRef = useRef<number | null>(null);
  const [uploadingWorkIndex, setUploadingWorkIndex] = useState<number | null>(null);
  const [workSkillInput, setWorkSkillInput] = useState('');
  const workDraftSkillChips = useMemo(
    () =>
      workDraft.associatedSkills
        .split(/[,;]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [workDraft.associatedSkills],
  );

  const [projectsList, setProjectsList] = useState<ProjectEntry[]>([]);
  const [projectDraft, setProjectDraft] = useState<ProjectEntry>(() => emptyProject());
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectAddFormOpen, setProjectAddFormOpen] = useState(false);
  const [verifyProjectModal, setVerifyProjectModal] = useState<{
    open: boolean;
    index: number | null;
    step: 'method' | 'evidence';
  }>({ open: false, index: null, step: 'method' });
  const [projectVerifyEvidenceDraft, setProjectVerifyEvidenceDraft] = useState({
    projectLink: '',
    mediaUrl: '',
  });
  const [projectRemoveConfirm, setProjectRemoveConfirm] = useState<{
    open: boolean;
    index: number | null;
  }>({ open: false, index: null });
  const [verifyCertModal, setVerifyCertModal] = useState<{
    open: boolean;
    index: number | null;
    step: 'method' | 'evidence';
  }>({ open: false, index: null, step: 'method' });
  const [certVerifyEvidenceDraft, setCertVerifyEvidenceDraft] = useState({
    reportingUrl: '',
    supportingMediaUrl: '',
  });
  const [certRemoveConfirm, setCertRemoveConfirm] = useState<{
    open: boolean;
    index: number | null;
  }>({ open: false, index: null });

  // Certification (local only for now)
  const [certList, setCertList] = useState<CertificateEntry[]>([]);
  const [certDraft, setCertDraft] = useState<CertificateEntry>(() => emptyCertificate());
  const [certAddFormOpen, setCertAddFormOpen] = useState(false);
  const [certDraftUploading, setCertDraftUploading] = useState(false);

  // Family & Relationship
  const [maritalStatus, setMaritalStatus] = useState('');
  const [spouseName, setSpouseName] = useState('');
  const [relationsList, setRelationsList] = useState<FamilyRelationEntry[]>([]);
  const [familyRelationDraft, setFamilyRelationDraft] = useState<FamilyRelationEntry>(() => emptyFamilyRelation());
  const [familyRelationAddFormOpen, setFamilyRelationAddFormOpen] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (personal.idType && personal.idNumber?.trim() && personal.idDocumentUrl) {
      setIdentityVerificationPath('gov');
    }
  }, [personal.idType, personal.idNumber, personal.idDocumentUrl]);

  // Sync URL with valid tab on load (e.g. invalid or missing param)
  useEffect(() => {
    if (!isSectionKey(tabParam)) {
      setSearchParams({ tab: 'personal' }, { replace: true });
    }
  }, [tabParam, setSearchParams]);

  const personalBasicComplete = useMemo(() => {
    return !!(
      personal.firstName?.trim() &&
      personal.lastName?.trim() &&
      personal.dateOfBirth &&
      personal.gender &&
      personal.nationality
    );
  }, [personal.firstName, personal.lastName, personal.dateOfBirth, personal.gender, personal.nationality]);

  const personalAgeYears = useMemo(() => {
    if (!personal.dateOfBirth?.trim()) return null;
    const d = new Date(personal.dateOfBirth);
    if (Number.isNaN(d.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
    return age;
  }, [personal.dateOfBirth]);

  const identityFlowComplete = useMemo(() => {
    if (verificationStatus.personal.verified) return true;
    if (profile?.identityVerification) return true;
    const gov =
      !!(profile?.idType && String(profile?.idNumber || '').trim() && profile?.idDocumentUrl);
    if (gov) return true;
    if (identityVerificationPath === 'self' && personalSelfDeclarationAcknowledged) return true;
    return false;
  }, [
    identityVerificationPath,
    personalSelfDeclarationAcknowledged,
    verificationStatus.personal.verified,
    profile?.identityVerification,
    profile?.idType,
    profile?.idNumber,
    profile?.idDocumentUrl,
  ]);

  const personalAdminReviewPending = useMemo(
    () => personalIdentityAwaitingAdminReview(profile),
    [profile],
  );

  /** Which flow group (0–2) is currently active for pill highlighting — matches stacked sections. */
  const activePersonalFlowGroupIndex = useMemo(() => {
    if (!personalBasicComplete || !identityFlowComplete) return 0;
    if (!userEmailVerified || !userPhoneVerified) return 1;
    if (!livenessCompleteLocal) return 2;
    return -1;
  }, [
    personalBasicComplete,
    identityFlowComplete,
    userEmailVerified,
    userPhoneVerified,
    livenessCompleteLocal,
  ]);

  /** Keep personal form/summary in this card until identity is verified; never hide it just because fields validate locally. */
  const showPersonalBasicEntryForm =
    !identityFlowComplete && !profile?.isPersonalCompleted;

  /** Read-only personal dashboard (matches post-liveness UX). Shown before step-specific UI so we never show the empty "identity" placeholder once identity + liveness are done. */
  const showPersonalIdentityReadOnlySummary = useMemo(() => {
    if (!livenessCompleteLocal || !personalBasicComplete) return false;
    if (!userEmailVerified || !userPhoneVerified) return false;
    if (profile?.isPersonalCompleted === true) return true;
    return identityFlowComplete;
  }, [
    livenessCompleteLocal,
    personalBasicComplete,
    userEmailVerified,
    userPhoneVerified,
    identityFlowComplete,
    profile?.isPersonalCompleted,
  ]);

  useEffect(() => {
    if (loading) return;
    try {
      if (verificationStatus.personal.verified) {
        clearPersonalIdentityPathStorage();
        clearPersonalSelfDeclarationAcknowledgedStorage();
        setPersonalSelfDeclarationAcknowledged(false);
        return;
      }
      if (identityVerificationPath === 'self' || identityVerificationPath === 'gov') {
        sessionStorage.setItem(PERSONAL_IDENTITY_PATH_STORAGE_KEY, identityVerificationPath);
      }
    } catch {
      /* ignore */
    }
  }, [loading, identityVerificationPath, verificationStatus.personal.verified]);

  useEffect(() => {
    if (loading) return;
    setPersonalSelfDeclarationAcknowledged(readPersonalSelfDeclarationAcknowledged());
  }, [loading]);

  useEffect(() => {
    if (identityFlowComplete) {
      setPersonalIdentityAwaitingVerification(false);
      clearPersonalIdentityAwaitingStorage();
    }
  }, [identityFlowComplete]);

  useEffect(() => {
    if (!personalBasicComplete) {
      setPersonalIdentityAwaitingVerification(false);
      clearPersonalIdentityAwaitingStorage();
      clearPersonalSelfDeclarationAcknowledgedStorage();
      setPersonalSelfDeclarationAcknowledged(false);
    }
  }, [personalBasicComplete]);

  useLayoutEffect(() => {
    if (loading) return;
    if (!verificationStatus.personal.verified && identityVerificationPath === 'none') {
      const hasServerIdentity =
        !!(profile?.identityVerification) ||
        !!(profile?.idType && String(profile?.idNumber || '').trim() && profile?.idDocumentUrl);
      if (!hasServerIdentity) {
        try {
          const p = sessionStorage.getItem(PERSONAL_IDENTITY_PATH_STORAGE_KEY);
          if (p === 'self' || p === 'gov') {
            setIdentityVerificationPath(p);
          }
        } catch {
          /* ignore */
        }
      }
    }
    if (!personalBasicComplete) {
      clearPersonalIdentityAwaitingStorage();
      clearPersonalSelfDeclarationAcknowledgedStorage();
      setPersonalSelfDeclarationAcknowledged(false);
    } else {
      try {
        const raw = sessionStorage.getItem(PERSONAL_IDENTITY_AWAITING_STORAGE_KEY);
        if (raw === '1' && !identityFlowComplete) {
          setPersonalIdentityAwaitingVerification(true);
        }
      } catch {
        /* ignore */
      }
    }
    const stored = parseStoredPersonalFlowStep(sessionStorage.getItem(PERSONAL_FLOW_STEP_STORAGE_KEY));
    const resolved = resolvePersonalFlowStepFromStorage(
      stored,
      personalBasicComplete,
      identityFlowComplete,
      userEmailVerified,
      userPhoneVerified,
      livenessCompleteLocal,
    );
    setPersonalFlowStep(resolved);
  }, [
    loading,
    personalBasicComplete,
    identityFlowComplete,
    identityVerificationPath,
    verificationStatus.personal.verified,
    profile?.identityVerification,
    profile?.idType,
    profile?.idNumber,
    profile?.idDocumentUrl,
    userPhoneVerified,
    userEmailVerified,
    livenessCompleteLocal,
    profile?.isPersonalCompleted,
  ]);

  useEffect(() => {
    if (loading) return;
    try {
      sessionStorage.setItem(PERSONAL_FLOW_STEP_STORAGE_KEY, personalFlowStep);
    } catch {
      /* ignore */
    }
  }, [personalFlowStep, loading]);

  useEffect(() => {
    if (loading) return;
    try {
      if (personalIdentityAwaitingVerification) {
        sessionStorage.setItem(PERSONAL_IDENTITY_AWAITING_STORAGE_KEY, '1');
      }
    } catch {
      /* ignore */
    }
  }, [personalIdentityAwaitingVerification, loading]);

  const fetchProfile = async (opts?: { soft?: boolean }) => {
    const blockWholePage = !opts?.soft && !profileInitialFetchCompletedRef.current;
    if (blockWholePage) setLoading(true);
    try {
      const [profileRes, statusRes] = await Promise.all([
        api.get('/v1/professional/profile'),
        api.get('/v1/professional/verification-status').catch(() => ({ data: { data: null } })),
      ]);
      const data = profileRes.data?.data;
      setProfile(data);
      if (data && typeof data === 'object') {
        const d = data as {
          livenessSelfieUrl?: string | null;
          isPersonalCompleted?: boolean;
        };
        const hasSelfie = Boolean(d.livenessSelfieUrl && String(d.livenessSelfieUrl).trim());
        setLivenessCompleteLocal(hasSelfie || d.isPersonalCompleted === true);
      }
      const status = statusRes.data?.data as Partial<Record<SectionKey, { completed?: boolean; verified?: boolean }>> | undefined;
      setVerificationStatus(mergeVerificationStatusFromSources(status, data));
      if (data?.user) {
        const u = data.user as {
          firstName?: string;
          lastName?: string;
          email?: string;
          phoneNumber?: string;
          emailVerified?: boolean;
          phoneVerified?: boolean;
        };
        setUserEmailVerified(!!u.emailVerified);
        setUserPhoneVerified(!!u.phoneVerified);
        const rawPhone = (u.phoneNumber || '').trim();
        const phoneParts = storedUserPhoneToDialAndNational(rawPhone || undefined);
        setPhoneDialSelection(phoneParts.dialValue);
        setPersonal((p) => ({
          ...p,
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          email: u.email || '',
          phoneNumber: rawPhone ? phoneParts.national : p.phoneNumber,
        }));
      }
      if (data) {
        const addressData = data.address && typeof data.address === 'object' ? data.address : {};
        setPersonal((p) => ({
          ...p,
          middleName: data.middleName ?? p.middleName ?? '',
          gender: data.gender ?? p.gender ?? '',
          nationality: resolvedNationalityFromApi(data),
          country: data.country || '',
          dateOfBirth: data.dateOfBirth
            ? new Date(data.dateOfBirth).toISOString().split('T')[0]
            : '',
          address: addressData.address ?? data.address ?? p.address ?? '',
          city: addressData.city ?? data.city ?? p.city ?? '',
          state: addressData.state ?? data.state ?? p.state ?? '',
          idType: data.idType || '',
          idNumber: data.idNumber || '',
          idDocumentUrl: data.idDocumentUrl || '',
        }));
        if (Array.isArray(data.locations) && data.locations.length > 0) {
          const len = data.locations.length;
          setLocationsList(data.locations.map((loc: any, i: number) => mapApiLocationToEntry(loc, i, len)));
        } else if (
          (data.locationDocumentUrl && String(data.locationDocumentUrl).trim()) ||
          ((data as any).locationDocumentType && String((data as any).locationDocumentType).trim())
        ) {
          // Legacy profile: location proof stored on professional, not in locations[] — do not infer from signup country alone.
          const addr = data.address && typeof data.address === 'object' ? (data.address as any) : {};
          setLocationsList([
            mapApiLocationToEntry(
              {
                country: data.country || '',
                address: addr.address ?? (typeof data.address === 'string' ? data.address : '') ?? '',
                city: addr.city ?? (data as any).city ?? '',
                state: addr.state ?? (data as any).state ?? '',
                documentType: (data as any).locationDocumentType || '',
                documentUrl: (data as any).locationDocumentUrl || '',
              },
              0,
              1,
            ),
          ]);
        } else {
          setLocationsList([]);
        }
        const sm = data.socialMedia || {};
        setSocial({
          linkedin: sm.linkedin || '',
          twitter: sm.twitter || '',
          facebook: sm.facebook || '',
          instagram: sm.instagram || '',
          tiktok: sm.tiktok || '',
          snapchat: sm.snapchat || '',
        });
        const eduList = data.education || [];
        if (Array.isArray(eduList) && eduList.length > 0) {
          setEducationEntriesList(
            eduList.map((e: any) => {
              const sm = parseYearMonthFromIso(e.startDate);
              const em = parseYearMonthFromIso(e.endDate);
              const hasLoan =
                (e.pendingLoanAmount != null && String(e.pendingLoanAmount).trim() !== '') ||
                !!(typeof e.loanRepaymentFrequency === 'string' && e.loanRepaymentFrequency.trim());
              return {
                id: e.id,
                schoolType: e.schoolType || '',
                levelOfEducation: e.levelOfEducation || '',
                degreeType: e.degreeType || '',
                institutionName: e.institutionName || '',
                institutionIndustry: e.institutionIndustry || '',
                fieldOfStudy: e.fieldOfStudy || '',
                country: e.country || '',
                grade: e.grade || '',
                startMonth: sm.month,
                startYear: sm.year,
                endMonth: em.month,
                endYear: em.year,
                expectedEndOngoing: !!e.currentlyAttending,
                costOfEducation: e.costOfEducation != null ? String(e.costOfEducation) : '',
                currency: e.currency || 'USD',
                costFrequency: e.costFrequency || '',
                pendingLoanAmount: e.pendingLoanAmount != null ? String(e.pendingLoanAmount) : '',
                loanCurrency: e.loanCurrency || 'USD',
                loanRepaymentFrequency: e.loanRepaymentFrequency || '',
                hasLoan,
                scholarshipsAndAid: e.scholarshipsAndAid || '',
                programDescription: e.programDescription || '',
                academicResponsibilities: e.academicResponsibilities || '',
                academicAchievements: e.academicAchievements || '',
                activitiesSocieties: e.activitiesSocieties || '',
                associatedSkills: e.associatedSkills || '',
                supportingMediaUrl: e.supportingMediaUrl || '',
                isDefault: !!e.isDefault,
                verificationMethod: e.verificationMethod || undefined,
                studentVerificationEmail:
                  typeof e.studentVerificationEmail === 'string' ? e.studentVerificationEmail : '',
                eduVerificationStatus:
                  e.verificationStatus === 'verified' ? 'verified' : 'pending',
                verificationDocuments: e.verificationDocuments ?? undefined,
                verifiedAt: e.verifiedAt ?? null,
                reviewedBy: e.reviewedBy ?? null,
                createdAt: e.createdAt ?? null,
                updatedAt: e.updatedAt ?? null,
              };
            }),
          );
        } else {
          setEducationEntriesList([]);
        }
        const workList = data.workExperience || [];
        if (Array.isArray(workList) && workList.length > 0) {
          setWorkEntriesList(
            workList.map((w: any) => {
              const sr = w.salaryRange && typeof w.salaryRange === 'object' ? w.salaryRange : null;
              const startD = w.startDate ? (typeof w.startDate === 'string' ? w.startDate.slice(0, 10) : '') : '';
              const endD = w.endDate ? (typeof w.endDate === 'string' ? w.endDate.slice(0, 10) : '') : '';
              const respArr = Array.isArray(w.responsibilities) ? w.responsibilities.filter((x: unknown) => typeof x === 'string') : [];
              const otherIdx = respArr.findIndex((a: string) => /^Other roles:\s*/i.test(a));
              const respWithoutOther =
                otherIdx >= 0 ? [...respArr.slice(0, otherIdx), ...respArr.slice(otherIdx + 1)] : [...respArr];
              const parsedExtras =
                otherIdx >= 0 && typeof respArr[otherIdx] === 'string'
                  ? parseOtherRolesLine(respArr[otherIdx] as string)
                  : [];
              const achArr = Array.isArray(w.achievements) ? w.achievements.filter((x: unknown) => typeof x === 'string') : [];
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
              return {
                id: w.id,
                organisationName: w.organisationName || '',
                industry: w.industry || '',
                role: w.role || '',
                employmentType: w.employmentType || '',
                workMode: w.workMode || '',
                startDate: startD,
                endDate: endD,
                currency: w.currency || 'USD',
                salary: sr != null && (sr.min != null || sr.max != null) ? String(sr.min ?? sr.max ?? '') : '',
                salaryFrequency: typeof w.paymentMode === 'string' ? w.paymentMode : 'monthly',
                workRoles: [
                  {
                    title: w.role || '',
                    startDate: startD,
                    endDate: endD,
                    currentlyWorking: !!w.currentlyWorking || !endD,
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
                workVerificationEmail:
                  typeof w.workVerificationEmail === 'string' ? w.workVerificationEmail : '',
                supportingMediaUrl: typeof w.supportingMediaUrl === 'string' ? w.supportingMediaUrl : '',
              };
            }),
          );
        } else {
          setWorkEntriesList([]);
        }
        const projectSource = data.projects ?? data.professionalProjects ?? [];
        if (Array.isArray(projectSource) && projectSource.length > 0) {
          setProjectsList(
            projectSource.map((p: any) => {
              const rawTeam = p.teamMembers;
              let teamMembers: ProjectTeamMemberEntry[] = [emptyProjectTeamMember()];
              if (Array.isArray(rawTeam) && rawTeam.length > 0) {
                teamMembers = rawTeam.map((m: any) => ({
                  name: typeof m?.name === 'string' ? m.name : '',
                  role: typeof m?.role === 'string' ? m.role : '',
                }));
              }
              const vmRaw =
                typeof (p as any).verificationMethod === 'string' ? (p as any).verificationMethod : null;
              const apiVs = String((p as any).verificationStatus ?? 'pending').toLowerCase();
              const apiSaysVerified = apiVs === 'verified' || (p as any).verified === true;
              const isSelfDeclMethod = isProjectMethodSelfDeclaration(vmRaw);
              /** Self-declaration is never "full verified" in the UI; legacy rows may have status verified + self_decl method */
              const isVerifiedRow = apiSaysVerified && !isSelfDeclMethod;
              const selfDeclFromApi =
                (p as any).selfDeclared === true ||
                (p as any).projectSelfDeclared === true ||
                isSelfDeclMethod;
              return {
                id: p.id,
                title: p.title || '',
                description: p.description || '',
                projectLink: p.projectLink || '',
                mediaUrl: p.mediaUrl || '',
                teamMembers,
                projectVerificationStatus: isVerifiedRow ? 'verified' : 'pending',
                verificationMethod: vmRaw,
                projectSelfDeclared: selfDeclFromApi && !isVerifiedRow,
              };
            }),
          );
        } else {
          setProjectsList([]);
        }
        if (Array.isArray(data.certifications)) {
          if (data.certifications.length > 0) {
            setCertList(
              data.certifications.map((c: any) => {
                const exp = typeof c.expirationDate === 'string' ? c.expirationDate.trim() : '';
                const vmRaw =
                  typeof c.verificationMethod === 'string' ? c.verificationMethod.trim() : '';
                const apiVs = String(
                  c.certVerificationStatus ?? c.verificationStatus ?? '',
                ).toLowerCase();
                const isVerifiedRow =
                  apiVs === 'verified' || c.verified === true || c.verified === 'true';
                const selfDeclFromApi =
                  c.certSelfDeclared === true ||
                  c.selfDeclared === true ||
                  vmRaw === 'self_declaration' ||
                  vmRaw === 'self_declared';
                return {
                  name: c.name || '',
                  issuedBy: c.issuedBy || '',
                  issuedDate: c.issuedDate || '',
                  expirationDate: exp,
                  credentialId: c.credentialId || '',
                  reportingUrl: c.reportingUrl || '',
                  supportingMediaUrl: c.supportingMediaUrl || '',
                  associatedSkills:
                    typeof c.associatedSkills === 'string' ? c.associatedSkills : '',
                  noExpiration: !exp,
                  certVerificationStatus: isVerifiedRow ? 'verified' : 'pending',
                  certSelfDeclared: selfDeclFromApi && !isVerifiedRow,
                  verificationMethod: vmRaw || null,
                };
              }),
            );
          } else {
            setCertList([]);
          }
        }
        if (data.familyInfo && typeof data.familyInfo === 'object') {
          const fi = data.familyInfo as any;
          setMaritalStatus(fi.maritalStatus || '');
          setSpouseName(fi.spouseName || '');
          if (Array.isArray(fi.relations) && fi.relations.length > 0) {
            setRelationsList(
              fi.relations.map((r: any) => ({
                relationType: r.relationType || '',
                fullName: r.fullName || '',
              })),
            );
          } else {
            setRelationsList([]);
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load profile');
    } finally {
      if (blockWholePage) {
        setLoading(false);
        profileInitialFetchCompletedRef.current = true;
      }
    }
  };


  const idNumberPlaceholder = (): string => {
    const label = ID_TYPE_OPTIONS.find((o) => o.value === personal.idType)?.label || 'ID';
    return `Enter your ${label} number`;
  };

  const handleAddPersonalBasic = async () => {
    const parsed = verificationPersonalBasicSchema.safeParse({
      firstName: personal.firstName,
      lastName: personal.lastName,
      dateOfBirth: personal.dateOfBirth,
      gender: personal.gender,
      nationality: personal.nationality,
    });
    if (!parsed.success) {
      setFormFieldErrors((p) => ({
        ...omitKeysMatching(p, /^per_/),
        ...prefixZodFieldErrors('per', parsed.error),
      }));
      toast.error('Please fix the highlighted fields');
      return;
    }
    setFormFieldErrors((p) => omitKeysMatching(p, /^per_/));
    setSaving(true);
    try {
      await api.put('/v1/professional/profile', {
        firstName: personal.firstName?.trim() || undefined,
        lastName: personal.lastName?.trim() || undefined,
        middleName: personal.middleName?.trim() || undefined,
        gender: personal.gender || undefined,
        dateOfBirth: personal.dateOfBirth || undefined,
        nationality: personal.nationality || undefined,
      });
      toast.success('Personal data added');
      setVerifyPersonalModalOpen(false);
      setPersonalIdentityAwaitingVerification(true);
      await fetchProfile({ soft: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePersonal = async () => {
    const parsed = verificationPersonalBasicSchema.safeParse({
      firstName: personal.firstName,
      lastName: personal.lastName,
      dateOfBirth: personal.dateOfBirth,
      gender: personal.gender,
      nationality: personal.nationality,
    });
    if (!parsed.success) {
      setFormFieldErrors((p) => ({
        ...omitKeysMatching(p, /^per_/),
        ...prefixZodFieldErrors('per', parsed.error),
      }));
      toast.error('Please fix the highlighted fields');
      return;
    }
    setFormFieldErrors((p) => omitKeysMatching(p, /^per_/));
    setSaving(true);
    try {
      await api.put('/v1/professional/profile', {
        firstName: personal.firstName?.trim() || undefined,
        lastName: personal.lastName?.trim() || undefined,
        middleName: personal.middleName?.trim() || undefined,
        gender: personal.gender || undefined,
        dateOfBirth: personal.dateOfBirth || undefined,
        nationality: personal.nationality || undefined,
        idType: personal.idType || undefined,
        idNumber: personal.idNumber?.trim() || undefined,
        idDocumentUrl: personal.idDocumentUrl || undefined,
      });
      toast.success('Personal information saved');
      setSectionEditMode((prev) => ({ ...prev, personal: false }));
      await fetchProfile({ soft: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitGovIdVerification = async () => {
    const parsed = verificationPersonalGovSchema.safeParse({
      nationality: personal.nationality,
      idType: personal.idType,
      idNumber: personal.idNumber,
    });
    if (!parsed.success) {
      setFormFieldErrors((p) => ({
        ...omitKeysMatching(p, /^gov_/),
        ...prefixZodFieldErrors('gov', parsed.error),
      }));
      toast.error('Please fix the highlighted fields');
      return;
    }
    setFormFieldErrors((p) => omitKeysMatching(p, /^gov_/));
    setSaving(true);
    try {
      await api.put('/v1/professional/profile', {
        firstName: personal.firstName?.trim() || undefined,
        lastName: personal.lastName?.trim() || undefined,
        middleName: personal.middleName?.trim() || undefined,
        gender: personal.gender || undefined,
        dateOfBirth: personal.dateOfBirth || undefined,
        nationality: personal.nationality || undefined,
        idType: personal.idType || undefined,
        idNumber: personal.idNumber?.trim() || undefined,
        ...(personal.idDocumentUrl ? { idDocumentUrl: personal.idDocumentUrl } : {}),
      });
      toast.success('Government ID submitted');
      setIdentityVerificationPath('gov');
      setVerifyGovIdModalOpen(false);
      setVerifyPersonalModalOpen(false);
      await fetchProfile({ soft: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const getPhoneE164 = (): string => {
    return buildE164FromDialAndNational(
      parsePhoneDialValue(phoneDialSelection).dial,
      personal.phoneNumber?.trim() || '',
    );
  };

  const closeRequestDataEditModal = () => {
    setRequestDataEditModalOpen(false);
    setRequestDataEditSelected({});
    setRequestDataEditReason('');
    setRequestDataEditFile(null);
    setRequestDataEditSubmitting(false);
    if (requestDataEditFileInputRef.current) requestDataEditFileInputRef.current.value = '';
  };

  const toggleRequestEditField = (key: string) => {
    setRequestDataEditSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmitRequestDataEdit = async () => {
    const keys = Object.entries(requestDataEditSelected)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (keys.length === 0) {
      toast.error('Select at least one field to edit');
      return;
    }
    if (!requestDataEditReason.trim()) {
      toast.error('Select a reason for your edit request');
      return;
    }
    if (!requestDataEditFile) {
      toast.error('Attach supporting evidence');
      return;
    }
    setRequestDataEditSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('fields', JSON.stringify(keys));
      formData.append('reason', requestDataEditReason);
      formData.append('file', requestDataEditFile);
      await api.post('/v1/professional/profile/edit-request', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Request submitted. Our team will review your request.');
      closeRequestDataEditModal();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setRequestDataEditSubmitting(false);
    }
  };

  const handlePhoneOtpDigit = (index: number, char: string) => {
    const d = char.replace(/\D/g, '').slice(-1);
    setPhoneOtpDigits((prev) => {
      const next = [...prev];
      next[index] = d;
      return next;
    });
    if (d && index < 5) {
      const el = document.getElementById(`phone-otp-${index + 1}`) as HTMLInputElement | null;
      el?.focus();
    }
  };

  const handleEmailOtpDigit = (index: number, char: string) => {
    const d = char.replace(/\D/g, '').slice(-1);
    setEmailOtpDigits((prev) => {
      const next = [...prev];
      next[index] = d;
      return next;
    });
    if (d && index < 5) {
      const el = document.getElementById(`email-otp-${index + 1}`) as HTMLInputElement | null;
      el?.focus();
    }
  };

  const handleSendPhoneOtp = async (channel: 'sms' | 'email') => {
    let phoneE164: string;
    try {
      phoneE164 = getPhoneE164();
    } catch {
      toast.error('Enter a valid phone number');
      return;
    }
    if (!/^\+[1-9]\d{7,14}$/.test(phoneE164)) {
      toast.error('Phone number looks incomplete');
      return;
    }
    setPhoneOtpSending(true);
    try {
      const res = await api.post<{ code?: string }>('/v1/professional/phone/send-otp', {
        phoneE164,
        channel,
      });
      const devCode = res.data?.code;
      setPhoneOtpChannel(channel);
      setPhoneVerifyPhase('enter_otp');
      setPhoneOtpDigits(['', '', '', '', '', '']);
      toast.success(
        channel === 'email'
          ? 'Verification code sent to your account email'
          : 'Verification code sent (check SMS or server logs in development)',
      );
      if (devCode && import.meta.env.DEV) {
        toast(`Dev OTP: ${devCode}`, { icon: '🔑' });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send code');
    } finally {
      setPhoneOtpSending(false);
    }
  };

  const handleConfirmPhoneOtp = async () => {
    const code = phoneOtpDigits.join('');
    if (code.length !== 6) {
      toast.error('Enter the 6-digit code');
      return;
    }
    let phoneE164: string;
    try {
      phoneE164 = getPhoneE164();
    } catch {
      toast.error('Invalid phone number');
      return;
    }
    setSaving(true);
    try {
      await api.post('/v1/professional/phone/verify-otp', { phoneE164, code });
      setUserPhoneVerified(true);
      setPhoneOtpChannel(null);
      setPhoneOtpDigits(['', '', '', '', '', '']);
      setPhoneVerifyPhase('enter_number');
      setPersonalFlowStep('liveness');
      toast.success('Phone verified');
      await fetchProfile({ soft: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmailVerificationCode = async () => {
    setEmailCodeSending(true);
    try {
      const res = await api.post<{ code?: string }>('/v1/professional/contact/send-email-code');
      const devCode = res.data?.code;
      setEmailVerifyPhase('enter_otp');
      setEmailOtpDigits(['', '', '', '', '', '']);
      toast.success('Verification code sent to your email');
      if (devCode && import.meta.env.DEV) {
        toast(`Dev OTP: ${devCode}`, { icon: '🔑' });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send email code');
    } finally {
      setEmailCodeSending(false);
    }
  };

  const handleConfirmEmailOtp = async () => {
    const code = emailOtpDigits.join('');
    if (code.length !== 6) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setSaving(true);
    try {
      await api.post('/v1/professional/contact/verify-email-code', { code });
      setUserEmailVerified(true);
      setEmailVerifyPhase('idle');
      setEmailOtpDigits(['', '', '', '', '', '']);
      toast.success('Email verified');
      await fetchProfile({ soft: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid code');
    } finally {
      setSaving(false);
    }
  };

  const mapLocationsForApi = (list: LocationEntry[]) =>
    list.map((loc) => {
      const docTypeForApi =
        loc.verificationStatus === 'self_declared' && !loc.documentUrl?.trim()
          ? 'self_declaration'
          : loc.documentType?.trim() || undefined;
      return {
        country: loc.country || undefined,
        address: loc.address || undefined,
        city: loc.city || undefined,
        state: loc.state || undefined,
        documentType: docTypeForApi,
        documentUrl: loc.documentUrl?.trim() || undefined,
        residenceType: loc.residenceType || undefined,
        isDefault: !!loc.isDefault,
        ...(loc.verificationStatus === 'verified' || loc.verificationStatus === 'rejected'
          ? { verificationStatus: loc.verificationStatus }
          : {}),
      };
    });

  const putLocationsProfile = async (list: LocationEntry[], options?: { silentSuccess?: boolean }) => {
    setSaving(true);
    try {
      await api.put('/v1/professional/profile', {
        locations: mapLocationsForApi(list),
      });
      setFormFieldErrors((p) => omitKeysMatching(p, /^loc_/));
      if (!options?.silentSuccess) toast.success('Location saved');
      setSectionEditMode((prev) => ({ ...prev, location: false }));
      await fetchProfile({ soft: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const tryPersistLocations = (list: LocationEntry[], silentSuccess?: boolean) => {
    const locFe = locationsListFieldErrors(list);
    if (Object.keys(locFe).length) {
      setFormFieldErrors((p) => ({ ...omitKeysMatching(p, /^loc_/), ...locFe }));
      if (!silentSuccess) toast.error('Please fix the highlighted location fields');
      return;
    }
    void putLocationsProfile(list, { silentSuccess });
  };

  const updateLocation = (index: number, updates: Partial<LocationEntry>) => {
    setLocationsList((prev) =>
      prev.map((loc, i) => (i === index ? { ...loc, ...updates } : loc)),
    );
  };

  const addLocationFromDraft = () => {
    const parsed = verificationLocationDraftSchema.safeParse(locationDraft);
    if (!parsed.success) {
      setFormFieldErrors((p) => ({
        ...omitKeysMatching(p, /^loc_draft_/),
        ...prefixZodFieldErrors('loc_draft', parsed.error),
      }));
      toast.error('Please fix the highlighted fields');
      return;
    }
    setFormFieldErrors((p) => omitKeysMatching(p, /^loc_draft_/));
    setLocationsList((prev) => {
      const isFirst = prev.length === 0;
      const newLoc: LocationEntry = {
        ...emptyLocation(),
        country: locationDraft.country.trim(),
        state: locationDraft.state.trim(),
        city: locationDraft.city.trim(),
        address: locationDraft.address.trim(),
        verificationStatus: 'pending',
        isDefault: isFirst,
      };
      const next = isFirst ? [newLoc] : [newLoc, ...prev];
      queueMicrotask(() => tryPersistLocations(next, true));
      return next;
    });
    setLocationDraft({ country: '', state: '', city: '', address: '' });
    setLocationAddFormOpen(false);
    toast.success('Location added — verify to unlock full access');
  };

  const markLocationAsDefault = (index: number) => {
    const next = locationsList.map((loc, i) => ({ ...loc, isDefault: i === index }));
    setLocationsList(next);
    void tryPersistLocations(next, true);
    toast.success('Default location updated');
  };

  const openVerifyAddressModal = (locationIndex: number) => {
    setVerifyAddressModal({ open: true, locationIndex, step: 'method' });
  };

  const closeVerifyAddressModal = () => {
    setVerifyAddressModal({ open: false, locationIndex: null, step: 'method' });
  };

  const updateEducationDraft = (updates: Partial<EducationEntry>) => {
    setEducationDraft((d) => ({ ...d, ...updates }));
  };

  const addEducationDraftSkill = () => {
    const t = educationSkillInput.trim();
    if (!t) return;
    const prev = educationDraftSkillChips;
    if (prev.includes(t)) {
      setEducationSkillInput('');
      return;
    }
    updateEducationDraft({ associatedSkills: [...prev, t].join(', ') });
    setEducationSkillInput('');
  };

  const removeEducationDraftSkill = (token: string) => {
    updateEducationDraft({
      associatedSkills: educationDraftSkillChips.filter((s) => s !== token).join(', '),
    });
  };

  const addEducationDraftCoursework = () => {
    const t = educationCourseworkInput.trim();
    if (!t) return;
    const prev = educationDraftCourseworkChips;
    if (prev.includes(t)) {
      setEducationCourseworkInput('');
      return;
    }
    updateEducationDraft({ academicResponsibilities: [...prev, t].join(', ') });
    setEducationCourseworkInput('');
  };

  const removeEducationDraftCoursework = (token: string) => {
    updateEducationDraft({
      academicResponsibilities: educationDraftCourseworkChips.filter((s) => s !== token).join(', '),
    });
  };

  const addEducationDraftScholarship = () => {
    const t = educationScholarshipInput.trim();
    if (!t) return;
    const prev = educationDraftScholarshipChips;
    if (prev.includes(t)) {
      setEducationScholarshipInput('');
      return;
    }
    updateEducationDraft({ scholarshipsAndAid: [...prev, t].join(', ') });
    setEducationScholarshipInput('');
  };

  const removeEducationDraftScholarship = (token: string) => {
    updateEducationDraft({
      scholarshipsAndAid: educationDraftScholarshipChips.filter((s) => s !== token).join(', '),
    });
  };

  const addEducationDraftAchievement = () => {
    const t = educationAchievementInput.trim();
    if (!t) return;
    const prev = educationDraftAchievementChips;
    if (prev.includes(t)) {
      setEducationAchievementInput('');
      return;
    }
    updateEducationDraft({ academicAchievements: [...prev, t].join(', ') });
    setEducationAchievementInput('');
  };

  const removeEducationDraftAchievement = (token: string) => {
    updateEducationDraft({
      academicAchievements: educationDraftAchievementChips.filter((s) => s !== token).join(', '),
    });
  };

  const addEducationDraftActivities = () => {
    const t = educationActivitiesInput.trim();
    if (!t) return;
    const prev = educationDraftActivitiesChips;
    if (prev.includes(t)) {
      setEducationActivitiesInput('');
      return;
    }
    updateEducationDraft({ activitiesSocieties: [...prev, t].join(', ') });
    setEducationActivitiesInput('');
  };

  const removeEducationDraftActivities = (token: string) => {
    updateEducationDraft({
      activitiesSocieties: educationDraftActivitiesChips.filter((s) => s !== token).join(', '),
    });
  };

  const commitEducationDraft = () => {
    let draft = educationDraft;
    const pendingSkill = educationSkillInput.trim();
    if (pendingSkill) {
      const prev = educationChipsFromDelimitedText(draft.associatedSkills);
      if (!prev.includes(pendingSkill)) {
        draft = { ...draft, associatedSkills: [...prev, pendingSkill].join(', ') };
      }
    }
    const pendingCw = educationCourseworkInput.trim();
    if (pendingCw) {
      const prev = educationChipsFromDelimitedText(draft.academicResponsibilities);
      if (!prev.includes(pendingCw)) {
        draft = { ...draft, academicResponsibilities: [...prev, pendingCw].join(', ') };
      }
    }
    const pendingSch = educationScholarshipInput.trim();
    if (pendingSch) {
      const prev = educationChipsFromDelimitedText(draft.scholarshipsAndAid);
      if (!prev.includes(pendingSch)) {
        draft = { ...draft, scholarshipsAndAid: [...prev, pendingSch].join(', ') };
      }
    }
    const pendingAch = educationAchievementInput.trim();
    if (pendingAch) {
      const prev = educationChipsFromDelimitedText(draft.academicAchievements);
      if (!prev.includes(pendingAch)) {
        draft = { ...draft, academicAchievements: [...prev, pendingAch].join(', ') };
      }
    }
    const pendingAct = educationActivitiesInput.trim();
    if (pendingAct) {
      const prev = educationChipsFromDelimitedText(draft.activitiesSocieties);
      if (!prev.includes(pendingAct)) {
        draft = { ...draft, activitiesSocieties: [...prev, pendingAct].join(', ') };
      }
    }
    setEducationSkillInput('');
    setEducationCourseworkInput('');
    setEducationScholarshipInput('');
    setEducationAchievementInput('');
    setEducationActivitiesInput('');
    const eduFe = educationEntryFieldErrors(draft, 'draft');
    if (Object.keys(eduFe).length) {
      setFormFieldErrors((p) => ({ ...omitKeysMatching(p, /^edu_draft_/), ...eduFe }));
      toast.error('Please fix the highlighted fields');
      return;
    }
    setFormFieldErrors((p) => omitKeysMatching(p, /^edu_draft_/));
    const entry = cloneEducationEntry({
      ...draft,
      id: undefined,
      eduVerificationStatus: 'pending',
      isDefault: educationEntriesList.length === 0,
    });
    const next = [entry, ...educationEntriesList];
    setEducationEntriesList(next);
    void syncEducationEntriesToApi(next, { silentSuccess: true });
    toast.success('Education added');
    setEducationDraft(emptyEducation());
    setEducationAddFormOpen(false);
  };

  const closeVerifyEducationModal = () => {
    setVerifyEducationModal({
      open: false,
      index: null,
      screen: 'pick',
      studentEmail: '',
      otp: '',
      otpSent: false,
      studentFlowBusy: false,
    });
  };

  const openVerifyEducationModal = (index: number) => {
    setVerifyEducationModal({
      open: true,
      index,
      screen: 'pick',
      studentEmail: '',
      otp: '',
      otpSent: false,
      studentFlowBusy: false,
    });
  };

  const sendEducationStudentEmailOtp = async () => {
    const idx = verifyEducationModal.index;
    if (idx == null) return;
    const entry = educationEntriesList[idx];
    if (!entry?.id) {
      toast.error('Save your education entry before verifying by email.');
      return;
    }
    const email = verifyEducationModal.studentEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter a valid student email address.');
      return;
    }
    setVerifyEducationModal((p) => ({ ...p, studentFlowBusy: true }));
    try {
      const res = await api.post<{ message?: string; code?: string }>(
        `/v1/professional/education/${entry.id}/student-email/send-otp`,
        { email },
      );
      const data = res.data as { message?: string; code?: string };
      setVerifyEducationModal((p) => ({
        ...p,
        otpSent: true,
        otp: '',
        studentFlowBusy: false,
      }));
      toast.success(data?.message || 'Verification code sent');
      if (data?.code) {
        console.info('[dev] Education verification OTP:', data.code);
      }
      void fetchProfile({ soft: true });
    } catch (err: any) {
      setVerifyEducationModal((p) => ({ ...p, studentFlowBusy: false }));
      toast.error(err.response?.data?.message || 'Failed to send verification code');
    }
  };

  const submitEducationStudentEmailOtp = async () => {
    const idx = verifyEducationModal.index;
    if (idx == null) return;
    const entry = educationEntriesList[idx];
    if (!entry?.id) return;
    const email = verifyEducationModal.studentEmail.trim();
    const code = verifyEducationModal.otp.trim();
    if (code.length !== 6) {
      toast.error('Enter the 6-digit code from your email.');
      return;
    }
    setVerifyEducationModal((p) => ({ ...p, studentFlowBusy: true }));
    try {
      await api.post(`/v1/professional/education/${entry.id}/student-email/verify-otp`, {
        email,
        code,
      });
      const emailNorm = email.toLowerCase();
      setEducationEntriesList((prev) =>
        prev.map((e, i) =>
          i === idx
            ? {
                ...e,
                eduVerificationStatus: 'verified' as const,
                verificationMethod: 'student_email',
                studentVerificationEmail: emailNorm,
              }
            : e,
        ),
      );
      setVerifyEducationModal((p) => ({
        ...p,
        screen: 'student_success',
        studentFlowBusy: false,
      }));
      toast.success('Education verified successfully');
      void fetchProfile({ soft: true });
    } catch (err: any) {
      setVerifyEducationModal((p) => ({ ...p, studentFlowBusy: false }));
      toast.error(err.response?.data?.message || 'Verification failed');
    }
  };

  const requestRemoveEducationEntry = (index: number) => {
    setEducationRemoveConfirm({ open: true, index });
  };

  const confirmRemoveEducationEntry = async () => {
    const index = educationRemoveConfirm.index;
    if (index == null) return;
    const entry = educationEntriesList[index];
    setEducationRemoveConfirm({ open: false, index: null });
    if (!entry) return;
    if (entry.id) {
      setEducationSaving(true);
      try {
        await api.delete(`/v1/professional/education/${entry.id}`);
        const filtered = educationEntriesList.filter((_, i) => i !== index);
        const next =
          filtered.length === 0 || !entry.isDefault
            ? filtered
            : filtered.map((e, i) => ({ ...e, isDefault: i === 0 }));
        setEducationEntriesList(next);
        toast.success('Education removed');
        await fetchProfile({ soft: true });
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to remove education');
      } finally {
        setEducationSaving(false);
      }
      return;
    }
    const filtered = educationEntriesList.filter((_, i) => i !== index);
    const next =
      filtered.length === 0 || !entry.isDefault
        ? filtered
        : filtered.map((e, i) => ({ ...e, isDefault: i === 0 }));
    setEducationEntriesList(next);
    toast.success('Education removed');
  };

  const triggerEducationVerifyDocumentUpload = () => {
    const idx = verifyEducationModal.index;
    if (idx == null) return;
    educationVerifyUploadIndexRef.current = idx;
    closeVerifyEducationModal();
    setTimeout(() => educationVerifyFileInputRef.current?.click(), 0);
  };

  const handleEducationVerifyFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const idx = educationVerifyUploadIndexRef.current;
    e.target.value = '';
    if (!file || idx == null) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an image (JPEG, PNG, WebP) or PDF');
      return;
    }
    setUploadingEducationIndex(idx);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ url: string } | { data: { url: string } }>(
        '/v1/professional/upload-id',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      const url = (res.data as any)?.data?.url ?? (res.data as any)?.url;
      if (url) {
        setEducationEntriesList((prev) => {
          const next = prev.map((ent, i) =>
            i === idx
              ? { ...ent, supportingMediaUrl: url, verificationMethod: 'upload_document' }
              : ent,
          );
          void syncEducationEntriesToApi(next, { silentSuccess: true });
          return next;
        });
        toast.success('Document attached for verification');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingEducationIndex(null);
      educationVerifyUploadIndexRef.current = null;
    }
  };

  const updateWorkDraft = (updates: Partial<WorkEntry>) => {
    setWorkDraft((d) => ({ ...d, ...updates }));
  };

  const updateWorkDraftRole = (roleIndex: number, updates: Partial<WorkRoleEntry>) => {
    setWorkDraft((d) => ({
      ...d,
      workRoles: d.workRoles.map((r, j) => (j === roleIndex ? { ...r, ...updates } : r)),
    }));
  };

  const addWorkDraftRole = () => {
    setWorkDraft((d) => ({ ...d, workRoles: [...d.workRoles, emptyWorkRole()] }));
  };

  const removeWorkDraftRole = (roleIndex: number) => {
    setWorkDraft((d) => {
      if (d.workRoles.length <= 1) return d;
      return { ...d, workRoles: d.workRoles.filter((_, j) => j !== roleIndex) };
    });
  };

  const addWorkDraftSkill = () => {
    const t = workSkillInput.trim();
    if (!t) return;
    const prev = workDraftSkillChips;
    if (prev.includes(t)) {
      setWorkSkillInput('');
      return;
    }
    updateWorkDraft({ associatedSkills: [...prev, t].join(', ') });
    setWorkSkillInput('');
  };

  const removeWorkDraftSkill = (token: string) => {
    updateWorkDraft({
      associatedSkills: workDraftSkillChips.filter((s) => s !== token).join(', '),
    });
  };

  const addWorkDraftOtherCompensation = () => {
    setWorkDraft((d) => {
      const t = d.otherCompensationInput.trim();
      if (!t) return d;
      if (d.otherCompensation.includes(t)) return { ...d, otherCompensationInput: '' };
      return {
        ...d,
        otherCompensation: [...d.otherCompensation, t],
        otherCompensationInput: '',
      };
    });
  };

  const removeWorkDraftOtherCompensation = (token: string) => {
    setWorkDraft((d) => ({
      ...d,
      otherCompensation: d.otherCompensation.filter((s) => s !== token),
    }));
  };

  const commitWorkDraft = () => {
    const pendingSkill = workSkillInput.trim();
    let mergedSkillsLine = workDraft.associatedSkills;
    if (pendingSkill) {
      const chips = workDraftSkillChips;
      mergedSkillsLine = chips.includes(pendingSkill)
        ? workDraft.associatedSkills
        : [...chips, pendingSkill].join(', ');
    }
    setWorkSkillInput('');
    const pendingOc = workDraft.otherCompensationInput.trim();
    let mergedOther = [...workDraft.otherCompensation];
    if (pendingOc && !mergedOther.includes(pendingOc)) mergedOther.push(pendingOc);
    const draftForValidate: WorkEntry = {
      ...workDraft,
      associatedSkills: mergedSkillsLine,
      otherCompensation: mergedOther,
      otherCompensationInput: '',
    };
    const workFe = workEntryFieldErrors(draftForValidate, 'draft');
    if (Object.keys(workFe).length) {
      setFormFieldErrors((p) => ({ ...omitKeysMatching(p, /^work_draft_/), ...workFe }));
      toast.error('Please fix the highlighted fields');
      return;
    }
    setFormFieldErrors((p) => omitKeysMatching(p, /^work_draft_/));
    const primary = draftForValidate.workRoles[0];
    const synced: WorkEntry = {
      ...cloneWorkEntry(draftForValidate),
      role: primary.title.trim(),
      startDate: primary.startDate,
      endDate: primary.currentlyWorking ? '' : primary.endDate,
    };
    const entry = {
      ...synced,
      id: undefined,
      workVerificationStatus: 'pending' as const,
      selfDeclared: false,
      workVerificationEmail: '',
      supportingMediaUrl: '',
    };
    const next = [entry, ...workEntriesList];
    setWorkEntriesList(next);
    void syncWorkEntriesToApi(next, { silentSuccess: true });
    toast.success('Work experience added');
    setWorkDraft(emptyWork());
    setWorkSkillInput('');
    setWorkAddFormOpen(false);
  };

  const onSelfDeclarationBackOrClose = () => {
    if (selfDeclarationFlow.open && selfDeclarationFlow.kind === 'personal') {
      setVerifyPersonalModalOpen(true);
    }
    if (selfDeclarationFlow.open && selfDeclarationFlow.kind === 'education') {
      openVerifyEducationModal(selfDeclarationFlow.educationIndex);
    }
    if (selfDeclarationFlow.open && selfDeclarationFlow.kind === 'work_card') {
      setVerifyWorkModal({
        open: true,
        index: selfDeclarationFlow.workIndex,
        screen: 'pick',
        workEmail: '',
        otp: '',
        otpSent: false,
        workEmailFlowBusy: false,
      });
    }
    if (selfDeclarationFlow.open && selfDeclarationFlow.kind === 'project_card') {
      setVerifyProjectModal({ open: true, index: selfDeclarationFlow.projectIndex, step: 'method' });
    }
    if (selfDeclarationFlow.open && selfDeclarationFlow.kind === 'cert_card') {
      setVerifyCertModal({ open: true, index: selfDeclarationFlow.certIndex, step: 'method' });
    }
    setSelfDeclarationFlow({ open: false });
  };

  const onSelfDeclarationConfirm = () => {
    if (!selfDeclarationFlow.open) return;
    if (selfDeclarationFlow.kind === 'personal') {
      setIdentityVerificationPath('self');
      setPersonalSelfDeclarationAcknowledgedStorage();
      setPersonalSelfDeclarationAcknowledged(true);
      toast.success('Self declaration recorded');
    } else if (selfDeclarationFlow.kind === 'address') {
      const idx = selfDeclarationFlow.locationIndex;
      setLocationsList((prev) => {
        const next = prev.map((loc, i) =>
          i === idx
            ? {
                ...loc,
                verificationStatus: 'self_declared' as const,
                documentType: '',
                documentUrl: '',
              }
            : loc,
        );
        queueMicrotask(() => tryPersistLocations(next, true));
        return next;
      });
      closeVerifyAddressModal();
      toast.success('Self declaration saved. Full verification unlocks more network access.');
    } else if (selfDeclarationFlow.kind === 'education') {
      const idx = selfDeclarationFlow.educationIndex;
      setEducationEntriesList((prev) => {
        const next = prev.map((e, i) =>
          i === idx ? { ...e, verificationMethod: 'self_declaration' } : e,
        );
        void syncEducationEntriesToApi(next, { silentSuccess: true });
        return next;
      });
      closeVerifyEducationModal();
      toast.success('Self declaration saved for this education.');
    } else if (selfDeclarationFlow.kind === 'work_card') {
      const idx = selfDeclarationFlow.workIndex;
      setWorkEntriesList((prev) => {
        const next = prev.map((e, i) =>
          i === idx
            ? {
                ...e,
                selfDeclared: true,
                verificationMethod: 'self_declaration',
              }
            : e,
        );
        void syncWorkEntriesToApi(next, { silentSuccess: true });
        return next;
      });
      closeVerifyWorkModal();
      toast.success('Self declaration recorded for this role.');
    } else if (selfDeclarationFlow.kind === 'project_card') {
      const idx = selfDeclarationFlow.projectIndex;
      setProjectsList((prev) => {
        const next = prev.map((p, i) =>
          i === idx
            ? { ...p, projectSelfDeclared: true, verificationMethod: 'self_declaration' }
            : p,
        );
        void syncProjectsListToApi(next, { silentSuccess: true });
        return next;
      });
      setVerifyProjectModal({ open: false, index: null, step: 'method' });
      toast.success('Self declaration recorded for this project.');
    } else if (selfDeclarationFlow.kind === 'cert_card') {
      const idx = selfDeclarationFlow.certIndex;
      setCertList((prev) => {
        const next = prev.map((c, i) =>
          i === idx ? { ...c, certSelfDeclared: true, verificationMethod: 'self_declaration' } : c,
        );
        void syncCertificationsToApi(next, { silentSuccess: true });
        return next;
      });
      setVerifyCertModal({ open: false, index: null, step: 'method' });
      toast.success('Self declaration recorded for this certification.');
    }
    setSelfDeclarationFlow({ open: false });
  };

  const closeVerifyWorkModal = () => {
    setVerifyWorkModal({
      open: false,
      index: null,
      screen: 'pick',
      workEmail: '',
      otp: '',
      otpSent: false,
      workEmailFlowBusy: false,
    });
  };

  const openVerifyWorkModal = (index: number) => {
    setVerifyWorkModal({
      open: true,
      index,
      screen: 'pick',
      workEmail: '',
      otp: '',
      otpSent: false,
      workEmailFlowBusy: false,
    });
  };

  const sendWorkEmailOtp = async () => {
    const idx = verifyWorkModal.index;
    if (idx == null) return;
    const entry = workEntriesList[idx];
    if (!entry?.id) {
      toast.error('Save your work experience before verifying by email.');
      return;
    }
    const email = verifyWorkModal.workEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter a valid work email address.');
      return;
    }
    setVerifyWorkModal((p) => ({ ...p, workEmailFlowBusy: true }));
    try {
      const res = await api.post<{ message?: string; code?: string }>(
        `/v1/professional/experience/${entry.id}/work-email/send-otp`,
        { email },
      );
      const data = res.data as { message?: string; code?: string };
      setVerifyWorkModal((p) => ({
        ...p,
        otpSent: true,
        otp: '',
        workEmailFlowBusy: false,
      }));
      toast.success(data?.message || 'Verification code sent');
      if (data?.code) {
        console.info('[dev] Work verification OTP:', data.code);
      }
      void fetchProfile({ soft: true });
    } catch (err: any) {
      setVerifyWorkModal((p) => ({ ...p, workEmailFlowBusy: false }));
      toast.error(err.response?.data?.message || 'Failed to send verification code');
    }
  };

  const submitWorkEmailOtp = async () => {
    const idx = verifyWorkModal.index;
    if (idx == null) return;
    const entry = workEntriesList[idx];
    if (!entry?.id) return;
    const email = verifyWorkModal.workEmail.trim();
    const code = verifyWorkModal.otp.trim();
    if (code.length !== 6) {
      toast.error('Enter the 6-digit code from your email.');
      return;
    }
    setVerifyWorkModal((p) => ({ ...p, workEmailFlowBusy: true }));
    try {
      await api.post(`/v1/professional/experience/${entry.id}/work-email/verify-otp`, {
        email,
        code,
      });
      const emailNorm = email.toLowerCase();
      setWorkEntriesList((prev) =>
        prev.map((e, i) =>
          i === idx
            ? {
                ...e,
                selfDeclared: false,
                workVerificationStatus: 'verified' as const,
                verificationMethod: 'work_email',
                workVerificationEmail: emailNorm,
              }
            : e,
        ),
      );
      setVerifyWorkModal((p) => ({
        ...p,
        screen: 'work_email_success',
        workEmailFlowBusy: false,
      }));
      toast.success('Work experience verified successfully');
      void fetchProfile({ soft: true });
    } catch (err: any) {
      setVerifyWorkModal((p) => ({ ...p, workEmailFlowBusy: false }));
      toast.error(err.response?.data?.message || 'Verification failed');
    }
  };

  const triggerWorkVerifyDocumentUpload = () => {
    const idx = verifyWorkModal.index;
    if (idx == null) return;
    workVerifyUploadIndexRef.current = idx;
    closeVerifyWorkModal();
    setTimeout(() => workVerifyFileInputRef.current?.click(), 0);
  };

  const handleWorkVerifyFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const idx = workVerifyUploadIndexRef.current;
    e.target.value = '';
    if (!file || idx == null) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an image (JPEG, PNG, WebP) or PDF');
      return;
    }
    setUploadingWorkIndex(idx);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ url: string } | { data: { url: string } }>(
        '/v1/professional/upload-id',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      const url = (res.data as any)?.data?.url ?? (res.data as any)?.url;
      if (url) {
        setWorkEntriesList((prev) => {
          const next = prev.map((ent, i) =>
            i === idx
              ? {
                  ...ent,
                  supportingMediaUrl: url,
                  verificationMethod: 'upload_document',
                  selfDeclared: false,
                }
              : ent,
          );
          void syncWorkEntriesToApi(next, { silentSuccess: true });
          return next;
        });
        toast.success('Document attached for verification');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingWorkIndex(null);
      workVerifyUploadIndexRef.current = null;
    }
  };

  const requestRemoveWorkEntry = (index: number) => {
    setWorkRemoveConfirm({ open: true, index });
  };

  const confirmRemoveWorkEntry = async () => {
    const index = workRemoveConfirm.index;
    if (index == null) return;
    setWorkRemoveConfirm({ open: false, index: null });
    const entry = workEntriesList[index];
    if (!entry) return;
    if (entry.id) {
      setWorkSaving(true);
      try {
        await api.delete(`/v1/professional/experience/${entry.id}`);
        const next = workEntriesList.filter((_, i) => i !== index);
        setWorkEntriesList(next);
        toast.success('Work experience removed');
        await fetchProfile({ soft: true });
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to remove work experience');
      } finally {
        setWorkSaving(false);
      }
      return;
    }
    const next = workEntriesList.filter((_, i) => i !== index);
    setWorkEntriesList(next);
    void syncWorkEntriesToApi(next, { silentSuccess: true });
    toast.success('Work experience removed');
  };

  const requestRemoveLocation = (index: number) => {
    setLocationRemoveConfirm({ open: true, index });
  };

  const confirmRemoveLocation = () => {
    const index = locationRemoveConfirm.index;
    if (index == null) return;
    setLocationRemoveConfirm({ open: false, index: null });

    const nextList = locationsList.filter((_, i) => i !== index);
    if (nextList.length === 0) {
      setLocationsList([]);
      void (async () => {
        setSaving(true);
        try {
          await api.put('/v1/professional/profile', { locations: [] });
          setFormFieldErrors((p) => omitKeysMatching(p, /^loc_/));
          toast.success('Location removed');
          await fetchProfile({ soft: true });
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to save');
        } finally {
          setSaving(false);
        }
      })();
      return;
    }
    const removedWasDefault = locationsList[index]?.isDefault;
    const adjusted = !removedWasDefault
      ? nextList
      : nextList.map((l, i) => ({ ...l, isDefault: i === 0 }));
    setLocationsList(adjusted);
    void tryPersistLocations(adjusted, true);
    toast.success('Location removed');
  };

  const handleLocationDocumentUpload = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
    options?: { fromVerifyModal?: boolean },
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an image (JPEG, PNG, WebP) or PDF');
      return;
    }
    setUploadingLocationIndex(index);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ url: string } | { data: { url: string } }>(
        '/v1/professional/upload-id',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      const url = (res.data as any)?.data?.url ?? (res.data as any)?.url;
      if (url) {
        const patch: Partial<LocationEntry> = { documentUrl: url };
        if (options?.fromVerifyModal) {
          patch.verificationStatus = 'pending';
        }
        setLocationsList((prev) => {
          const next = prev.map((l, i) => (i === index ? { ...l, ...patch } : l));
          queueMicrotask(() => tryPersistLocations(next, true));
          return next;
        });
        toast.success('Document uploaded');
        if (options?.fromVerifyModal) {
          closeVerifyAddressModal();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingLocationIndex(null);
      e.target.value = '';
      locationVerifyUploadIndexRef.current = null;
    }
  };

  const triggerVerifyModalDocumentUpload = (documentTypeValue: string) => {
    const idx = verifyAddressModal.locationIndex;
    if (idx == null) return;
    locationVerifyUploadIndexRef.current = idx;
    updateLocation(idx, { documentType: documentTypeValue });
    locationVerifyFileInputRef.current?.click();
  };

  const handleLocationVerifyFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = locationVerifyUploadIndexRef.current;
    if (idx == null) {
      e.target.value = '';
      return;
    }
    void handleLocationDocumentUpload(idx, e, { fromVerifyModal: true });
  };

  const handleSaveSocial = async () => {
    const socFe = socialFieldErrors(social);
    if (Object.keys(socFe).length) {
      setFormFieldErrors((p) => ({ ...omitKeysMatching(p, /^soc_/), ...socFe }));
      toast.error('Please fix the highlighted fields');
      return;
    }
    setFormFieldErrors((p) => omitKeysMatching(p, /^soc_/));
    setSaving(true);
    try {
      await api.put('/v1/professional/profile', {
        socialMedia: social,
      });
      toast.success('Social profiles saved');
      await fetchProfile({ soft: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const syncEducationEntriesToApi = async (
    list: EducationEntry[],
    options?: { silentSuccess?: boolean },
  ) => {
    if (!profile?.id) return;
    const eduFe = educationListFieldErrors(list);
    if (Object.keys(eduFe).length) {
      setFormFieldErrors((p) => ({ ...omitKeysMatching(p, /^edu_/), ...eduFe }));
      if (!options?.silentSuccess) toast.error('Please fix the highlighted education fields');
      return;
    }
    const toSave = list.filter((e) => e.id || e.institutionName.trim());
    const profId = profile.id;
    setEducationSaving(true);
    try {
      for (const entry of toSave) {
        const startDate = buildMonthYear(entry.startMonth, entry.startYear)!;
        const endDate = buildMonthYear(entry.endMonth, entry.endYear);
        const payload = {
          schoolType: entry.schoolType || undefined,
          levelOfEducation: entry.levelOfEducation,
          programLevel: deriveProgramLevel(entry.levelOfEducation),
          institutionName: entry.institutionName.trim(),
          institutionIndustry: entry.institutionIndustry?.trim() || undefined,
          degreeType: entry.degreeType || undefined,
          fieldOfStudy: entry.fieldOfStudy.trim(),
          startDate,
          endDate: endDate ?? undefined,
          currentlyAttending: entry.expectedEndOngoing,
          grade: entry.grade.trim(),
          country: entry.country.trim(),
          costOfEducation: entry.costOfEducation ? parseFloat(entry.costOfEducation) : undefined,
          currency: entry.currency || undefined,
          costFrequency: entry.costFrequency || undefined,
          pendingLoanAmount:
            entry.hasLoan && entry.pendingLoanAmount?.trim()
              ? parseFloat(entry.pendingLoanAmount)
              : undefined,
          loanCurrency: entry.hasLoan ? entry.loanCurrency || undefined : undefined,
          loanRepaymentFrequency:
            entry.hasLoan && entry.loanRepaymentFrequency?.trim()
              ? entry.loanRepaymentFrequency
              : undefined,
          scholarshipsAndAid: entry.scholarshipsAndAid?.trim() || undefined,
          programDescription: entry.programDescription?.trim() || undefined,
          academicResponsibilities: entry.academicResponsibilities?.trim() || undefined,
          academicAchievements: entry.academicAchievements?.trim() || undefined,
          activitiesSocieties: entry.activitiesSocieties?.trim() || undefined,
          associatedSkills: entry.associatedSkills?.trim() || undefined,
          supportingMediaUrl: entry.supportingMediaUrl?.trim() || undefined,
          isDefault: !!entry.isDefault,
          verificationMethod: entry.verificationMethod?.trim() || undefined,
          studentVerificationEmail: entry.studentVerificationEmail?.trim() || undefined,
        };
        if (entry.id) {
          await api.put(`/v1/professional/education/${entry.id}`, payload);
        } else {
          await api.post(`/v1/professional/${profId}/education`, payload);
        }
      }
      setFormFieldErrors((p) => omitKeysMatching(p, /^edu_/));
      if (!options?.silentSuccess) toast.success('Education saved');
      setSectionEditMode((prev) => ({ ...prev, education: false }));
      await fetchProfile({ soft: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save education');
    } finally {
      setEducationSaving(false);
    }
  };

  const buildWorkPayload = (entry: WorkEntry) => {
    const primary = entry.workRoles[0] ?? emptyWorkRole();
    const extraRoles = entry.workRoles
      .slice(1)
      .filter((r) => r.title.trim())
      .map(
        (r) =>
          `${r.title.trim()} (${r.startDate || '?'} – ${r.currentlyWorking ? 'present' : r.endDate || '?'})`,
      );
    const responsibilitiesLines = [
      ...entry.responsibilitiesText.split('\n').map((s) => s.trim()).filter(Boolean),
      ...(extraRoles.length ? [`Other roles: ${extraRoles.join('; ')}`] : []),
    ];
    const ocTokens = entry.otherCompensation.map((s) => String(s).trim()).filter(Boolean);
    const achievementsLines = [
      ...entry.achievementsText.split('\n').map((s) => s.trim()).filter(Boolean),
      ...(ocTokens.length ? [`Other compensation: ${ocTokens.join(' | ')}`] : []),
      ...(entry.otherCompensationNotes.trim() ? [entry.otherCompensationNotes.trim()] : []),
      ...(entry.associatedSkills.trim() ? [`Skills: ${entry.associatedSkills.trim()}`] : []),
    ];
    const startDate =
      primary.startDate?.trim() || entry.startDate?.trim() || new Date().toISOString().split('T')[0];
    const endDate = primary.currentlyWorking ? undefined : primary.endDate?.trim() || undefined;
    const verificationMethod =
      entry.verificationMethod?.trim() ||
      (entry.selfDeclared ? 'self_declaration' : undefined);
    return {
      organisationName: entry.organisationName.trim(),
      industry: entry.industry.trim(),
      role: primary.title.trim() || entry.role.trim() || 'Role',
      employmentType: (entry.employmentType || 'full_time') as any,
      workMode: (entry.workMode || 'on_site') as any,
      startDate,
      endDate,
      currentlyWorking: primary.currentlyWorking,
      location: { city: '', state: '', country: '' },
      responsibilities: responsibilitiesLines,
      achievements: achievementsLines,
      paymentMode: entry.salaryFrequency || undefined,
      salaryRange: entry.salary?.trim()
        ? { min: parseFloat(entry.salary) || 0, max: parseFloat(entry.salary) || 0 }
        : undefined,
      currency: entry.currency,
      verificationMethod: verificationMethod || undefined,
      supportingMediaUrl: entry.supportingMediaUrl?.trim() || undefined,
      workVerificationEmail: entry.workVerificationEmail?.trim() || undefined,
      jobDescription: entry.jobDescription?.trim() || undefined,
    };
  };

  const syncWorkEntriesToApi = async (list: WorkEntry[], options?: { silentSuccess?: boolean }) => {
    if (!profile?.id) return;
    const workFe = workListFieldErrors(list);
    if (Object.keys(workFe).length) {
      setFormFieldErrors((p) => ({ ...omitKeysMatching(p, /^work_/), ...workFe }));
      if (!options?.silentSuccess) toast.error('Please fix the highlighted work fields');
      return;
    }
    const profId = profile.id;
    setWorkSaving(true);
    try {
      const workToSave = list.filter((e) => e.id || e.organisationName.trim());
      for (const entry of workToSave) {
        const payload = buildWorkPayload(entry);
        if (entry.id) {
          await api.put(`/v1/professional/experience/${entry.id}`, payload);
        } else {
          await api.post(`/v1/professional/${profId}/experience`, payload);
        }
      }
      setFormFieldErrors((p) => omitKeysMatching(p, /^work_/));
      if (!options?.silentSuccess) toast.success('Work experience saved');
      setSectionEditMode((prev) => ({ ...prev, work: false }));
      await fetchProfile({ soft: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save work experience');
    } finally {
      setWorkSaving(false);
    }
  };

  const updateProjectDraft = (updates: Partial<ProjectEntry>) => {
    setProjectDraft((d) => ({ ...d, ...updates }));
  };

  const updateProjectDraftMember = (memberIndex: number, updates: Partial<ProjectTeamMemberEntry>) => {
    setProjectDraft((d) => ({
      ...d,
      teamMembers: d.teamMembers.map((m, j) => (j === memberIndex ? { ...m, ...updates } : m)),
    }));
  };

  const addProjectDraftMember = () => {
    setProjectDraft((d) => ({
      ...d,
      teamMembers: [...d.teamMembers, emptyProjectTeamMember()],
    }));
  };

  const removeProjectDraftMember = (memberIndex: number) => {
    setProjectDraft((d) => {
      if (d.teamMembers.length <= 1) return d;
      return { ...d, teamMembers: d.teamMembers.filter((_, j) => j !== memberIndex) };
    });
  };

  const commitProjectDraft = () => {
    const projFe = projectEntryFieldErrors(projectDraft, 'draft');
    if (Object.keys(projFe).length) {
      setFormFieldErrors((p) => ({ ...omitKeysMatching(p, /^proj_draft_/), ...projFe }));
      toast.error('Please fix the highlighted fields');
      return;
    }
    setFormFieldErrors((p) => omitKeysMatching(p, /^proj_draft_/));
    const entry = cloneProjectEntry({
      ...projectDraft,
      id: undefined,
      projectVerificationStatus: 'pending',
      projectSelfDeclared: false,
      verificationMethod: null,
    });
    const next = [...projectsList, entry];
    setProjectsList(next);
    void syncProjectsListToApi(next, { silentSuccess: true });
    toast.success('Project added');
    setProjectDraft(emptyProject());
    setProjectAddFormOpen(false);
  };

  const closeVerifyProjectModal = () => {
    setVerifyProjectModal({ open: false, index: null, step: 'method' });
  };

  const openVerifyProjectModal = (index: number) => {
    const entry = projectsList[index];
    setProjectVerifyEvidenceDraft({
      projectLink: entry?.projectLink?.trim() ?? '',
      mediaUrl: entry?.mediaUrl?.trim() ?? '',
    });
    setVerifyProjectModal({
      open: true,
      index,
      step: entry && projectEntryIsSelfDeclared(entry) ? 'evidence' : 'method',
    });
  };

  const submitProjectVerificationEvidence = () => {
    const idx = verifyProjectModal.index;
    if (idx == null) return;
    const link = projectVerifyEvidenceDraft.projectLink.trim();
    const media = projectVerifyEvidenceDraft.mediaUrl.trim();
    if (!link && !media) {
      toast.error('Add a project link or media URL (or both).');
      return;
    }
    setProjectsList((prev) => {
      const next = prev.map((p, i) =>
        i === idx
          ? {
              ...p,
              projectSelfDeclared: false,
              verificationMethod: null,
              projectVerificationStatus: 'pending' as const,
              projectLink: link,
              mediaUrl: media,
            }
          : p,
      );
      void syncProjectsListToApi(next, { silentSuccess: true });
      return next;
    });
    closeVerifyProjectModal();
    toast.success('Project verification details saved.');
  };

  const requestRemoveProjectEntry = (index: number) => {
    setProjectRemoveConfirm({ open: true, index });
  };

  const confirmRemoveProjectEntry = async () => {
    const index = projectRemoveConfirm.index;
    if (index == null) return;
    setProjectRemoveConfirm({ open: false, index: null });
    const entry = projectsList[index];
    if (!entry) return;
    if (entry.id) {
      setProjectSaving(true);
      try {
        await api.delete(apiProfessionalProjectByIdUrl(entry.id));
        const next = projectsList.filter((_, i) => i !== index);
        setProjectsList(next);
        toast.success('Project removed');
        await fetchProfile({ soft: true });
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to remove project');
      } finally {
        setProjectSaving(false);
      }
      return;
    }
    const next = projectsList.filter((_, i) => i !== index);
    setProjectsList(next);
    void syncProjectsListToApi(next, { silentSuccess: true });
    toast.success('Project removed');
  };

  const closeVerifyCertModal = () => {
    setVerifyCertModal({ open: false, index: null, step: 'method' });
  };

  const openVerifyCertModal = (index: number) => {
    const entry = certList[index];
    setCertVerifyEvidenceDraft({
      reportingUrl: entry?.reportingUrl?.trim() ?? '',
      supportingMediaUrl: entry?.supportingMediaUrl?.trim() ?? '',
    });
    setVerifyCertModal({
      open: true,
      index,
      step: entry?.certSelfDeclared ? 'evidence' : 'method',
    });
  };

  const submitCertVerificationEvidence = () => {
    const idx = verifyCertModal.index;
    if (idx == null) return;
    const reportingUrl = certVerifyEvidenceDraft.reportingUrl.trim();
    const supportingMediaUrl = certVerifyEvidenceDraft.supportingMediaUrl.trim();
    if (!reportingUrl && !supportingMediaUrl) {
      toast.error('Add a credential reporting URL and/or supporting media URL.');
      return;
    }
    setCertList((prev) => {
      const next = prev.map((c, i) =>
        i === idx
          ? {
              ...c,
              certSelfDeclared: false,
              verificationMethod: null,
              reportingUrl,
              supportingMediaUrl,
            }
          : c,
      );
      void syncCertificationsToApi(next, { silentSuccess: true });
      return next;
    });
    closeVerifyCertModal();
    toast.success('Certification verification details saved.');
  };

  const requestRemoveCertificate = (index: number) => {
    setCertRemoveConfirm({ open: true, index });
  };

  const confirmRemoveCertificate = () => {
    const index = certRemoveConfirm.index;
    if (index == null) return;
    setCertRemoveConfirm({ open: false, index: null });
    const next = certList.filter((_, i) => i !== index);
    setCertList(next);
    void syncCertificationsToApi(next, { silentSuccess: true });
    toast.success('Certification removed');
  };

  const syncProjectsListToApi = async (list: ProjectEntry[], options?: { silentSuccess?: boolean }) => {
    if (!profile?.id) return;
    const projFe = projectListFieldErrors(list);
    if (Object.keys(projFe).length) {
      setFormFieldErrors((p) => ({ ...omitKeysMatching(p, /^proj_/), ...projFe }));
      if (!options?.silentSuccess) toast.error('Please fix the highlighted project fields');
      return;
    }
    const profId = profile.id;
    const toSave = list.filter((p) => p.id || p.title.trim());
    setProjectSaving(true);
    try {
      for (const entry of toSave) {
        const teamMembers = entry.teamMembers
          .filter((m) => m.name.trim() || m.role.trim())
          .map((m) => ({ name: m.name.trim(), role: m.role.trim() }));
        const verificationMethod = projectVerificationMethodForApi(entry);
        const payload = {
          title: entry.title.trim(),
          description: entry.description?.trim() || undefined,
          projectLink: entry.projectLink?.trim() || undefined,
          mediaUrl: entry.mediaUrl?.trim() || undefined,
          teamMembers: teamMembers.length ? teamMembers : undefined,
          /** Empty string clears a stale method on PUT; omitted coerced to null on create */
          verificationMethod: verificationMethod ?? '',
        };
        if (entry.id) {
          await api.put(apiProfessionalProjectByIdUrl(entry.id), payload);
        } else {
          await api.post(apiProfessionalProjectCreateUrl(profId), payload);
        }
      }
      setFormFieldErrors((p) => omitKeysMatching(p, /^proj_/));
      if (!options?.silentSuccess) toast.success('Projects saved');
      setSectionEditMode((prev) => ({ ...prev, projects: false }));
      await fetchProfile({ soft: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save projects');
    } finally {
      setProjectSaving(false);
    }
  };

  const updateCertDraft = (updates: Partial<CertificateEntry>) => {
    setCertDraft((d) => ({ ...d, ...updates }));
  };

  const commitCertDraft = () => {
    const certFe = certificateEntryFieldErrors(certDraft, 'draft');
    if (Object.keys(certFe).length) {
      setFormFieldErrors((p) => ({ ...omitKeysMatching(p, /^cert_draft_/), ...certFe }));
      toast.error('Please fix the highlighted fields');
      return;
    }
    setFormFieldErrors((p) => omitKeysMatching(p, /^cert_draft_/));
    const entry = cloneCertificate({
      ...certDraft,
      expirationDate: certDraft.noExpiration ? '' : certDraft.expirationDate,
      certVerificationStatus: 'pending',
      certSelfDeclared: false,
      verificationMethod: null,
    });
    const next = [...certList, entry];
    setCertList(next);
    void syncCertificationsToApi(next, { silentSuccess: true });
    toast.success('Certification added');
    setCertDraft(emptyCertificate());
    setCertAddFormOpen(false);
  };

  const handleCertDraftFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an image (JPEG, PNG, WebP) or PDF');
      return;
    }
    setCertDraftUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ url: string } | { data: { url: string } }>(
        '/v1/professional/upload-id',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      const url = (res.data as any)?.data?.url ?? (res.data as any)?.url;
      if (url) {
        setCertDraft((d) => ({ ...d, supportingMediaUrl: url }));
        clearFormError('cert_draft_supportingMediaUrl');
        toast.success('File uploaded');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setCertDraftUploading(false);
      e.target.value = '';
    }
  };

  const syncCertificationsToApi = async (list: CertificateEntry[], options?: { silentSuccess?: boolean }) => {
    const certFe = certificationListFieldErrors(list);
    if (Object.keys(certFe).length) {
      setFormFieldErrors((p) => ({ ...omitKeysMatching(p, /^cert_/), ...certFe }));
      if (!options?.silentSuccess) toast.error('Please fix the highlighted certification fields');
      return;
    }
    setSaving(true);
    try {
      await api.put('/v1/professional/profile', {
        certifications: list.map((c) => {
          const isVerified = c.certVerificationStatus === 'verified';
          const base: Record<string, unknown> = {
            name: c.name,
            issuedBy: c.issuedBy,
            issuedDate: c.issuedDate || undefined,
            expirationDate: c.noExpiration ? undefined : c.expirationDate || undefined,
            credentialId: c.credentialId,
            reportingUrl: c.reportingUrl?.trim() || undefined,
            supportingMediaUrl: c.supportingMediaUrl?.trim() || undefined,
            associatedSkills: c.associatedSkills?.trim() || undefined,
            certVerificationStatus: isVerified ? 'verified' : 'pending',
            verified: isVerified,
            certSelfDeclared: !isVerified && !!c.certSelfDeclared,
          };
          const vm = c.verificationMethod?.trim();
          if (!isVerified && c.certSelfDeclared) {
            base.verificationMethod = vm || 'self_declaration';
          } else if (!isVerified && vm) {
            base.verificationMethod = vm;
          }
          return base;
        }),
      });
      setFormFieldErrors((p) => omitKeysMatching(p, /^cert_/));
      if (!options?.silentSuccess) toast.success('Certifications saved');
      setSectionEditMode((prev) => ({ ...prev, certification: false }));
      await fetchProfile({ soft: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save certifications');
    } finally {
      setSaving(false);
    }
  };

  const syncFamilyToApi = async (
    marital: string,
    spouse: string,
    list: FamilyRelationEntry[],
    options?: { silentSuccess?: boolean; exitEditMode?: boolean },
  ) => {
    const famFe = familyFieldErrors(marital, spouse, list);
    if (Object.keys(famFe).length) {
      setFormFieldErrors((p) => ({ ...omitKeysMatching(p, /^fam/), ...famFe }));
      if (!options?.silentSuccess) toast.error('Please fix the highlighted family fields');
      return;
    }
    setSaving(true);
    try {
      await api.put('/v1/professional/profile', {
        familyInfo: {
          maritalStatus: marital || undefined,
          spouseName: marital === 'married' ? spouse || undefined : undefined,
          relations: list
            .filter((r) => r.relationType?.trim() || r.fullName?.trim())
            .map((r) => ({ relationType: r.relationType, fullName: r.fullName })),
        },
      });
      setFormFieldErrors((p) => omitKeysMatching(p, /^fam/));
      if (!options?.silentSuccess) toast.success('Family information saved');
      if (options?.exitEditMode) {
        setSectionEditMode((prev) => ({ ...prev, family: false }));
      }
      await fetchProfile({ soft: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save family information');
    } finally {
      setSaving(false);
    }
  };

  const updateFamilyRelationDraft = (updates: Partial<FamilyRelationEntry>) => {
    setFamilyRelationDraft((d) => ({ ...d, ...updates }));
  };

  const commitFamilyRelationDraft = () => {
    const draftFe = familyRelationDraftFieldErrors(familyRelationDraft);
    if (Object.keys(draftFe).length) {
      setFormFieldErrors((p) => ({ ...omitKeysMatching(p, /^fam_draft_/), ...draftFe }));
      toast.error('Please fix the highlighted fields');
      return;
    }
    setFormFieldErrors((p) => omitKeysMatching(p, /^fam_draft_/));
    const next = [...relationsList, { ...familyRelationDraft }];
    const famFe = familyFieldErrors(maritalStatus, spouseName, next);
    if (Object.keys(famFe).length) {
      setFormFieldErrors((p) => ({ ...omitKeysMatching(p, /^fam/), ...famFe }));
      toast.error('Please fix the highlighted fields');
      return;
    }
    setRelationsList(next);
    setFamilyRelationDraft(emptyFamilyRelation());
    setFamilyRelationAddFormOpen(false);
    toast.success('Relation added');
    void syncFamilyToApi(maritalStatus, spouseName, next, { silentSuccess: true, exitEditMode: true });
  };

  const removeFamilyRelation = (index: number) => {
    const next = relationsList.filter((_, i) => i !== index);
    setRelationsList(next);
    void syncFamilyToApi(maritalStatus, spouseName, next, { silentSuccess: true, exitEditMode: true });
  };

  const clearFormError = (key: string) => {
    setFormFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const fe = formFieldErrors;
  const hasLocationDraftFieldErrors = Object.keys(fe).some((k) => k.startsWith('loc_draft_'));
  const showLocationAddForm = locationAddFormOpen || hasLocationDraftFieldErrors;
  const hasEducationDraftFieldErrors = Object.keys(fe).some((k) => k.startsWith('edu_draft_'));
  const showEducationAddForm = educationAddFormOpen || hasEducationDraftFieldErrors;
  const hasWorkDraftFieldErrors = Object.keys(fe).some((k) => k.startsWith('work_draft_'));
  const showWorkAddForm = workAddFormOpen || hasWorkDraftFieldErrors;
  const hasProjectDraftFieldErrors = Object.keys(fe).some((k) => k.startsWith('proj_draft_'));
  const showProjectAddForm = projectAddFormOpen || hasProjectDraftFieldErrors;
  const hasCertDraftFieldErrors = Object.keys(fe).some((k) => k.startsWith('cert_draft_'));
  const showCertificationAddForm = certAddFormOpen || hasCertDraftFieldErrors;
  const hasFamilyRelationDraftFieldErrors = Object.keys(fe).some((k) => k.startsWith('fam_draft_'));
  const showFamilyRelationAddForm = familyRelationAddFormOpen || hasFamilyRelationDraftFieldErrors;
  const errB3 = (k: string) => (fe[k] ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300');
  const errB2 = (k: string) => (fe[k] ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200');

  if (loading) {
    return (
      <ProfessionalLayout>
        <div className="p-6 flex items-center justify-center min-h-[40vh]">
          <p className="text-gray-500">Loading verification data...</p>
        </div>
      </ProfessionalLayout>
    );
  }

  return (
    <ProfessionalLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiShieldCheck className="w-7 h-7 text-brand-600" />
            Verification Center
          </h1>
          <p className="text-gray-600 mt-1">
            Add and verify your information. Changes sync when you add or update entries.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-sm font-medium text-gray-800">
            <span>Profile Completion</span>
            <span>{progressPct}%</span>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {completedVerificationSteps}/{VERIFICATION_TABS.length} verification steps completed
          </p>
        </div>

        <div className="mb-4 rounded-lg bg-gray-100 p-px">
          <nav className="flex flex-wrap gap-px overflow-x-auto" aria-label="Verification sections">
            {VERIFICATION_TABS.map(({ id, label }) => {
              const status = verificationStatus[id];
              const verified = status?.verified ?? false;
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSearchParams({ tab: id })}
                  className={`flex items-center gap-1 px-2 py-1 text-[13px] leading-tight font-medium whitespace-nowrap rounded-md transition-colors ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                      : 'text-gray-600 hover:bg-gray-50/80 border border-transparent'
                  }`}
                >
                  {label}
                  {verified && <HiCheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" aria-hidden />}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {verificationStatus.personal.verified ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Verified
                  </span>
                ) : personalAdminReviewPending ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-900">
                    Verification Request under Review
                  </span>
                ) : verificationStatus.personal.completed ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Pending verification
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Not completed
                  </span>
                )}
              </div>

              {!showPersonalIdentityReadOnlySummary && (
                <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {PERSONAL_FLOW_UI_GROUPS.map(({ label }, i) => {
                      const done =
                        (i === 0 && identityFlowComplete) ||
                        (i === 1 && userEmailVerified && userPhoneVerified) ||
                        (i === 2 && livenessCompleteLocal);
                      const active = activePersonalFlowGroupIndex === i;
                      return (
                        <div
                          key={label}
                          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs leading-tight font-medium border ${
                            done
                              ? 'border-brand-200 bg-brand-50 text-brand-800'
                              : active
                                ? 'border-brand-500 bg-white text-brand-700 ring-2 ring-brand-200'
                                : 'border-gray-200 bg-white text-gray-500'
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                              done ? 'bg-brand-500 text-white' : active ? 'bg-brand-100 text-brand-800' : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {done ? '✓' : i + 1}
                          </span>
                          {label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {sectionEditMode.personal && personalBasicComplete ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-gray-900">Personal Identity Information</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Update your details, then tap Add Data to save. Use Back to return to this tab and continue the
                        verification steps (identity, email & phone, liveness) on one page.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSectionEditMode((prev) => ({ ...prev, personal: false }))}
                      className="shrink-0 px-3 py-1.5 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Back
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={personal.firstName}
                        onChange={(e) => {
                          setPersonal((p) => ({ ...p, firstName: e.target.value }));
                          clearFormError('per_firstName');
                        }}
                        className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB3('per_firstName')}`}
                        required
                      />
                      {fe.per_firstName ? <p className="mt-1 text-sm text-red-600">{fe.per_firstName}</p> : null}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={personal.lastName}
                        onChange={(e) => {
                          setPersonal((p) => ({ ...p, lastName: e.target.value }));
                          clearFormError('per_lastName');
                        }}
                        className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB3('per_lastName')}`}
                        required
                      />
                      {fe.per_lastName ? <p className="mt-1 text-sm text-red-600">{fe.per_lastName}</p> : null}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other Names</label>
                      <input
                        type="text"
                        value={personal.middleName}
                        onChange={(e) => setPersonal((p) => ({ ...p, middleName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="verification-personal-nationality"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Nationality <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="verification-personal-nationality"
                        value={personal.nationality}
                        onChange={(e) => {
                          setPersonal((p) => ({ ...p, nationality: e.target.value }));
                          clearFormError('per_nationality');
                        }}
                        className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB3('per_nationality')}`}
                      >
                        {NATIONALITY_SEARCHABLE_OPTIONS.map((o) => (
                          <option key={o.value || '__nationality_empty'} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {fe.per_nationality ? <p className="mt-1 text-sm text-red-600">{fe.per_nationality}</p> : null}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={personal.dateOfBirth}
                        onChange={(e) => {
                          setPersonal((p) => ({ ...p, dateOfBirth: e.target.value }));
                          clearFormError('per_dateOfBirth');
                        }}
                        className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB3('per_dateOfBirth')}`}
                        required
                      />
                      {fe.per_dateOfBirth ? <p className="mt-1 text-sm text-red-600">{fe.per_dateOfBirth}</p> : null}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={personal.gender}
                        onChange={(e) => {
                          setPersonal((p) => ({ ...p, gender: e.target.value }));
                          clearFormError('per_gender');
                        }}
                        className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB3('per_gender')}`}
                      >
                        {[{ value: '', label: 'Select' }, ...GENDERS.map((g) => ({ value: g, label: g }))].map((o) => (
                          <option key={o.value || '__gender_empty'} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {fe.per_gender ? <p className="mt-1 text-sm text-red-600">{fe.per_gender}</p> : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSavePersonal()}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium"
                  >
                    <HiPlus className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Add Data'}
                  </button>
                </div>
              ) : showPersonalIdentityReadOnlySummary ? (
                <div className="space-y-6 min-h-[280px]">
                  {identityVerificationPath === 'self' && !verificationStatus.personal.verified ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/90 bg-[#fffbeb] px-4 py-3.5">
                      <div className="flex min-w-0 items-start gap-3">
                        <HiExclamationCircle
                          className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
                          aria-hidden
                        />
                        <p className="text-sm font-medium leading-snug text-amber-950">
                          Self Declaration — limited network access. Upgrade to full verification.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setVerifyPersonalModalOpen(true)}
                        className="inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-amber-800/25 bg-white px-3 py-2 text-sm font-semibold text-amber-950 shadow-sm hover:bg-amber-50"
                      >
                        <span
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-amber-800/30"
                          aria-hidden
                        >
                          <HiArrowUp className="h-3.5 w-3.5" />
                        </span>
                        Upgrade Verification
                      </button>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <h2 className="min-w-0 flex-1 text-lg font-semibold text-gray-900">
                      Personal Identity Information
                    </h2>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-1">
                      {verificationStatus.personal.verified ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Verified
                        </span>
                      ) : personalAdminReviewPending ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-900">
                          Verification Request under Review
                        </span>
                      ) : verificationStatus.personal.completed ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-900">
                          Pending review
                        </span>
                      ) : null}
                      {identityVerificationPath === 'self' && (
                        <span className="text-xs text-gray-500">via Self Declaration</span>
                      )}
                      {identityVerificationPath === 'gov' && (
                        <span className="text-xs text-gray-500">via Government ID</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 text-sm border-b border-gray-200 pb-6">
                    <div className="space-y-5">
                      <div>
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">First Name</p>
                        <p className="text-gray-900 font-semibold flex items-center gap-1.5 flex-wrap">
                          {personal.firstName?.trim() || '—'}
                          {!!personal.firstName?.trim() && (
                            <HiCheckCircle className="w-4 h-4 text-green-600 shrink-0" aria-hidden />
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Other Names</p>
                        <p className="text-gray-900 font-semibold">{personal.middleName?.trim() || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Date of Birth</p>
                        <p className="text-gray-900 font-semibold flex flex-wrap items-baseline gap-2">
                          {personal.dateOfBirth
                            ? (() => {
                                const d = new Date(personal.dateOfBirth);
                                return Number.isNaN(d.getTime()) ? personal.dateOfBirth : d.toLocaleDateString();
                              })()
                            : '—'}
                          {personalAgeYears != null && (
                            <span className="text-gray-500 font-normal text-sm">({personalAgeYears} yrs)</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-5">
                      <div>
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Last Name</p>
                        <p className="text-gray-900 font-semibold flex items-center gap-1.5 flex-wrap">
                          {personal.lastName?.trim() || '—'}
                          {!!personal.lastName?.trim() && (
                            <HiCheckCircle className="w-4 h-4 text-green-600 shrink-0" aria-hidden />
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Nationality</p>
                        <p className="text-gray-900 font-semibold">{personal.nationality?.trim() || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Gender</p>
                        <p className="text-gray-900 font-semibold">{personal.gender?.trim() || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* <div className="grid grid-cols-1 gap-x-10 gap-y-6 border-b border-gray-200 pb-6 text-sm md:grid-cols-2">
                    <div className="space-y-5">
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                          Country (signup)
                        </p>
                        <p className="font-semibold text-gray-900">{personal.country?.trim() || '—'}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                          Residential address
                        </p>
                        <p className="whitespace-pre-wrap font-semibold text-gray-900">
                          {[personal.address, personal.city, personal.state]
                            .map((x) => String(x || '').trim())
                            .filter(Boolean)
                            .join(', ') || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-5">
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                          Government ID type
                        </p>
                        <p className="font-semibold text-gray-900">
                          {ID_TYPE_OPTIONS.find((o) => o.value === personal.idType)?.label || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                          ID number (reference)
                        </p>
                        <p className="font-semibold text-gray-900">
                          {personal.idNumber?.trim()
                            ? `••••${personal.idNumber.trim().slice(-4)}`
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">ID document</p>
                        {personal.idDocumentUrl?.trim() ? (
                          <p className="font-semibold text-gray-900">
                            <a
                              href={
                                personal.idDocumentUrl.trim().startsWith('http')
                                  ? personal.idDocumentUrl.trim()
                                  : `${String(api.defaults.baseURL || '').replace(/\/$/, '')}${personal.idDocumentUrl.trim().startsWith('/') ? '' : '/'}${personal.idDocumentUrl.trim()}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-brand-600 hover:underline"
                            >
                              View document
                            </a>
                          </p>
                        ) : (
                          <p className="font-semibold text-gray-900">—</p>
                        )}
                      </div>
                    </div>
                  </div> */}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <HiMail className="w-5 h-5 text-gray-400 shrink-0" aria-hidden />
                        <span className="font-medium text-gray-900">Email Verification</span>
                      </div>
                      {userEmailVerified ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 shrink-0">
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 shrink-0">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <HiPhone className="w-5 h-5 text-gray-400 shrink-0" aria-hidden />
                        <span className="font-medium text-gray-900">Phone Verification</span>
                      </div>
                      {userPhoneVerified ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 shrink-0">
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 shrink-0">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <HiVideoCamera className="w-5 h-5 text-gray-400 shrink-0" aria-hidden />
                        <span className="font-medium text-gray-900">Liveness Check</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {livenessCompleteLocal && profile?.livenessSelfieUrl?.trim() ? (
                          <img
                            src={profile.livenessSelfieUrl}
                            alt=""
                            className="h-8 w-8 rounded-md border border-gray-200 object-cover"
                          />
                        ) : livenessCompleteLocal && profile?.isPersonalCompleted ? (
                          <HiUserCircle
                            className="h-8 w-8 shrink-0 text-gray-400"
                            title="Liveness check completed"
                            aria-hidden
                          />
                        ) : null}
                        {livenessCompleteLocal ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setRequestDataEditModalOpen(true)}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800 hover:text-brand-600"
                  >
                    <HiLockClosed className="w-4 h-4 text-gray-500" aria-hidden />
                    Request Edit
                  </button>
                </div>
              ) : showPersonalBasicEntryForm ? (
                !(personalBasicComplete && personalIdentityAwaitingVerification) ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-gray-900">Personal Identity Information</h2>
                        <p className="text-sm text-gray-600 mt-1">
                          Enter your details, then tap Add Data. After saving, use Verify Data to open identity verification.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={personal.firstName}
                          onChange={(e) => {
                            setPersonal((p) => ({ ...p, firstName: e.target.value }));
                            clearFormError('per_firstName');
                          }}
                          className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB3('per_firstName')}`}
                          placeholder="First name"
                          required
                        />
                        {fe.per_firstName ? <p className="mt-1 text-sm text-red-600">{fe.per_firstName}</p> : null}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={personal.lastName}
                          onChange={(e) => {
                            setPersonal((p) => ({ ...p, lastName: e.target.value }));
                            clearFormError('per_lastName');
                          }}
                          className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB3('per_lastName')}`}
                          placeholder="Last name"
                          required
                        />
                        {fe.per_lastName ? <p className="mt-1 text-sm text-red-600">{fe.per_lastName}</p> : null}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Other Names</label>
                        <input
                          type="text"
                          value={personal.middleName}
                          onChange={(e) => setPersonal((p) => ({ ...p, middleName: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="verification-personal-nationality-new"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Nationality <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="verification-personal-nationality-new"
                          value={personal.nationality}
                          onChange={(e) => {
                            setPersonal((p) => ({ ...p, nationality: e.target.value }));
                            clearFormError('per_nationality');
                          }}
                          className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB3('per_nationality')}`}
                        >
                          {NATIONALITY_SEARCHABLE_OPTIONS.map((o) => (
                            <option key={o.value || '__nationality_empty'} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        {fe.per_nationality ? <p className="mt-1 text-sm text-red-600">{fe.per_nationality}</p> : null}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date of Birth <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={personal.dateOfBirth}
                          onChange={(e) => {
                            setPersonal((p) => ({ ...p, dateOfBirth: e.target.value }));
                            clearFormError('per_dateOfBirth');
                          }}
                          className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB3('per_dateOfBirth')}`}
                          required
                        />
                        {fe.per_dateOfBirth ? <p className="mt-1 text-sm text-red-600">{fe.per_dateOfBirth}</p> : null}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Gender <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={personal.gender}
                          onChange={(e) => {
                            setPersonal((p) => ({ ...p, gender: e.target.value }));
                            clearFormError('per_gender');
                          }}
                          className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB3('per_gender')}`}
                        >
                          {[{ value: '', label: 'Select' }, ...GENDERS.map((g) => ({ value: g, label: g }))].map((o) => (
                            <option key={o.value || '__gender_empty'} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        {fe.per_gender ? <p className="mt-1 text-sm text-red-600">{fe.per_gender}</p> : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleAddPersonalBasic()}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium"
                    >
                      <HiPlus className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Add Data'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="text-lg font-semibold text-gray-900">Personal Identity Information</h2>
                      <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
                        Data Added
                      </span>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-10">
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs font-medium text-gray-500">First Name</p>
                            <p className="mt-0.5 text-sm font-medium text-gray-900">
                              {personal.firstName?.trim() || '—'}
                            </p>
                          </div>
                          {personal.middleName?.trim() ? (
                            <div>
                              <p className="text-xs font-medium text-gray-500">Other Names</p>
                              <p className="mt-0.5 text-sm font-medium text-gray-900">{personal.middleName.trim()}</p>
                            </div>
                          ) : null}
                          <div>
                            <p className="text-xs font-medium text-gray-500">Nationality</p>
                            <p className="mt-0.5 text-sm font-medium text-gray-900">
                              {personal.nationality?.trim() || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500">Gender</p>
                            <p className="mt-0.5 text-sm font-medium text-gray-900">
                              {personal.gender?.trim() || '—'}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs font-medium text-gray-500">Last Name</p>
                            <p className="mt-0.5 text-sm font-medium text-gray-900">
                              {personal.lastName?.trim() || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500">Date of Birth</p>
                            <p className="mt-0.5 text-sm font-medium text-gray-900">
                              {personal.dateOfBirth?.trim() || '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setVerifyPersonalModalOpen(true)}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium"
                      >
                        <HiShieldCheck className="w-4 h-4" />
                        Verify Data
                      </button>
                      <button
                        type="button"
                        onClick={() => setSectionEditMode((prev) => ({ ...prev, personal: true }))}
                        className="text-sm font-medium text-gray-600 hover:text-gray-900"
                      >
                        Edit details
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="space-y-8">
                  {/** Hide completed identity while Email & phone (1) or Liveness (2) is the active pill. */}
                  {activePersonalFlowGroupIndex !== 1 && activePersonalFlowGroupIndex !== 2 ? (
                    <section className="rounded-xl border border-gray-200 bg-white p-5 md:p-6 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Step 2</p>
                          <h2 className="text-lg font-semibold text-gray-900">Identity verification</h2>
                        </div>
                        {identityFlowComplete ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
                            To do
                          </span>
                        )}
                      </div>
                      <div
                        className={
                          verifyPersonalModalOpen
                            ? ''
                            : 'min-h-[120px] flex flex-col items-center justify-center gap-3 text-center px-4 py-6'
                        }
                      >
                        {!verifyPersonalModalOpen && (
                          <>
                            <p className="text-sm text-gray-600">Choose how to verify your identity to continue.</p>
                            <button
                              type="button"
                              onClick={() => setVerifyPersonalModalOpen(true)}
                              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
                            >
                              Open verification options
                            </button>
                            <button
                              type="button"
                              onClick={() => setSectionEditMode((prev) => ({ ...prev, personal: true }))}
                              className="text-xs text-gray-500 hover:text-gray-800"
                            >
                              Edit personal data
                            </button>
                          </>
                        )}
                      </div>
                    </section>
                  ) : null}

                  {!identityFlowComplete ? (
                    <p className="text-sm text-gray-600 rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-3">
                      Complete Step 2 above to unlock email & phone and liveness on this same page.
                    </p>
                  ) : null}

                  {identityFlowComplete && activePersonalFlowGroupIndex !== 2 ? (
                    <section className="rounded-xl border border-gray-200 bg-white p-5 md:p-6 space-y-5">
                      <div className="border-b border-gray-100 pb-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Step {activePersonalFlowGroupIndex === 1 ? '2' : '3'}
                        </p>
                        <h2 className="text-lg font-semibold text-gray-900">Email & phone</h2>
                        <p className="text-sm text-gray-600 mt-1">
                          {userEmailVerified
                            ? 'Add your phone number and confirm the code we send by SMS or to your account email.'
                            : 'Verify your account email, then verify your phone number to continue.'}
                        </p>
                      </div>
                  <div className="flex flex-col gap-4 w-full">
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-3 w-full">
                      <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <div className="flex items-center gap-2 min-w-0 shrink-0">
                          <HiMail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-900 text-sm whitespace-nowrap">Email Verification</span>
                        </div>
                        <div className="flex min-w-0 flex-1 items-center justify-end gap-3 sm:justify-end">
                          {userEmailVerified ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 shrink-0">
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 shrink-0">
                              Unverified
                            </span>
                          )}
                          <span
                            className="text-sm font-medium text-gray-900 truncate text-right"
                            title={personal.email || undefined}
                          >
                            {personal.email || '—'}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">This is your Taldium account primary email.</p>
                      {!userEmailVerified && (
                        <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">
                          {emailVerifyPhase === 'enter_otp' ? (
                            <>
                              <p className="text-xs text-gray-500">Enter the 6-digit code we sent to your email.</p>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex gap-1">
                                  {emailOtpDigits.map((digit, i) => (
                                    <input
                                      key={i}
                                      id={`email-otp-${i}`}
                                      type="text"
                                      inputMode="numeric"
                                      maxLength={1}
                                      value={digit}
                                      onChange={(e) => handleEmailOtpDigit(i, e.target.value)}
                                      className="h-9 w-8 text-center text-sm border border-gray-300 rounded-md text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-gray-400">6 digits</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => void handleConfirmEmailOtp()}
                                disabled={saving}
                                className="h-9 w-full rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                              >
                                {saving ? 'Verifying…' : 'Confirm email'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEmailVerifyPhase('idle');
                                  setEmailOtpDigits(['', '', '', '', '', '']);
                                }}
                                className="text-xs font-medium text-brand-600 hover:text-brand-700 text-left"
                              >
                                Back
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleSendEmailVerificationCode()}
                              disabled={emailCodeSending}
                              className="h-9 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 sm:w-auto"
                            >
                              {emailCodeSending ? 'Sending…' : 'Send verification code'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-3 w-full">
                      <div className="flex w-full flex-col gap-3">
                        <div className="flex w-full flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <HiPhone className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-gray-900 text-sm whitespace-nowrap">Phone Verification</span>
                          </div>
                          {userPhoneVerified ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 shrink-0">
                              Verified
                            </span>
                          ) : null}
                        </div>
                        {userPhoneVerified ? (
                          <p className="text-sm text-gray-700 font-mono">
                            {personal.phoneNumber?.trim() || '—'}
                          </p>
                        ) : null}
                        {!userPhoneVerified &&
                          (phoneVerifyPhase === 'enter_otp' && phoneOtpChannel ? (
                            <div className="flex flex-col gap-2 pt-1">
                              <p className="text-xs text-gray-500">
                                Code sent via {phoneOtpChannel === 'sms' ? 'SMS' : 'your account email'}.
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex gap-1">
                                  {phoneOtpDigits.map((digit, i) => (
                                    <input
                                      key={i}
                                      id={`phone-otp-${i}`}
                                      type="text"
                                      inputMode="numeric"
                                      maxLength={1}
                                      value={digit}
                                      onChange={(e) => handlePhoneOtpDigit(i, e.target.value)}
                                      className="h-9 w-8 text-center text-sm border border-gray-300 rounded-md text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-gray-400">6 digits</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => void handleConfirmPhoneOtp()}
                                disabled={saving}
                                className="h-9 w-full rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                              >
                                {saving ? 'Verifying…' : 'Confirm'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPhoneVerifyPhase('choose_delivery');
                                  setPhoneOtpChannel(null);
                                  setPhoneOtpDigits(['', '', '', '', '', '']);
                                }}
                                className="text-xs font-medium text-brand-600 hover:text-brand-700 text-left"
                              >
                                Change delivery method
                              </button>
                            </div>
                          ) : phoneVerifyPhase === 'choose_delivery' ? (
                            <div className="flex flex-col gap-3 pt-1">
                              <p className="text-xs text-gray-600">
                                <span className="font-mono font-medium text-gray-900">
                                  {(() => {
                                    try {
                                      return getPhoneE164();
                                    } catch {
                                      return `${parsePhoneDialValue(phoneDialSelection).dial} ${personal.phoneNumber?.trim() || ''}`;
                                    }
                                  })()}
                                </span>
                              </p>
                              <p className="text-xs font-medium text-gray-700">How should we send your code?</p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={phoneOtpSending}
                                  onClick={() => void handleSendPhoneOtp('sms')}
                                  className="flex-1 min-w-0 py-2.5 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50"
                                >
                                  {phoneOtpSending ? 'Sending…' : 'Via SMS'}
                                </button>
                                <button
                                  type="button"
                                  disabled={phoneOtpSending}
                                  onClick={() => void handleSendPhoneOtp('email')}
                                  className="flex-1 min-w-0 py-2.5 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50"
                                >
                                  {phoneOtpSending ? 'Sending…' : 'Via Email'}
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setPhoneVerifyPhase('enter_number');
                                  setPhoneOtpChannel(null);
                                }}
                                className="text-xs font-medium text-brand-600 hover:text-brand-700 text-left"
                              >
                                Change number
                              </button>
                            </div>
                          ) : (
                            <div className="flex w-full min-w-0 flex-col gap-2">
                              {!userEmailVerified && (
                                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                  Verify your email above before you can add a phone number.
                                </p>
                              )}
                              <div className="flex w-full min-w-0 flex-nowrap items-stretch gap-2 overflow-x-auto pt-0.5 pb-0.5 sm:gap-3">
                              <div className="w-[min(100%,280px)] min-w-[200px] shrink-0">
                                <label htmlFor="contact-phone-dial" className="sr-only">
                                  Country code
                                </label>
                                <PhoneDialCodeSelect
                                  id="contact-phone-dial"
                                  value={phoneDialSelection}
                                  onChange={setPhoneDialSelection}
                                  className="text-sm"
                                />
                              </div>
                              <div className="min-w-[140px] flex-1">
                                <label htmlFor="contact-phone-number" className="sr-only">
                                  Phone number
                                </label>
                                <input
                                  id="contact-phone-number"
                                  type="tel"
                                  value={personal.phoneNumber}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (
                                      typeof InputEvent !== 'undefined' &&
                                      e.nativeEvent instanceof InputEvent &&
                                      e.nativeEvent.inputType === 'insertFromPaste'
                                    ) {
                                      const split = splitPlusPrefixedPhone(v.trim());
                                      if (split) {
                                        setPhoneDialSelection(split.dialValue);
                                        setPersonal((p) => ({ ...p, phoneNumber: split.nationalNumber }));
                                        return;
                                      }
                                    }
                                    const auto = tryAutoSplitPhoneInputValue(v);
                                    if (auto) {
                                      setPhoneDialSelection(auto.dialValue);
                                      setPersonal((p) => ({ ...p, phoneNumber: auto.national }));
                                      return;
                                    }
                                    setPersonal((p) => ({ ...p, phoneNumber: v }));
                                  }}
                                  onBlur={(e) => {
                                    const v = e.target.value.trim();
                                    if (!v.startsWith('+')) return;
                                    const split = splitPlusPrefixedPhone(v);
                                    if (split) {
                                      setPhoneDialSelection(split.dialValue);
                                      setPersonal((p) => ({ ...p, phoneNumber: split.nationalNumber }));
                                    }
                                  }}
                                  placeholder="e.g. 8012345678 or +2348012345678"
                                  className="h-10 w-full min-w-[120px] rounded-lg border border-gray-300 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!personal.phoneNumber?.trim()) {
                                    toast.error('Enter a phone number');
                                    return;
                                  }
                                  try {
                                    getPhoneE164();
                                  } catch {
                                    toast.error('Enter a valid phone number');
                                    return;
                                  }
                                  if (!userEmailVerified) {
                                    toast.error('Verify your email first');
                                    return;
                                  }
                                  setPhoneVerifyPhase('choose_delivery');
                                  setPhoneOtpChannel(null);
                                  setPhoneOtpDigits(['', '', '', '', '', '']);
                                }}
                                className="h-10 shrink-0 rounded-lg border border-gray-300 bg-white px-5 text-sm font-medium text-gray-800 hover:bg-gray-50 min-w-[5.5rem]"
                              >
                                Add
                              </button>
                            </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                    </section>
                  ) : null}

                  {identityFlowComplete && userEmailVerified && userPhoneVerified ? (
                    <section className="rounded-xl border border-gray-200 bg-white p-5 md:p-6 space-y-5">
                      <div className="border-b border-gray-100 pb-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Step {activePersonalFlowGroupIndex === 2 ? '2' : '4'}
                        </p>
                        <h2 className="text-lg font-semibold text-gray-900">Liveness check</h2>
                        <p className="text-sm text-gray-600 mt-1">Complete a quick camera check to confirm it is you.</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3 shrink-0">
                        <HiVideoCamera className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900">Liveness Check</span>
                      </div>
                      <div className="flex items-center sm:justify-end sm:ml-auto min-h-[36px]">
                        {livenessCompleteLocal ? (
                          <div className="flex items-center gap-2">
                            {profile?.livenessSelfieUrl?.trim() ? (
                              <img
                                src={profile.livenessSelfieUrl}
                                alt="Liveness selfie"
                                className="h-9 w-9 rounded-lg border border-gray-200 object-cover"
                              />
                            ) : profile?.isPersonalCompleted ? (
                              <HiUserCircle
                                className="h-9 w-9 shrink-0 text-gray-400"
                                title="Liveness check completed"
                                aria-hidden
                              />
                            ) : null}
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-700">
                              Complete
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {!livenessCompleteLocal && (
                      <div className="mt-4 rounded-lg bg-gray-100 p-4 space-y-4">
                        <h4 className="font-semibold text-gray-900">Liveness Check Instructions</h4>
                        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
                          <li>Ensure you are in a well-lit environment</li>
                          <li>Remove glasses, hats, or face coverings</li>
                          <li>Hold your device at eye level</li>
                          <li>Follow the on-screen prompts in the camera step</li>
                        </ul>
                        <p className="text-xs text-gray-500">
                          Your liveness selfie is stored for verification only and is not used as your
                          profile photo.
                        </p>
                        <button
                          type="button"
                          onClick={() => setLivenessSelfieModalOpen(true)}
                          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
                        >
                          <HiVideoCamera className="w-4 h-4" />
                          Start
                        </button>
                      </div>
                    )}
                  </div>
                    </section>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {activeTab === 'location' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {verificationStatus.location?.verified ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Verified
                  </span>
                ) : verificationStatus.location?.completed ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Pending verification
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Not completed
                  </span>
                )}
              </div>

              {(fe.loc_list || fe.loc_default) && (
                <p className="text-sm text-red-600">{fe.loc_list || fe.loc_default}</p>
              )}

              <div className="space-y-6">
                {locationsList.map((loc, index) => {
                  const status = loc.verificationStatus ?? 'pending';
                  const hasDoc = !!loc.documentUrl?.trim();
                  const pendingWithProof = status === 'pending' && hasDoc;
                  const methodLabel = locationVerificationMethodLabel(loc);
                  const title =
                    [loc.city, loc.state].filter((s) => s?.trim()).join(', ') || 'Location';
                  const subtitle = `${loc.country?.trim() || '—'} · ${loc.address?.trim() || '—'}`;
                  const locRowErrs = Object.entries(fe).filter(([k]) => k.startsWith(`loc_${index}_`));
                  const showSelfDeclBanner = status === 'self_declared';
                  const showVerifyCta =
                    status === 'rejected' || (status === 'pending' && !hasDoc);
                  const docHref =
                    loc.documentUrl &&
                    (loc.documentUrl.startsWith('http')
                      ? loc.documentUrl
                      : `${api.defaults.baseURL || ''}${loc.documentUrl}`);

                  return (
                    <div key={`loc-${index}-${title}`} className="space-y-3">
                      {locRowErrs.length > 0 && (
                        <ul className="list-disc space-y-0.5 pl-5 text-sm text-red-600">
                          {locRowErrs.map(([k, msg]) => (
                            <li key={k}>{msg}</li>
                          ))}
                        </ul>
                      )}

                      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                        {showSelfDeclBanner ? (
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/80 bg-[#fffbeb] px-4 py-3.5 sm:px-6">
                            <div className="flex min-w-0 items-start gap-3">
                              <HiExclamationCircle
                                className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
                                aria-hidden
                              />
                              <p className="text-sm font-medium leading-snug text-amber-950">
                                Self Declaration — limited network access. Upgrade to full verification.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => openVerifyAddressModal(index)}
                              className="inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-amber-800/25 bg-white px-3 py-2 text-sm font-semibold text-amber-950 shadow-sm hover:bg-amber-50"
                            >
                              <span
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-amber-800/30"
                                aria-hidden
                              >
                                <HiArrowUp className="h-3.5 w-3.5" />
                              </span>
                              Upgrade Verification
                            </button>
                          </div>
                        ) : null}

                        <div className="space-y-4 p-5 sm:p-6">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 gap-4">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 ring-1 ring-brand-100">
                                <HiLocationMarker className="h-6 w-6 text-brand-600" aria-hidden />
                              </div>
                              <div className="min-w-0">
                                <p className="text-lg font-semibold leading-tight text-gray-900">{title}</p>
                                <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                              <div className="flex flex-wrap gap-1.5 sm:justify-end">
                                {loc.isDefault ? (
                                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800">
                                    Default
                                  </span>
                                ) : null}
                                {status === 'pending' && !pendingWithProof ? (
                                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
                                    Pending
                                  </span>
                                ) : null}
                                {pendingWithProof ? (
                                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
                                    Pending verification
                                  </span>
                                ) : null}
                                {status === 'rejected' ? (
                                  <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-900">
                                    Rejected
                                  </span>
                                ) : null}
                                {status === 'self_declared' ? (
                                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-950">
                                    Self Declared
                                  </span>
                                ) : null}
                                {status === 'verified' ? (
                                  <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                                    Verified
                                  </span>
                                ) : null}
                              </div>
                              {status === 'self_declared' ? (
                                <p className="text-xs text-gray-400">via Self Declaration</p>
                              ) : null}
                              {methodLabel ? (
                                <p className="text-xs font-medium text-gray-600">
                                  Verification method: <span className="text-gray-900">{methodLabel}</span>
                                </p>
                              ) : null}
                            </div>
                          </div>

                          {uploadingLocationIndex === index || pendingWithProof ? (
                            <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                              <HiUpload
                                className={`mt-0.5 h-5 w-5 shrink-0 text-brand-600 ${uploadingLocationIndex === index ? 'animate-pulse' : ''}`}
                                aria-hidden
                              />
                              <div className="min-w-0">
                                {uploadingLocationIndex === index ? (
                                  <p className="text-sm font-medium text-gray-900">Uploading document…</p>
                                ) : (
                                  <>
                                    <p className="text-sm font-medium text-gray-900">Proof document on file</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      Submitted for review — you can open your upload below.
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/50 px-5 py-4 sm:px-6">
                          <div className="flex flex-wrap items-center gap-2">
                            {!loc.isDefault ? (
                              <button
                                type="button"
                                onClick={() => markLocationAsDefault(index)}
                                disabled={saving}
                                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Mark as default
                              </button>
                            ) : null}
                            {showVerifyCta ? (
                              <button
                                type="button"
                                onClick={() => openVerifyAddressModal(index)}
                                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                              >
                                <HiShieldCheck className="h-4 w-4" />
                                Verify
                              </button>
                            ) : null}
                            {showSelfDeclBanner ? (
                              <button
                                type="button"
                                onClick={() => openVerifyAddressModal(index)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500 bg-white px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
                              >
                                <HiShieldCheck className="h-4 w-4" />
                                Upgrade Verification
                              </button>
                            ) : null}
                            {status === 'verified' && loc.documentUrl && docHref ? (
                              <a
                                href={docHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-brand-600 hover:bg-gray-50"
                              >
                                View proof document
                              </a>
                            ) : null}
                            {pendingWithProof && docHref && uploadingLocationIndex !== index ? (
                              <a
                                href={docHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-brand-600 hover:bg-gray-50"
                              >
                                View uploaded document
                              </a>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => requestRemoveLocation(index)}
                            className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                            aria-label="Remove location"
                          >
                            <HiTrash className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {showLocationAddForm ? (
                <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <HiLocationMarker className="w-5 h-5 text-brand-600 shrink-0" />
                      <h3 className="text-base font-semibold text-gray-900">Add new location</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLocationAddFormOpen(false);
                        setLocationDraft({ country: '', state: '', city: '', address: '' });
                        setFormFieldErrors((p) => omitKeysMatching(p, /^loc_draft_/));
                      }}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country of Residence</label>
                      <select
                        value={locationDraft.country}
                        onChange={(e) => {
                          setLocationDraft((d) => ({ ...d, country: e.target.value }));
                          clearFormError('loc_draft_country');
                        }}
                        className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB2('loc_draft_country')}`}
                      >
                        {[{ value: '', label: 'Select country' }, ...COUNTRIES.map((c) => ({ value: c, label: c }))].map(
                          (o) => (
                            <option key={o.value || '__country_empty'} value={o.value}>
                              {o.label}
                            </option>
                          ),
                        )}
                      </select>
                      {fe.loc_draft_country ? <p className="mt-1 text-sm text-red-600">{fe.loc_draft_country}</p> : null}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State / Province / District</label>
                      <input
                        type="text"
                        value={locationDraft.state}
                        onChange={(e) => {
                          setLocationDraft((d) => ({ ...d, state: e.target.value }));
                          clearFormError('loc_draft_state');
                        }}
                        className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB2('loc_draft_state')}`}
                      />
                      {fe.loc_draft_state ? <p className="mt-1 text-sm text-red-600">{fe.loc_draft_state}</p> : null}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={locationDraft.city}
                        onChange={(e) => {
                          setLocationDraft((d) => ({ ...d, city: e.target.value }));
                          clearFormError('loc_draft_city');
                        }}
                        className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB2('loc_draft_city')}`}
                      />
                      {fe.loc_draft_city ? <p className="mt-1 text-sm text-red-600">{fe.loc_draft_city}</p> : null}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Street Number & Name</label>
                      <input
                        type="text"
                        value={locationDraft.address}
                        onChange={(e) => {
                          setLocationDraft((d) => ({ ...d, address: e.target.value }));
                          clearFormError('loc_draft_address');
                        }}
                        className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB2('loc_draft_address')}`}
                      />
                      {fe.loc_draft_address ? <p className="mt-1 text-sm text-red-600">{fe.loc_draft_address}</p> : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addLocationFromDraft}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    <HiPlus className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Add Location'}
                  </button>
                </div>
              ) : locationsList.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-14 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gray-100 bg-white shadow-sm">
                    <HiLocationMarker className="h-7 w-7 text-brand-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-800">No locations added yet</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Add where you live or work so employers can verify your address.
                  </p>
                  <button
                    type="button"
                    onClick={() => setLocationAddFormOpen(true)}
                    className="mt-6 inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-800"
                  >
                    <HiPlus className="w-4 h-4 text-brand-600" />
                    Add new location
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setLocationAddFormOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-800"
                >
                  <HiPlus className="w-4 h-4 text-brand-600" />
                  Add new location
                </button>
              )}

            </div>
          )}

          {activeTab === 'education' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {verificationStatus.education?.verified ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Verified
                  </span>
                ) : verificationStatus.education?.completed ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Pending verification
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Not completed
                  </span>
                )}
              </div>

              {fe.edu_list && <p className="text-sm text-red-600">{fe.edu_list}</p>}

              <div className="space-y-6">
                {educationEntriesList.map((entry, index) => {
                  const status = entry.eduVerificationStatus ?? 'pending';
                  const isSelfDeclaredEducation =
                    entry.verificationMethod === 'self_declaration' && status !== 'verified';
                  const hasMedia = !!entry.supportingMediaUrl?.trim();
                  const pendingWithProof = status === 'pending' && hasMedia && !isSelfDeclaredEducation;
                  const methodLabel = educationVerificationMethodLabel(entry);
                  const showVerifyCta = status === 'pending' && !isSelfDeclaredEducation;
                  const subtitle = formatEducationCardSubtitle(entry);
                  const eduRowErrs = Object.entries(fe).filter(([k]) => k.startsWith(`edu_${index}_`));
                  const eduCardKey = entry.id ? String(entry.id) : `tmp-${index}`;
                  const expanded = educationCardExpanded[eduCardKey] === true;
                  const qualShort = entry.degreeType?.trim();
                  const instName = entry.institutionName?.trim();
                  const headerTitle =
                    qualShort && instName
                      ? `${qualShort} — ${instName}`
                      : instName || qualShort || 'Education';
                  const skillChips = educationSkillChipsFromEntry(entry);
                  const courseworkChips = educationCourseworkChipsFromEntry(entry);
                  const scholarshipChips = educationChipsFromDelimitedText(entry.scholarshipsAndAid);
                  const achievementChips = educationChipsFromDelimitedText(entry.academicAchievements);
                  const activitiesChips = educationChipsFromDelimitedText(entry.activitiesSocieties);
                  const costLine = formatEducationMoneyLine(entry.currency, entry.costOfEducation);
                  const loanLine = formatEducationMoneyLine(entry.loanCurrency, entry.pendingLoanAmount);
                  const mediaHref = entry.supportingMediaUrl?.trim()
                    ? entry.supportingMediaUrl.startsWith('http')
                      ? entry.supportingMediaUrl
                      : `${api.defaults.baseURL || ''}${entry.supportingMediaUrl}`
                    : null;

                  return (
                    <div key={entry.id ?? `edu-${index}`} className="space-y-3">
                      {eduRowErrs.length > 0 && (
                        <ul className="list-disc space-y-0.5 pl-5 text-sm text-red-600">
                          {eduRowErrs.map(([k, msg]) => (
                            <li key={k}>{msg}</li>
                          ))}
                        </ul>
                      )}

                      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                        {isSelfDeclaredEducation ? (
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/80 bg-[#fffbeb] px-4 py-3.5 sm:px-6">
                            <div className="flex min-w-0 items-start gap-3">
                              <HiExclamationCircle
                                className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
                                aria-hidden
                              />
                              <p className="text-sm font-medium leading-snug text-amber-950">
                                Self Declaration — limited network access. Upgrade to full verification.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => openVerifyEducationModal(index)}
                              className="inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-amber-800/25 bg-white px-3 py-2 text-sm font-semibold text-amber-950 shadow-sm hover:bg-amber-50"
                            >
                              <span
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-amber-800/30"
                                aria-hidden
                              >
                                <HiArrowUp className="h-3.5 w-3.5" />
                              </span>
                              Upgrade Verification
                            </button>
                          </div>
                        ) : null}

                        <div className="space-y-4 p-5 sm:p-6">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
                              <button
                                type="button"
                                onClick={() =>
                                  setEducationCardExpanded((prev) => ({
                                    ...prev,
                                    [eduCardKey]: !(prev[eduCardKey] === true),
                                  }))
                                }
                                className="mt-1 shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                                aria-expanded={expanded}
                                aria-label={expanded ? 'Collapse details' : 'Expand details'}
                              >
                                <HiChevronDown
                                  className={`h-5 w-5 transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`}
                                  aria-hidden
                                />
                              </button>
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 ring-1 ring-brand-100">
                                <HiAcademicCap className="h-6 w-6 text-brand-600" aria-hidden />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-lg font-semibold leading-tight text-gray-900">{headerTitle}</p>
                                <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                              <div className="flex flex-wrap gap-1.5 sm:justify-end">
                                {entry.isDefault ? (
                                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800">
                                    Default
                                  </span>
                                ) : null}
                                {status === 'pending' && !pendingWithProof && !isSelfDeclaredEducation ? (
                                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
                                    Pending
                                  </span>
                                ) : null}
                                {pendingWithProof ? (
                                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
                                    Pending verification
                                  </span>
                                ) : null}
                                {isSelfDeclaredEducation ? (
                                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-950">
                                    Self Declared
                                  </span>
                                ) : null}
                                {status === 'verified' ? (
                                  <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                                    Verified
                                  </span>
                                ) : null}
                              </div>
                              {isSelfDeclaredEducation ? (
                                <p className="text-xs text-gray-400">via Self Declaration</p>
                              ) : null}
                              {methodLabel ? (
                                <p className="text-xs font-medium text-gray-600">
                                  Verification method: <span className="text-gray-900">{methodLabel}</span>
                                </p>
                              ) : null}
                            </div>
                          </div>

                          {uploadingEducationIndex === index || pendingWithProof ? (
                            <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                              <HiUpload
                                className={`mt-0.5 h-5 w-5 shrink-0 text-brand-600 ${uploadingEducationIndex === index ? 'animate-pulse' : ''}`}
                                aria-hidden
                              />
                              <div className="min-w-0">
                                {uploadingEducationIndex === index ? (
                                  <p className="text-sm font-medium text-gray-900">Uploading document…</p>
                                ) : (
                                  <>
                                    <p className="text-sm font-medium text-gray-900">Supporting document on file</p>
                                    <p className="mt-0.5 text-xs text-gray-500">
                                      Submitted for review — you can open your upload below.
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                          ) : null}

                          {expanded ? (
                            <div className="space-y-6 border-t border-gray-100 pt-4 sm:pt-5">
                          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                            <div className="sm:col-span-1">
                              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Institution
                              </dt>
                              <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                                {entry.institutionName?.trim() || '—'}
                              </dd>
                            </div>
                            <div className="sm:col-span-1">
                              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                School Type
                              </dt>
                              <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                                {schoolTypeDisplayLabel(entry.schoolType)}
                              </dd>
                            </div>
                            <div className="sm:col-span-1">
                              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Level</dt>
                              <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                                {educationLevelLabel(entry.levelOfEducation)}
                              </dd>
                            </div>
                            <div className="sm:col-span-1">
                              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Qualification
                              </dt>
                              <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                                {educationQualificationDisplay(entry.degreeType)}
                              </dd>
                            </div>
                            <div className="sm:col-span-2">
                              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Field of Study
                              </dt>
                              <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                                {entry.fieldOfStudy?.trim() || '—'}
                              </dd>
                            </div>
                            <div className="sm:col-span-1">
                              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Grade</dt>
                              <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                                {entry.grade?.trim() || '—'}
                              </dd>
                            </div>
                            <div className="sm:col-span-1">
                              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Duration</dt>
                              <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                                {formatEducationDurationLine(entry)}
                              </dd>
                            </div>
                            <div className="sm:col-span-1">
                              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Country</dt>
                              <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                                {entry.country?.trim() || '—'}
                              </dd>
                            </div>
                            {costLine ? (
                              <div className="sm:col-span-1">
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Cost</dt>
                                <dd className="mt-0.5 text-sm font-semibold text-gray-900">{costLine}</dd>
                              </div>
                            ) : null}
                            <div className="sm:col-span-1">
                              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Cost frequency
                              </dt>
                              <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                                {educationPaymentFrequencyLabel(entry.costFrequency)}
                              </dd>
                            </div>
                            {entry.hasLoan ? (
                              <>
                                <div className="sm:col-span-1">
                                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Pending loan
                                  </dt>
                                  <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                                    {loanLine || '—'}
                                  </dd>
                                </div>
                                <div className="sm:col-span-1">
                                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Loan repayment frequency
                                  </dt>
                                  <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                                    {educationPaymentFrequencyLabel(entry.loanRepaymentFrequency)}
                                  </dd>
                                </div>
                              </>
                            ) : null}
                            <div className="sm:col-span-2">
                              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Student verification email
                              </dt>
                              <dd className="mt-0.5 text-sm font-semibold text-gray-900 break-all">
                                {entry.studentVerificationEmail?.trim() || '—'}
                              </dd>
                            </div>
                            <div className="sm:col-span-2">
                              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Scholarships &amp; aid
                              </dt>
                              <dd className="mt-0.5">
                                {scholarshipChips.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {scholarshipChips.map((chip, sci) => (
                                      <span
                                        key={`${eduCardKey}-sch-${chip}-${sci}`}
                                        className={EDU_VERIF_TAG_CHIP_STATIC_CLASS}
                                      >
                                        {chip}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-sm font-semibold text-gray-900">—</span>
                                )}
                              </dd>
                            </div>
                            <div className="sm:col-span-2">
                              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Program description
                              </dt>
                              <dd className="mt-0.5 whitespace-pre-wrap text-sm font-semibold text-gray-900">
                                {entry.programDescription?.trim() || '—'}
                              </dd>
                            </div>
                            <div className="sm:col-span-2">
                              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Coursework / responsibilities
                              </dt>
                              <dd className="mt-0.5">
                                {courseworkChips.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {courseworkChips.map((chip, cci) => (
                                      <span
                                        key={`${eduCardKey}-cw-${chip}-${cci}`}
                                        className={EDU_VERIF_TAG_CHIP_STATIC_CLASS}
                                      >
                                        {chip}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-sm font-semibold text-gray-900">—</span>
                                )}
                              </dd>
                            </div>
                            <div className="sm:col-span-2">
                              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Honors / achievements
                              </dt>
                              <dd className="mt-0.5">
                                {achievementChips.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {achievementChips.map((chip, aci) => (
                                      <span
                                        key={`${eduCardKey}-ach-${chip}-${aci}`}
                                        className={EDU_VERIF_TAG_CHIP_STATIC_CLASS}
                                      >
                                        {chip}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-sm font-semibold text-gray-900">—</span>
                                )}
                              </dd>
                            </div>
                            <div className="sm:col-span-2">
                              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Activities &amp; Societies
                              </dt>
                              <dd className="mt-0.5">
                                {activitiesChips.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {activitiesChips.map((chip, aci) => (
                                      <span
                                        key={`${eduCardKey}-act-${chip}-${aci}`}
                                        className={EDU_VERIF_TAG_CHIP_STATIC_CLASS}
                                      >
                                        {chip}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-sm font-semibold text-gray-900">—</span>
                                )}
                              </dd>
                            </div>
                          </dl>

                          {skillChips.length > 0 ? (
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Skills</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {skillChips.map((chip, ci) => (
                                  <span
                                    key={`${eduCardKey}-${chip}-${ci}`}
                                    className={EDU_VERIF_TAG_CHIP_STATIC_CLASS}
                                  >
                                    {chip}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <div className="mt-6 border-t border-gray-100 pt-5">
                            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                              <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                  Supporting media
                                </dt>
                                <dd className="mt-0.5 text-sm font-semibold text-gray-900 break-all">
                                  {mediaHref ? (
                                    <a
                                      href={mediaHref}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-brand-600 hover:underline"
                                    >
                                      View file
                                    </a>
                                  ) : (
                                    '—'
                                  )}
                                </dd>
                              </div>
                              <div className="hidden sm:block" aria-hidden />
                              <div className="sm:col-span-1">
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                  Verification documents
                                </dt>
                                <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                                  {educationVerificationDocumentsBlock(entry.verificationDocuments)}
                                </dd>
                              </div>
                              <div className="hidden sm:block" aria-hidden />
                              <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                  Verified at
                                </dt>
                                <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                                  {formatEducationVerificationDateTime(entry.verifiedAt)}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                  Reviewed by
                                </dt>
                                <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                                  {entry.reviewedBy?.trim() || '—'}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Created</dt>
                                <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                                  {formatEducationVerificationDateTime(entry.createdAt)}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                  Last updated
                                </dt>
                                <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                                  {formatEducationVerificationDateTime(entry.updatedAt)}
                                </dd>
                              </div>
                            </dl>
                          </div>
                        </div>
                      ) : null}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/50 px-5 py-4 sm:px-6">
                          <div className="flex flex-wrap items-center gap-2">
                            {showVerifyCta ? (
                              <button
                                type="button"
                                onClick={() => openVerifyEducationModal(index)}
                                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                              >
                                <HiShieldCheck className="h-4 w-4" />
                                Verify
                              </button>
                            ) : null}
                            {isSelfDeclaredEducation ? (
                              <button
                                type="button"
                                onClick={() => openVerifyEducationModal(index)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500 bg-white px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
                              >
                                <HiShieldCheck className="h-4 w-4" />
                                Upgrade Verification
                              </button>
                            ) : null}
                            {status === 'verified' && mediaHref ? (
                              <a
                                href={mediaHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-brand-600 hover:bg-gray-50"
                              >
                                View supporting media
                              </a>
                            ) : null}
                            {pendingWithProof && mediaHref && uploadingEducationIndex !== index ? (
                              <a
                                href={mediaHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-brand-600 hover:bg-gray-50"
                              >
                                View uploaded document
                              </a>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => requestRemoveEducationEntry(index)}
                            className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                            aria-label="Remove education"
                          >
                            <HiTrash className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {showEducationAddForm ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="mb-8 flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 ring-1 ring-brand-100">
                      <HiAcademicCap className="h-6 w-6 text-brand-600" aria-hidden />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Add Education</h3>
                      <p className="mt-0.5 text-sm text-gray-500">Enter your qualification details below.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEducationAddFormOpen(false);
                      setEducationDraft(emptyEducation());
                      setEducationSkillInput('');
                      setEducationCourseworkInput('');
                      setEducationScholarshipInput('');
                      setEducationAchievementInput('');
                      setEducationActivitiesInput('');
                      setFormFieldErrors((p) => omitKeysMatching(p, /^edu_draft_/));
                    }}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Institution / School <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={educationDraft.institutionName}
                        onChange={(e) => {
                          updateEducationDraft({ institutionName: e.target.value });
                          clearFormError('edu_draft_institutionName');
                        }}
                        className={`w-full rounded-lg border bg-gray-50 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 ${errB2('edu_draft_institutionName')}`}
                        placeholder="School or institution name"
                      />
                      {fe.edu_draft_institutionName ? (
                        <p className="mt-1 text-sm text-red-600">{fe.edu_draft_institutionName}</p>
                      ) : null}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">School Type</label>
                      <select
                        value={educationDraft.schoolType}
                        onChange={(e) => updateEducationDraft({ schoolType: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                      >
                        {[{ value: '', label: 'Select' }, ...SCHOOL_TYPE_OPTIONS].map((o) => (
                          <option key={o.value || '__school'} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Level</label>
                      <select
                        value={educationDraft.levelOfEducation}
                        onChange={(e) => {
                          updateEducationDraft({ levelOfEducation: e.target.value });
                          clearFormError('edu_draft_levelOfEducation');
                        }}
                        className={`w-full rounded-lg border bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 ${errB2('edu_draft_levelOfEducation')}`}
                      >
                        {[{ value: '', label: 'Select' }, ...EDUCATION_LEVELS].map((o) => (
                          <option key={o.value || '__level'} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {fe.edu_draft_levelOfEducation ? (
                        <p className="mt-1 text-sm text-red-600">{fe.edu_draft_levelOfEducation}</p>
                      ) : null}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Qualification</label>
                      <select
                        value={educationDraft.degreeType}
                        onChange={(e) => {
                          updateEducationDraft({ degreeType: e.target.value });
                          clearFormError('edu_draft_degreeType');
                        }}
                        className={`w-full rounded-lg border bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 ${errB2('edu_draft_degreeType')}`}
                      >
                        {[{ value: '', label: 'Select' }, ...QUALIFICATION_OPTIONS].map((o) => (
                          <option key={o.value || '__deg'} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {fe.edu_draft_degreeType ? (
                        <p className="mt-1 text-sm text-red-600">{fe.edu_draft_degreeType}</p>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Field of Study</label>
                    <input
                      type="text"
                      value={educationDraft.fieldOfStudy}
                      onChange={(e) => {
                        updateEducationDraft({ fieldOfStudy: e.target.value });
                        clearFormError('edu_draft_fieldOfStudy');
                      }}
                      className={`w-full rounded-lg border bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 ${errB2('edu_draft_fieldOfStudy')}`}
                      placeholder="e.g. Computer Science, Medicine, Law…"
                    />
                    {fe.edu_draft_fieldOfStudy ? (
                      <p className="mt-1 text-sm text-red-600">{fe.edu_draft_fieldOfStudy}</p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-x-6">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Country</label>
                      <select
                        value={educationDraft.country}
                        onChange={(e) => {
                          updateEducationDraft({ country: e.target.value });
                          clearFormError('edu_draft_country');
                        }}
                        className={`w-full rounded-lg border bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 ${errB2('edu_draft_country')}`}
                      >
                        {[{ value: '', label: 'Select' }, ...COUNTRIES.map((c) => ({ value: c, label: c }))].map((o) => (
                          <option key={o.value || '__edu_country'} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {fe.edu_draft_country ? <p className="mt-1 text-sm text-red-600">{fe.edu_draft_country}</p> : null}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Grade <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={educationDraft.grade}
                        onChange={(e) => {
                          updateEducationDraft({ grade: e.target.value });
                          clearFormError('edu_draft_grade');
                        }}
                        className={`w-full rounded-lg border bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 ${errB2('edu_draft_grade')}`}
                        placeholder="e.g. First Class, 3.8 GPA"
                      />
                      {fe.edu_draft_grade ? <p className="mt-1 text-sm text-red-600">{fe.edu_draft_grade}</p> : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-x-6">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Start Date</label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={educationDraft.startMonth}
                          onChange={(e) => {
                            updateEducationDraft({ startMonth: e.target.value });
                            clearFormError('edu_draft_startDate');
                          }}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                        >
                          {[{ value: '', label: 'Month' }, ...MONTH_OPTIONS].map((o) => (
                            <option key={o.value || '__sm'} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={educationDraft.startYear}
                          onChange={(e) => {
                            updateEducationDraft({ startYear: e.target.value });
                            clearFormError('edu_draft_startDate');
                          }}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                        >
                          {[{ value: '', label: 'Year' }, ...EDUCATION_YEAR_OPTIONS].map((o) => (
                            <option key={o.value || '__sy'} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {fe.edu_draft_startDate ? (
                        <p className="mt-1 text-sm text-red-600">{fe.edu_draft_startDate}</p>
                      ) : null}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        End Date / Expected End Date
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={educationDraft.endMonth}
                          onChange={(e) => {
                            updateEducationDraft({ endMonth: e.target.value });
                            clearFormError('edu_draft_endDate');
                          }}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                        >
                          {[{ value: '', label: 'Month' }, ...MONTH_OPTIONS].map((o) => (
                            <option key={o.value || '__em'} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={educationDraft.endYear}
                          onChange={(e) => {
                            updateEducationDraft({ endYear: e.target.value });
                            clearFormError('edu_draft_endDate');
                          }}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                        >
                          {[{ value: '', label: 'Year' }, ...EDUCATION_YEAR_OPTIONS].map((o) => (
                            <option key={o.value || '__ey'} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {fe.edu_draft_endDate ? (
                        <p className="mt-1 text-sm text-red-600">{fe.edu_draft_endDate}</p>
                      ) : null}
                      <label className="mt-3 flex cursor-pointer select-none items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={educationDraft.expectedEndOngoing}
                          onChange={(e) => updateEducationDraft({ expectedEndOngoing: e.target.checked })}
                          className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        />
                        This is an expected end date (ongoing)
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-x-6">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Cost of Education</label>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                        <div className="w-full shrink-0 sm:w-36">
                          <select
                            value={educationDraft.currency}
                            onChange={(e) => updateEducationDraft({ currency: e.target.value })}
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                          >
                            {EDUCATION_CURRENCY_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={educationDraft.costOfEducation}
                          onChange={(e) => {
                            updateEducationDraft({ costOfEducation: e.target.value });
                            clearFormError('edu_draft_costOfEducation');
                          }}
                          className={`min-w-0 flex-1 rounded-lg border bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 ${errB2('edu_draft_costOfEducation')}`}
                          placeholder="0.00"
                        />
                      </div>
                      {fe.edu_draft_costOfEducation ? (
                        <p className="mt-1 text-sm text-red-600">{fe.edu_draft_costOfEducation}</p>
                      ) : null}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Cost frequency</label>
                      <select
                        value={educationDraft.costFrequency}
                        onChange={(e) => updateEducationDraft({ costFrequency: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                      >
                        {[{ value: '', label: 'Select' }, ...EDUCATION_PAYMENT_FREQUENCY_OPTIONS].map((o) => (
                          <option key={o.value || '__cf'} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">How the cost amount recurs, if applicable.</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-3 sm:px-4">
                        <input
                          type="checkbox"
                          checked={!!educationDraft.hasLoan}
                          onChange={(e) => {
                            const on = e.target.checked;
                            updateEducationDraft(
                              on
                                ? { hasLoan: true }
                                : {
                                    hasLoan: false,
                                    pendingLoanAmount: '',
                                    loanRepaymentFrequency: '',
                                  },
                            );
                            clearFormError('edu_draft_pendingLoanAmount');
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-gray-900">I have a pending study loan</span>
                          <span className="mt-0.5 block text-xs text-gray-500">
                            Turn on to enter loan amount and repayment frequency.
                          </span>
                        </span>
                      </label>
                    </div>
                    {educationDraft.hasLoan ? (
                      <>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700">Pending Loan</label>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                            <div className="w-full shrink-0 sm:w-36">
                              <select
                                value={educationDraft.loanCurrency}
                                onChange={(e) => updateEducationDraft({ loanCurrency: e.target.value })}
                                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                              >
                                {EDUCATION_CURRENCY_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={educationDraft.pendingLoanAmount}
                              onChange={(e) => {
                                updateEducationDraft({ pendingLoanAmount: e.target.value });
                                clearFormError('edu_draft_pendingLoanAmount');
                              }}
                              className={`min-w-0 flex-1 rounded-lg border bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 ${errB2('edu_draft_pendingLoanAmount')}`}
                              placeholder="0.00"
                            />
                          </div>
                          {fe.edu_draft_pendingLoanAmount ? (
                            <p className="mt-1 text-sm text-red-600">{fe.edu_draft_pendingLoanAmount}</p>
                          ) : null}
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700">
                            Loan repayment frequency
                          </label>
                          <select
                            value={educationDraft.loanRepaymentFrequency}
                            onChange={(e) => updateEducationDraft({ loanRepaymentFrequency: e.target.value })}
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                          >
                            {[{ value: '', label: 'Select' }, ...EDUCATION_PAYMENT_FREQUENCY_OPTIONS].map((o) => (
                              <option key={o.value || '__lrf'} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          <p className="mt-1 text-xs text-gray-500">How often you repay this loan.</p>
                        </div>
                      </>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Student verification email <span className="font-normal text-gray-500">(optional)</span>
                    </label>
                    <input
                      type="email"
                      autoComplete="email"
                      value={educationDraft.studentVerificationEmail ?? ''}
                      onChange={(e) => {
                        updateEducationDraft({ studentVerificationEmail: e.target.value });
                        clearFormError('edu_draft_studentVerificationEmail');
                      }}
                      className={`w-full rounded-lg border bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 ${errB2('edu_draft_studentVerificationEmail')}`}
                      placeholder="Institution email for student verification"
                    />
                    {fe.edu_draft_studentVerificationEmail ? (
                      <p className="mt-1 text-sm text-red-600">{fe.edu_draft_studentVerificationEmail}</p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500">
                        Saved on your record. You can also enter it when you choose “Student email” verification.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Scholarships &amp; aid</label>
                    {educationDraftScholarshipChips.length > 0 ? (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {educationDraftScholarshipChips.map((chip, chipIdx) => (
                          <span key={`sch-${chip}-${chipIdx}`} className={EDU_VERIF_TAG_CHIP_CLASS}>
                            {chip}
                            <button
                              type="button"
                              onClick={() => removeEducationDraftScholarship(chip)}
                              className={EDU_VERIF_TAG_CHIP_REMOVE_BTN_CLASS}
                              aria-label={`Remove ${chip}`}
                            >
                              <HiX className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <input
                      type="text"
                      value={educationScholarshipInput}
                      onChange={(e) => setEducationScholarshipInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addEducationDraftScholarship();
                        }
                      }}
                      className={EDU_VERIF_TAG_INPUT_CLASS}
                      placeholder="Scholarships, grants, bursaries, employer sponsorship…"
                    />
                    <p className="mt-1 text-xs text-gray-500">Press Enter to add each item.</p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Program description</label>
                    <textarea
                      value={educationDraft.programDescription}
                      onChange={(e) => updateEducationDraft({ programDescription: e.target.value })}
                      rows={4}
                      className="min-h-[104px] w-full resize-y rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                      placeholder="Overview of the program, credits, structure…"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Coursework / responsibilities
                    </label>
                    {educationDraftCourseworkChips.length > 0 ? (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {educationDraftCourseworkChips.map((chip, chipIdx) => (
                          <span key={`cw-${chip}-${chipIdx}`} className={EDU_VERIF_TAG_CHIP_CLASS}>
                            {chip}
                            <button
                              type="button"
                              onClick={() => removeEducationDraftCoursework(chip)}
                              className={EDU_VERIF_TAG_CHIP_REMOVE_BTN_CLASS}
                              aria-label={`Remove ${chip}`}
                            >
                              <HiX className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <input
                      type="text"
                      value={educationCourseworkInput}
                      onChange={(e) => setEducationCourseworkInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addEducationDraftCoursework();
                        }
                      }}
                      className={EDU_VERIF_TAG_INPUT_CLASS}
                      placeholder="e.g. Data Structures lab, Thesis supervision…"
                    />
                    <p className="mt-1 text-xs text-gray-500">Press Enter to add each item.</p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Honors / achievements</label>
                    {educationDraftAchievementChips.length > 0 ? (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {educationDraftAchievementChips.map((chip, chipIdx) => (
                          <span key={`ach-${chip}-${chipIdx}`} className={EDU_VERIF_TAG_CHIP_CLASS}>
                            {chip}
                            <button
                              type="button"
                              onClick={() => removeEducationDraftAchievement(chip)}
                              className={EDU_VERIF_TAG_CHIP_REMOVE_BTN_CLASS}
                              aria-label={`Remove ${chip}`}
                            >
                              <HiX className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <input
                      type="text"
                      value={educationAchievementInput}
                      onChange={(e) => setEducationAchievementInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addEducationDraftAchievement();
                        }
                      }}
                      className={EDU_VERIF_TAG_INPUT_CLASS}
                      placeholder="Dean’s list, awards, competitions, publications…"
                    />
                    <p className="mt-1 text-xs text-gray-500">Press Enter to add each item.</p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Activities &amp; Societies
                    </label>
                    {educationDraftActivitiesChips.length > 0 ? (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {educationDraftActivitiesChips.map((chip, chipIdx) => (
                          <span key={`act-${chip}-${chipIdx}`} className={EDU_VERIF_TAG_CHIP_CLASS}>
                            {chip}
                            <button
                              type="button"
                              onClick={() => removeEducationDraftActivities(chip)}
                              className={EDU_VERIF_TAG_CHIP_REMOVE_BTN_CLASS}
                              aria-label={`Remove ${chip}`}
                            >
                              <HiX className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <input
                      type="text"
                      value={educationActivitiesInput}
                      onChange={(e) => setEducationActivitiesInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addEducationDraftActivities();
                        }
                      }}
                      className={EDU_VERIF_TAG_INPUT_CLASS}
                      placeholder="Clubs, sports, volunteer work, etc."
                    />
                    <p className="mt-1 text-xs text-gray-500">Press Enter to add each item.</p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Associated Skills</label>
                    {educationDraftSkillChips.length > 0 ? (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {educationDraftSkillChips.map((chip, chipIdx) => (
                          <span key={`${chip}-${chipIdx}`} className={EDU_VERIF_TAG_CHIP_CLASS}>
                            {chip}
                            <button
                              type="button"
                              onClick={() => removeEducationDraftSkill(chip)}
                              className={EDU_VERIF_TAG_CHIP_REMOVE_BTN_CLASS}
                              aria-label={`Remove ${chip}`}
                            >
                              <HiX className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <input
                      type="text"
                      value={educationSkillInput}
                      onChange={(e) => setEducationSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addEducationDraftSkill();
                        }
                      }}
                      className={EDU_VERIF_TAG_INPUT_CLASS}
                      placeholder="Type to search skills or add custom…"
                    />
                    <p className="mt-1 text-xs text-gray-500">Press Enter to add a skill.</p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Supporting Media</label>
                    <input
                      type="url"
                      value={educationDraft.supportingMediaUrl}
                      onChange={(e) => {
                        updateEducationDraft({ supportingMediaUrl: e.target.value });
                        clearFormError('edu_draft_supportingMediaUrl');
                      }}
                      className={`w-full rounded-lg border bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 ${errB2('edu_draft_supportingMediaUrl')}`}
                      placeholder="URL to certificate, transcript, or media file"
                    />
                    {fe.edu_draft_supportingMediaUrl ? (
                      <p className="mt-1 text-sm text-red-600">{fe.edu_draft_supportingMediaUrl}</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-8 border-t border-gray-100 pt-6">
                  <button
                    type="button"
                    onClick={commitEducationDraft}
                    disabled={educationSaving}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    <HiPlus className="h-4 w-4" />
                    {educationSaving ? 'Saving...' : 'Add Data'}
                  </button>
                </div>
              </div>
              ) : educationEntriesList.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-14 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gray-100 bg-white shadow-sm">
                    <HiAcademicCap className="h-7 w-7 text-brand-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-800">No education added yet</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Add your schools and qualifications to complete this step.
                  </p>
                  <button
                    type="button"
                    onClick={() => setEducationAddFormOpen(true)}
                    className="mt-6 inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-800"
                  >
                    <HiPlus className="w-4 h-4 text-brand-600" />
                    Add new education
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEducationAddFormOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-800"
                >
                  <HiPlus className="w-4 h-4 text-brand-600" />
                  Add new education
                </button>
              )}

            </div>
          )}

          {activeTab === 'work' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {verificationStatus.work?.verified ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Verified
                  </span>
                ) : verificationStatus.work?.completed ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Pending verification
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Not completed
                  </span>
                )}
              </div>

              {fe.work_list && <p className="text-sm text-red-600">{fe.work_list}</p>}

              <div className="space-y-6">
                {workEntriesList.map((entry, index) => {
                  const status = entry.workVerificationStatus ?? 'pending';
                  const org = entry.organisationName?.trim() || '';
                  const role = entry.role?.trim() || '';
                  const headerTitle = role || org || 'Work experience';
                  const headerSubtitle = formatWorkExperienceHeaderSubtitle(entry);
                  const tenureYears = workTenureYearsAtOrganisation(entry);
                  const roleTimelineRows = entry.workRoles.filter((r) => r.title?.trim());
                  const skillTags = workAssociatedSkillTags(entry);
                  const workRowErrs = Object.entries(fe).filter(([k]) => k.startsWith(`work_${index}_`));
                  const workCardKey = entry.id ? String(entry.id) : `tmp-${index}`;
                  const expanded = workCardExpanded[workCardKey] === true;
                  const workMethodLabel = workVerificationMethodLabel(entry);
                  /** Cream strip only while self-declared and still pending (hidden once verified). */
                  const showSelfDeclStrip = entry.selfDeclared && status === 'pending';
                  const workSupportingUrl = entry.supportingMediaUrl?.trim() || '';
                  const workSupportingHref = workSupportingUrl
                    ? workSupportingUrl.startsWith('http')
                      ? workSupportingUrl
                      : `${api.defaults.baseURL || ''}${workSupportingUrl}`
                    : null;
                  const showWorkViewFileButton =
                    !!workSupportingHref && (status === 'pending' || status === 'verified');

                  return (
                    <div key={entry.id ?? `work-${index}`} className="space-y-3">
                      {workRowErrs.length > 0 && (
                        <ul className="list-disc space-y-0.5 pl-5 text-sm text-red-600">
                          {workRowErrs.map(([k, msg]) => (
                            <li key={k}>{msg}</li>
                          ))}
                        </ul>
                      )}

                      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                        {showSelfDeclStrip ? (
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/80 bg-[#fffbeb] px-4 py-3.5 sm:px-6">
                            <div className="flex min-w-0 items-start gap-3">
                              <HiExclamationCircle
                                className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
                                aria-hidden
                              />
                              <p className="text-sm font-medium leading-snug text-amber-950">
                                Self Declaration — limited network access. Upgrade to full verification.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => openVerifyWorkModal(index)}
                              className="inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-amber-800/25 bg-white px-3 py-2 text-sm font-semibold text-amber-950 shadow-sm hover:bg-amber-50"
                            >
                              <span
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-amber-800/30"
                                aria-hidden
                              >
                                <HiArrowUp className="h-3.5 w-3.5" />
                              </span>
                              Upgrade Verification
                            </button>
                          </div>
                        ) : null}

                        <div className="space-y-4 p-5 sm:p-6">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
                              <button
                                type="button"
                                onClick={() =>
                                  setWorkCardExpanded((prev) => ({
                                    ...prev,
                                    [workCardKey]: !(prev[workCardKey] === true),
                                  }))
                                }
                                className="mt-1 shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                                aria-expanded={expanded}
                                aria-label={expanded ? 'Collapse details' : 'Expand details'}
                              >
                                <HiChevronDown
                                  className={`h-5 w-5 transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`}
                                  aria-hidden
                                />
                              </button>
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 ring-1 ring-brand-100">
                                <HiBriefcase className="h-6 w-6 text-brand-600" aria-hidden />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-lg font-semibold leading-tight text-gray-900">{headerTitle}</p>
                                <p className="mt-1 text-sm text-gray-500">{headerSubtitle}</p>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                              <div className="flex flex-wrap gap-1.5 sm:justify-end">
                                {status === 'pending' && !entry.selfDeclared ? (
                                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
                                    Pending verification
                                  </span>
                                ) : null}
                                {entry.selfDeclared && status === 'pending' ? (
                                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-950">
                                    Self Declared
                                  </span>
                                ) : null}
                                {status === 'verified' ? (
                                  <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                                    Verified
                                  </span>
                                ) : null}
                              </div>
                              {entry.selfDeclared && status === 'pending' ? (
                                <p className="text-xs text-gray-400">via Self Declaration</p>
                              ) : null}
                              {workMethodLabel && !entry.selfDeclared ? (
                                <p className="text-xs font-medium text-gray-600">
                                  Verification method:{' '}
                                  <span className="text-gray-900">{workMethodLabel}</span>
                                </p>
                              ) : null}
                            </div>
                          </div>

                          {expanded ? (
                            <div className="space-y-5 border-t border-gray-100 pt-4 sm:pt-5">
                              {tenureYears != null ? (
                                <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                                  <HiClock className="h-4 w-4 shrink-0" aria-hidden />
                                  {tenureYears.toFixed(1)} years at this organisation
                                </p>
                              ) : null}
                              {roleTimelineRows.length > 0 ? (
                                <div className="space-y-3">
                                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Roles
                                  </p>
                                  <ul className="flow-root">
                                    {roleTimelineRows.map((roleRow, ri) => (
                                      <li
                                        key={`${entry.id ?? index}-role-${ri}`}
                                        className="relative pb-6 last:pb-0"
                                      >
                                        {ri < roleTimelineRows.length - 1 ? (
                                          <div
                                            className="absolute left-[11px] top-5 bottom-0 w-px bg-gray-200"
                                            aria-hidden
                                          />
                                        ) : null}
                                        <div className="relative flex gap-3">
                                          <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-brand-200 bg-white">
                                            <span className="h-2 w-2 rounded-full bg-brand-600" aria-hidden />
                                          </div>
                                          <div className="min-w-0 flex-1 pt-0.5">
                                            <p className="text-sm font-semibold text-gray-900">
                                              {roleRow.title}
                                              {ri === 0 ? (
                                                <span className="ml-2 text-xs font-normal uppercase tracking-wide text-gray-400">
                                                  Primary
                                                </span>
                                              ) : null}
                                            </p>
                                            <p className="mt-0.5 text-sm text-gray-500">
                                              {formatWorkRoleDateRange(roleRow)}
                                            </p>
                                          </div>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Remuneration
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-gray-900">
                                    {formatWorkRemunerationLine(entry)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Other compensation
                                  </p>
                                  {(() => {
                                    const tags = (entry.otherCompensation ?? [])
                                      .map((p) => p?.trim())
                                      .filter(Boolean);
                                    if (tags.length > 0) {
                                      return (
                                        <div className="mt-1 flex flex-wrap gap-2">
                                          {tags.map((t) => (
                                            <span
                                              key={`${entry.id ?? index}-oc-${t}`}
                                              className={EDU_VERIF_TAG_CHIP_STATIC_CLASS}
                                            >
                                              {t}
                                            </span>
                                          ))}
                                        </div>
                                      );
                                    }
                                    return (
                                      <p className="mt-1 text-sm font-semibold text-gray-900">
                                        {formatWorkCompensationSummary(entry)}
                                      </p>
                                    );
                                  })()}
                                </div>
                              </div>
                              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                                <p className="text-xs font-medium text-gray-500">Job description</p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                                  {entry.jobDescription?.trim() ? entry.jobDescription.trim() : '—'}
                                </p>
                              </div>
                              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                                <p className="text-xs font-medium text-gray-500">Responsibilities</p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                                  {entry.responsibilitiesText?.trim()
                                    ? entry.responsibilitiesText.trim()
                                    : '—'}
                                </p>
                              </div>
                              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                                <p className="text-xs font-medium text-gray-500">Achievements</p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                                  {entry.achievementsText?.trim()
                                    ? entry.achievementsText.trim()
                                    : '—'}
                                </p>
                              </div>
                              {skillTags.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {skillTags.map((t) => (
                                    <span
                                      key={`${entry.id ?? index}-${t}`}
                                      className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 ring-1 ring-brand-100"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/50 px-5 py-4 sm:px-6">
                          <div className="flex flex-wrap items-center gap-2">
                            {showWorkViewFileButton && workSupportingHref ? (
                              <a
                                href={workSupportingHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-brand-600 hover:bg-gray-50"
                              >
                                <HiDocumentText className="h-4 w-4" aria-hidden />
                                View file
                              </a>
                            ) : null}
                            {status === 'pending' && !showWorkViewFileButton ? (
                              <button
                                type="button"
                                onClick={() => openVerifyWorkModal(index)}
                                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                              >
                                <HiShieldCheck className="h-4 w-4" />
                                Verify
                              </button>
                            ) : null}
                            {showSelfDeclStrip ? (
                              <button
                                type="button"
                                onClick={() => openVerifyWorkModal(index)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500 bg-white px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
                              >
                                <HiShieldCheck className="h-4 w-4" />
                                Upgrade Verification
                              </button>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => requestRemoveWorkEntry(index)}
                            className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                            aria-label="Remove work experience"
                          >
                            <HiTrash className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {showWorkAddForm ? (
                <div className={workEntriesList.length > 0 ? 'mt-6 border-t border-gray-200 pt-6' : ''}>
                  <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
                    <div className="mb-8 flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 ring-1 ring-brand-100">
                          <HiBriefcase className="h-6 w-6 text-brand-600" aria-hidden />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Add Work Experience</h3>
                          <p className="mt-0.5 text-sm text-gray-500">
                            Enter your role and employer details below.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setWorkAddFormOpen(false);
                          setWorkDraft(emptyWork());
                          setWorkSkillInput('');
                          setFormFieldErrors((p) => omitKeysMatching(p, /^work_draft_/));
                        }}
                        className="text-sm font-medium text-gray-600 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="space-y-8">
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700">Organisation</label>
                          <input
                            type="text"
                            value={workDraft.organisationName}
                            onChange={(e) => {
                              updateWorkDraft({ organisationName: e.target.value });
                              clearFormError('work_draft_organisationName');
                            }}
                            className={`w-full rounded-lg border bg-gray-50 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 ${errB2('work_draft_organisationName')}`}
                            placeholder="Company or organisation name"
                          />
                          {fe.work_draft_organisationName ? (
                            <p className="mt-1 text-sm text-red-600">{fe.work_draft_organisationName}</p>
                          ) : null}
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700">Industry</label>
                          <input
                            type="text"
                            value={workDraft.industry}
                            onChange={(e) => {
                              updateWorkDraft({ industry: e.target.value });
                              clearFormError('work_draft_industry');
                            }}
                            className={`w-full rounded-lg border bg-gray-50 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 ${errB2('work_draft_industry')}`}
                            placeholder="Industry or sector"
                          />
                          {fe.work_draft_industry ? (
                            <p className="mt-1 text-sm text-red-600">{fe.work_draft_industry}</p>
                          ) : null}
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700">Employment Type</label>
                          <select
                            value={workDraft.employmentType}
                            onChange={(e) => {
                              updateWorkDraft({ employmentType: e.target.value });
                              clearFormError('work_draft_employmentType');
                            }}
                            className={`w-full rounded-lg border bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 ${errB2('work_draft_employmentType')}`}
                          >
                            {[
                              { value: '', label: 'Select' },
                              { value: 'full_time', label: 'Full-time' },
                              { value: 'part_time', label: 'Part-time' },
                              { value: 'contract', label: 'Contract' },
                              { value: 'internship', label: 'Internship' },
                            ].map((o) => (
                              <option key={o.value || '__emp'} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          {fe.work_draft_employmentType ? (
                            <p className="mt-1 text-sm text-red-600">{fe.work_draft_employmentType}</p>
                          ) : null}
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700">Work Mode</label>
                          <select
                            value={workDraft.workMode}
                            onChange={(e) => {
                              updateWorkDraft({ workMode: e.target.value });
                              clearFormError('work_draft_workMode');
                            }}
                            className={`w-full rounded-lg border bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 ${errB2('work_draft_workMode')}`}
                          >
                            {[
                              { value: '', label: 'Select' },
                              { value: 'global_remote', label: 'Global Remote' },
                              { value: 'remote', label: 'Location Remote' },
                              { value: 'hybrid', label: 'Hybrid' },
                              { value: 'on_site', label: 'Onsite' },
                            ].map((o) => (
                              <option key={o.value || '__wm'} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          {fe.work_draft_workMode ? (
                            <p className="mt-1 text-sm text-red-600">{fe.work_draft_workMode}</p>
                          ) : null}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">Remuneration</label>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,7rem)_1fr_minmax(0,9rem)]">
                          <select
                            value={workDraft.currency}
                            onChange={(e) => updateWorkDraft({ currency: e.target.value })}
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                          >
                            {EDUCATION_CURRENCY_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={workDraft.salary}
                            onChange={(e) => {
                              updateWorkDraft({ salary: e.target.value });
                              clearFormError('work_draft_salary');
                            }}
                            className={`min-w-0 rounded-lg border bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 ${errB2('work_draft_salary')}`}
                            placeholder="0.00"
                          />
                          <select
                            value={workDraft.salaryFrequency}
                            onChange={(e) => updateWorkDraft({ salaryFrequency: e.target.value })}
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                          >
                            {WORK_SALARY_FREQUENCY_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        {fe.work_draft_salary ? (
                          <p className="mt-1 text-sm text-red-600">{fe.work_draft_salary}</p>
                        ) : null}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Other Compensation
                        </label>
                        {workDraft.otherCompensation.length > 0 ? (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {workDraft.otherCompensation.map((chip, chipIdx) => (
                              <span key={`oc-${chip}-${chipIdx}`} className={EDU_VERIF_TAG_CHIP_CLASS}>
                                {chip}
                                <button
                                  type="button"
                                  onClick={() => removeWorkDraftOtherCompensation(chip)}
                                  className={EDU_VERIF_TAG_CHIP_REMOVE_BTN_CLASS}
                                  aria-label={`Remove ${chip}`}
                                >
                                  <HiX className="h-3.5 w-3.5" aria-hidden />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <input
                          type="text"
                          value={workDraft.otherCompensationInput}
                          onChange={(e) => updateWorkDraft({ otherCompensationInput: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addWorkDraftOtherCompensation();
                            }
                          }}
                          className={EDU_VERIF_TAG_INPUT_CLASS}
                          placeholder="Stock options, bonus, HMO, etc."
                        />
                        <p className="mt-1 text-xs text-gray-500">Press Enter to add each item.</p>
                      </div>

                      <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-5 sm:p-6">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold text-gray-900">Roles / Role Progression</h4>
                          <button
                            type="button"
                            onClick={addWorkDraftRole}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
                          >
                            <HiPlus className="h-4 w-4" aria-hidden />
                            Add Role
                          </button>
                        </div>
                        <div className="space-y-4">
                          {workDraft.workRoles.map((roleRow, ri) => {
                            const titleKey = ri === 0 ? 'work_draft_role0_title' : '';
                            const startKey = `work_draft_role${ri}_startDate`;
                            const endKey = `work_draft_role${ri}_endDate`;
                            return (
                              <div
                                key={ri}
                                className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm"
                              >
                                <div className="mb-3 flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium text-gray-800">Role {ri + 1}</span>
                                  {workDraft.workRoles.length > 1 ? (
                                    <button
                                      type="button"
                                      onClick={() => removeWorkDraftRole(ri)}
                                      className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700"
                                    >
                                      <HiX className="h-4 w-4" aria-hidden />
                                      Remove
                                    </button>
                                  ) : null}
                                </div>
                                <div className="space-y-4">
                                  <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Title</label>
                                    <input
                                      type="text"
                                      value={roleRow.title}
                                      onChange={(e) => {
                                        updateWorkDraftRole(ri, { title: e.target.value });
                                        if (titleKey) clearFormError(titleKey);
                                      }}
                                      className={`w-full rounded-lg border bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 ${
                                        titleKey ? errB2(titleKey) : 'border-gray-200'
                                      }`}
                                      placeholder="Job title"
                                    />
                                    {titleKey && fe[titleKey] ? (
                                      <p className="mt-1 text-sm text-red-600">{fe[titleKey]}</p>
                                    ) : null}
                                  </div>
                                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                        Start Date
                                      </label>
                                      <input
                                        type="date"
                                        value={roleRow.startDate}
                                        onChange={(e) => {
                                          updateWorkDraftRole(ri, { startDate: e.target.value });
                                          clearFormError(startKey);
                                        }}
                                        className={`w-full rounded-lg border bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 ${errB2(startKey)}`}
                                      />
                                      {fe[startKey] ? (
                                        <p className="mt-1 text-sm text-red-600">{fe[startKey]}</p>
                                      ) : null}
                                    </div>
                                    <div>
                                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                        End Date
                                      </label>
                                      <input
                                        type="date"
                                        value={roleRow.endDate}
                                        disabled={roleRow.currentlyWorking}
                                        onChange={(e) => {
                                          updateWorkDraftRole(ri, { endDate: e.target.value });
                                          clearFormError(endKey);
                                        }}
                                        className={`w-full rounded-lg border bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 disabled:opacity-60 ${errB2(endKey)}`}
                                      />
                                      {fe[endKey] ? (
                                        <p className="mt-1 text-sm text-red-600">{fe[endKey]}</p>
                                      ) : null}
                                    </div>
                                  </div>
                                  <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-gray-700">
                                    <input
                                      type="checkbox"
                                      checked={roleRow.currentlyWorking}
                                      onChange={(e) =>
                                        updateWorkDraftRole(ri, {
                                          currentlyWorking: e.target.checked,
                                          endDate: e.target.checked ? '' : roleRow.endDate,
                                        })
                                      }
                                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    Currently working here
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {fe.work_draft_workRoles ? (
                          <p className="mt-3 text-sm text-red-600">{fe.work_draft_workRoles}</p>
                        ) : null}
                      </div>

                      <div className="space-y-5">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700">Job Description</label>
                          <textarea
                            value={workDraft.jobDescription}
                            onChange={(e) => updateWorkDraft({ jobDescription: e.target.value })}
                            rows={5}
                            className="min-h-[120px] w-full resize-y rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                            placeholder="Summarise the role and scope…"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700">Responsibilities</label>
                          <textarea
                            value={workDraft.responsibilitiesText}
                            onChange={(e) => updateWorkDraft({ responsibilitiesText: e.target.value })}
                            rows={5}
                            className="min-h-[120px] w-full resize-y rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                            placeholder="Key duties and outcomes…"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700">Achievements</label>
                          <textarea
                            value={workDraft.achievementsText}
                            onChange={(e) => updateWorkDraft({ achievementsText: e.target.value })}
                            rows={5}
                            className="min-h-[120px] w-full resize-y rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                            placeholder="Impact, metrics, recognition…"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">Associated Skills</label>
                        {workDraftSkillChips.length > 0 ? (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {workDraftSkillChips.map((chip, chipIdx) => (
                              <span
                                key={`work-skill-${chip}-${chipIdx}`}
                                className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 ring-1 ring-brand-100"
                              >
                                {chip}
                                <button
                                  type="button"
                                  onClick={() => removeWorkDraftSkill(chip)}
                                  className="rounded-full p-0.5 text-brand-700 hover:bg-brand-100"
                                  aria-label={`Remove ${chip}`}
                                >
                                  <HiX className="h-3.5 w-3.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <input
                          type="text"
                          value={workSkillInput}
                          onChange={(e) => setWorkSkillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addWorkDraftSkill();
                            }
                          }}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                          placeholder="Type to search skills or add custom…"
                        />
                        <p className="mt-1 text-xs text-gray-500">Press Enter to add a skill.</p>
                      </div>
                    </div>

                    <div className="mt-8 border-t border-gray-100 pt-6">
                      <button
                        type="button"
                        onClick={commitWorkDraft}
                        disabled={workSaving}
                        className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
                      >
                        <HiPlus className="h-4 w-4" aria-hidden />
                        {workSaving ? 'Saving…' : 'Add Data'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : workEntriesList.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-14 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gray-100 bg-white shadow-sm">
                    <HiBriefcase className="h-7 w-7 text-brand-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-800">No work experience added yet</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Add your roles and employers to complete this step.
                  </p>
                  <button
                    type="button"
                    onClick={() => setWorkAddFormOpen(true)}
                    className="mt-6 inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-800"
                  >
                    <HiPlus className="w-4 h-4 text-brand-600" />
                    Add new work experience
                  </button>
                </div>
              ) : (
                <div className="border-t border-gray-200 pt-6">
                  <button
                    type="button"
                    onClick={() => setWorkAddFormOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-800"
                  >
                    <HiPlus className="h-4 w-4 text-brand-600" />
                    Add more data
                  </button>
                </div>
              )}

            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {verificationStatus.projects?.verified ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Verified
                  </span>
                ) : verificationStatus.projects?.completed ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Pending verification
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Not completed
                  </span>
                )}
              </div>

              {fe.proj_list && <p className="text-sm text-red-600">{fe.proj_list}</p>}

              <div className="space-y-6">
                {projectsList.map((entry, index) => {
                  const status = entry.projectVerificationStatus ?? 'pending';
                  const statusVerified = status === 'verified';
                  const isSelfDeclaredProject = projectEntryIsSelfDeclared(entry);
                  const methodSubtext = projectVerificationSubtext(entry);
                  const projRowErrs = Object.entries(fe).filter(([k]) => k.startsWith(`proj_${index}_`));
                  const teamRows = entry.teamMembers.filter((m) => m.name.trim() || m.role.trim());
                  const linkTrim = entry.projectLink?.trim() ?? '';
                  const linkHref = linkTrim
                    ? linkTrim.startsWith('http')
                      ? linkTrim
                      : `https://${linkTrim}`
                    : '';
                  const showSelfDeclBanner = isSelfDeclaredProject;
                  const showVerifyCta = status === 'pending' && !isSelfDeclaredProject;
                  return (
                    <div key={entry.id ?? `proj-${index}`} className="space-y-3">
                      {projRowErrs.length > 0 && (
                        <ul className="list-disc space-y-0.5 pl-5 text-sm text-red-600">
                          {projRowErrs.map(([k, msg]) => (
                            <li key={k}>{msg}</li>
                          ))}
                        </ul>
                      )}

                      {statusVerified ? (
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                          <div className="space-y-4 p-5 sm:p-6">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex min-w-0 gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 ring-1 ring-brand-100">
                                  <HiFolder className="h-6 w-6 text-brand-600" aria-hidden />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-lg font-semibold leading-tight text-gray-900">{entry.title}</p>
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                                  Verified
                                </span>
                                {methodSubtext ? (
                                  <p className="text-xs text-brand-600/85">{methodSubtext}</p>
                                ) : null}
                              </div>
                            </div>
                            {entry.description?.trim() ? (
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.description.trim()}</p>
                            ) : null}
                            {linkTrim ? (
                              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                                <span className="shrink-0 text-sm text-gray-500">Link:</span>
                                <a
                                  href={linkHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="break-all text-sm font-semibold text-gray-900 hover:text-brand-600 sm:text-right"
                                >
                                  {linkTrim}
                                </a>
                              </div>
                            ) : null}
                            {teamRows.length > 0 ? (
                              <div>
                                <p className="text-xs font-medium text-gray-500">Team</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {teamRows.map((m, mi) => (
                                    <span
                                      key={`${entry.id ?? index}-tm-${mi}`}
                                      className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800"
                                    >
                                      {m.name.trim()}
                                      {m.role.trim() ? ` (${m.role.trim()})` : ''}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/50 px-5 py-4 sm:px-6">
                            <button
                              type="button"
                              onClick={() => requestRemoveProjectEntry(index)}
                              className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                              aria-label="Remove project"
                            >
                              <HiTrash className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                          {showSelfDeclBanner ? (
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/80 bg-[#fffbeb] px-4 py-3.5 sm:px-6">
                              <div className="flex min-w-0 items-start gap-3">
                                <HiExclamationCircle
                                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
                                  aria-hidden
                                />
                                <p className="text-sm font-medium leading-snug text-amber-950">
                                  Self Declaration — limited network access. Upgrade to full verification.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => openVerifyProjectModal(index)}
                                className="inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-amber-800/25 bg-white px-3 py-2 text-sm font-semibold text-amber-950 shadow-sm hover:bg-amber-50"
                              >
                                <span
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-amber-800/30"
                                  aria-hidden
                                >
                                  <HiArrowUp className="h-3.5 w-3.5" />
                                </span>
                                Upgrade Verification
                              </button>
                            </div>
                          ) : null}

                          <div
                            className={
                              isSelfDeclaredProject
                                ? 'border-b border-gray-100 p-5 sm:p-6'
                                : 'space-y-4 p-5 sm:p-6'
                            }
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex min-w-0 gap-4">
                                {isSelfDeclaredProject ? (
                                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sky-50 ring-1 ring-sky-100/90">
                                    <HiLocationMarker className="h-6 w-6 text-sky-700" aria-hidden />
                                  </div>
                                ) : (
                                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 ring-1 ring-brand-100">
                                    <HiFolder className="h-6 w-6 text-brand-600" aria-hidden />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-lg font-semibold leading-tight text-gray-900">{entry.title}</p>
                                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                                    {formatProjectCardSubtitle(entry)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                                <div className="flex flex-wrap gap-1.5 sm:justify-end">
                                  {isSelfDeclaredProject ? (
                                    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-950">
                                      Self Declared
                                    </span>
                                  ) : null}
                                  {status === 'pending' && !isSelfDeclaredProject ? (
                                    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
                                      Pending
                                    </span>
                                  ) : null}
                                </div>
                                {isSelfDeclaredProject ? (
                                  <p className="text-xs text-gray-400">via Self Declaration</p>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div
                            className={`flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 sm:px-6 ${
                              isSelfDeclaredProject ? 'bg-white' : 'bg-gray-50/50'
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              {showVerifyCta ? (
                                <button
                                  type="button"
                                  onClick={() => openVerifyProjectModal(index)}
                                  className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                                >
                                  <HiShieldCheck className="h-4 w-4" />
                                  Verify
                                </button>
                              ) : null}
                              {showSelfDeclBanner ? (
                                <button
                                  type="button"
                                  onClick={() => openVerifyProjectModal(index)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500 bg-white px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
                                >
                                  <HiShieldCheck className="h-4 w-4" />
                                  Upgrade Verification
                                </button>
                              ) : null}
                              {linkTrim ? (
                                <a
                                  href={linkHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-brand-600 hover:bg-gray-50"
                                >
                                  Project link
                                </a>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => requestRemoveProjectEntry(index)}
                              className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                              aria-label="Remove project"
                            >
                              <HiTrash className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {showProjectAddForm ? (
                <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <HiFolder className="w-5 h-5 text-brand-600 shrink-0" />
                      <h3 className="text-base font-semibold text-gray-900">Add new project</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProjectAddFormOpen(false);
                        setProjectDraft(emptyProject());
                        setFormFieldErrors((p) => omitKeysMatching(p, /^proj_draft_/));
                      }}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">Project Title</label>
                      <input
                        type="text"
                        value={projectDraft.title}
                        onChange={(e) => {
                          updateProjectDraft({ title: e.target.value });
                          clearFormError('proj_draft_title');
                        }}
                        className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB2('proj_draft_title')}`}
                        placeholder="Project title"
                      />
                      {fe.proj_draft_title ? (
                        <p className="mt-1 text-sm text-red-600">{fe.proj_draft_title}</p>
                      ) : null}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">Project Description</label>
                      <textarea
                        value={projectDraft.description}
                        onChange={(e) => updateProjectDraft({ description: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-y min-h-[100px]"
                        placeholder="Enter project description..."
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">Project Link</label>
                        <input
                          type="url"
                          value={projectDraft.projectLink}
                          onChange={(e) => {
                            updateProjectDraft({ projectLink: e.target.value });
                            clearFormError('proj_draft_projectLink');
                          }}
                          className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB2('proj_draft_projectLink')}`}
                          placeholder="https://..."
                        />
                        {fe.proj_draft_projectLink ? (
                          <p className="mt-1 text-sm text-red-600">{fe.proj_draft_projectLink}</p>
                        ) : null}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">Media URL</label>
                        <input
                          type="url"
                          value={projectDraft.mediaUrl}
                          onChange={(e) => {
                            updateProjectDraft({ mediaUrl: e.target.value });
                            clearFormError('proj_draft_mediaUrl');
                          }}
                          className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB2('proj_draft_mediaUrl')}`}
                          placeholder="Image or video URL"
                        />
                        {fe.proj_draft_mediaUrl ? (
                          <p className="mt-1 text-sm text-red-600">{fe.proj_draft_mediaUrl}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900">Team Members</span>
                      <button
                        type="button"
                        onClick={addProjectDraftMember}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
                      >
                        <HiPlus className="h-4 w-4" />
                        Add Member
                      </button>
                    </div>
                    {projectDraft.teamMembers.map((member, memberIndex) => {
                      const teamKey = `proj_draft_team_${memberIndex}`;
                      return (
                      <div
                        key={memberIndex}
                        className="grid grid-cols-1 md:grid-cols-2 gap-3 md:items-end"
                      >
                        <div>
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => {
                              updateProjectDraftMember(memberIndex, { name: e.target.value });
                              clearFormError(teamKey);
                            }}
                            className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB2(teamKey)}`}
                            placeholder="Name"
                          />
                          {fe[teamKey] ? <p className="mt-1 text-sm text-red-600">{fe[teamKey]}</p> : null}
                        </div>
                        <div className="flex gap-2 items-end">
                          <input
                            type="text"
                            value={member.role}
                            onChange={(e) => {
                              updateProjectDraftMember(memberIndex, { role: e.target.value });
                              clearFormError(teamKey);
                            }}
                            className={`flex-1 min-w-0 px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB2(teamKey)}`}
                            placeholder="Role"
                          />
                          {projectDraft.teamMembers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeProjectDraftMember(memberIndex)}
                              className="mb-0.5 p-2 text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                              aria-label="Remove member"
                            >
                              <HiX className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={commitProjectDraft}
                    disabled={projectSaving}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    <HiPlus className="w-4 h-4" />
                    {projectSaving ? 'Saving...' : 'Add Project'}
                  </button>
                </div>
              ) : projectsList.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-14 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gray-100 bg-white shadow-sm">
                    <HiFolder className="h-7 w-7 text-brand-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-800">No projects added yet</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Showcase your work by adding projects you have contributed to.
                  </p>
                  <button
                    type="button"
                    onClick={() => setProjectAddFormOpen(true)}
                    className="mt-6 inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-800"
                  >
                    <HiPlus className="w-4 h-4 text-brand-600" />
                    Add new project
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setProjectAddFormOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-800"
                >
                  <HiPlus className="w-4 h-4 text-brand-600" />
                  Add new project
                </button>
              )}

            </div>
          )}

          {activeTab === 'certification' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {verificationStatus.certification?.verified ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Verified
                  </span>
                ) : verificationStatus.certification?.completed ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Pending verification
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Not completed
                  </span>
                )}
              </div>

              {fe.cert_list && <p className="text-sm text-red-600">{fe.cert_list}</p>}

              <div className="space-y-3">
                {certList.map((cert, index) => {
                  const status = cert.certVerificationStatus ?? 'pending';
                  const isSelfDeclaredCert = !!cert.certSelfDeclared && status !== 'verified';
                  const certRowErrs = Object.entries(fe).filter(([k]) => k.startsWith(`cert_${index}_`));
                  return (
                    <div
                      key={`cert-${index}-${cert.name}`}
                      className={`overflow-hidden rounded-xl border border-gray-200 bg-white ${
                        isSelfDeclaredCert ? '' : 'space-y-4 p-5'
                      }`}
                    >
                      {certRowErrs.length > 0 && (
                        <ul
                          className={`list-disc space-y-0.5 text-sm text-red-600 ${
                            isSelfDeclaredCert ? 'mx-4 mt-3 mb-2 pl-5' : 'pl-5'
                          }`}
                        >
                          {certRowErrs.map(([k, msg]) => (
                            <li key={k}>{msg}</li>
                          ))}
                        </ul>
                      )}

                      {isSelfDeclaredCert ? (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 bg-[#fffbeb] px-3 py-2.5 sm:px-4">
                            <div className="flex min-w-0 items-start gap-2">
                              <HiExclamationCircle
                                className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                                aria-hidden
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-medium leading-snug text-amber-950 sm:text-[13px]">
                                  Self Declaration — limited network access. Upgrade to full verification.
                                </p>
                                <p className="mt-0.5 text-[11px] leading-snug text-amber-900/80">
                                  Add a credential reporting URL or supporting media to upgrade.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => openVerifyCertModal(index)}
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-800/25 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-950 shadow-sm hover:bg-amber-50"
                            >
                              <HiArrowUp className="h-3.5 w-3.5" aria-hidden />
                              Upgrade Verification
                            </button>
                          </div>

                          <div className="px-3 py-3 sm:px-4 sm:py-3">
                            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                              <div className="flex min-w-0 items-start gap-2">
                                <HiChevronRight
                                  className="mt-2 h-4 w-4 shrink-0 text-gray-400"
                                  aria-hidden
                                />
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 ring-1 ring-sky-100/80">
                                  <HiBadgeCheck className="h-5 w-5 text-sky-700" aria-hidden />
                                </div>
                                <div className="min-w-0 pt-0.5">
                                  <p className="truncate text-base font-semibold leading-tight text-gray-900">
                                    {cert.name}
                                  </p>
                                  <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                                    {formatCertificateCardSubtitle(cert)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-col items-start gap-0.5 sm:items-end">
                                <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold leading-tight text-amber-950">
                                  Self Declared
                                </span>
                                <p className="text-[11px] text-gray-400">via Self Declaration</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/50 px-3 py-2.5 sm:px-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openVerifyCertModal(index)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 sm:px-3.5 sm:py-2 sm:text-sm"
                              >
                                <HiShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                Verify
                              </button>
                              <button
                                type="button"
                                onClick={() => openVerifyCertModal(index)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500 bg-white px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 sm:py-2 sm:text-sm"
                              >
                                <HiShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                Upgrade Verification
                              </button>
                              {cert.supportingMediaUrl?.trim() ? (
                                <a
                                  href={
                                    cert.supportingMediaUrl.startsWith('http')
                                      ? cert.supportingMediaUrl
                                      : `${api.defaults.baseURL || ''}${cert.supportingMediaUrl}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-gray-50 sm:px-3 sm:py-2 sm:text-sm"
                                >
                                  View media
                                </a>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => requestRemoveCertificate(index)}
                              className="inline-flex items-center justify-center rounded-lg p-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 sm:p-2"
                              aria-label="Remove certification"
                            >
                              <HiTrash className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 gap-3">
                              <HiBadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-gray-900">{cert.name}</p>
                                <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">
                                  {formatCertificateCardSubtitle(cert)}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                              <div className="flex flex-wrap justify-end gap-1.5">
                                {status === 'pending' && (
                                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                                    Pending
                                  </span>
                                )}
                                {status === 'verified' && (
                                  <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                                    Verified
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-y-2 gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => openVerifyCertModal(index)}
                                  className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                                >
                                  <HiShieldCheck className="h-4 w-4" />
                                  Verify
                                </button>
                              )}
                              {cert.supportingMediaUrl?.trim() && (
                                <a
                                  href={
                                    cert.supportingMediaUrl.startsWith('http')
                                      ? cert.supportingMediaUrl
                                      : `${api.defaults.baseURL || ''}${cert.supportingMediaUrl}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-brand-600 hover:bg-gray-50"
                                >
                                  View media
                                </a>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => requestRemoveCertificate(index)}
                              className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                              aria-label="Remove certification"
                            >
                              <HiTrash className="h-5 w-5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {showCertificationAddForm ? (
                <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
                  <div className="mb-8 flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 ring-1 ring-emerald-100">
                        <HiBadgeCheck className="h-6 w-6 text-emerald-700" aria-hidden />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Add Certification</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCertAddFormOpen(false);
                        setCertDraft(emptyCertificate());
                        setFormFieldErrors((p) => omitKeysMatching(p, /^cert_draft_/));
                      }}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-900" htmlFor="cert_draft_name">
                        Name
                      </label>
                      <input
                        id="cert_draft_name"
                        type="text"
                        value={certDraft.name}
                        onChange={(e) => {
                          updateCertDraft({ name: e.target.value });
                          clearFormError('cert_draft_name');
                        }}
                        className={`min-h-[2.75rem] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 ${errB2('cert_draft_name')}`}
                        placeholder="Certificate name"
                      />
                      {fe.cert_draft_name ? (
                        <p className="mt-1 text-sm text-red-600">{fe.cert_draft_name}</p>
                      ) : null}
                    </div>
                    <div>
                      <label
                        className="mb-1.5 block text-sm font-semibold text-gray-900"
                        htmlFor="cert_draft_issuedBy"
                      >
                        Issuing Organisation
                      </label>
                      <input
                        id="cert_draft_issuedBy"
                        type="text"
                        value={certDraft.issuedBy}
                        onChange={(e) => {
                          updateCertDraft({ issuedBy: e.target.value });
                          clearFormError('cert_draft_issuedBy');
                        }}
                        className={`min-h-[2.75rem] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 ${errB2('cert_draft_issuedBy')}`}
                        placeholder="e.g. Coursera"
                      />
                      {fe.cert_draft_issuedBy ? (
                        <p className="mt-1 text-sm text-red-600">{fe.cert_draft_issuedBy}</p>
                      ) : null}
                    </div>
                    <div>
                      <label
                        className="mb-1.5 block text-sm font-semibold text-gray-900"
                        htmlFor="cert_draft_issuedDate"
                      >
                        Issue Date
                      </label>
                      <div className="relative">
                        <input
                          id="cert_draft_issuedDate"
                          type="date"
                          value={certDraft.issuedDate}
                          onChange={(e) => updateCertDraft({ issuedDate: e.target.value })}
                          className="min-h-[2.75rem] w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-3 pr-10 text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <HiCalendar
                          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                          aria-hidden
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                        <label
                          className="block text-sm font-semibold text-gray-900"
                          htmlFor="cert_draft_expirationDate"
                        >
                          Expiration Date
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-600">
                          <input
                            type="checkbox"
                            checked={certDraft.noExpiration === true}
                            onChange={(e) => {
                              const noExp = e.target.checked;
                              updateCertDraft({
                                noExpiration: noExp,
                                expirationDate: noExp ? '' : certDraft.expirationDate,
                              });
                              clearFormError('cert_draft_expirationDate');
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          />
                          No expiration date
                        </label>
                      </div>
                      {certDraft.noExpiration ? (
                        <p className="min-h-[2.75rem] rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-3 py-2.5 text-sm text-gray-500">
                          This credential does not expire.
                        </p>
                      ) : (
                        <>
                          <div className="relative">
                            <input
                              id="cert_draft_expirationDate"
                              type="date"
                              value={certDraft.expirationDate}
                              onChange={(ev) => {
                                updateCertDraft({ expirationDate: ev.target.value });
                                clearFormError('cert_draft_expirationDate');
                              }}
                              className={`min-h-[2.75rem] w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-3 pr-10 text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 ${errB2('cert_draft_expirationDate')}`}
                            />
                            <HiCalendar
                              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                              aria-hidden
                            />
                          </div>
                          {fe.cert_draft_expirationDate ? (
                            <p className="mt-1 text-sm text-red-600">{fe.cert_draft_expirationDate}</p>
                          ) : null}
                        </>
                      )}
                    </div>
                    <div>
                      <label
                        className="mb-1.5 block text-sm font-semibold text-gray-900"
                        htmlFor="cert_draft_credentialId"
                      >
                        Credential ID
                      </label>
                      <input
                        id="cert_draft_credentialId"
                        type="text"
                        value={certDraft.credentialId}
                        onChange={(e) => updateCertDraft({ credentialId: e.target.value })}
                        className="min-h-[2.75rem] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="e.g. DORYY53743"
                      />
                    </div>
                    <div>
                      <label
                        className="mb-1.5 block text-sm font-semibold text-gray-900"
                        htmlFor="cert_draft_reportingUrl"
                      >
                        Supporting URL
                      </label>
                      <input
                        id="cert_draft_reportingUrl"
                        type="url"
                        value={certDraft.reportingUrl}
                        onChange={(e) => {
                          updateCertDraft({ reportingUrl: e.target.value });
                          clearFormError('cert_draft_reportingUrl');
                        }}
                        className={`min-h-[2.75rem] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 ${errB2('cert_draft_reportingUrl')}`}
                        placeholder="https://..."
                      />
                      {fe.cert_draft_reportingUrl ? (
                        <p className="mt-1 text-sm text-red-600">{fe.cert_draft_reportingUrl}</p>
                      ) : null}
                    </div>
                    <div className="md:col-span-2">
                      <label
                        className="mb-1.5 block text-sm font-semibold text-gray-900"
                        htmlFor="cert_draft_associatedSkills"
                      >
                        Associated Skills
                      </label>
                      <input
                        id="cert_draft_associatedSkills"
                        type="text"
                        value={certDraft.associatedSkills ?? ''}
                        onChange={(e) => updateCertDraft({ associatedSkills: e.target.value })}
                        className="min-h-[2.75rem] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="Comma-separated"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-sm font-semibold text-gray-900">
                        Supporting media <span className="font-normal text-gray-500">(optional)</span>
                      </label>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                          <input
                            type="url"
                            value={certDraft.supportingMediaUrl}
                            onChange={(e) => {
                              updateCertDraft({ supportingMediaUrl: e.target.value });
                              clearFormError('cert_draft_supportingMediaUrl');
                            }}
                            className={`min-h-[2.75rem] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 ${errB2('cert_draft_supportingMediaUrl')}`}
                            placeholder="Paste media URL"
                          />
                          {fe.cert_draft_supportingMediaUrl ? (
                            <p className="mt-1 text-sm text-red-600">{fe.cert_draft_supportingMediaUrl}</p>
                          ) : null}
                        </div>
                        <div className="shrink-0">
                          <input
                            type="file"
                            accept=".pdf,image/jpeg,image/png,image/webp"
                            onChange={(e) => void handleCertDraftFileUpload(e)}
                            disabled={certDraftUploading}
                            className="block w-full min-w-0 text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 disabled:opacity-60"
                          />
                        </div>
                      </div>
                      {certDraft.supportingMediaUrl ? (
                        <p className="mt-2 text-sm text-gray-600">
                          Uploaded:{' '}
                          <a
                            href={
                              certDraft.supportingMediaUrl.startsWith('http')
                                ? certDraft.supportingMediaUrl
                                : `${api.defaults.baseURL || ''}${certDraft.supportingMediaUrl}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-brand-600 hover:underline"
                          >
                            View file
                          </a>
                        </p>
                      ) : null}
                      {certDraftUploading ? (
                        <p className="mt-1 text-sm text-gray-500">Uploading…</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-8 border-t border-gray-100 pt-6">
                    <button
                      type="button"
                      onClick={commitCertDraft}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
                    >
                      <HiPlus className="h-4 w-4" aria-hidden />
                      {saving ? 'Saving…' : 'Add Certification'}
                    </button>
                  </div>
                </div>
              ) : certList.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-14 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gray-100 bg-white shadow-sm">
                    <HiBadgeCheck className="h-7 w-7 text-brand-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-800">No certifications added yet</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Add certificates and credentials to strengthen your profile.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCertAddFormOpen(true)}
                    className="mt-6 inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-800"
                  >
                    <HiPlus className="w-4 h-4 text-brand-600" />
                    Add new certification
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCertAddFormOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-800"
                >
                  <HiPlus className="w-4 h-4 text-brand-600" />
                  Add new certification
                </button>
              )}

            </div>
          )}

          {activeTab === 'family' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {verificationStatus.family?.verified ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
                    Verified
                  </span>
                ) : verificationStatus.family?.completed ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                    Pending verification
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    Not completed
                  </span>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 space-y-6 shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
                  <HiHeart className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                  <h2 className="text-lg font-semibold text-gray-900">Family &amp; Relationship</h2>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-800">Marital Status</label>
                  <div className="relative">
                    <select
                      value={maritalStatus}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMaritalStatus(v);
                        clearFormError('fam_spouseName');
                        setRelationsList((relList) => {
                          queueMicrotask(() =>
                            void syncFamilyToApi(v, spouseName, relList, { silentSuccess: true }),
                          );
                          return relList;
                        });
                      }}
                      className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-10 text-sm text-gray-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                    >
                      <option value="">Select</option>
                      {MARITAL_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <HiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {maritalStatus === 'married' && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-800">Spouse name</label>
                    <input
                      type="text"
                      value={spouseName}
                      onChange={(e) => {
                        setSpouseName(e.target.value);
                        clearFormError('fam_spouseName');
                      }}
                      onBlur={(e) => {
                        setRelationsList((relList) => {
                          queueMicrotask(() =>
                            void syncFamilyToApi(maritalStatus, e.target.value, relList, {
                              silentSuccess: true,
                            }),
                          );
                          return relList;
                        });
                      }}
                      className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/25 ${errB2('fam_spouseName')}`}
                      placeholder="Full name"
                    />
                    {fe.fam_spouseName ? (
                      <p className="mt-1 text-sm text-red-600">{fe.fam_spouseName}</p>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {relationsList.map((rel, index) => {
                  const typeLabel =
                    RELATION_TYPE_OPTIONS.find((o) => o.value === rel.relationType)?.label ||
                    rel.relationType ||
                    'Relation';
                  const famRelTypeErr = fe[`fam_rel_${index}_type`];
                  const famRelNameErr = fe[`fam_rel_${index}_name`];
                  return (
                    <div
                      key={`fam-${index}-${rel.fullName}-${rel.relationType}`}
                      className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      {(famRelTypeErr || famRelNameErr) && (
                        <ul className="list-disc pl-5 text-sm text-red-600 space-y-0.5 w-full order-first">
                          {famRelTypeErr ? <li key="t">{famRelTypeErr}</li> : null}
                          {famRelNameErr ? <li key="n">{famRelNameErr}</li> : null}
                        </ul>
                      )}
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <HiChevronRight className="mt-1 h-5 w-5 shrink-0 text-gray-300" aria-hidden />
                        <HiUsers className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 truncate">{rel.fullName || '—'}</p>
                          <p className="mt-0.5 text-sm text-gray-500">{typeLabel}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:shrink-0">
                        <button
                          type="button"
                          onClick={() => removeFamilyRelation(index)}
                          className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                        >
                          <HiX className="h-4 w-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {showFamilyRelationAddForm ? (
                <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <HiUsers className="w-5 h-5 shrink-0 text-brand-600" aria-hidden />
                      <h3 className="text-base font-semibold text-gray-900">Add new family relation</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFamilyRelationAddFormOpen(false);
                        setFamilyRelationDraft(emptyFamilyRelation());
                        setFormFieldErrors((p) => omitKeysMatching(p, /^fam_draft_/));
                      }}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Relation name</label>
                      <input
                        type="text"
                        value={familyRelationDraft.fullName}
                        onChange={(e) => {
                          updateFamilyRelationDraft({ fullName: e.target.value });
                          clearFormError('fam_draft_name');
                        }}
                        className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB2('fam_draft_name')}`}
                        placeholder="Full name"
                      />
                      {fe.fam_draft_name ? (
                        <p className="mt-1 text-sm text-red-600">{fe.fam_draft_name}</p>
                      ) : null}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Relationship type</label>
                      <div className="relative">
                        <select
                          value={familyRelationDraft.relationType}
                          onChange={(e) => {
                            updateFamilyRelationDraft({ relationType: e.target.value });
                            clearFormError('fam_draft_type');
                          }}
                          className={`w-full appearance-none rounded-lg border bg-white py-2.5 pl-3 pr-10 text-sm text-gray-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/25 ${errB2('fam_draft_type')}`}
                        >
                          <option value="">Select</option>
                          {RELATION_TYPE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <HiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      </div>
                      {fe.fam_draft_type ? (
                        <p className="mt-1 text-sm text-red-600">{fe.fam_draft_type}</p>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={commitFamilyRelationDraft}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    <HiPlus className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Add relation'}
                  </button>
                </div>
              ) : relationsList.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-14 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gray-100 bg-white shadow-sm">
                    <HiUsers className="h-7 w-7 text-brand-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-800">No family relations added yet</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Add parents, children, or other relations to complete this step.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFamilyRelationAddFormOpen(true)}
                    className="mt-6 inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-800"
                  >
                    <HiPlus className="w-4 h-4 text-brand-600" />
                    Add new family relation
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setFamilyRelationAddFormOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-800"
                >
                  <HiPlus className="w-4 h-4 text-brand-600" />
                  Add new family relation
                </button>
              )}
            </div>
          )}

          {activeTab === 'social' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {verificationStatus.social?.verified ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Verified
                    </span>
                  ) : verificationStatus.social?.completed ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Pending verification
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Not completed
                    </span>
                  )}
                  {verificationStatus.social?.completed && !verificationStatus.social?.verified && !isSectionEditable('social') && (
                    <button
                      type="button"
                      onClick={() => setSectionEditMode((prev) => ({ ...prev, social: true }))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                    >
                      <HiPencil className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'linkedin' as const, label: 'LinkedIn' },
                    { key: 'twitter' as const, label: 'X (Twitter)' },
                    { key: 'facebook' as const, label: 'Facebook' },
                    { key: 'instagram' as const, label: 'Instagram' },
                    { key: 'tiktok' as const, label: 'TikTok' },
                    { key: 'snapchat' as const, label: 'Snapchat' },
                  ].map(({ key, label }) => {
                    const sk = `soc_${key}` as const;
                    return (
                    <div key={key} className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-sm font-medium text-gray-700">{label}</label>
                        <span className="text-xs text-gray-500">{social[key] ? 'Linked' : 'Not linked'}</span>
                      </div>
                      <input
                        type="url"
                        value={social[key]}
                        onChange={(e) => {
                          setSocial((s) => ({ ...s, [key]: e.target.value }));
                          clearFormError(sk);
                        }}
                        disabled={!isSectionEditable('social')}
                        readOnly={!isSectionEditable('social')}
                        placeholder={`${label} URL`}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed ${errB3(sk)}`}
                      />
                      {fe[sk] ? <p className="text-sm text-red-600">{fe[sk]}</p> : null}
                    </div>
                    );
                  })}
                </div>

                {isSectionEditable('social') && (
                  <button
                    type="button"
                    onClick={() => void handleSaveSocial()}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium"
                  >
                    <HiShare className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Update social profiles'}
                  </button>
                )}
              </div>
            )}
        </div>

      </div>

      {requestDataEditModalOpen && (
        <div
          className="fixed inset-0 z-[62] flex items-center justify-center p-4 bg-black/50"
          onClick={closeRequestDataEditModal}
          role="presentation"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[min(90vh,720px)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-data-edit-title"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 pr-2">
                  <h2 id="request-data-edit-title" className="text-lg font-semibold text-gray-900">
                    Request Data Edit
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Select which fields you want to edit and provide a reason with supporting evidence.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeRequestDataEditModal}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 shrink-0"
                  aria-label="Close"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900 mb-3">Fields to Edit</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  {PROFILE_REQUEST_EDIT_FIELDS.map((col, ci) => (
                    <div key={ci} className="space-y-3">
                      {col.map(({ label, key }) => (
                        <label
                          key={key}
                          className="flex items-center gap-3 cursor-pointer select-none text-sm text-gray-900"
                        >
                          <input
                            type="checkbox"
                            checked={!!requestDataEditSelected[key]}
                            onChange={() => toggleRequestEditField(key)}
                            className="h-4 w-4 rounded-full border-gray-300 text-brand-600 focus:ring-brand-500"
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="request-data-edit-reason" className="text-sm font-semibold text-gray-900 mb-2 block">
                  Reason for Edit
                </label>
                <div className="relative">
                  <select
                    id="request-data-edit-reason"
                    value={requestDataEditReason}
                    onChange={(e) => setRequestDataEditReason(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-10 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {PROFILE_REQUEST_EDIT_REASON_OPTIONS.map((o) => (
                      <option key={o.value || 'placeholder'} value={o.value} disabled={o.value === ''}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <HiChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                    aria-hidden
                  />
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">Supporting Evidence</p>
                <input
                  ref={requestDataEditFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) {
                      setRequestDataEditFile(null);
                      return;
                    }
                    const ok = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(f.type);
                    if (!ok) {
                      toast.error('Please upload an image (JPEG, PNG, WebP) or PDF');
                      e.target.value = '';
                      return;
                    }
                    setRequestDataEditFile(f);
                  }}
                />
                <button
                  type="button"
                  onClick={() => requestDataEditFileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center transition-colors hover:border-gray-300 hover:bg-gray-100/80"
                >
                  <HiUpload className="w-8 h-8 text-gray-400" aria-hidden />
                  <span className="text-sm text-gray-600">
                    {requestDataEditFile ? (
                      <span className="font-medium text-gray-900">{requestDataEditFile.name}</span>
                    ) : (
                      <>Click to attach supporting document</>
                    )}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => void handleSubmitRequestDataEdit()}
                disabled={requestDataEditSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                <HiPaperAirplane className="w-5 h-5" aria-hidden />
                {requestDataEditSubmitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      <LivenessSelfieModal
        open={livenessSelfieModalOpen}
        onClose={() => setLivenessSelfieModalOpen(false)}
        onUploaded={() => void fetchProfile({ soft: true })}
      />

      <SelfDeclarationModal
        open={selfDeclarationFlow.open}
        onClose={onSelfDeclarationBackOrClose}
        onBack={onSelfDeclarationBackOrClose}
        onConfirm={onSelfDeclarationConfirm}
      />

      {verifyPersonalModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setVerifyPersonalModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Verify Personal Identity</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Choose a verification method for your personal identity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVerifyPersonalModalOpen(false)}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>
            <div className="grid gap-3">
              {!(
                identityVerificationPath === 'self' && personalSelfDeclarationAcknowledged
              ) ? (
              <button
                type="button"
                onClick={() => {
                  setVerifyPersonalModalOpen(false);
                  setSelfDeclarationFlow({ open: true, kind: 'personal' });
                }}
                className="flex items-start gap-4 w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-brand-400 hover:bg-brand-50/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <HiDocumentText className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Self Declaration</p>
                  <p className="text-sm text-gray-500 mt-0.5">Declare your identity information yourself</p>
                </div>
              </button>
              ) : (
                <p className="text-sm text-gray-600 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  You have already confirmed self declaration. To upgrade verification, use Government ID below.
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setVerifyPersonalModalOpen(false);
                  setVerifyGovIdModalOpen(true);
                }}
                className="flex items-start gap-4 w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-brand-400 hover:bg-brand-50/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <HiShieldCheck className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Government ID</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Verify with a government-issued ID document
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {verifyGovIdModalOpen && (
        <div
          className="fixed inset-0 z-[61] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setVerifyGovIdModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-gray-900 pr-8">Verify Identity with Government ID</h3>
              <button
                type="button"
                onClick={() => setVerifyGovIdModalOpen(false)}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 shrink-0"
                aria-label="Close"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setVerifyGovIdModalOpen(false);
                setVerifyPersonalModalOpen(true);
              }}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              <HiArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="verification-gov-nationality"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Country of Nationality
                </label>
                <select
                  id="verification-gov-nationality"
                  value={personal.nationality}
                  onChange={(e) => {
                    setPersonal((p) => ({ ...p, nationality: e.target.value }));
                    clearFormError('gov_nationality');
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB3('gov_nationality')}`}
                >
                  {NATIONALITY_SEARCHABLE_OPTIONS.map((o) => (
                    <option key={o.value || '__gov_nat'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {fe.gov_nationality ? <p className="mt-1 text-sm text-red-600">{fe.gov_nationality}</p> : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Type</label>
                <select
                  value={personal.idType}
                  onChange={(e) => {
                    setPersonal((p) => ({ ...p, idType: e.target.value }));
                    clearFormError('gov_idType');
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB3('gov_idType')}`}
                >
                  {[{ value: '', label: 'Select ID type' }, ...ID_TYPE_OPTIONS].map((o) => (
                    <option key={o.value || '__idt'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {fe.gov_idType ? <p className="mt-1 text-sm text-red-600">{fe.gov_idType}</p> : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                <input
                  type="text"
                  value={personal.idNumber}
                  onChange={(e) => {
                    setPersonal((p) => ({ ...p, idNumber: e.target.value }));
                    clearFormError('gov_idNumber');
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errB3('gov_idNumber')}`}
                  placeholder={idNumberPlaceholder()}
                />
                {fe.gov_idNumber ? <p className="mt-1 text-sm text-red-600">{fe.gov_idNumber}</p> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleSubmitGovIdVerification()}
              disabled={saving}
              className="w-full py-3 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Verify'}
            </button>
          </div>
        </div>
      )}

      <input
        ref={locationVerifyFileInputRef}
        type="file"
        accept=".pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        aria-hidden
        onChange={handleLocationVerifyFileInputChange}
      />

      <input
        ref={educationVerifyFileInputRef}
        type="file"
        accept=".pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        aria-hidden
        onChange={handleEducationVerifyFileInputChange}
      />

      <input
        ref={workVerifyFileInputRef}
        type="file"
        accept=".pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        aria-hidden
        onChange={handleWorkVerifyFileInputChange}
      />

      {verifyEducationModal.open && verifyEducationModal.index != null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onClick={closeVerifyEducationModal}
        >
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {verifyEducationModal.screen === 'pick' ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">Verify Education</h3>
                    <p className="text-sm text-gray-500 mt-1.5">Choose a verification method.</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeVerifyEducationModal}
                    className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Close"
                  >
                    <HiX className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const idx = verifyEducationModal.index;
                      if (idx == null) return;
                      closeVerifyEducationModal();
                      setSelfDeclarationFlow({ open: true, kind: 'education', educationIndex: idx });
                    }}
                    className="w-full flex gap-3 text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
                  >
                    <HiDocumentText className="w-6 h-6 text-brand-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">Self Declaration</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Temporary verification — limited network access
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerEducationVerifyDocumentUpload()}
                    disabled={uploadingEducationIndex !== null}
                    className="w-full flex gap-3 text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-brand-300 hover:bg-brand-50/50 transition-colors disabled:opacity-50"
                  >
                    <HiUpload className="w-6 h-6 text-brand-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">Upload Document</p>
                      <p className="text-sm text-gray-500 mt-0.5">Degree certificate, transcript, etc.</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const idx = verifyEducationModal.index;
                      if (idx == null) return;
                      const ent = educationEntriesList[idx];
                      setVerifyEducationModal((p) => ({
                        ...p,
                        screen: 'student_email',
                        studentEmail: (ent?.studentVerificationEmail || '').trim(),
                        otp: '',
                        otpSent: false,
                        studentFlowBusy: false,
                      }));
                    }}
                    className="w-full flex gap-3 text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
                  >
                    <HiMail className="w-6 h-6 text-brand-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">Student Email</p>
                      <p className="text-sm text-gray-500 mt-0.5">Verify with your institution email</p>
                    </div>
                  </button>
                </div>
              </>
            ) : verifyEducationModal.screen === 'student_email' ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setVerifyEducationModal((p) => ({
                        ...p,
                        screen: 'pick',
                        otpSent: false,
                        otp: '',
                        studentFlowBusy: false,
                      }))
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-brand-600 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <HiArrowLeft className="h-4 w-4" aria-hidden />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={closeVerifyEducationModal}
                    className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Close"
                  >
                    <HiX className="w-5 h-5" />
                  </button>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">Student email</h3>
                  <p className="text-sm text-gray-500 mt-1.5">
                    We will email a one-time code to your institution address.
                  </p>
                </div>
                <div className="space-y-4 pt-1">
                  <div>
                    <label htmlFor="edu-student-email" className="block text-sm font-medium text-gray-700 mb-1">
                      Institution email
                    </label>
                    <input
                      id="edu-student-email"
                      type="email"
                      autoComplete="email"
                      value={verifyEducationModal.studentEmail}
                      onChange={(e) =>
                        setVerifyEducationModal((p) => ({ ...p, studentEmail: e.target.value }))
                      }
                      disabled={verifyEducationModal.otpSent}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
                      placeholder="you@university.edu"
                    />
                  </div>
                  {!verifyEducationModal.otpSent ? (
                    <button
                      type="button"
                      onClick={() => void sendEducationStudentEmailOtp()}
                      disabled={verifyEducationModal.studentFlowBusy}
                      className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
                    >
                      {verifyEducationModal.studentFlowBusy ? 'Sending…' : 'Verify'}
                    </button>
                  ) : (
                    <>
                      <div>
                        <label htmlFor="edu-student-otp" className="block text-sm font-medium text-gray-700 mb-1">
                          Enter code
                        </label>
                        <input
                          id="edu-student-otp"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={verifyEducationModal.otp}
                          onChange={(e) =>
                            setVerifyEducationModal((p) => ({
                              ...p,
                              otp: e.target.value.replace(/\D/g, '').slice(0, 6),
                            }))
                          }
                          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-center text-lg font-mono tracking-widest text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                          placeholder="000000"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => void submitEducationStudentEmailOtp()}
                        disabled={
                          verifyEducationModal.studentFlowBusy || verifyEducationModal.otp.length !== 6
                        }
                        className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
                      >
                        {verifyEducationModal.studentFlowBusy ? 'Verifying…' : 'Verify'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setVerifyEducationModal((p) => ({
                            ...p,
                            otpSent: false,
                            otp: '',
                            studentFlowBusy: false,
                          }))
                        }
                        className="w-full text-sm font-medium text-brand-600 hover:text-brand-700"
                      >
                        Use a different email
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-6 text-center space-y-3">
                <HiCheckCircle className="h-14 w-14 text-emerald-500" aria-hidden />
                <h3 className="text-xl font-bold text-gray-900">Verified successfully</h3>
                <p className="text-sm text-gray-600 max-w-sm">
                  Your education is now verified using your institution email.
                </p>
                <button
                  type="button"
                  onClick={closeVerifyEducationModal}
                  className="mt-4 w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {educationRemoveConfirm.open && educationRemoveConfirm.index != null && (
        <div
          className="fixed inset-0 z-[61] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setEducationRemoveConfirm({ open: false, index: null })}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">Remove this education?</h3>
            <p className="text-sm text-gray-600">
              This will permanently delete this education entry from your profile. You can add it again
              later if needed.
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEducationRemoveConfirm({ open: false, index: null })}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmRemoveEducationEntry()}
                disabled={educationSaving}
                className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {educationSaving ? 'Removing…' : 'Remove education'}
              </button>
            </div>
          </div>
        </div>
      )}

      {locationRemoveConfirm.open && locationRemoveConfirm.index != null && (
        <div
          className="fixed inset-0 z-[61] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setLocationRemoveConfirm({ open: false, index: null })}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">Remove this location?</h3>
            <p className="text-sm text-gray-600">
              This will remove this address from your profile. You can add a location again at any time.
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLocationRemoveConfirm({ open: false, index: null })}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmRemoveLocation()}
                disabled={saving}
                className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Removing…' : 'Remove location'}
              </button>
            </div>
          </div>
        </div>
      )}

      {workRemoveConfirm.open && workRemoveConfirm.index != null && (
        <div
          className="fixed inset-0 z-[61] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setWorkRemoveConfirm({ open: false, index: null })}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">Remove this work experience?</h3>
            <p className="text-sm text-gray-600">
              This will permanently delete this role from your profile. You can add it again later if needed.
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWorkRemoveConfirm({ open: false, index: null })}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmRemoveWorkEntry()}
                disabled={workSaving}
                className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {workSaving ? 'Removing…' : 'Remove work experience'}
              </button>
            </div>
          </div>
        </div>
      )}

      {projectRemoveConfirm.open && projectRemoveConfirm.index != null && (
        <div
          className="fixed inset-0 z-[61] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setProjectRemoveConfirm({ open: false, index: null })}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">Remove this project?</h3>
            <p className="text-sm text-gray-600">
              This will permanently delete this project from your profile. You can add it again later if needed.
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProjectRemoveConfirm({ open: false, index: null })}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmRemoveProjectEntry()}
                disabled={projectSaving}
                className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {projectSaving ? 'Removing…' : 'Remove project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {certRemoveConfirm.open && certRemoveConfirm.index != null && (
        <div
          className="fixed inset-0 z-[61] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setCertRemoveConfirm({ open: false, index: null })}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">Remove this certification?</h3>
            <p className="text-sm text-gray-600">
              This will remove this certification from your profile. You can add it again later if needed.
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCertRemoveConfirm({ open: false, index: null })}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmRemoveCertificate()}
                disabled={saving}
                className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Removing…' : 'Remove certification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {verifyProjectModal.open && verifyProjectModal.index != null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onClick={closeVerifyProjectModal}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Verify Project</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {verifyProjectModal.step === 'method'
                    ? 'Choose how you would like to verify this project.'
                    : 'Add a public project link and/or media URL for reviewers.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeVerifyProjectModal}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>

            {verifyProjectModal.step === 'evidence' && (
              <button
                type="button"
                onClick={() => {
                  const idx = verifyProjectModal.index;
                  const entry = idx != null ? projectsList[idx] : undefined;
                  if (entry && projectEntryIsSelfDeclared(entry)) {
                    closeVerifyProjectModal();
                  } else {
                    setVerifyProjectModal((m) => ({ ...m, step: 'method' }));
                  }
                }}
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                <HiArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {verifyProjectModal.step === 'method' && (
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const idx = verifyProjectModal.index;
                    if (idx == null) return;
                    closeVerifyProjectModal();
                    setSelfDeclarationFlow({ open: true, kind: 'project_card', projectIndex: idx });
                  }}
                  className="w-full flex gap-3 text-left rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
                >
                  <HiDocumentText className="w-6 h-6 text-brand-600 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Self Declaration</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Temporary verification — limited network access
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setVerifyProjectModal((m) => ({ ...m, step: 'evidence' }))}
                  className="w-full flex gap-3 text-left rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
                >
                  <HiUpload className="w-6 h-6 text-brand-600 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Project link or media</p>
                    <p className="text-sm text-gray-500 mt-0.5">Share a URL to the live project or supporting media</p>
                  </div>
                </button>
              </div>
            )}

            {verifyProjectModal.step === 'evidence' && (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project link</label>
                  <input
                    type="url"
                    value={projectVerifyEvidenceDraft.projectLink}
                    onChange={(e) =>
                      setProjectVerifyEvidenceDraft((d) => ({ ...d, projectLink: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Media URL (optional)</label>
                  <input
                    type="url"
                    value={projectVerifyEvidenceDraft.mediaUrl}
                    onChange={(e) =>
                      setProjectVerifyEvidenceDraft((d) => ({ ...d, mediaUrl: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="Image or video URL"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => submitProjectVerificationEvidence()}
                  disabled={projectSaving}
                  className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  Save and submit for verification
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {verifyCertModal.open && verifyCertModal.index != null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onClick={closeVerifyCertModal}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Verify Certification</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {verifyCertModal.step === 'method'
                    ? 'Choose how you would like to verify this credential.'
                    : 'Add a credential registry URL and/or supporting media for reviewers.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeVerifyCertModal}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>

            {verifyCertModal.step === 'evidence' && (
              <button
                type="button"
                onClick={() => {
                  const idx = verifyCertModal.index;
                  const entry = idx != null ? certList[idx] : undefined;
                  if (entry?.certSelfDeclared) {
                    closeVerifyCertModal();
                  } else {
                    setVerifyCertModal((m) => ({ ...m, step: 'method' }));
                  }
                }}
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                <HiArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {verifyCertModal.step === 'method' && (
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const idx = verifyCertModal.index;
                    if (idx == null) return;
                    closeVerifyCertModal();
                    setSelfDeclarationFlow({ open: true, kind: 'cert_card', certIndex: idx });
                  }}
                  className="w-full flex gap-3 text-left rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
                >
                  <HiDocumentText className="w-6 h-6 text-brand-600 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Self Declaration</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Temporary verification — limited network access
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setVerifyCertModal((m) => ({ ...m, step: 'evidence' }))}
                  className="w-full flex gap-3 text-left rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
                >
                  <HiUpload className="w-6 h-6 text-brand-600 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Credential evidence</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Reporting URL (e.g. badge provider) and/or certificate file URL
                    </p>
                  </div>
                </button>
              </div>
            )}

            {verifyCertModal.step === 'evidence' && (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credential reporting URL</label>
                  <input
                    type="url"
                    value={certVerifyEvidenceDraft.reportingUrl}
                    onChange={(e) =>
                      setCertVerifyEvidenceDraft((d) => ({ ...d, reportingUrl: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supporting media URL (optional)
                  </label>
                  <input
                    type="url"
                    value={certVerifyEvidenceDraft.supportingMediaUrl}
                    onChange={(e) =>
                      setCertVerifyEvidenceDraft((d) => ({ ...d, supportingMediaUrl: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="PDF or image URL"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => submitCertVerificationEvidence()}
                  disabled={saving}
                  className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  Save and submit for verification
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {verifyWorkModal.open && verifyWorkModal.index != null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onClick={closeVerifyWorkModal}
        >
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {verifyWorkModal.screen === 'pick' ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">Verify Work Experience</h3>
                    <p className="text-sm text-gray-500 mt-1.5">Choose a verification method.</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeVerifyWorkModal}
                    className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Close"
                  >
                    <HiX className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const idx = verifyWorkModal.index;
                      if (idx == null) return;
                      closeVerifyWorkModal();
                      setSelfDeclarationFlow({ open: true, kind: 'work_card', workIndex: idx });
                    }}
                    className="w-full flex gap-3 text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
                  >
                    <HiDocumentText className="w-6 h-6 text-brand-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">Self Declaration</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Temporary verification — limited network access
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerWorkVerifyDocumentUpload()}
                    disabled={uploadingWorkIndex !== null}
                    className="w-full flex gap-3 text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-brand-300 hover:bg-brand-50/50 transition-colors disabled:opacity-50"
                  >
                    <HiUpload className="w-6 h-6 text-brand-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">Upload Document</p>
                      <p className="text-sm text-gray-500 mt-0.5">Employment letter, pay slip, etc.</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const idx = verifyWorkModal.index;
                      if (idx == null) return;
                      const ent = workEntriesList[idx];
                      setVerifyWorkModal((p) => ({
                        ...p,
                        screen: 'work_email',
                        workEmail: (ent?.workVerificationEmail || '').trim(),
                        otp: '',
                        otpSent: false,
                        workEmailFlowBusy: false,
                      }));
                    }}
                    className="w-full flex gap-3 text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
                  >
                    <HiMail className="w-6 h-6 text-brand-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">Work Email</p>
                      <p className="text-sm text-gray-500 mt-0.5">Verify with your company email</p>
                    </div>
                  </button>
                </div>
              </>
            ) : verifyWorkModal.screen === 'work_email' ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setVerifyWorkModal((p) => ({
                        ...p,
                        screen: 'pick',
                        otpSent: false,
                        otp: '',
                        workEmailFlowBusy: false,
                      }))
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-brand-600 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <HiArrowLeft className="h-4 w-4" aria-hidden />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={closeVerifyWorkModal}
                    className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Close"
                  >
                    <HiX className="w-5 h-5" />
                  </button>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">Work email</h3>
                  <p className="text-sm text-gray-500 mt-1.5">
                    We will email a one-time code to your company address.
                  </p>
                </div>
                <div className="space-y-4 pt-1">
                  <div>
                    <label htmlFor="work-verify-email" className="block text-sm font-medium text-gray-700 mb-1">
                      Company email
                    </label>
                    <input
                      id="work-verify-email"
                      type="email"
                      autoComplete="email"
                      value={verifyWorkModal.workEmail}
                      onChange={(e) =>
                        setVerifyWorkModal((p) => ({ ...p, workEmail: e.target.value }))
                      }
                      disabled={verifyWorkModal.otpSent}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
                      placeholder="you@company.com"
                    />
                  </div>
                  {!verifyWorkModal.otpSent ? (
                    <button
                      type="button"
                      onClick={() => void sendWorkEmailOtp()}
                      disabled={verifyWorkModal.workEmailFlowBusy}
                      className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
                    >
                      {verifyWorkModal.workEmailFlowBusy ? 'Sending…' : 'Verify'}
                    </button>
                  ) : (
                    <>
                      <div>
                        <label htmlFor="work-verify-otp" className="block text-sm font-medium text-gray-700 mb-1">
                          Enter code
                        </label>
                        <input
                          id="work-verify-otp"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={verifyWorkModal.otp}
                          onChange={(e) =>
                            setVerifyWorkModal((p) => ({
                              ...p,
                              otp: e.target.value.replace(/\D/g, '').slice(0, 6),
                            }))
                          }
                          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-center text-lg font-mono tracking-widest text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                          placeholder="000000"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => void submitWorkEmailOtp()}
                        disabled={
                          verifyWorkModal.workEmailFlowBusy || verifyWorkModal.otp.length !== 6
                        }
                        className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
                      >
                        {verifyWorkModal.workEmailFlowBusy ? 'Verifying…' : 'Verify'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setVerifyWorkModal((p) => ({
                            ...p,
                            otpSent: false,
                            otp: '',
                            workEmailFlowBusy: false,
                          }))
                        }
                        className="w-full text-sm font-medium text-brand-600 hover:text-brand-700"
                      >
                        Use a different email
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-6 text-center space-y-3">
                <HiCheckCircle className="h-14 w-14 text-emerald-500" aria-hidden />
                <h3 className="text-xl font-bold text-gray-900">Verified successfully</h3>
                <p className="text-sm text-gray-600 max-w-sm">
                  Your work experience is now verified using your company email.
                </p>
                <button
                  type="button"
                  onClick={closeVerifyWorkModal}
                  className="mt-4 w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {verifyAddressModal.open && verifyAddressModal.locationIndex != null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onClick={closeVerifyAddressModal}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Verify Address</h3>
                <p className="text-sm text-gray-500 mt-1">Choose a verification method.</p>
              </div>
              <button
                type="button"
                onClick={closeVerifyAddressModal}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>

            {verifyAddressModal.step !== 'method' && (
              <button
                type="button"
                onClick={() =>
                  setVerifyAddressModal((m) => ({
                    ...m,
                    step: m.step === 'document' ? 'residence' : 'method',
                  }))
                }
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                <HiArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {verifyAddressModal.step === 'method' && (
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const idx = verifyAddressModal.locationIndex;
                    if (idx == null) return;
                    setSelfDeclarationFlow({ open: true, kind: 'address', locationIndex: idx });
                  }}
                  className="w-full flex gap-3 text-left rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
                >
                  <HiDocumentText className="w-6 h-6 text-brand-600 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Self Declaration</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Temporary verification — limited network access
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setVerifyAddressModal((m) => ({ ...m, step: 'residence' }))}
                  className="w-full flex gap-3 text-left rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
                >
                  <HiUpload className="w-6 h-6 text-brand-600 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Upload Document</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Utility bill, lease agreement, bank statement, etc.
                    </p>
                  </div>
                </button>
                {/* <button
                  type="button"
                  onClick={() => {
                    const idx = verifyAddressModal.locationIndex;
                    if (idx == null) return;
                    setLocationsList((prev) => {
                      const next = prev.map((loc, i) =>
                        i === idx
                          ? {
                              ...loc,
                              verificationStatus: 'verified' as const,
                              documentType: 'digital_verify',
                              documentUrl: '',
                            }
                          : loc,
                      );
                      queueMicrotask(() => tryPersistLocations(next, true));
                      return next;
                    });
                    closeVerifyAddressModal();
                    toast.success('Address verified using location data.');
                  }}
                  className="w-full flex gap-3 text-left rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
                >
                  <HiLocationMarker className="w-6 h-6 text-brand-600 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Verify Digitally</p>
                    <p className="text-sm text-gray-500 mt-0.5">Use location data</p>
                  </div>
                </button> */}
              </div>
            )}

            {verifyAddressModal.step === 'residence' && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-900">Select your residence type:</p>
                <div className="space-y-2">
                  {RESIDENCE_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        const idx = verifyAddressModal.locationIndex;
                        if (idx == null) return;
                        updateLocation(idx, { residenceType: opt.value });
                        setVerifyAddressModal((m) => ({ ...m, step: 'document' }));
                      }}
                      className="w-full text-left rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 hover:border-brand-300 hover:bg-brand-50/40"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {verifyAddressModal.step === 'document' && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-900">Upload supporting document:</p>
                <div className="space-y-2">
                  {[
                    { value: 'utility_bill', label: 'Utility Bill' },
                    { value: 'bank_statement', label: 'Bank Statement' },
                    { value: 'lease_agreement', label: 'Lease or Tenancy Agreement' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => triggerVerifyModalDocumentUpload(opt.value)}
                      disabled={uploadingLocationIndex !== null}
                      className="w-full flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-50"
                    >
                      <HiUpload className="w-5 h-5 text-brand-600" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </ProfessionalLayout>
  );
}
