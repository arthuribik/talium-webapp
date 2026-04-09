import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { LivenessSelfieModal } from '@/components/professional/LivenessSelfieModal';
import { SelfDeclarationModal } from '@/components/professional/SelfDeclarationModal';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import {
  HiAcademicCap,
  HiShare,
  HiBriefcase,
  HiBadgeCheck,
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
  HiArrowRight,
  HiStar,
  HiUpload,
  HiExclamationCircle,
} from 'react-icons/hi';
import { COUNTRIES } from '@/utils/countries';
import {
  DEFAULT_PHONE_DIAL_VALUE,
  PHONE_DIAL_SEARCH_OPTIONS,
  buildE164FromDialAndNational,
  parsePhoneDialValue,
  splitPlusPrefixedPhone,
} from '@/utils/phoneDialCodes';
import { SearchableList } from '@/components/common/SearchableList';

type SectionKey =
  | 'personal'
  | 'location'
  | 'education'
  | 'social'
  | 'work'
  | 'projects'
  | 'certification'
  | 'family';

const VALID_SECTION_KEYS: SectionKey[] = [
  'personal',
  'location',
  'education',
  'social',
  'work',
  'projects',
  'certification',
  'family',
];

function isSectionKey(value: string | null): value is SectionKey {
  return value !== null && VALID_SECTION_KEYS.includes(value as SectionKey);
}

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
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
  | { open: true; kind: 'work' };

const PERSONAL_FLOW_STEPS: { step: Exclude<PersonalFlowStep, 'complete'>; label: string }[] = [
  { step: 'add_data', label: 'Add data' },
  { step: 'identity', label: 'Identity' },
  { step: 'contact', label: 'Email & phone' },
  { step: 'liveness', label: 'Liveness' },
];

function personalFlowStepIndex(s: PersonalFlowStep): number {
  const m: Record<PersonalFlowStep, number> = {
    add_data: 0,
    identity: 1,
    contact: 2,
    liveness: 3,
    complete: 4,
  };
  return m[s];
}
type LocationVerificationStatus = 'pending' | 'self_declared' | 'verified';

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
  let verificationStatus: LocationVerificationStatus = 'pending';
  let documentType = docTypeRaw;
  if (docUrl) {
    verificationStatus = 'verified';
    if (!documentType) documentType = 'other';
  } else if (docTypeRaw === 'digital_verify') {
    verificationStatus = 'verified';
  } else if (docTypeRaw === 'self_declaration') {
    verificationStatus = 'self_declared';
    documentType = '';
  }

  return {
    country: loc.country || '',
    address: loc.address || '',
    city: loc.city || '',
    state: loc.state || '',
    documentType,
    documentUrl: loc.documentUrl || '',
    verificationStatus,
    isDefault: length > 0 && index === 0,
    residenceType: typeof loc.residenceType === 'string' ? loc.residenceType : undefined,
  };
}

type EducationProgramMilestoneEntry = {
  title: string;
  startDate: string;
  endDate: string;
  currentlyActive: boolean;
};

const emptyEducationMilestone = (): EducationProgramMilestoneEntry => ({
  title: '',
  startDate: '',
  endDate: '',
  currentlyActive: false,
});

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
  pendingLoanAmount: string;
  loanCurrency: string;
  loanRepaymentFrequency: string;
  scholarshipsAndAid: string;
  programDescription: string;
  academicResponsibilities: string;
  academicAchievements: string;
  programMilestones: EducationProgramMilestoneEntry[];
  activitiesSocieties: string;
  associatedSkills: string;
  supportingMediaUrl: string;
  /** Local UI: education row verification (not necessarily from API). */
  eduVerificationStatus?: 'pending' | 'verified';
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
  pendingLoanAmount: '',
  loanCurrency: 'USD',
  loanRepaymentFrequency: '',
  scholarshipsAndAid: '',
  programDescription: '',
  academicResponsibilities: '',
  academicAchievements: '',
  programMilestones: [emptyEducationMilestone()],
  activitiesSocieties: '',
  associatedSkills: '',
  supportingMediaUrl: '',
  eduVerificationStatus: 'pending',
});

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
  verifyWebsite: string;
  verifyHrEmail: string;
  workVerificationStatus?: 'pending' | 'verified';
};

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
  selfDeclared: true,
  verifyWebsite: '',
  verifyHrEmail: '',
  workVerificationStatus: 'pending',
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
    on_site: 'On-site',
    remote: 'Remote',
    hybrid: 'Hybrid',
    global_remote: 'Global Remote',
  };
  return map[value] || value || '—';
}

function formatWorkCardSubtitle(entry: WorkEntry): string {
  return [
    entry.industry?.trim() || '—',
    workEmploymentTypeLabel(entry.employmentType),
    workModeLabel(entry.workMode),
  ].join(' · ');
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
};

const emptyProjectTeamMember = (): ProjectTeamMemberEntry => ({ name: '', role: '' });

const emptyProject = (): ProjectEntry => ({
  title: '',
  description: '',
  projectLink: '',
  mediaUrl: '',
  teamMembers: [emptyProjectTeamMember()],
  projectVerificationStatus: 'pending',
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

const EDUCATION_LEVELS = [
  { value: 'high_school', label: 'High School' },
  { value: 'associate', label: 'Associate' },
  { value: 'bachelor', label: 'Bachelor' },
  { value: 'master', label: 'Master' },
  { value: 'doctorate', label: 'Doctorate' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'diploma', label: 'Diploma' },
];
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
  { value: 'college', label: 'College' },
  { value: 'secondary', label: 'Secondary school' },
  { value: 'primary', label: 'Primary school' },
  { value: 'technical', label: 'Technical / vocational' },
  { value: 'other', label: 'Other' },
];

const QUALIFICATION_OPTIONS = [
  { value: 'BSc', label: 'B.Sc.' },
  { value: 'BA', label: 'B.A.' },
  { value: 'BTech', label: 'B.Tech.' },
  { value: 'MSc', label: 'M.Sc.' },
  { value: 'MA', label: 'M.A.' },
  { value: 'MBA', label: 'MBA' },
  { value: 'PhD', label: 'Ph.D.' },
  { value: 'MD', label: 'M.D.' },
  { value: 'LLB', label: 'LL.B.' },
  { value: 'LLM', label: 'LL.M.' },
  { value: 'HND', label: 'HND' },
  { value: 'ND', label: 'ND' },
  { value: 'Certificate', label: 'Certificate' },
  { value: 'Diploma', label: 'Diploma' },
  { value: 'WAEC_SSCE', label: 'WAEC / SSCE' },
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

function monthShortCode(monthValue: string): string {
  const opt = MONTH_OPTIONS.find((o) => o.value === monthValue);
  return opt ? opt.label.slice(0, 3) : '';
}

function schoolTypeDisplayLabel(value: string): string {
  if (!value?.trim()) return '—';
  return SCHOOL_TYPE_OPTIONS.find((o) => o.value === value)?.label || value;
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

function cloneEducationEntry(e: EducationEntry): EducationEntry {
  return {
    ...e,
    programMilestones: e.programMilestones.map((m) => ({ ...m })),
  };
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
  if (level) return 'undergraduate';
  return undefined;
}

const VERIFICATION_TABS: { id: SectionKey; label: string }[] = [
  { id: 'personal', label: 'Personal Identity' },
  { id: 'location', label: 'Location Data' },
  { id: 'education', label: 'Education' },
  { id: 'work', label: 'Work Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'certification', label: 'Certifications' },
  { id: 'family', label: 'Family' },
  { id: 'social', label: 'Social' },
];

/** Mirrors API rules so progress works if /verification-status fails or omits sections. */
function deriveVerificationStatusFromProfile(data: any): Record<SectionKey, { completed: boolean; verified: boolean }> | null {
  if (!data || typeof data !== 'object') return null;
  const socialMedia = data.socialMedia || {};
  const hasSocial = [
    socialMedia.linkedin,
    socialMedia.twitter,
    socialMedia.facebook,
    socialMedia.instagram,
    socialMedia.tiktok,
    socialMedia.snapchat,
  ].some(Boolean);

  const hasRequiredIdFields = !!(data.idType && String(data.idNumber || '').trim() && data.idDocumentUrl);
  const personalCompleted =
    hasRequiredIdFields ||
    !!(data.country || data.nationality || data.dateOfBirth) ||
    !!data.identityVerification;
  const personalVerified =
    data.identityStatus === 'verified' || !!data.identityVerification?.verifiedAt;

  const education = Array.isArray(data.education) ? data.education : [];
  const educationCompleted = education.length > 0;
  const educationVerified = education.some((e: any) => e?.verificationStatus === 'verified');

  const work = Array.isArray(data.workExperience) ? data.workExperience : [];
  const workCompleted = work.length > 0;
  const workVerified = work.some((e: any) => e?.verificationStatus === 'verified');

  const projects = Array.isArray(data.professionalProjects)
    ? data.professionalProjects
    : Array.isArray(data.projects)
      ? data.projects
      : [];
  const projectsCompleted = projects.length > 0;
  const projectsVerified = projects.some((p: any) => p?.verificationStatus === 'verified');

  const locationsJson = data.locations;
  const locationsArr = Array.isArray(locationsJson)
    ? locationsJson
    : locationsJson != null && typeof locationsJson === 'object'
      ? [locationsJson]
      : [];
  const locationCompleted =
    locationsArr.some((loc: any) => {
      if (!loc || typeof loc !== 'object') return false;
      const country = typeof loc.country === 'string' ? loc.country.trim() : '';
      const address = typeof loc.address === 'string' ? loc.address.trim() : '';
      const docUrl =
        (typeof loc.documentUrl === 'string' && loc.documentUrl.trim()) ||
        (typeof loc.document_url === 'string' && loc.document_url.trim()) ||
        '';
      return !!(country || address || docUrl);
    }) ||
    !!(data.locationDocumentUrl && String(data.locationDocumentUrl).trim()) ||
    !!(data.locationDocumentType && String(data.locationDocumentType).trim()) ||
    !!(data.country && String(data.country).trim());

  const certsArr = Array.isArray(data.certifications) ? data.certifications : [];
  const certificationCompleted = certsArr.some((c: any) => {
    const name = typeof c?.name === 'string' ? c.name.trim() : '';
    const issuedBy = typeof c?.issuedBy === 'string' ? c.issuedBy.trim() : '';
    return !!(name && issuedBy);
  });
  const certificationVerified = certsArr.some(
    (c: any) => c?.verified === true || c?.certVerificationStatus === 'verified',
  );

  let familyCompleted = false;
  const familyRaw = data.familyInfo;
  if (familyRaw && typeof familyRaw === 'object') {
    const marital = typeof familyRaw.maritalStatus === 'string' ? familyRaw.maritalStatus.trim() : '';
    const spouse = typeof familyRaw.spouseName === 'string' ? familyRaw.spouseName.trim() : '';
    const relations = Array.isArray(familyRaw.relations) ? familyRaw.relations : [];
    const hasValidRelation = relations.some((r: any) => {
      const rt = typeof r?.relationType === 'string' ? r.relationType.trim() : '';
      const fn = typeof r?.fullName === 'string' ? r.fullName.trim() : '';
      return !!(rt && fn);
    });
    familyCompleted = !!marital || hasValidRelation || (marital === 'married' && !!spouse);
  }

  return {
    personal: { completed: personalCompleted, verified: personalVerified },
    location: { completed: locationCompleted, verified: false },
    education: { completed: educationCompleted, verified: educationVerified },
    social: { completed: hasSocial, verified: hasSocial },
    work: { completed: workCompleted, verified: workVerified },
    projects: { completed: projectsCompleted, verified: projectsVerified },
    certification: { completed: certificationCompleted, verified: certificationVerified },
    family: { completed: familyCompleted, verified: false },
  };
}

type CertificateEntry = {
  name: string;
  issuedBy: string;
  issuedDate: string;
  expirationDate: string;
  credentialId: string;
  reportingUrl: string;
  supportingMediaUrl: string;
  certVerificationStatus?: 'pending' | 'verified';
};

const emptyCertificate = (): CertificateEntry => ({
  name: '',
  issuedBy: '',
  issuedDate: '',
  expirationDate: '',
  credentialId: '',
  reportingUrl: '',
  supportingMediaUrl: '',
  certVerificationStatus: 'pending',
});

function cloneCertificate(c: CertificateEntry): CertificateEntry {
  return { ...c };
}

function formatCertificateCardSubtitle(c: CertificateEntry): string {
  const parts: string[] = [];
  if (c.issuedBy?.trim()) parts.push(`Issued by ${c.issuedBy.trim()}`);
  if (c.issuedDate?.trim()) parts.push(`Issued ${c.issuedDate}`);
  if (c.expirationDate?.trim()) parts.push(`Expires ${c.expirationDate}`);
  if (c.credentialId?.trim()) parts.push(`ID ${c.credentialId.trim()}`);
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

function validateLocationEntry(loc: LocationEntry, index: number): string | null {
  const label = `Location ${index + 1}`;
  if (!loc.country?.trim()) return `${label}: country is required`;
  if (!loc.address?.trim()) return `${label}: address is required`;
  if (!loc.city?.trim()) return `${label}: city is required`;
  if (!loc.state?.trim()) return `${label}: state / region is required`;
  const status = loc.verificationStatus ?? 'pending';
  if (status === 'verified') {
    const digital = loc.documentType === 'digital_verify';
    if (!digital && !loc.documentUrl?.trim()) return `${label}: upload a proof-of-address document`;
    if (!digital && !loc.documentType?.trim()) return `${label}: document type is required`;
  }
  return null;
}

function validateLocationsList(list: LocationEntry[]): string | null {
  if (list.length === 0) return 'Add at least one location.';
  const defaults = list.filter((l) => l.isDefault);
  if (defaults.length !== 1) return 'Select exactly one default location.';
  for (let i = 0; i < list.length; i++) {
    const err = validateLocationEntry(list[i], i);
    if (err) return err;
  }
  return null;
}

function validateEducationEntry(entry: EducationEntry, index: number): string | null {
  const label = `Education ${index + 1}`;
  if (!entry.institutionName?.trim()) return `${label}: institution / school is required`;
  if (!entry.grade?.trim()) return `${label}: grade is required`;
  if (!entry.fieldOfStudy?.trim()) return `${label}: field of study is required`;
  if (!entry.country?.trim()) return `${label}: country is required`;
  if (!entry.levelOfEducation) return `${label}: level is required`;
  if (!entry.degreeType) return `${label}: qualification is required`;
  if (!entry.startMonth || !entry.startYear) return `${label}: start month and year are required`;
  if (!entry.expectedEndOngoing && (!entry.endMonth || !entry.endYear)) {
    return `${label}: end month and year are required, or mark “expected end date (ongoing)”`;
  }
  const startKey = yearMonthSortKey(entry.startYear, entry.startMonth);
  const endKey = yearMonthSortKey(entry.endYear, entry.endMonth);
  if (startKey != null && endKey != null && endKey < startKey) {
    return `${label}: end date cannot be before start date`;
  }
  const costErr = validateAmountField('Cost of education', entry.costOfEducation);
  if (costErr) return `${label}: ${costErr}`;
  const loanErr = validateAmountField('Pending loan', entry.pendingLoanAmount);
  if (loanErr) return `${label}: ${loanErr}`;
  const mediaErr = validateOptionalHttpUrl('Supporting media URL', entry.supportingMediaUrl);
  if (mediaErr) return `${label}: ${mediaErr}`;
  for (let mi = 0; mi < entry.programMilestones.length; mi++) {
    const m = entry.programMilestones[mi];
    const hasT = !!m.title?.trim();
    const hasS = !!m.startDate?.trim();
    if (hasT && !hasS) {
      return `${label}: milestone ${mi + 1}: start date is required when a title is entered`;
    }
    if (m.startDate && m.endDate && m.startDate > m.endDate) {
      return `${label}: milestone ${mi + 1}: end date cannot be before start date`;
    }
  }
  return null;
}

function validateEducationList(list: EducationEntry[]): string | null {
  const toSave = list.filter((e) => e.id || e.institutionName.trim());
  if (toSave.length === 0) {
    return 'Add at least one education entry with an institution name.';
  }
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!e.id && !e.institutionName.trim()) continue;
    const err = validateEducationEntry(e, i);
    if (err) return err;
  }
  return null;
}

function validateWorkEntry(entry: WorkEntry, index: number): string | null {
  const label = `Work experience ${index + 1}`;
  if (!entry.organisationName?.trim()) return `${label}: organisation name is required`;
  if (!entry.industry?.trim()) return `${label}: industry is required`;
  if (!entry.employmentType) return `${label}: employment type is required`;
  if (!entry.workMode) return `${label}: work mode is required`;
  if (!entry.workRoles?.length) return `${label}: add at least one role`;
  const primary = entry.workRoles[0];
  if (!primary.title?.trim()) return `${label}: role title is required`;
  if (!primary.startDate?.trim()) return `${label}: start date is required for the role`;
  if (!primary.currentlyWorking && !primary.endDate?.trim()) {
    return `${label}: end date is required, or mark “Currently working here”`;
  }
  for (let ri = 1; ri < entry.workRoles.length; ri++) {
    const r = entry.workRoles[ri];
    if (!r.title?.trim()) continue;
    if (!r.startDate?.trim()) return `${label}: role ${ri + 1}: start date is required`;
    if (!r.currentlyWorking && !r.endDate?.trim()) {
      return `${label}: role ${ri + 1}: end date is required, or mark as current`;
    }
  }
  if (!entry.selfDeclared) {
    const web = entry.verifyWebsite?.trim();
    const em = entry.verifyHrEmail?.trim();
    if (!web && !em) {
      return `${label}: add a verification website or HR email, or check “Self declared”`;
    }
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      return `${label}: enter a valid HR email address`;
    }
    const siteErr = web ? validateOptionalHttpUrl('Verification website', web) : null;
    if (siteErr) return `${label}: ${siteErr}`;
  }
  const salErr = validateAmountField('Salary', entry.salary);
  if (salErr) return `${label}: ${salErr}`;
  return null;
}

function validateWorkList(list: WorkEntry[]): string | null {
  const toSave = list.filter((e) => e.id || e.organisationName.trim());
  if (toSave.length === 0) {
    return 'Add at least one work experience with an organisation name.';
  }
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!e.id && !e.organisationName.trim()) continue;
    const err = validateWorkEntry(e, i);
    if (err) return err;
  }
  return null;
}

function validateProjectEntry(entry: ProjectEntry, index: number): string | null {
  const label = `Project ${index + 1}`;
  if (!entry.title?.trim()) return `${label}: title is required`;
  const linkErr = validateOptionalHttpUrl('Project link', entry.projectLink);
  if (linkErr) return `${label}: ${linkErr}`;
  const mediaErr = validateOptionalHttpUrl('Media URL', entry.mediaUrl);
  if (mediaErr) return `${label}: ${mediaErr}`;
  for (let mi = 0; mi < entry.teamMembers.length; mi++) {
    const m = entry.teamMembers[mi];
    const hasN = !!m.name?.trim();
    const hasR = !!m.role?.trim();
    if (hasN !== hasR) {
      return `${label}: team member ${mi + 1} needs both name and role, or leave the row empty`;
    }
  }
  return null;
}

function validateProjectList(list: ProjectEntry[]): string | null {
  const toSave = list.filter((p) => p.id || p.title.trim());
  if (toSave.length === 0) {
    return 'Add at least one project with a title.';
  }
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (!p.id && !p.title.trim()) continue;
    const err = validateProjectEntry(p, i);
    if (err) return err;
  }
  return null;
}

function validateCertificateEntry(c: CertificateEntry, index: number): string | null {
  const label = `Certificate ${index + 1}`;
  if (!c.name?.trim()) return `${label}: certificate name is required`;
  if (!c.issuedBy?.trim()) return `${label}: issued by is required`;
  const reportErr = validateOptionalHttpUrl('Reporting URL', c.reportingUrl);
  if (reportErr) return `${label}: ${reportErr}`;
  const mediaErr = validateOptionalHttpUrl('Supporting media URL', c.supportingMediaUrl);
  if (mediaErr) return `${label}: ${mediaErr}`;
  if (c.issuedDate && c.expirationDate && c.issuedDate > c.expirationDate) {
    return `${label}: expiration date cannot be before issued date`;
  }
  return null;
}

function validateCertificationList(list: CertificateEntry[]): string | null {
  if (list.length === 0) return 'Add at least one certification.';
  for (let i = 0; i < list.length; i++) {
    const err = validateCertificateEntry(list[i], i);
    if (err) return err;
  }
  return null;
}

function validateFamilyForm(
  maritalStatus: string,
  spouseName: string,
  relationsList: FamilyRelationEntry[],
): string | null {
  if (maritalStatus === 'married' && !spouseName?.trim()) {
    return 'Spouse name is required when marital status is Married.';
  }
  for (let i = 0; i < relationsList.length; i++) {
    const r = relationsList[i];
    const hasT = !!r.relationType?.trim();
    const hasN = !!r.fullName?.trim();
    if (!hasT && !hasN) continue;
    if (!hasT) return `Family relation ${i + 1}: select a relation type`;
    if (!hasN) return `Family relation ${i + 1}: enter full name`;
  }
  return null;
}

function validateFamilyRelationDraft(r: FamilyRelationEntry): string | null {
  if (!r.relationType?.trim()) return 'Select a relationship type.';
  if (!r.fullName?.trim()) return 'Enter relation full name.';
  return null;
}

const SOCIAL_URL_FIELDS = [
  { key: 'linkedin' as const, label: 'LinkedIn' },
  { key: 'twitter' as const, label: 'X (Twitter)' },
  { key: 'facebook' as const, label: 'Facebook' },
  { key: 'instagram' as const, label: 'Instagram' },
  { key: 'tiktok' as const, label: 'TikTok' },
  { key: 'snapchat' as const, label: 'Snapchat' },
];

function validateSocialForm(social: {
  linkedin: string;
  twitter: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  snapchat: string;
}): string | null {
  for (const { key, label } of SOCIAL_URL_FIELDS) {
    const v = social[key]?.trim();
    if (!v) continue;
    const err = validateOptionalHttpUrl(`${label} URL`, v);
    if (err) return err;
  }
  return null;
}

export default function VerificationCenter() {
  const [loading, setLoading] = useState(true);
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
  const { completedVerificationSteps, progressPct } = useMemo(() => {
    const total = VERIFICATION_TABS.length;
    const done = VERIFICATION_TABS.filter(({ id }) => {
      const s = verificationStatus[id];
      return s?.completed || s?.verified;
    }).length;
    return {
      completedVerificationSteps: done,
      progressPct: total ? Math.round((done / total) * 100) : 0,
    };
  }, [verificationStatus]);
  const [saving, setSaving] = useState(false);

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
  const [livenessSelfieModalOpen, setLivenessSelfieModalOpen] = useState(false);
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
  const [verifyAddressModal, setVerifyAddressModal] = useState<{
    open: boolean;
    locationIndex: number | null;
    step: VerifyAddressModalStep;
  }>({ open: false, locationIndex: null, step: 'method' });
  const locationVerifyFileInputRef = useRef<HTMLInputElement>(null);
  const locationVerifyUploadIndexRef = useRef<number | null>(null);
  const [uploadingLocationIndex, setUploadingLocationIndex] = useState<number | null>(null);

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

  // Work (list of entries like Location)
  const [workEntriesList, setWorkEntriesList] = useState<WorkEntry[]>([]);
  const [workDraft, setWorkDraft] = useState<WorkEntry>(() => emptyWork());
  const [workSaving, setWorkSaving] = useState(false);

  const [projectsList, setProjectsList] = useState<ProjectEntry[]>([]);
  const [projectDraft, setProjectDraft] = useState<ProjectEntry>(() => emptyProject());
  const [projectEditingIndex, setProjectEditingIndex] = useState<number | null>(null);
  const [projectSaving, setProjectSaving] = useState(false);

  // Certification (local only for now)
  const [certList, setCertList] = useState<CertificateEntry[]>([]);
  const [certDraft, setCertDraft] = useState<CertificateEntry>(() => emptyCertificate());
  const [certEditingIndex, setCertEditingIndex] = useState<number | null>(null);
  const [certDraftUploading, setCertDraftUploading] = useState(false);

  // Family & Relationship
  const [maritalStatus, setMaritalStatus] = useState('');
  const [spouseName, setSpouseName] = useState('');
  const [relationsList, setRelationsList] = useState<FamilyRelationEntry[]>([]);
  const [familyRelationDraft, setFamilyRelationDraft] = useState<FamilyRelationEntry>(() => emptyFamilyRelation());
  const [familyRelationEditingIndex, setFamilyRelationEditingIndex] = useState<number | null>(null);

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

  const identityFlowComplete =
    identityVerificationPath !== 'none' || verificationStatus.personal.verified;

  useEffect(() => {
    if (loading) return;
    let next: PersonalFlowStep = 'complete';
    if (!personalBasicComplete) next = 'add_data';
    else if (!identityFlowComplete) next = 'identity';
    else if (!userEmailVerified || !userPhoneVerified) next = 'contact';
    else if (!livenessCompleteLocal) next = 'liveness';
    else next = 'complete';
    setPersonalFlowStep(next);
  }, [
    loading,
    personalBasicComplete,
    identityFlowComplete,
    userPhoneVerified,
    userEmailVerified,
    livenessCompleteLocal,
  ]);

  const fetchProfile = async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setLoading(true);
    try {
      const [profileRes, statusRes] = await Promise.all([
        api.get('/v1/professional/profile'),
        api.get('/v1/professional/verification-status').catch(() => ({ data: { data: null } })),
      ]);
      const data = profileRes.data?.data;
      setProfile(data);
      if (data && typeof data === 'object') {
        setLivenessCompleteLocal(
          Boolean((data as { livenessSelfieUrl?: string | null }).livenessSelfieUrl),
        );
      }
      const status = statusRes.data?.data as Partial<Record<SectionKey, { completed?: boolean; verified?: boolean }>> | undefined;
      const derived = data && typeof data === 'object' ? deriveVerificationStatusFromProfile(data) : null;
      if (status || derived) {
        const mergeKey = (key: SectionKey): { completed: boolean; verified: boolean } => {
          const s = status?.[key];
          const d = derived?.[key];
          return {
            completed: !!(s?.completed || s?.verified || d?.completed || d?.verified),
            verified: !!(s?.verified || d?.verified),
          };
        };
        setVerificationStatus({
          personal: mergeKey('personal'),
          location: mergeKey('location'),
          education: mergeKey('education'),
          social: mergeKey('social'),
          work: mergeKey('work'),
          projects: mergeKey('projects'),
          certification: mergeKey('certification'),
          family: mergeKey('family'),
        });
      }
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
        setPersonal((p) => ({
          ...p,
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          email: u.email || '',
          phoneNumber: u.phoneNumber || p.phoneNumber || '',
        }));
      }
      if (data) {
        const addressData = data.address && typeof data.address === 'object' ? data.address : {};
        setPersonal((p) => ({
          ...p,
          middleName: data.middleName ?? p.middleName ?? '',
          gender: data.gender ?? p.gender ?? '',
          nationality: data.nationality || '',
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
        } else if (data.country || data.locationDocumentUrl || (data as any).locationDocumentType) {
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
              const rawProg = e.programProgression;
              let programMilestones: EducationProgramMilestoneEntry[] = [emptyEducationMilestone()];
              if (Array.isArray(rawProg) && rawProg.length > 0) {
                programMilestones = rawProg.map((m: any) => ({
                  title: typeof m?.title === 'string' ? m.title : '',
                  startDate:
                    typeof m?.startDate === 'string' && m.startDate
                      ? m.startDate.slice(0, 10)
                      : '',
                  endDate:
                    typeof m?.endDate === 'string' && m.endDate ? m.endDate.slice(0, 10) : '',
                  currentlyActive: !!m?.currentlyActive,
                }));
              }
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
                scholarshipsAndAid: e.scholarshipsAndAid || '',
                programDescription: e.programDescription || '',
                academicResponsibilities: e.academicResponsibilities || '',
                academicAchievements: e.academicAchievements || '',
                programMilestones,
                activitiesSocieties: e.activitiesSocieties || '',
                associatedSkills: e.associatedSkills || '',
                supportingMediaUrl: e.supportingMediaUrl || '',
                eduVerificationStatus: (e as any).verified ? 'verified' : 'pending',
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
              const vc = w.verificationContact && typeof w.verificationContact === 'object' ? w.verificationContact : {};
              const sr = w.salaryRange && typeof w.salaryRange === 'object' ? w.salaryRange : null;
              const startD = w.startDate ? (typeof w.startDate === 'string' ? w.startDate.slice(0, 10) : '') : '';
              const endD = w.endDate ? (typeof w.endDate === 'string' ? w.endDate.slice(0, 10) : '') : '';
              const respArr = Array.isArray(w.responsibilities) ? w.responsibilities.filter((x: unknown) => typeof x === 'string') : [];
              const achArr = Array.isArray(w.achievements) ? w.achievements.filter((x: unknown) => typeof x === 'string') : [];
              const skillsLine = achArr.find((a: string) => /^Skills:\s*/i.test(a));
              const achievementsOnly = achArr.filter((a: string) => !/^Skills:\s*/i.test(a));
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
                ],
                jobDescription: '',
                responsibilitiesText: respArr.join('\n'),
                achievementsText: achievementsOnly.join('\n'),
                associatedSkills: skillsLine ? skillsLine.replace(/^Skills:\s*/i, '').trim() : '',
                otherCompensation: [],
                otherCompensationInput: '',
                otherCompensationNotes: '',
                selfDeclared: !vc.email && !vc.website,
                verifyWebsite: vc.website || '',
                verifyHrEmail: vc.email || '',
                workVerificationStatus: (w as any).verified ? 'verified' : 'pending',
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
              return {
                id: p.id,
                title: p.title || '',
                description: p.description || '',
                projectLink: p.projectLink || '',
                mediaUrl: p.mediaUrl || '',
                teamMembers,
                projectVerificationStatus: (p as any).verified ? 'verified' : 'pending',
              };
            }),
          );
        } else {
          setProjectsList([]);
        }
        if (Array.isArray(data.certifications)) {
          if (data.certifications.length > 0) {
            setCertList(
              data.certifications.map((c: any) => ({
                name: c.name || '',
                issuedBy: c.issuedBy || '',
                issuedDate: c.issuedDate || '',
                expirationDate: c.expirationDate || '',
                credentialId: c.credentialId || '',
                reportingUrl: c.reportingUrl || '',
                supportingMediaUrl: c.supportingMediaUrl || '',
                certVerificationStatus: (c as any).verified ? 'verified' : 'pending',
              })),
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
      if (!opts?.soft) setLoading(false);
    }
  };


  const personalBasicRequiredFields = (): string[] => {
    const missing: string[] = [];
    if (!personal.firstName?.trim()) missing.push('First name');
    if (!personal.lastName?.trim()) missing.push('Last name');
    if (!personal.dateOfBirth) missing.push('Date of birth');
    if (!personal.gender) missing.push('Gender');
    if (!personal.nationality) missing.push('Nationality');
    return missing;
  };

  const personalGovIdRequiredFields = (): string[] => {
    const missing: string[] = [];
    if (!personal.nationality) missing.push('Country of nationality');
    if (!personal.idType) missing.push('ID type');
    if (!personal.idNumber?.trim()) missing.push('ID number');
    return missing;
  };

  const idNumberPlaceholder = (): string => {
    const label = ID_TYPE_OPTIONS.find((o) => o.value === personal.idType)?.label || 'ID';
    return `Enter your ${label} number`;
  };

  const handleAddPersonalBasic = async () => {
    const missingPersonal = personalBasicRequiredFields();
    if (missingPersonal.length) {
      toast.error(`Please fill required fields: ${missingPersonal.join(', ')}`);
      return;
    }
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
      setSectionEditMode((prev) => ({ ...prev, personal: false }));
      await fetchProfile();
      setPersonalFlowStep('identity');
      setVerifyPersonalModalOpen(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePersonal = async () => {
    const missingPersonal = personalBasicRequiredFields();
    if (missingPersonal.length) {
      toast.error(`Please fill required fields: ${missingPersonal.join(', ')}`);
      return;
    }
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
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitGovIdVerification = async () => {
    const missing = personalGovIdRequiredFields();
    if (missing.length) {
      toast.error(`Please complete: ${missing.join(', ')}`);
      return;
    }
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
      await fetchProfile();
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
      };
    });

  const putLocationsProfile = async (list: LocationEntry[], options?: { silentSuccess?: boolean }) => {
    setSaving(true);
    try {
      await api.put('/v1/professional/profile', {
        locations: mapLocationsForApi(list),
      });
      if (!options?.silentSuccess) toast.success('Location saved');
      setSectionEditMode((prev) => ({ ...prev, location: false }));
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const tryPersistLocations = (list: LocationEntry[], silentSuccess?: boolean) => {
    const locErr = validateLocationsList(list);
    if (locErr) return;
    void putLocationsProfile(list, { silentSuccess });
  };

  const updateLocation = (index: number, updates: Partial<LocationEntry>) => {
    setLocationsList((prev) =>
      prev.map((loc, i) => (i === index ? { ...loc, ...updates } : loc)),
    );
  };

  const addLocationFromDraft = () => {
    if (
      !locationDraft.country.trim() ||
      !locationDraft.state.trim() ||
      !locationDraft.city.trim() ||
      !locationDraft.address.trim()
    ) {
      toast.error('Fill country, state, city, and street address');
      return;
    }
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
    toast.success('Location added — verify to unlock full access');
  };

  const setDefaultLocation = (index: number) => {
    setLocationsList((prev) => {
      const next = prev.map((loc, i) => ({ ...loc, isDefault: i === index }));
      queueMicrotask(() => tryPersistLocations(next, true));
      return next;
    });
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

  const commitEducationDraft = () => {
    const labelIndex = educationEntriesList.length;
    const err = validateEducationEntry(educationDraft, labelIndex);
    if (err) {
      toast.error(err);
      return;
    }
    const entry = cloneEducationEntry({
      ...educationDraft,
      id: undefined,
      eduVerificationStatus: 'pending',
    });
    setEducationEntriesList((prev) => {
      const next = [entry, ...prev];
      queueMicrotask(() => void syncEducationEntriesToApi(next, { silentSuccess: true }));
      return next;
    });
    toast.success('Education added');
    setEducationDraft(emptyEducation());
  };

  const removeEducationEntry = (index: number) => {
    setEducationEntriesList((prev) => {
      const next = prev.filter((_, i) => i !== index);
      queueMicrotask(() => void syncEducationEntriesToApi(next, { silentSuccess: true }));
      return next;
    });
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

  const commitWorkDraft = () => {
    const labelIndex = workEntriesList.length;
    const err = validateWorkEntry(workDraft, labelIndex);
    if (err) {
      toast.error(err);
      return;
    }
    const primary = workDraft.workRoles[0];
    const synced: WorkEntry = {
      ...cloneWorkEntry(workDraft),
      role: primary.title.trim(),
      startDate: primary.startDate,
      endDate: primary.currentlyWorking ? '' : primary.endDate,
    };
    const entry = { ...synced, id: undefined, workVerificationStatus: 'pending' as const };
    setWorkEntriesList((prev) => {
      const next = [entry, ...prev];
      queueMicrotask(() => void syncWorkEntriesToApi(next, { silentSuccess: true }));
      return next;
    });
    toast.success('Work experience added');
    setWorkDraft(emptyWork());
  };

  const onSelfDeclarationBackOrClose = () => {
    if (selfDeclarationFlow.open && selfDeclarationFlow.kind === 'personal') {
      setVerifyPersonalModalOpen(true);
    }
    setSelfDeclarationFlow({ open: false });
  };

  const onSelfDeclarationConfirm = () => {
    if (!selfDeclarationFlow.open) return;
    if (selfDeclarationFlow.kind === 'personal') {
      setIdentityVerificationPath('self');
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
    } else if (selfDeclarationFlow.kind === 'work') {
      updateWorkDraft({ selfDeclared: true });
      toast.success('Self declaration recorded');
    }
    setSelfDeclarationFlow({ open: false });
  };

  const removeWorkEntry = (index: number) => {
    setWorkEntriesList((prev) => {
      const next = prev.filter((_, i) => i !== index);
      queueMicrotask(() => void syncWorkEntriesToApi(next, { silentSuccess: true }));
      return next;
    });
  };

  const removeLocation = (index: number) => {
    setLocationsList((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) return next;
      const removedWasDefault = prev[index]?.isDefault;
      const adjusted = !removedWasDefault ? next : next.map((l, i) => ({ ...l, isDefault: i === 0 }));
      queueMicrotask(() => tryPersistLocations(adjusted, true));
      return adjusted;
    });
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
          patch.verificationStatus = 'verified';
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
    const socialErr = validateSocialForm(social);
    if (socialErr) {
      toast.error(socialErr);
      return;
    }
    setSaving(true);
    try {
      await api.put('/v1/professional/profile', {
        socialMedia: social,
      });
      toast.success('Social profiles saved');
      fetchProfile();
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
    const eduErr = validateEducationList(list);
    if (eduErr) {
      if (!options?.silentSuccess) toast.error(eduErr);
      return;
    }
    const toSave = list.filter((e) => e.id || e.institutionName.trim());
    const profId = profile.id;
    setEducationSaving(true);
    try {
      for (const entry of toSave) {
        const startDate = buildMonthYear(entry.startMonth, entry.startYear)!;
        const endDate = buildMonthYear(entry.endMonth, entry.endYear);
        const programProgression = entry.programMilestones
          .filter((m) => m.title.trim())
          .map((m) => ({
            title: m.title.trim(),
            startDate: m.startDate.trim(),
            endDate: m.endDate.trim() || undefined,
            currentlyActive: m.currentlyActive,
          }));
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
          pendingLoanAmount: entry.pendingLoanAmount ? parseFloat(entry.pendingLoanAmount) : undefined,
          loanCurrency: entry.loanCurrency || undefined,
          loanRepaymentFrequency: entry.loanRepaymentFrequency || undefined,
          scholarshipsAndAid: entry.scholarshipsAndAid?.trim() || undefined,
          programDescription: entry.programDescription?.trim() || undefined,
          academicResponsibilities: entry.academicResponsibilities?.trim() || undefined,
          academicAchievements: entry.academicAchievements?.trim() || undefined,
          programProgression: programProgression.length ? programProgression : undefined,
          activitiesSocieties: entry.activitiesSocieties?.trim() || undefined,
          associatedSkills: entry.associatedSkills?.trim() || undefined,
          supportingMediaUrl: entry.supportingMediaUrl?.trim() || undefined,
        };
        if (entry.id) {
          await api.put(`/v1/professional/education/${entry.id}`, payload);
        } else {
          await api.post(`/v1/professional/${profId}/education`, payload);
        }
      }
      if (!options?.silentSuccess) toast.success('Education saved');
      setSectionEditMode((prev) => ({ ...prev, education: false }));
      fetchProfile();
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
      ...entry.jobDescription.split('\n').map((s) => s.trim()).filter(Boolean),
      ...entry.responsibilitiesText.split('\n').map((s) => s.trim()).filter(Boolean),
      ...(extraRoles.length ? [`Other roles: ${extraRoles.join('; ')}`] : []),
    ];
    const achievementsLines = [
      ...entry.achievementsText.split('\n').map((s) => s.trim()).filter(Boolean),
      ...(entry.otherCompensationNotes.trim() ? [entry.otherCompensationNotes.trim()] : []),
      ...entry.otherCompensation.filter(Boolean),
      ...(entry.associatedSkills.trim() ? [`Skills: ${entry.associatedSkills.trim()}`] : []),
    ];
    const startDate =
      primary.startDate?.trim() || entry.startDate?.trim() || new Date().toISOString().split('T')[0];
    const endDate = primary.currentlyWorking ? undefined : primary.endDate?.trim() || undefined;
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
      ...(entry.selfDeclared
        ? {}
        : {
            verificationContact: {
              email: entry.verifyHrEmail?.trim() || undefined,
              website: entry.verifyWebsite?.trim() || undefined,
            },
          }),
    };
  };

  const syncWorkEntriesToApi = async (list: WorkEntry[], options?: { silentSuccess?: boolean }) => {
    if (!profile?.id) return;
    const workErr = validateWorkList(list);
    if (workErr) {
      if (!options?.silentSuccess) toast.error(workErr);
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
      if (!options?.silentSuccess) toast.success('Work experience saved');
      setSectionEditMode((prev) => ({ ...prev, work: false }));
      fetchProfile();
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
    const labelIndex = projectEditingIndex ?? projectsList.length;
    const err = validateProjectEntry(projectDraft, labelIndex);
    if (err) {
      toast.error(err);
      return;
    }
    if (projectEditingIndex != null) {
      const i = projectEditingIndex;
      const merged = cloneProjectEntry(projectDraft);
      setProjectsList((prev) => {
        const next = prev.map((p, idx) => (idx === i ? merged : p));
        queueMicrotask(() => void syncProjectsListToApi(next, { silentSuccess: true }));
        return next;
      });
      setProjectEditingIndex(null);
      toast.success('Project updated');
    } else {
      const entry = cloneProjectEntry({
        ...projectDraft,
        id: undefined,
        projectVerificationStatus: 'pending',
      });
      setProjectsList((prev) => {
        const next = [...prev, entry];
        queueMicrotask(() => void syncProjectsListToApi(next, { silentSuccess: true }));
        return next;
      });
      toast.success('Project added');
    }
    setProjectDraft(emptyProject());
  };

  const beginEditProjectEntry = (index: number) => {
    const p = projectsList[index];
    if (!p) return;
    setProjectDraft(cloneProjectEntry(p));
    setProjectEditingIndex(index);
  };

  const cancelProjectDraft = () => {
    setProjectDraft(emptyProject());
    setProjectEditingIndex(null);
  };

  const removeProjectEntry = (index: number) => {
    if (projectEditingIndex === index) {
      setProjectDraft(emptyProject());
      setProjectEditingIndex(null);
    } else if (projectEditingIndex != null && projectEditingIndex > index) {
      setProjectEditingIndex(projectEditingIndex - 1);
    }
    setProjectsList((prev) => {
      const next = prev.filter((_, i) => i !== index);
      queueMicrotask(() => void syncProjectsListToApi(next, { silentSuccess: true }));
      return next;
    });
  };

  const syncProjectsListToApi = async (list: ProjectEntry[], options?: { silentSuccess?: boolean }) => {
    if (!profile?.id) return;
    const projErr = validateProjectList(list);
    if (projErr) {
      if (!options?.silentSuccess) toast.error(projErr);
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
        const payload = {
          title: entry.title.trim(),
          description: entry.description?.trim() || undefined,
          projectLink: entry.projectLink?.trim() || undefined,
          mediaUrl: entry.mediaUrl?.trim() || undefined,
          teamMembers: teamMembers.length ? teamMembers : undefined,
        };
        if (entry.id) {
          await api.put(`/v1/professional/project/${entry.id}`, payload);
        } else {
          await api.post(`/v1/professional/${profId}/project`, payload);
        }
      }
      if (!options?.silentSuccess) toast.success('Projects saved');
      setSectionEditMode((prev) => ({ ...prev, projects: false }));
      fetchProfile();
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
    const labelIndex = certEditingIndex ?? certList.length;
    const err = validateCertificateEntry(certDraft, labelIndex);
    if (err) {
      toast.error(err);
      return;
    }
    if (certEditingIndex != null) {
      const i = certEditingIndex;
      const merged = cloneCertificate(certDraft);
      setCertList((prev) => {
        const next = prev.map((c, idx) => (idx === i ? merged : c));
        queueMicrotask(() => void syncCertificationsToApi(next, { silentSuccess: true }));
        return next;
      });
      setCertEditingIndex(null);
      toast.success('Certification updated');
    } else {
      const entry = cloneCertificate({ ...certDraft, certVerificationStatus: 'pending' });
      setCertList((prev) => {
        const next = [...prev, entry];
        queueMicrotask(() => void syncCertificationsToApi(next, { silentSuccess: true }));
        return next;
      });
      toast.success('Certification added');
    }
    setCertDraft(emptyCertificate());
  };

  const beginEditCert = (index: number) => {
    const c = certList[index];
    if (!c) return;
    setCertDraft(cloneCertificate(c));
    setCertEditingIndex(index);
  };

  const cancelCertDraft = () => {
    setCertDraft(emptyCertificate());
    setCertEditingIndex(null);
  };

  const removeCertificate = (index: number) => {
    if (certEditingIndex === index) {
      setCertDraft(emptyCertificate());
      setCertEditingIndex(null);
    } else if (certEditingIndex != null && certEditingIndex > index) {
      setCertEditingIndex(certEditingIndex - 1);
    }
    setCertList((prev) => {
      const next = prev.filter((_, i) => i !== index);
      queueMicrotask(() => void syncCertificationsToApi(next, { silentSuccess: true }));
      return next;
    });
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
    const certErr = validateCertificationList(list);
    if (certErr) {
      if (!options?.silentSuccess) toast.error(certErr);
      return;
    }
    setSaving(true);
    try {
      await api.put('/v1/professional/profile', {
        certifications: list.map((c) => ({
          name: c.name,
          issuedBy: c.issuedBy,
          issuedDate: c.issuedDate || undefined,
          expirationDate: c.expirationDate || undefined,
          credentialId: c.credentialId,
          reportingUrl: c.reportingUrl || undefined,
          supportingMediaUrl: c.supportingMediaUrl || undefined,
        })),
      });
      if (!options?.silentSuccess) toast.success('Certifications saved');
      setSectionEditMode((prev) => ({ ...prev, certification: false }));
      fetchProfile();
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
    const famErr = validateFamilyForm(marital, spouse, list);
    if (famErr) {
      if (!options?.silentSuccess) toast.error(famErr);
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
      if (!options?.silentSuccess) toast.success('Family information saved');
      if (options?.exitEditMode) {
        setSectionEditMode((prev) => ({ ...prev, family: false }));
      }
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save family information');
    } finally {
      setSaving(false);
    }
  };

  const updateFamilyRelationDraft = (updates: Partial<FamilyRelationEntry>) => {
    setFamilyRelationDraft((d) => ({ ...d, ...updates }));
  };

  const cancelFamilyRelationDraft = () => {
    setFamilyRelationDraft(emptyFamilyRelation());
    setFamilyRelationEditingIndex(null);
  };

  const beginEditFamilyRelation = (index: number) => {
    const r = relationsList[index];
    if (!r) return;
    setFamilyRelationDraft({ relationType: r.relationType, fullName: r.fullName });
    setFamilyRelationEditingIndex(index);
  };

  const commitFamilyRelationDraft = () => {
    const draftErr = validateFamilyRelationDraft(familyRelationDraft);
    if (draftErr) {
      toast.error(draftErr);
      return;
    }
    const i = familyRelationEditingIndex;
    const next =
      i != null
        ? relationsList.map((r, idx) => (idx === i ? { ...familyRelationDraft } : r))
        : [...relationsList, { ...familyRelationDraft }];
    const famErr = validateFamilyForm(maritalStatus, spouseName, next);
    if (famErr) {
      toast.error(famErr);
      return;
    }
    setRelationsList(next);
    setFamilyRelationEditingIndex(null);
    setFamilyRelationDraft(emptyFamilyRelation());
    toast.success(i != null ? 'Relation updated' : 'Relation added');
    void syncFamilyToApi(maritalStatus, spouseName, next, { silentSuccess: true, exitEditMode: true });
  };

  const removeFamilyRelation = (index: number) => {
    if (familyRelationEditingIndex === index) {
      setFamilyRelationDraft(emptyFamilyRelation());
      setFamilyRelationEditingIndex(null);
    } else if (familyRelationEditingIndex != null && familyRelationEditingIndex > index) {
      setFamilyRelationEditingIndex(familyRelationEditingIndex - 1);
    }
    setRelationsList((prev) => {
      const next = prev.filter((_, i) => i !== index);
      queueMicrotask(() =>
        void syncFamilyToApi(maritalStatus, spouseName, next, { silentSuccess: true, exitEditMode: true }),
      );
      return next;
    });
  };

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

        <div className="mb-6 rounded-lg bg-gray-100 p-0.5">
          <nav className="flex flex-wrap gap-0.5 overflow-x-auto" aria-label="Verification sections">
            {VERIFICATION_TABS.map(({ id, label }) => {
              const status = verificationStatus[id];
              const verified = status?.verified ?? false;
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSearchParams({ tab: id })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium whitespace-nowrap rounded-md transition-colors ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                      : 'text-gray-600 hover:bg-gray-50/80 border border-transparent'
                  }`}
                >
                  {label}
                  {verified && <HiCheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" aria-hidden />}
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

              {!(sectionEditMode.personal && personalBasicComplete) && (
                <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
                  {/* <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Personal verification flow</p> */}
                  <div className="flex flex-wrap gap-2">
                    {PERSONAL_FLOW_STEPS.map(({ step, label }, i) => {
                      const cur = personalFlowStepIndex(personalFlowStep);
                      const done = cur > i || personalFlowStep === 'complete';
                      const active = personalFlowStep === step;
                      return (
                        <div
                          key={step}
                          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border ${
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
                        Update your details, then continue to return to your verification flow.
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
                        onChange={(e) => setPersonal((p) => ({ ...p, firstName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={personal.lastName}
                        onChange={(e) => setPersonal((p) => ({ ...p, lastName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        required
                      />
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nationality <span className="text-red-500">*</span>
                      </label>
                      <SearchableList
                        value={personal.nationality}
                        onChange={(nationality) => setPersonal((p) => ({ ...p, nationality }))}
                        options={[{ value: '', label: 'Select country' }, ...COUNTRIES.map((c) => ({ value: c, label: c }))]}
                        placeholder="Select country"
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={personal.dateOfBirth}
                        onChange={(e) => setPersonal((p) => ({ ...p, dateOfBirth: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <SearchableList
                        value={personal.gender}
                        onChange={(gender) => setPersonal((p) => ({ ...p, gender }))}
                        options={[{ value: '', label: 'Select' }, ...GENDERS.map((g) => ({ value: g, label: g }))]}
                        placeholder="Select"
                        className="bg-gray-50"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const missing = personalBasicRequiredFields();
                      if (missing.length) {
                        toast.error(`Please fill required fields: ${missing.join(', ')}`);
                        return;
                      }
                      void handleSavePersonal();
                    }}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium"
                  >
                    <HiArrowRight className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Continue'}
                  </button>
                </div>
              ) : !personalBasicComplete ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-gray-900">Personal Identity Information</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Enter your details, then continue to choose how we verify your identity.
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
                        onChange={(e) => setPersonal((p) => ({ ...p, firstName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="First name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={personal.lastName}
                        onChange={(e) => setPersonal((p) => ({ ...p, lastName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="Last name"
                        required
                      />
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nationality <span className="text-red-500">*</span>
                      </label>
                      <SearchableList
                        value={personal.nationality}
                        onChange={(nationality) => setPersonal((p) => ({ ...p, nationality }))}
                        options={[{ value: '', label: 'Select country' }, ...COUNTRIES.map((c) => ({ value: c, label: c }))]}
                        placeholder="Select country"
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={personal.dateOfBirth}
                        onChange={(e) => setPersonal((p) => ({ ...p, dateOfBirth: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <SearchableList
                        value={personal.gender}
                        onChange={(gender) => setPersonal((p) => ({ ...p, gender }))}
                        options={[{ value: '', label: 'Select' }, ...GENDERS.map((g) => ({ value: g, label: g }))]}
                        placeholder="Select"
                        className="bg-gray-50"
                      />
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
              ) : personalFlowStep === 'identity' ? (
                <div className="space-y-5 min-h-[280px]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-gray-900">Verify your identity</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Proceed by choosing self declaration or government ID. A dialog will open with both options.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSectionEditMode((prev) => ({ ...prev, personal: true }))}
                      className="shrink-0 text-sm font-semibold text-gray-900 hover:text-brand-600"
                    >
                      Edit Data
                    </button>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Data on file</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <div>
                        <span className="text-gray-500">Name: </span>
                        <span className="text-gray-900">
                          {personal.firstName} {personal.lastName}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Nationality: </span>
                        <span className="text-gray-900">{personal.nationality || '—'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVerifyPersonalModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium text-sm"
                  >
                    <HiShieldCheck className="w-4 h-4" />
                    Choose verification method
                  </button>
                </div>
              ) : personalFlowStep === 'contact' ? (
                <div className="w-full space-y-5 min-h-[280px]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-gray-900">Email & phone</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {userEmailVerified
                          ? 'Add your phone number and confirm the code we send by SMS or to your account email.'
                          : 'Verify your account email, then verify your phone number to continue.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSectionEditMode((prev) => ({ ...prev, personal: true }))}
                      className="shrink-0 text-sm font-semibold text-gray-900 hover:text-brand-600"
                    >
                      Edit Data
                    </button>
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
                                <SearchableList
                                  id="contact-phone-dial"
                                  value={phoneDialSelection}
                                  onChange={setPhoneDialSelection}
                                  options={PHONE_DIAL_SEARCH_OPTIONS}
                                  placeholder="Search country or code"
                                  className="bg-white text-sm h-10 py-2"
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
                                      const split = splitPlusPrefixedPhone(v);
                                      if (split) {
                                        setPhoneDialSelection(split.dialValue);
                                        setPersonal((p) => ({ ...p, phoneNumber: split.nationalNumber }));
                                        return;
                                      }
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
                </div>
              ) : personalFlowStep === 'liveness' ? (
                <div className="space-y-5 min-h-[280px]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-gray-900">Liveness check</h2>
                      <p className="text-sm text-gray-600 mt-1">Complete a quick camera check to confirm it is you.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSectionEditMode((prev) => ({ ...prev, personal: true }))}
                      className="shrink-0 text-sm font-semibold text-gray-900 hover:text-brand-600"
                    >
                      Edit Data
                    </button>
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
                            {profile?.livenessSelfieUrl ? (
                              <img
                                src={profile.livenessSelfieUrl}
                                alt="Liveness selfie"
                                className="h-9 w-9 rounded-lg border border-gray-200 object-cover"
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
                </div>
              ) : (
                <div className="space-y-6 min-h-[280px]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between gap-y-2">
                    <h2 className="text-lg font-semibold text-gray-900">Personal Identity Information</h2>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:justify-end">
                      {verificationStatus.personal.verified ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Verified
                        </span>
                      ) : verificationStatus.personal.completed ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Pending verification
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5 text-sm border-b border-gray-200 pb-6">
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
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Last Name</p>
                      <p className="text-gray-900 font-semibold flex items-center gap-1.5 flex-wrap">
                        {personal.lastName?.trim() || '—'}
                        {!!personal.lastName?.trim() && (
                          <HiCheckCircle className="w-4 h-4 text-green-600 shrink-0" aria-hidden />
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Other Names</p>
                      <p className="text-gray-900 font-semibold">{personal.middleName?.trim() || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Nationality</p>
                      <p className="text-gray-900 font-semibold">{personal.nationality?.trim() || '—'}</p>
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
                    <div>
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Gender</p>
                      <p className="text-gray-900 font-semibold">{personal.gender?.trim() || '—'}</p>
                    </div>
                  </div>

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
                        {livenessCompleteLocal && profile?.livenessSelfieUrl ? (
                          <img
                            src={profile.livenessSelfieUrl}
                            alt=""
                            className="h-8 w-8 rounded-md border border-gray-200 object-cover"
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
                    onClick={() => setSectionEditMode((prev) => ({ ...prev, personal: true }))}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800 hover:text-brand-600"
                  >
                    <HiLockClosed className="w-4 h-4 text-gray-500" aria-hidden />
                    Request Edit
                  </button>
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

              <div className="space-y-4">
                {locationsList.map((loc, index) => {
                  const status = loc.verificationStatus ?? 'pending';
                  const title =
                    [loc.city, loc.state].filter((s) => s?.trim()).join(', ') || 'Location';
                  const subtitle = `${loc.country?.trim() || '—'} · ${loc.address?.trim() || '—'}`;
                  return (
                    <div
                      key={`loc-${index}-${title}`}
                      className="rounded-xl border border-gray-200 bg-white p-5 space-y-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-3 min-w-0">
                          <HiLocationMarker className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">{title}</p>
                            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                          <div className="flex flex-wrap gap-1.5 justify-end">
                            {loc.isDefault && (
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                Default
                              </span>
                            )}
                            {status === 'pending' && (
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900">
                                Pending
                              </span>
                            )}
                            {status === 'self_declared' && (
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-900">
                                Self Declared
                              </span>
                            )}
                            {status === 'verified' && (
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                Verified
                              </span>
                            )}
                          </div>
                          {status === 'self_declared' && (
                            <p className="text-xs text-gray-400">via Self Declaration</p>
                          )}
                        </div>
                      </div>

                      {status === 'self_declared' && (
                        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
                          <HiExclamationCircle className="w-5 h-5 shrink-0 text-amber-700" />
                          <span>
                            Self Declaration — limited network access. Upgrade by verifying with a document.
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 justify-between gap-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {locationsList.length > 1 && !loc.isDefault && (
                            <button
                              type="button"
                              onClick={() => setDefaultLocation(index)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <HiStar className="w-4 h-4 text-gray-500" />
                              Set as Default
                            </button>
                          )}
                          {status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => openVerifyAddressModal(index)}
                              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                            >
                              <HiShieldCheck className="w-4 h-4" />
                              Verify
                            </button>
                          )}
                          {status === 'self_declared' && (
                            <>
                              <button
                                type="button"
                                onClick={() => openVerifyAddressModal(index)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500 bg-white px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
                              >
                                <HiShieldCheck className="w-4 h-4" />
                                Upgrade Verification
                              </button>
                              <button
                                type="button"
                                onClick={() => toast('Edit request recorded. Support will contact you if needed.')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                              >
                                <HiLockClosed className="w-4 h-4" />
                                Request Edit
                              </button>
                            </>
                          )}
                          {status === 'verified' && loc.documentUrl && (
                            <a
                              href={
                                loc.documentUrl.startsWith('http')
                                  ? loc.documentUrl
                                  : `${api.defaults.baseURL || ''}${loc.documentUrl}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-brand-600 hover:bg-gray-50"
                            >
                              View proof document
                            </a>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLocation(index)}
                          className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                        >
                          <HiX className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                      {uploadingLocationIndex === index && (
                        <p className="text-sm text-gray-500">Uploading document…</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <HiLocationMarker className="w-5 h-5 text-brand-600 shrink-0" />
                  <h3 className="text-base font-semibold text-gray-900">Add Location</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country of Residence</label>
                    <SearchableList
                      value={locationDraft.country}
                      onChange={(country) => setLocationDraft((d) => ({ ...d, country }))}
                      options={[{ value: '', label: 'Select country' }, ...COUNTRIES.map((c) => ({ value: c, label: c }))]}
                      placeholder="Select country"
                      className="[&_button]:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State / Province / District</label>
                    <input
                      type="text"
                      value={locationDraft.state}
                      onChange={(e) => setLocationDraft((d) => ({ ...d, state: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={locationDraft.city}
                      onChange={(e) => setLocationDraft((d) => ({ ...d, city: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Number & Name</label>
                    <input
                      type="text"
                      value={locationDraft.address}
                      onChange={(e) => setLocationDraft((d) => ({ ...d, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
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

              <div className="space-y-4">
                {educationEntriesList.map((entry, index) => {
                  const status = entry.eduVerificationStatus ?? 'pending';
                  const title = entry.institutionName?.trim() || 'Education';
                  const subtitle = formatEducationCardSubtitle(entry);
                  return (
                    <div
                      key={entry.id ?? `edu-${index}`}
                      className="rounded-xl border border-gray-200 bg-white p-5 space-y-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-3 min-w-0">
                          <HiAcademicCap className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">{title}</p>
                            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                          <div className="flex flex-wrap gap-1.5 justify-end">
                            {status === 'pending' && (
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900">
                                Pending
                              </span>
                            )}
                            {status === 'verified' && (
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                Verified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 justify-between gap-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => {
                                setEducationEntriesList((prev) => {
                                  const next = prev.map((e, i) =>
                                    i === index ? { ...e, eduVerificationStatus: 'verified' as const } : e,
                                  );
                                  queueMicrotask(() =>
                                    void syncEducationEntriesToApi(next, { silentSuccess: true }),
                                  );
                                  return next;
                                });
                                toast.success('Verification submitted for this education.');
                              }}
                              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                            >
                              <HiShieldCheck className="w-4 h-4" />
                              Verify
                            </button>
                          )}
                          {entry.supportingMediaUrl?.trim() && (
                            <a
                              href={
                                entry.supportingMediaUrl.startsWith('http')
                                  ? entry.supportingMediaUrl
                                  : `${api.defaults.baseURL || ''}${entry.supportingMediaUrl}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-brand-600 hover:bg-gray-50"
                            >
                              View supporting media
                            </a>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeEducationEntry(index)}
                          className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                        >
                          <HiX className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <HiAcademicCap className="w-5 h-5 text-brand-600 shrink-0" />
                  <h3 className="text-base font-semibold text-gray-900">Add Education</h3>
                </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Institution / School <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={educationDraft.institutionName}
                        onChange={(e) => updateEducationDraft({ institutionName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="Enter institution name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">School Type</label>
                      <SearchableList
                        value={educationDraft.schoolType}
                        onChange={(schoolType) => updateEducationDraft({ schoolType })}
                        options={[{ value: '', label: 'Select type' }, ...SCHOOL_TYPE_OPTIONS]}
                        placeholder="Select type"
                        className="[&_button]:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                      <SearchableList
                        value={educationDraft.levelOfEducation}
                        onChange={(levelOfEducation) => updateEducationDraft({ levelOfEducation })}
                        options={[{ value: '', label: 'Select' }, ...EDUCATION_LEVELS]}
                        placeholder="Select"
                        className="[&_button]:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                      <SearchableList
                        value={educationDraft.degreeType}
                        onChange={(degreeType) => updateEducationDraft({ degreeType })}
                        options={[{ value: '', label: 'Select' }, ...QUALIFICATION_OPTIONS]}
                        placeholder="Select"
                        className="[&_button]:bg-gray-50"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Field of Study</label>
                      <input
                        type="text"
                        value={educationDraft.fieldOfStudy}
                        onChange={(e) => updateEducationDraft({ fieldOfStudy: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="e.g. Computer Science, Medicine, Law..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <SearchableList
                        value={educationDraft.country}
                        onChange={(country) => updateEducationDraft({ country })}
                        options={[{ value: '', label: 'Select' }, ...COUNTRIES.map((c) => ({ value: c, label: c }))]}
                        placeholder="Select"
                        className="[&_button]:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Grade <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={educationDraft.grade}
                        onChange={(e) => updateEducationDraft({ grade: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="e.g. First Class, 3.8 GPA"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <div className="grid grid-cols-2 gap-2">
                        <SearchableList
                          value={educationDraft.startMonth}
                          onChange={(startMonth) => updateEducationDraft({ startMonth })}
                          options={[{ value: '', label: 'Month' }, ...MONTH_OPTIONS]}
                          placeholder="Month"
                          className="[&_button]:bg-gray-50"
                        />
                        <SearchableList
                          value={educationDraft.startYear}
                          onChange={(startYear) => updateEducationDraft({ startYear })}
                          options={[{ value: '', label: 'Year' }, ...EDUCATION_YEAR_OPTIONS]}
                          placeholder="Year"
                          className="[&_button]:bg-gray-50"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date / Expected End Date
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <SearchableList
                          value={educationDraft.endMonth}
                          onChange={(endMonth) => updateEducationDraft({ endMonth })}
                          options={[{ value: '', label: 'Month' }, ...MONTH_OPTIONS]}
                          placeholder="Month"
                          className="[&_button]:bg-gray-50"
                        />
                        <SearchableList
                          value={educationDraft.endYear}
                          onChange={(endYear) => updateEducationDraft({ endYear })}
                          options={[{ value: '', label: 'Year' }, ...EDUCATION_YEAR_OPTIONS]}
                          placeholder="Year"
                          className="[&_button]:bg-gray-50"
                        />
                      </div>
                      <label className="mt-2 flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={educationDraft.expectedEndOngoing}
                          onChange={(e) => updateEducationDraft({ expectedEndOngoing: e.target.checked })}
                          className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        />
                        This is an expected end date (ongoing)
                      </label>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cost of Education</label>
                      <div className="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-2">
                        <SearchableList
                          value={educationDraft.currency}
                          onChange={(currency) => updateEducationDraft({ currency })}
                          options={EDUCATION_CURRENCY_OPTIONS}
                          placeholder="Currency"
                          className="[&_button]:bg-gray-50"
                        />
                        <input
                          type="text"
                          inputMode="decimal"
                          value={educationDraft.costOfEducation}
                          onChange={(e) => updateEducationDraft({ costOfEducation: e.target.value })}
                          className="min-w-0 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pending Loan</label>
                      <div className="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-2">
                        <SearchableList
                          value={educationDraft.loanCurrency}
                          onChange={(loanCurrency) => updateEducationDraft({ loanCurrency })}
                          options={EDUCATION_CURRENCY_OPTIONS}
                          placeholder="Currency"
                          className="[&_button]:bg-gray-50"
                        />
                        <input
                          type="text"
                          inputMode="decimal"
                          value={educationDraft.pendingLoanAmount}
                          onChange={(e) => updateEducationDraft({ pendingLoanAmount: e.target.value })}
                          className="min-w-0 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Activities & Societies</label>
                      <textarea
                        value={educationDraft.activitiesSocieties}
                        onChange={(e) => updateEducationDraft({ activitiesSocieties: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-y min-h-[100px]"
                        placeholder="Clubs, sports, volunteer work, etc."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Associated Skills</label>
                      <input
                        type="text"
                        value={educationDraft.associatedSkills}
                        onChange={(e) => updateEducationDraft({ associatedSkills: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="Type to search skills or add custom..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Supporting Media</label>
                      <input
                        type="url"
                        value={educationDraft.supportingMediaUrl}
                        onChange={(e) => updateEducationDraft({ supportingMediaUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="URL to certificate, transcript, or media file"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={commitEducationDraft}
                    disabled={educationSaving}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    <HiPlus className="w-4 h-4" />
                    {educationSaving ? 'Saving...' : 'Add Education'}
                  </button>
              </div>

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

              <div className="space-y-4">
                {workEntriesList.map((entry, index) => {
                  const status = entry.workVerificationStatus ?? 'pending';
                  const org = entry.organisationName?.trim() || '';
                  const role = entry.role?.trim() || '';
                  const title = org || role || 'Work experience';
                  const subtitle =
                    org && role ? `${role} · ${formatWorkCardSubtitle(entry)}` : formatWorkCardSubtitle(entry);
                  return (
                    <div
                      key={entry.id ?? `work-${index}`}
                      className="rounded-xl border border-gray-200 bg-white p-5 space-y-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-3 min-w-0">
                          <HiBriefcase className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">{title}</p>
                            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                          <div className="flex flex-wrap gap-1.5 justify-end">
                            {entry.selfDeclared && (
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-900">
                                Self Declared
                              </span>
                            )}
                            {status === 'pending' && (
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900">
                                Pending
                              </span>
                            )}
                            {status === 'verified' && (
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                Verified
                              </span>
                            )}
                          </div>
                          {entry.selfDeclared && (
                            <p className="text-xs text-gray-400">Self declared — employer verification skipped</p>
                          )}
                        </div>
                      </div>

                      {entry.selfDeclared && (
                        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
                          <HiExclamationCircle className="w-5 h-5 shrink-0 text-amber-700" />
                          <span>
                            Self Declaration — limited network access. Upgrade by adding employer verification details.
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 justify-between gap-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => {
                                setWorkEntriesList((prev) => {
                                  const next = prev.map((e, i) =>
                                    i === index ? { ...e, workVerificationStatus: 'verified' as const } : e,
                                  );
                                  queueMicrotask(() => void syncWorkEntriesToApi(next, { silentSuccess: true }));
                                  return next;
                                });
                                toast.success('Verification submitted for this role.');
                              }}
                              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                            >
                              <HiShieldCheck className="w-4 h-4" />
                              Verify
                            </button>
                          )}
                          {!entry.selfDeclared && entry.verifyWebsite?.trim() && (
                            <a
                              href={
                                entry.verifyWebsite.startsWith('http')
                                  ? entry.verifyWebsite
                                  : `https://${entry.verifyWebsite}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-brand-600 hover:bg-gray-50"
                            >
                              Verification website
                            </a>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeWorkEntry(index)}
                          className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                        >
                          <HiX className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <HiBriefcase className="w-5 h-5 text-brand-600 shrink-0" />
                  <h3 className="text-base font-semibold text-gray-900">Add Work Experience</h3>
                </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Organisation</label>
                      <input
                        type="text"
                        value={workDraft.organisationName}
                        onChange={(e) => updateWorkDraft({ organisationName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="Company name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                      <input
                        type="text"
                        value={workDraft.industry}
                        onChange={(e) => updateWorkDraft({ industry: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="Industry or sector"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                      <SearchableList
                        value={workDraft.employmentType}
                        onChange={(employmentType) => updateWorkDraft({ employmentType })}
                        options={[
                          { value: '', label: 'Select' },
                          { value: 'full_time', label: 'Full-time' },
                          { value: 'part_time', label: 'Part-time' },
                          { value: 'contract', label: 'Contract' },
                          { value: 'internship', label: 'Internship' },
                        ]}
                        placeholder="Select"
                        className="[&_button]:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Work Mode</label>
                      <SearchableList
                        value={workDraft.workMode}
                        onChange={(workMode) => updateWorkDraft({ workMode })}
                        options={[
                          { value: '', label: 'Select' },
                          { value: 'on_site', label: 'On-site' },
                          { value: 'remote', label: 'Remote' },
                          { value: 'hybrid', label: 'Hybrid' },
                          { value: 'global_remote', label: 'Global Remote' },
                        ]}
                        placeholder="Select"
                        className="[&_button]:bg-gray-50"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Remuneration</label>
                      <div className="grid grid-cols-1 sm:grid-cols-[8rem_1fr_9rem] gap-2">
                        <SearchableList
                          value={workDraft.currency}
                          onChange={(currency) => updateWorkDraft({ currency })}
                          options={EDUCATION_CURRENCY_OPTIONS}
                          placeholder="Currency"
                          className="[&_button]:bg-gray-50"
                        />
                        <input
                          type="text"
                          inputMode="decimal"
                          value={workDraft.salary}
                          onChange={(e) => updateWorkDraft({ salary: e.target.value })}
                          className="min-w-0 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          placeholder="0.00"
                        />
                        <SearchableList
                          value={workDraft.salaryFrequency}
                          onChange={(salaryFrequency) => updateWorkDraft({ salaryFrequency })}
                          options={WORK_SALARY_FREQUENCY_OPTIONS}
                          placeholder="Frequency"
                          className="[&_button]:bg-gray-50"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other Compensation</label>
                      <input
                        type="text"
                        value={workDraft.otherCompensationNotes}
                        onChange={(e) => updateWorkDraft({ otherCompensationNotes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="Stock options, HMO, etc."
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900">Roles / Role Progression</span>
                      <button
                        type="button"
                        onClick={addWorkDraftRole}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
                      >
                        <HiPlus className="h-4 w-4" />
                        Add Role
                      </button>
                    </div>
                    {workDraft.workRoles.map((roleRow, ri) => (
                      <div
                        key={ri}
                        className="rounded-lg border border-gray-200 bg-white p-4 space-y-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-800">Role {ri + 1}</span>
                          {workDraft.workRoles.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeWorkDraftRole(ri)}
                              className="text-sm text-red-600 hover:text-red-700 inline-flex items-center gap-1"
                            >
                              <HiX className="h-4 w-4" />
                              Remove
                            </button>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                          <input
                            type="text"
                            value={roleRow.title}
                            onChange={(e) => updateWorkDraftRole(ri, { title: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            placeholder="Job title"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                              type="date"
                              value={roleRow.startDate}
                              onChange={(e) => updateWorkDraftRole(ri, { startDate: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                              type="date"
                              value={roleRow.endDate}
                              disabled={roleRow.currentlyWorking}
                              onChange={(e) => updateWorkDraftRole(ri, { endDate: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-60"
                            />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
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
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
                      <textarea
                        value={workDraft.jobDescription}
                        onChange={(e) => updateWorkDraft({ jobDescription: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-y min-h-[100px]"
                        placeholder="Enter job description..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Responsibilities</label>
                      <textarea
                        value={workDraft.responsibilitiesText}
                        onChange={(e) => updateWorkDraft({ responsibilitiesText: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-y min-h-[100px]"
                        placeholder="Enter responsibilities..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Achievements</label>
                      <textarea
                        value={workDraft.achievementsText}
                        onChange={(e) => updateWorkDraft({ achievementsText: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-y min-h-[100px]"
                        placeholder="Enter achievements..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Associated Skills</label>
                      <input
                        type="text"
                        value={workDraft.associatedSkills}
                        onChange={(e) => updateWorkDraft({ associatedSkills: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="Type to search skills or add custom..."
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={workDraft.selfDeclared}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelfDeclarationFlow({ open: true, kind: 'work' });
                          } else {
                            updateWorkDraft({ selfDeclared: false });
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Self declared (skip employer verification)</span>
                    </label>
                    {!workDraft.selfDeclared && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Verification website</label>
                          <input
                            type="url"
                            value={workDraft.verifyWebsite}
                            onChange={(e) => updateWorkDraft({ verifyWebsite: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            placeholder="https://company.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">HR email</label>
                          <input
                            type="email"
                            value={workDraft.verifyHrEmail}
                            onChange={(e) => updateWorkDraft({ verifyHrEmail: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            placeholder="hr@company.com"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={commitWorkDraft}
                    disabled={workSaving}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    <HiPlus className="w-4 h-4" />
                    {workSaving ? 'Saving...' : 'Add Work Experience'}
                  </button>
              </div>

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
                {verificationStatus.projects?.completed &&
                  !verificationStatus.projects?.verified &&
                  !isSectionEditable('projects') && (
                    <button
                      type="button"
                      onClick={() => setSectionEditMode((prev) => ({ ...prev, projects: true }))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                    >
                      <HiPencil className="w-4 h-4" />
                      Edit
                    </button>
                  )}
              </div>

              {isSectionEditable('projects') && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500">
                        <HiFolder className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">Add Project</h3>
                    </div>
                    {projectEditingIndex != null && (
                      <button
                        type="button"
                        onClick={cancelProjectDraft}
                        className="text-sm font-medium text-gray-600 hover:text-gray-800"
                      >
                        Cancel edit
                      </button>
                    )}
                  </div>
                  {projectEditingIndex != null && (
                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      Editing an existing project. Use &quot;Add Project&quot; below to apply; it syncs automatically.
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">Project Title</label>
                      <input
                        type="text"
                        value={projectDraft.title}
                        onChange={(e) => updateProjectDraft({ title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="Project title"
                      />
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
                          onChange={(e) => updateProjectDraft({ projectLink: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">Media URL</label>
                        <input
                          type="url"
                          value={projectDraft.mediaUrl}
                          onChange={(e) => updateProjectDraft({ mediaUrl: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          placeholder="Image or video URL"
                        />
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
                    {projectDraft.teamMembers.map((member, memberIndex) => (
                      <div
                        key={memberIndex}
                        className="grid grid-cols-1 md:grid-cols-2 gap-3 md:items-end"
                      >
                        <div>
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) =>
                              updateProjectDraftMember(memberIndex, { name: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            placeholder="Name"
                          />
                        </div>
                        <div className="flex gap-2 items-end">
                          <input
                            type="text"
                            value={member.role}
                            onChange={(e) =>
                              updateProjectDraftMember(memberIndex, { role: e.target.value })
                            }
                            className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={commitProjectDraft}
                    disabled={projectSaving}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    <HiPlus className="w-4 h-4" />
                    {projectSaving
                      ? 'Saving...'
                      : projectEditingIndex != null
                        ? 'Update project'
                        : 'Add Project'}
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {projectsList.map((entry, index) => {
                  const isEditing = projectEditingIndex === index;
                  return (
                    <div
                      key={entry.id ?? `proj-${index}`}
                      className={`flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                        isEditing ? 'ring-2 ring-brand-400 ring-offset-2' : ''
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <HiChevronRight className="mt-1 h-5 w-5 shrink-0 text-gray-300" aria-hidden />
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                          <HiFolder className="h-5 w-5 text-brand-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 truncate">{entry.title}</p>
                          <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">
                            {formatProjectCardSubtitle(entry)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:shrink-0">
                        {isSectionEditable('projects') && (
                          <>
                            <button
                              type="button"
                              onClick={() => beginEditProjectEntry(index)}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                            >
                              <HiPencil className="h-4 w-4" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => removeProjectEntry(index)}
                              className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                            >
                              <HiX className="h-4 w-4" />
                              Remove
                            </button>
                          </>
                        )}
                        {entry.projectVerificationStatus === 'verified' ? (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                            <HiCheckCircle className="h-4 w-4" />
                            Verified
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setProjectsList((prev) => {
                                const next = prev.map((p, i) =>
                                  i === index ? { ...p, projectVerificationStatus: 'verified' as const } : p,
                                );
                                queueMicrotask(() => void syncProjectsListToApi(next, { silentSuccess: true }));
                                return next;
                              });
                              toast.success('Verification submitted for this project.');
                            }}
                            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                          >
                            <HiShieldCheck className="h-4 w-4" />
                            Verify
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

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
                {verificationStatus.certification?.completed &&
                  !verificationStatus.certification?.verified &&
                  !isSectionEditable('certification') && (
                    <button
                      type="button"
                      onClick={() => setSectionEditMode((prev) => ({ ...prev, certification: true }))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                    >
                      <HiPencil className="w-4 h-4" />
                      Edit
                    </button>
                  )}
              </div>

              {isSectionEditable('certification') && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <HiBadgeCheck className="w-6 h-6 text-brand-600 shrink-0" />
                      <h3 className="text-base font-semibold text-gray-900">Add Certification</h3>
                    </div>
                    {certEditingIndex != null && (
                      <button
                        type="button"
                        onClick={cancelCertDraft}
                        className="text-sm font-medium text-gray-600 hover:text-gray-800"
                      >
                        Cancel edit
                      </button>
                    )}
                  </div>
                  {certEditingIndex != null && (
                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      Editing an existing certification. Use &quot;Add Data&quot; to apply; it syncs automatically.
                    </p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name of certificate</label>
                      <input
                        type="text"
                        value={certDraft.name}
                        onChange={(e) => updateCertDraft({ name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="e.g. Advanced Product Management"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Issued by</label>
                      <input
                        type="text"
                        value={certDraft.issuedBy}
                        onChange={(e) => updateCertDraft({ issuedBy: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="e.g. Coursera"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Issued date</label>
                      <input
                        type="date"
                        value={certDraft.issuedDate}
                        onChange={(e) => updateCertDraft({ issuedDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expiration date</label>
                      <input
                        type="date"
                        value={certDraft.expirationDate}
                        onChange={(e) => updateCertDraft({ expirationDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Credential ID</label>
                      <input
                        type="text"
                        value={certDraft.credentialId}
                        onChange={(e) => updateCertDraft({ credentialId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="e.g. DORYY53743"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reporting URL</label>
                      <input
                        type="url"
                        value={certDraft.reportingUrl}
                        onChange={(e) => updateCertDraft({ reportingUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Supporting media</label>
                      <input
                        type="file"
                        accept=".pdf,image/jpeg,image/png,image/webp"
                        onChange={(e) => void handleCertDraftFileUpload(e)}
                        disabled={certDraftUploading}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 disabled:opacity-60"
                      />
                      {certDraft.supportingMediaUrl && (
                        <p className="mt-1 text-sm text-gray-600">
                          Uploaded:{' '}
                          <a
                            href={
                              certDraft.supportingMediaUrl.startsWith('http')
                                ? certDraft.supportingMediaUrl
                                : `${api.defaults.baseURL || ''}${certDraft.supportingMediaUrl}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-600 hover:underline"
                          >
                            View file
                          </a>
                        </p>
                      )}
                      {certDraftUploading && <p className="mt-1 text-sm text-gray-500">Uploading...</p>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={commitCertDraft}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    <HiPlus className="w-4 h-4" />
                    {saving ? 'Saving...' : certEditingIndex != null ? 'Update entry' : 'Add Data'}
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {certList.map((cert, index) => {
                  const isEditing = certEditingIndex === index;
                  return (
                    <div
                      key={`cert-${index}-${cert.name}`}
                      className={`flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                        isEditing ? 'ring-2 ring-brand-400 ring-offset-2' : ''
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <HiChevronRight className="mt-1 h-5 w-5 shrink-0 text-gray-300" aria-hidden />
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                          <HiBadgeCheck className="h-5 w-5 text-brand-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 truncate">{cert.name}</p>
                          <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">
                            {formatCertificateCardSubtitle(cert)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:shrink-0">
                        {isSectionEditable('certification') && (
                          <>
                            <button
                              type="button"
                              onClick={() => beginEditCert(index)}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                            >
                              <HiPencil className="h-4 w-4" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => removeCertificate(index)}
                              className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                            >
                              <HiX className="h-4 w-4" />
                              Remove
                            </button>
                          </>
                        )}
                        {cert.supportingMediaUrl && (
                          <a
                            href={
                              cert.supportingMediaUrl.startsWith('http')
                                ? cert.supportingMediaUrl
                                : `${api.defaults.baseURL || ''}${cert.supportingMediaUrl}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-brand-600 hover:bg-gray-50"
                          >
                            Media
                          </a>
                        )}
                        {cert.certVerificationStatus === 'verified' ? (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                            <HiCheckCircle className="h-4 w-4" />
                            Verified
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setCertList((prev) => {
                                const next = prev.map((c, i) =>
                                  i === index ? { ...c, certVerificationStatus: 'verified' as const } : c,
                                );
                                queueMicrotask(() => void syncCertificationsToApi(next, { silentSuccess: true }));
                                return next;
                              });
                              toast.success('Verification submitted for this certification.');
                            }}
                            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                          >
                            <HiShieldCheck className="h-4 w-4" />
                            Verify
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

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
                {verificationStatus.family?.completed &&
                  !verificationStatus.family?.verified &&
                  !isSectionEditable('family') && (
                    <button
                      type="button"
                      onClick={() => setSectionEditMode((prev) => ({ ...prev, family: true }))}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
                    >
                      <HiPencil className="h-4 w-4" />
                      Edit
                    </button>
                  )}
              </div>

              {isSectionEditable('family') && (
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
                        onChange={(e) => setSpouseName(e.target.value)}
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
                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                        placeholder="Full name"
                      />
                    </div>
                  )}

                  <div className="border-t border-gray-100 pt-6 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <HiUsers className="w-5 h-5 shrink-0 text-brand-600" aria-hidden />
                        <h3 className="text-base font-semibold text-gray-900">Add family relation</h3>
                      </div>
                      {familyRelationEditingIndex != null && (
                        <button
                          type="button"
                          onClick={cancelFamilyRelationDraft}
                          className="text-sm font-medium text-gray-600 hover:text-gray-800"
                        >
                          Cancel edit
                        </button>
                      )}
                    </div>
                    {familyRelationEditingIndex != null && (
                      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        You are editing an existing relation. Use &quot;Add Data&quot; to apply changes; they sync
                        automatically.
                      </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Relation name</label>
                        <input
                          type="text"
                          value={familyRelationDraft.fullName}
                          onChange={(e) => updateFamilyRelationDraft({ fullName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          placeholder="Full name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Relationship type</label>
                        <div className="relative">
                          <select
                            value={familyRelationDraft.relationType}
                            onChange={(e) => updateFamilyRelationDraft({ relationType: e.target.value })}
                            className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-10 text-sm text-gray-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
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
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={commitFamilyRelationDraft}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                    >
                      <HiPlus className="w-4 h-4" />
                      {saving
                        ? 'Saving...'
                        : familyRelationEditingIndex != null
                          ? 'Update entry'
                          : 'Add Data'}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {relationsList.map((rel, index) => {
                  const isRowEditing = familyRelationEditingIndex === index;
                  const typeLabel =
                    RELATION_TYPE_OPTIONS.find((o) => o.value === rel.relationType)?.label ||
                    rel.relationType ||
                    'Relation';
                  return (
                    <div
                      key={`fam-${index}-${rel.fullName}-${rel.relationType}`}
                      className={`flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                        isRowEditing ? 'ring-2 ring-brand-400 ring-offset-2' : ''
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <HiChevronRight className="mt-1 h-5 w-5 shrink-0 text-gray-300" aria-hidden />
                        <HiUsers className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 truncate">{rel.fullName || '—'}</p>
                          <p className="mt-0.5 text-sm text-gray-500">{typeLabel}</p>
                        </div>
                      </div>
                      {isSectionEditable('family') && (
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:shrink-0">
                          <button
                            type="button"
                            onClick={() => beginEditFamilyRelation(index)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                          >
                            <HiPencil className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFamilyRelation(index)}
                            className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                          >
                            <HiX className="h-4 w-4" />
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
                  ].map(({ key, label }) => (
                    <div key={key} className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-sm font-medium text-gray-700">{label}</label>
                        <span className="text-xs text-gray-500">{social[key] ? 'Linked' : 'Not linked'}</span>
                      </div>
                      <input
                        type="url"
                        value={social[key]}
                        onChange={(e) => setSocial((s) => ({ ...s, [key]: e.target.value }))}
                        disabled={!isSectionEditable('social')}
                        readOnly={!isSectionEditable('social')}
                        placeholder={`${label} URL`}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  ))}
                </div>

                {isSectionEditable('social') && (
                  <button
                    type="button"
                    onClick={() => {
                      const err = validateSocialForm(social);
                      if (err) {
                        toast.error(err);
                        return;
                      }
                      void handleSaveSocial();
                    }}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Country of Nationality</label>
                <SearchableList
                  value={personal.nationality}
                  onChange={(nationality) => setPersonal((p) => ({ ...p, nationality }))}
                  options={[{ value: '', label: 'Select country' }, ...COUNTRIES.map((c) => ({ value: c, label: c }))]}
                  placeholder="Select country"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Type</label>
                <SearchableList
                  value={personal.idType}
                  onChange={(idType) => setPersonal((p) => ({ ...p, idType }))}
                  options={[{ value: '', label: 'Select ID type' }, ...ID_TYPE_OPTIONS]}
                  placeholder="Select ID type"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                <input
                  type="text"
                  value={personal.idNumber}
                  onChange={(e) => setPersonal((p) => ({ ...p, idNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder={idNumberPlaceholder()}
                />
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
                <p className="text-sm text-gray-500 mt-1">
                  Choose how you&apos;d like to verify your address.
                </p>
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
                    <p className="font-medium text-gray-900">Proof of Address Document</p>
                    <p className="text-sm text-gray-500 mt-0.5">Upload a document to verify</p>
                  </div>
                </button>
                <button
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
                </button>
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
