/**
 * Shared verification progress for Verification Center and Professional dashboard.
 */

export type VerificationSectionKey =
  | 'personal'
  | 'location'
  | 'education'
  | 'social'
  | 'work'
  | 'projects'
  | 'certification'
  | 'family';

export const VERIFICATION_TABS: { id: VerificationSectionKey; label: string }[] = [
  { id: 'personal', label: 'Personal Identity' },
  { id: 'location', label: 'Location Data' },
  { id: 'education', label: 'Education' },
  { id: 'work', label: 'Work Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'certification', label: 'Certifications' },
  { id: 'family', label: 'Family' },
  { id: 'social', label: 'Social' },
];

export type VerificationSectionStatus = { completed: boolean; verified: boolean };

function normalizeSelfDeclarationKey(v: unknown): string {
  return String(v ?? '')
    .toLowerCase()
    .replace(/-/g, '_');
}

function isVerificationSelfDeclarationMethod(v: unknown): boolean {
  const s = normalizeSelfDeclarationKey(v);
  return s === 'self_declaration' || s === 'self_declared';
}

function isEducationSelfDeclaredForAggregate(e: { verificationMethod?: string | null }): boolean {
  return isVerificationSelfDeclarationMethod(e?.verificationMethod);
}

function isWorkSelfDeclaredForAggregate(exp: { verificationMethod?: string | null }): boolean {
  return isVerificationSelfDeclarationMethod(exp?.verificationMethod);
}

function isProjectSelfDeclaredForAggregate(proj: {
  verificationMethod?: string | null;
  selfDeclared?: boolean | null;
  projectSelfDeclared?: boolean | null;
}): boolean {
  return (
    isVerificationSelfDeclarationMethod(proj?.verificationMethod) ||
    proj?.selfDeclared === true ||
    proj?.projectSelfDeclared === true
  );
}

function isLocationSelfDeclaredForAggregate(loc: Record<string, unknown>): boolean {
  const dt = normalizeSelfDeclarationKey(loc.documentType);
  if (dt === 'self_declaration' || dt === 'self_declared') return true;
  return String(loc.verificationStatus ?? '').toLowerCase() === 'self_declared';
}

function isLocationRowVerifiedForAggregate(loc: Record<string, unknown>): boolean {
  if (isLocationSelfDeclaredForAggregate(loc)) return true;
  const dt = normalizeSelfDeclarationKey(loc.documentType);
  if (dt === 'digital_verify') return true;
  const vs = String(loc.verificationStatus ?? loc.documentVerificationStatus ?? '').toLowerCase();
  return vs === 'verified';
}

function isCertSelfDeclaredForAggregate(cert: Record<string, unknown>): boolean {
  return !!(cert.certSelfDeclared || cert.selfDeclared);
}

function isCertRowVerifiedForAggregate(cert: Record<string, unknown>): boolean {
  if (isCertSelfDeclaredForAggregate(cert)) return true;
  if (cert.verified === true) return true;
  if (String(cert.certVerificationStatus ?? '').toLowerCase() === 'verified') return true;
  if (String(cert.verificationStatus ?? '').toLowerCase() === 'verified') return true;
  return false;
}

/** Mirrors API rules so progress works if /verification-status fails or omits sections. */
export function deriveVerificationStatusFromProfile(data: unknown): Record<
  VerificationSectionKey,
  VerificationSectionStatus
> | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const socialMedia = (d.socialMedia as Record<string, unknown>) || {};
  const hasSocial = [
    socialMedia.linkedin,
    socialMedia.twitter,
    socialMedia.facebook,
    socialMedia.instagram,
    socialMedia.tiktok,
    socialMedia.snapchat,
  ].some(Boolean);

  const hasRequiredIdFields = !!(
    d.idType &&
    String((d.idNumber as string) || '').trim() &&
    d.idDocumentUrl
  );
  const isPersonalCompletedFlag = (d as { isPersonalCompleted?: unknown }).isPersonalCompleted === true;
  /** Match API: signup-only country/DOB/nationality must not count as completed verification steps. */
  const personalCompleted =
    hasRequiredIdFields ||
    isPersonalCompletedFlag ||
    !!d.identityVerification;
  const personalVerified =
    d.identityStatus === 'verified' ||
    !!(d.identityVerification as { verifiedAt?: unknown } | undefined)?.verifiedAt;

  const education = Array.isArray(d.education) ? d.education : [];
  const educationCompleted = education.length > 0;
  const educationVerified =
    educationCompleted &&
    education.every(
      (e: { verificationMethod?: string | null; verificationStatus?: string }) =>
        isEducationSelfDeclaredForAggregate(e) || e?.verificationStatus === 'verified',
    );

  const work = Array.isArray(d.workExperience) ? d.workExperience : [];
  const workCompleted = work.length > 0;
  const workVerified =
    workCompleted &&
    work.every(
      (e: { verificationMethod?: string | null; verificationStatus?: string }) =>
        isWorkSelfDeclaredForAggregate(e) || e?.verificationStatus === 'verified',
    );

  const projects = Array.isArray(d.professionalProjects)
    ? d.professionalProjects
    : Array.isArray(d.projects)
      ? d.projects
      : [];
  const projectsCompleted = projects.length > 0;
  const projectsVerified =
    projectsCompleted &&
    projects.every(
      (p: {
        verificationMethod?: string | null;
        selfDeclared?: boolean | null;
        projectSelfDeclared?: boolean | null;
        verificationStatus?: string;
      }) => isProjectSelfDeclaredForAggregate(p) || p?.verificationStatus === 'verified',
    );

  const locationsJson = d.locations;
  const locationsArr = Array.isArray(locationsJson)
    ? locationsJson
    : locationsJson != null && typeof locationsJson === 'object'
      ? [locationsJson]
      : [];
  const locationCompleted =
    locationsArr.some((loc: Record<string, unknown>) => {
      if (!loc || typeof loc !== 'object') return false;
      const country = typeof loc.country === 'string' ? loc.country.trim() : '';
      const address = typeof loc.address === 'string' ? loc.address.trim() : '';
      const docUrl =
        (typeof loc.documentUrl === 'string' && loc.documentUrl.trim()) ||
        (typeof loc.document_url === 'string' && loc.document_url.trim()) ||
        '';
      return !!(country || address || docUrl);
    }) ||
    !!(d.locationDocumentUrl && String(d.locationDocumentUrl).trim()) ||
    !!(d.locationDocumentType && String(d.locationDocumentType).trim());

  const locationVerified =
    locationsArr.length > 0 &&
    locationsArr.every(
      (loc) => loc && typeof loc === 'object' && isLocationRowVerifiedForAggregate(loc as Record<string, unknown>),
    );

  const certsArr = Array.isArray(d.certifications) ? d.certifications : [];
  const certificationCompleted = certsArr.some((c: { name?: string; issuedBy?: string }) => {
    const name = typeof c?.name === 'string' ? c.name.trim() : '';
    const issuedBy = typeof c?.issuedBy === 'string' ? c.issuedBy.trim() : '';
    return !!(name && issuedBy);
  });
  const certificationVerified =
    certsArr.length > 0 &&
    certsArr.every((c) => {
      const cert = c as Record<string, unknown>;
      const name = typeof cert.name === 'string' ? cert.name.trim() : '';
      const issuedBy = typeof cert.issuedBy === 'string' ? cert.issuedBy.trim() : '';
      if (!name || !issuedBy) return false;
      return isCertRowVerifiedForAggregate(cert);
    });

  let familyCompleted = false;
  const familyRaw = d.familyInfo;
  if (familyRaw && typeof familyRaw === 'object') {
    const fr = familyRaw as Record<string, unknown>;
    const marital = typeof fr.maritalStatus === 'string' ? fr.maritalStatus.trim() : '';
    const spouse = typeof fr.spouseName === 'string' ? fr.spouseName.trim() : '';
    const relations = Array.isArray(fr.relations) ? fr.relations : [];
    const hasValidRelation = relations.some((r: { relationType?: string; fullName?: string }) => {
      const rt = typeof r?.relationType === 'string' ? r.relationType.trim() : '';
      const fn = typeof r?.fullName === 'string' ? r.fullName.trim() : '';
      return !!(rt && fn);
    });
    familyCompleted = !!marital || hasValidRelation || (marital === 'married' && !!spouse);
  }

  return {
    personal: { completed: personalCompleted, verified: personalVerified },
    location: { completed: locationCompleted, verified: locationVerified },
    education: { completed: educationCompleted, verified: educationVerified },
    social: { completed: hasSocial, verified: hasSocial },
    work: { completed: workCompleted, verified: workVerified },
    projects: { completed: projectsCompleted, verified: projectsVerified },
    certification: { completed: certificationCompleted, verified: certificationVerified },
    family: { completed: familyCompleted, verified: false },
  };
}

export function mergeVerificationStatusFromSources(
  status: Partial<Record<VerificationSectionKey, { completed?: boolean; verified?: boolean }>> | undefined | null,
  profileData: unknown,
): Record<VerificationSectionKey, VerificationSectionStatus> {
  const derived = deriveVerificationStatusFromProfile(profileData);
  const mergeKey = (key: VerificationSectionKey): VerificationSectionStatus => {
    const s = status?.[key];
    const dr = derived?.[key];
    return {
      completed: !!(s?.completed || s?.verified || dr?.completed || dr?.verified),
      verified: !!(s?.verified || dr?.verified),
    };
  };
  return {
    personal: mergeKey('personal'),
    location: mergeKey('location'),
    education: mergeKey('education'),
    social: mergeKey('social'),
    work: mergeKey('work'),
    projects: mergeKey('projects'),
    certification: mergeKey('certification'),
    family: mergeKey('family'),
  };
}

export function verificationProgressFromMerged(
  merged: Record<VerificationSectionKey, VerificationSectionStatus>,
): { completedVerificationSteps: number; progressPct: number; totalSteps: number } {
  const total = VERIFICATION_TABS.length;
  const done = VERIFICATION_TABS.filter(({ id }) => {
    const s = merged[id];
    return s?.completed || s?.verified;
  }).length;
  return {
    completedVerificationSteps: done,
    progressPct: total ? Math.round((done / total) * 100) : 0,
    totalSteps: total,
  };
}
