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
  const personalCompleted =
    hasRequiredIdFields ||
    !!(d.country || d.nationality || d.dateOfBirth) ||
    !!d.identityVerification;
  const personalVerified =
    d.identityStatus === 'verified' ||
    !!(d.identityVerification as { verifiedAt?: unknown } | undefined)?.verifiedAt;

  const education = Array.isArray(d.education) ? d.education : [];
  const educationCompleted = education.length > 0;
  const educationVerified = education.some((e: { verificationStatus?: string }) => e?.verificationStatus === 'verified');

  const work = Array.isArray(d.workExperience) ? d.workExperience : [];
  const workCompleted = work.length > 0;
  const workVerified = work.some((e: { verificationStatus?: string }) => e?.verificationStatus === 'verified');

  const projects = Array.isArray(d.professionalProjects)
    ? d.professionalProjects
    : Array.isArray(d.projects)
      ? d.projects
      : [];
  const projectsCompleted = projects.length > 0;
  const projectsVerified = projects.some((p: { verificationStatus?: string }) => p?.verificationStatus === 'verified');

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
    !!(d.locationDocumentType && String(d.locationDocumentType).trim()) ||
    !!(d.country && String(d.country).trim());

  const certsArr = Array.isArray(d.certifications) ? d.certifications : [];
  const certificationCompleted = certsArr.some((c: { name?: string; issuedBy?: string }) => {
    const name = typeof c?.name === 'string' ? c.name.trim() : '';
    const issuedBy = typeof c?.issuedBy === 'string' ? c.issuedBy.trim() : '';
    return !!(name && issuedBy);
  });
  const certificationVerified = certsArr.some(
    (c: { verified?: boolean; certVerificationStatus?: string }) =>
      c?.verified === true || c?.certVerificationStatus === 'verified',
  );

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
    location: { completed: locationCompleted, verified: false },
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
