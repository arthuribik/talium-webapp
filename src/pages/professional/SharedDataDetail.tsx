import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import {
  HiArrowLeft,
  HiX,
  HiUsers,
  HiAcademicCap,
  HiBriefcase,
  HiLocationMarker,
  HiShare,
  HiDocumentDownload,
} from 'react-icons/hi';

// Order and labels matching "Required Applicant Data" (Verification Center / job requirement)
const REQUIRED_APPLICANT_DATA_LABELS: Record<string, string> = {
  full_name: 'Full Name',
  email: 'Email',
  phone: 'Phone Number',
  nationality: 'Nationality',
  location: 'Location',
  government_id: 'Government ID',
  academic_data: 'Academic Data',
  work_data: 'Work Data',
  skill_set: 'Skill Set Data',
  certifications: 'Certifications',
  social_media: 'Social Media',
  financial_data: 'Financial Data',
  reference_data: 'Reference Data',
};

type SharedDataDetailItem = {
  id: string;
  type?: string;
  organisationName?: string;
  status?: string;
  accessType?: string;
  date?: string;
  retentionPeriod?: string;
  jobTitle?: string;
  requiredApplicantData?: string[];
  applicationData?: Record<string, unknown>;
};

type VerificationProfile = {
  user?: { firstName?: string; lastName?: string; email?: string; phoneNumber?: string };
  nationality?: string;
  country?: string;
  dateOfBirth?: string;
  idType?: string;
  idNumber?: string;
  identityStatus?: string;
  identityVerification?: { verifiedAt?: string } | null;
  education?: any[];
  workExperience?: any[];
  description?: string;
  certifications?: any;
  socialMedia?: Record<string, string>;
  familyInfo?: Record<string, unknown> | null;
  locations?: any;
  [key: string]: any;
};

export default function SharedDataDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<SharedDataDetailItem | null>(null);
  const [profile, setProfile] = useState<VerificationProfile | null>(null);
  const [revokeDrawerOpen, setRevokeDrawerOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const [sharedRes, profileRes] = await Promise.all([
        api.get(`/v1/professional/shared-data/${id}`),
        api.get('/v1/professional/profile').catch(() => ({ data: { data: null } })),
      ]);
      const data = sharedRes.data?.data?.sharedData;
      setItem(data ?? null);
      const profileData = profileRes.data?.data;
      setProfile(profileData ?? null);
    } catch (err) {
      toast.error('Failed to load shared data');
      setItem(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const getRevokeId = (sid: string) => (sid.startsWith('hired-') ? sid.replace(/^hired-/, '') : sid);

  const handleRevoke = async () => {
    if (!item) return;
    setRevoking(true);
    try {
      await api.post(`/v1/professional/shared-data/${getRevokeId(item.id)}/revoke`, { reason: revokeReason.trim() || undefined });
      toast.success(`Access revoked. The job organizer will be notified.`);
      setRevokeDrawerOpen(false);
      setRevokeReason('');
      navigate('/professional/shared-data');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to revoke access');
    } finally {
      setRevoking(false);
    }
  };

  // Status: Active, Expired, or Revoked
  const statusDisplay = ((): { label: string; className: string } => {
    const s = String(item?.status ?? item?.type ?? '').toLowerCase();
    if (s === 'revoked' || s === 'withdrawn') return { label: 'Revoked', className: 'bg-red-100 text-red-800' };
    if (s === 'expired') return { label: 'Expired', className: 'bg-amber-100 text-amber-800' };
    if (s === 'active' || s === 'hired' || s === 'accepted' || s === 'pending' || s === 'shortlisted') return { label: 'Active', className: 'bg-green-100 text-green-800' };
    return { label: 'Active', className: 'bg-green-100 text-green-800' };
  })();
  const statusLabel = statusDisplay.label;
  const statusBadgeClass = statusDisplay.className;
  const isActive = statusLabel === 'Active';
  const accessTypeLabel = item?.accessType || (item?.type === 'hired' ? 'Employment' : 'Job application');

  if (loading) {
    return (
      <ProfessionalLayout>
        <div className="p-6">
          <div className="text-center text-gray-600 py-16">Loading...</div>
        </div>
      </ProfessionalLayout>
    );
  }

  if (!item) {
    return (
      <ProfessionalLayout>
        <div className="p-6">
          <button
            onClick={() => navigate('/professional/shared-data')}
            className="mb-4 text-brand-600 hover:text-brand-700 flex items-center"
          >
            <HiArrowLeft className="w-5 h-5 mr-2" />
            Back to Shared Data
          </button>
          <div className="text-center text-gray-600 py-16">Shared data entry not found.</div>
        </div>
      </ProfessionalLayout>
    );
  }

  const requiredKeys = Array.isArray(item.requiredApplicantData) && item.requiredApplicantData.length > 0
    ? item.requiredApplicantData
    : Object.keys(item.applicationData ?? {});
  const applicationData = item.applicationData ?? {};
  const has = (key: string) => requiredKeys.includes(key);
  const appVal = (key: string) => applicationData[key];
  const scalar = (v: unknown): string => (v == null ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));

  // Data from Verification Center (profile) with fallback to applicationData
  const getPersonalValue = (key: string): string => {
    const u = profile?.user;
    if (key === 'full_name') return profile ? `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || scalar(appVal(key)) : scalar(appVal(key));
    if (key === 'email') return String(profile?.user?.email ?? appVal(key) ?? '—');
    if (key === 'phone') return String(profile?.user?.phoneNumber ?? appVal(key) ?? '—');
    if (key === 'nationality') return String(profile?.nationality ?? appVal(key) ?? '—');
    if (key === 'government_id') {
      if (profile?.idType || profile?.idNumber || profile?.identityStatus === 'verified' || profile?.identityVerification?.verifiedAt)
        return profile.idType && profile.idNumber
          ? `${String(profile.idType).replace(/_/g, ' ')} (verified)`
          : profile.identityStatus === 'verified' ? 'Verified' : '—';
      return scalar(appVal(key));
    }
    return scalar(appVal(key));
  };

  const personalKeys = ['full_name', 'email', 'phone', 'nationality', 'government_id'] as const;
  const hasPersonal = personalKeys.some((k) => has(k));

  const educationList: any[] = (has('academic_data')
    ? (Array.isArray(profile?.education) && profile.education.length > 0
        ? profile.education
        : Array.isArray(appVal('academic_data'))
          ? appVal('academic_data')
          : appVal('academic_data')
            ? [appVal('academic_data')]
            : [])
    : []) as any[];
  const workList: any[] = (has('work_data')
    ? (Array.isArray(profile?.workExperience) && profile.workExperience.length > 0
        ? profile.workExperience
        : Array.isArray(appVal('work_data'))
          ? appVal('work_data')
          : appVal('work_data')
            ? [appVal('work_data')]
            : [])
    : []) as any[];
  const locationsFromProfile = Array.isArray(profile?.locations) ? profile.locations : profile?.country ? [{ country: profile.country, city: (profile as any).city, address: (profile as any).address, state: (profile as any).state }] : [];
  const locationList: any[] = (has('location')
    ? (locationsFromProfile.length > 0
        ? locationsFromProfile
        : Array.isArray(appVal('location'))
          ? appVal('location')
          : appVal('location')
            ? [appVal('location')]
            : [])
    : []) as any[];
  const certList: any[] = (has('certifications')
    ? (Array.isArray(profile?.certifications)
        ? profile.certifications
        : (profile?.certifications && typeof profile.certifications === 'object' && !Array.isArray(profile.certifications))
          ? [profile.certifications]
          : Array.isArray(appVal('certifications'))
            ? appVal('certifications')
            : appVal('certifications')
              ? [appVal('certifications')]
              : [])
    : []) as any[];
  const socialObj = has('social_media')
    ? (profile?.socialMedia && Object.keys(profile.socialMedia).length > 0
        ? profile.socialMedia
        : typeof appVal('social_media') === 'object' && appVal('social_media') !== null
          ? (appVal('social_media') as Record<string, unknown>)
          : null)
    : null;
  const hasSocial = socialObj && Object.values(socialObj).some((v) => v && String(v).trim());
  const familyData = has('reference_data')
    ? (profile?.familyInfo && typeof profile.familyInfo === 'object'
        ? profile.familyInfo
        : typeof appVal('reference_data') === 'object' && appVal('reference_data') !== null
          ? (appVal('reference_data') as Record<string, unknown>)
          : null)
    : null;
  const hasFamily = familyData && (familyData.maritalStatus || familyData.spouseName || (Array.isArray(familyData.relations) && familyData.relations.length > 0));

  const formatLoc = (loc: unknown): string => {
    if (loc == null) return '—';
    if (typeof loc === 'string') return loc;
    if (typeof loc === 'object' && !Array.isArray(loc)) {
      const o = loc as Record<string, unknown>;
      const parts = [o.country, o.address, o.city, o.state].filter(Boolean);
      return parts.length ? parts.join(', ') : '—';
    }
    return String(loc);
  };

  const skillSetText = (): string => {
    if (has('skill_set')) {
      if (profile?.description) return profile.description;
      const v = appVal('skill_set');
      if (v == null) return '—';
      if (Array.isArray(v)) return v.map((s: any) => (typeof s === 'object' && s?.name != null ? s.name : s)).join(', ');
      if (typeof v === 'object') return String((v as any).description ?? (v as any).summary ?? '') || '—';
      return String(v);
    }
    return '—';
  };

  return (
    <ProfessionalLayout>
      <div className="min-h-[60vh] bg-gray-50">
        <div className="p-6 max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/professional/shared-data')}
            className="mb-6 text-gray-600 hover:text-brand-600 flex items-center"
          >
            <HiArrowLeft className="w-5 h-5 mr-2" />
            Back to Shared Data
          </button>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{item.organisationName ?? '—'}</h1>
              {item.jobTitle && <p className="text-sm text-gray-500 mt-0.5">{item.jobTitle}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-800">{accessTypeLabel}</span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${statusBadgeClass}`}>{statusLabel}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Applicant data</h2>

              {requiredKeys.length === 0 ? (
                <p className="text-sm text-gray-500">No applicant data was required for this share.</p>
              ) : (
                <div className="space-y-8">
                  {hasPersonal && (
                    <section>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <HiUsers className="w-4 h-4" />
                        Personal
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {personalKeys.filter((k) => has(k)).map((key) => (
                          <div key={key} className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                            <p className="text-xs font-medium text-gray-500 mb-0.5">{REQUIRED_APPLICANT_DATA_LABELS[key]}</p>
                            <p className="text-sm text-gray-900">{getPersonalValue(key)}</p>
                          </div>
                        ))}
                        {(applicationData.cvUrl || requiredKeys.includes('cvUrl')) && (
                          <div className="p-3 rounded-lg border-2 border-brand-500 bg-brand-50/50">
                            <p className="text-xs font-medium text-gray-500 mb-0.5">CV</p>
                            {applicationData.cvUrl ? (
                              <a href={String(applicationData.cvUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-brand-600 hover:underline text-sm font-medium">
                                <HiDocumentDownload className="w-4 h-4" />
                                View CV
                              </a>
                            ) : (
                              <p className="text-sm text-gray-400">—</p>
                            )}
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {has('academic_data') && (
                    <section>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <HiAcademicCap className="w-4 h-4" />
                        Education
                      </h3>
                      {educationList.length > 0 ? (
                        <ul className="space-y-3">
                          {educationList.map((edu: any, i: number) => (
                            <li key={i} className="p-4 rounded-lg border border-gray-200 bg-gray-50/50">
                              <p className="font-semibold text-gray-900">{edu.institutionName || edu.school || edu.name || '—'}</p>
                              <p className="text-sm text-gray-600 mt-0.5">
                                {[edu.levelOfEducation, edu.degreeType, edu.degree, edu.fieldOfStudy].filter(Boolean).join(' · ')}
                                {edu.country ? ` · ${edu.country}` : ''}
                              </p>
                              {(edu.startDate || edu.endDate) && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {edu.startDate ? new Date(edu.startDate).getFullYear() : ''}
                                  {edu.endDate ? ` – ${new Date(edu.endDate).getFullYear()}` : ' – Present'}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-400 p-3">—</p>
                      )}
                    </section>
                  )}

                  {has('work_data') && (
                    <section>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <HiBriefcase className="w-4 h-4" />
                        Work experience
                      </h3>
                      {workList.length > 0 ? (
                        <ul className="space-y-3">
                          {workList.map((w: any, i: number) => (
                            <li key={i} className="p-4 rounded-lg border border-gray-200 bg-gray-50/50">
                              <p className="font-semibold text-gray-900">{w.role || w.jobTitle || w.title || '—'}</p>
                              <p className="text-sm text-gray-600 mt-0.5">{w.organisationName || w.companyName || w.company || '—'}</p>
                              {(w.startDate || w.endDate) && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {w.startDate ? new Date(w.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}
                                  {w.endDate ? ` – ${new Date(w.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ' – Present'}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-400 p-3">—</p>
                      )}
                    </section>
                  )}

                  {has('skill_set') && (
                    <section>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Skill set / Summary</h3>
                      <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{skillSetText()}</p>
                      </div>
                    </section>
                  )}

                  {has('certifications') && (
                    <section>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Certifications</h3>
                      {certList.length > 0 ? (
                        <ul className="space-y-2">
                          {certList.map((c: any, i: number) => (
                            <li key={i} className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 text-sm text-gray-900">
                              {c.name || c.issuedBy || (typeof c === 'string' ? c : '—')}
                              {c.issuedDate && <span className="text-gray-500 block text-xs mt-0.5">{new Date(c.issuedDate).toLocaleDateString()}</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-400 p-3">—</p>
                      )}
                    </section>
                  )}

                  {hasFamily && familyData && (
                    <section>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <HiUsers className="w-4 h-4" />
                        Family & relationship
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {familyData.maritalStatus != null && String(familyData.maritalStatus).trim() !== '' ? (
                          <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                            <p className="text-xs font-medium text-gray-500 mb-0.5">Marital status</p>
                            <p className="text-sm text-gray-900">{String(familyData.maritalStatus)}</p>
                          </div>
                        ) : null}
                        {familyData.spouseName != null && String(familyData.spouseName).trim() !== '' ? (
                          <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                            <p className="text-xs font-medium text-gray-500 mb-0.5">Spouse name</p>
                            <p className="text-sm text-gray-900">{String(familyData.spouseName)}</p>
                          </div>
                        ) : null}
                      </div>
                      {Array.isArray(familyData.relations) && familyData.relations.length > 0 && (
                        <div className="mt-3 p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                          <p className="text-xs font-medium text-gray-500 mb-1">Relations</p>
                          <ul className="text-sm text-gray-900 space-y-0.5">
                            {(familyData.relations as any[]).map((r: any, i: number) => (
                              <li key={i}>{r.relationType ? `${r.relationType}: ` : ''}{r.fullName || '—'}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </section>
                  )}

                  {has('location') && (
                    <section>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <HiLocationMarker className="w-4 h-4" />
                        Location
                      </h3>
                      {locationList.length > 0 ? (
                        <ul className="space-y-2">
                          {locationList.map((loc: any, i: number) => (
                            <li key={i} className="p-3 rounded-lg border border-gray-200 bg-gray-50/50 text-sm text-gray-900">
                              {formatLoc(loc)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50 text-sm text-gray-900">
                          {profile?.country ? formatLoc({ country: profile.country, city: (profile as any).city, address: (profile as any).address, state: (profile as any).state }) : formatLoc(appVal('location'))}
                        </div>
                      )}
                    </section>
                  )}

                  {has('social_media') && (
                    <section>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <HiShare className="w-4 h-4" />
                        Social media
                      </h3>
                      <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                        {hasSocial ? (
                          <div className="flex flex-wrap gap-3">
                            {Object.entries(socialObj!).map(([k, v]) => {
                              const url = typeof v === 'string' ? v.trim() : '';
                              if (!url) return null;
                              return (
                                <a key={k} href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:underline">
                                  {k.charAt(0).toUpperCase() + k.slice(1)}
                                </a>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">—</p>
                        )}
                      </div>
                    </section>
                  )}

                  {(has('financial_data') || has('reference_data')) && !hasFamily && (
                    <section>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Other</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {has('financial_data') && (
                          <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                            <p className="text-xs font-medium text-gray-500 mb-0.5">Financial data</p>
                            <p className="text-sm text-gray-900">{scalar(appVal('financial_data'))}</p>
                          </div>
                        )}
                        {has('reference_data') && !familyData && (
                          <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                            <p className="text-xs font-medium text-gray-500 mb-0.5">Reference data</p>
                            <p className="text-sm text-gray-900">{scalar(appVal('reference_data'))}</p>
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-3">
              {isActive && (
                <button
                  type="button"
                  onClick={() => setRevokeDrawerOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-700 bg-white hover:bg-red-50 text-sm font-medium"
                >
                  <HiX className="w-4 h-4" />
                  Revoke Access
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Revoke drawer (right to left) */}
      {revokeDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" aria-hidden onClick={() => !revoking && (setRevokeDrawerOpen(false), setRevokeReason(''))} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-[70] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Revoke access</h3>
              <button
                type="button"
                onClick={() => !revoking && (setRevokeDrawerOpen(false), setRevokeReason(''))}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <p className="text-gray-700">
                Revoking access means the job publisher (<span className="font-semibold">{item.organisationName}</span>) will no longer have access to your shared data. Are you sure you want to proceed?
              </p>
              <div>
                <label htmlFor="revoke-reason" className="block text-sm font-medium text-gray-700 mb-1.5">Reason (optional)</label>
                <textarea
                  id="revoke-reason"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="e.g. No longer pursuing this role"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-900 placeholder-gray-400"
                />
              </div>
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-900">
                  You have 48 hours for the revoked data to take effect. The job organizer will be notified.
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                type="button"
                onClick={() => !revoking && (setRevokeDrawerOpen(false), setRevokeReason(''))}
                disabled={revoking}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={revoking}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                {revoking ? 'Proceeding...' : 'Proceed'}
              </button>
            </div>
          </div>
        </>
      )}
    </ProfessionalLayout>
  );
}
