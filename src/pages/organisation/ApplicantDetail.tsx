import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import OrganisationLayout from '@/components/organisation/OrganisationLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import {
  HiArrowLeft,
  HiDocumentDownload,
  HiBriefcase,
  HiLocationMarker,
  HiClock,
  HiAcademicCap,
  HiShare,
  HiUsers,
  HiX,
} from 'react-icons/hi';

const REQUIRED_APPLICANT_DATA_LABELS: Record<string, string> = {
  full_name: 'Full Name',
  email: 'Email',
  nationality: 'Nationality',
  location: 'Location',
  phone: 'Phone Number',
  government_id: 'Government ID',
  academic_data: 'Academic Data',
  work_data: 'Work Data',
  skill_set: 'Skill Set Data',
  social_media: 'Social Media',
  financial_data: 'Financial Data',
  reference_data: 'Reference Data',
  certifications: 'Certifications',
};

function getApplicantLocation(application: any): string {
  const loc = application?.location;
  if (loc != null && loc !== '') {
    if (typeof loc === 'string' && (loc.startsWith('{') || loc.startsWith('['))) {
      try {
        const parsed = JSON.parse(loc);
        if (parsed && typeof parsed === 'object') {
          const parts = [parsed.city, parsed.country, parsed.address].filter(Boolean);
          if (parts.length) return parts.join(', ');
        }
      } catch {
        // ignore
      }
    }
    if (typeof loc === 'string') return loc;
    if (typeof loc === 'object' && !Array.isArray(loc)) {
      const parts = [loc.city, loc.country, loc.address].filter(Boolean);
      if (parts.length) return parts.join(', ');
    }
  }
  const pro = application?.professional;
  if (pro?.country) return pro.country;
  if (Array.isArray(pro?.locations) && pro.locations.length > 0) {
    const first = pro.locations[0];
    const parts = typeof first === 'object' ? [first.city, first.country, first.address].filter(Boolean) : [first];
    if (parts.length) return parts.join(', ');
  }
  const workLoc = pro?.workExperience?.[0]?.location;
  if (workLoc && typeof workLoc === 'object') {
    const parts = [workLoc.city, workLoc.country].filter(Boolean);
    if (parts.length) return parts.join(', ');
  }
  return 'Not specified';
}

function getRequiredDataValue(key: string, application: any): string {
  const data = application?.applicationData;
  const pro = application?.professional;
  const u = pro?.user || {};
  switch (key) {
    case 'full_name':
      return (data?.full_name ?? `${u.firstName || ''} ${u.lastName || ''}`.trim()) || '—';
    case 'email':
      return data?.email ?? u.email ?? '—';
    case 'phone':
      return data?.phone ?? (pro?.user as any)?.phoneNumber ?? '—';
    case 'nationality':
      return data?.nationality ?? pro?.nationality ?? '—';
    case 'location':
      return (data?.location ?? getApplicantLocation(application)) || '—';
    case 'government_id':
      return pro?.idType && pro?.idNumber ? `${String(pro.idType).replace(/_/g, ' ')} (verified)` : pro?.identityStatus === 'verified' ? 'Verified' : '—';
    case 'academic_data':
      return Array.isArray(pro?.education) && pro.education.length > 0
        ? `${pro.education.length} entr${pro.education.length === 1 ? 'y' : 'ies'}`
        : '—';
    case 'work_data':
      return Array.isArray(pro?.workExperience) && pro.workExperience.length > 0
        ? `${pro.workExperience.length} entr${pro.workExperience.length === 1 ? 'y' : 'ies'}`
        : '—';
    case 'skill_set':
      return pro?.description ? String(pro.description).slice(0, 200) + (String(pro.description).length > 200 ? '…' : '') : data?.skill_set ?? '—';
    case 'social_media':
      const sm = pro?.socialMedia || {};
      const links = ['linkedin', 'twitter', 'facebook', 'instagram']
        .map((k) => (sm[k] ? `${k}: ${sm[k]}` : null))
        .filter(Boolean);
      return links.length > 0 ? links.join(' · ') : data?.social_media ?? '—';
    case 'cvUrl':
      return data?.cvUrl ?? '—';
    case 'certifications':
      const certs = pro?.certifications;
      if (Array.isArray(certs) && certs.length > 0) return `${certs.length} item(s)`;
      if (certs && typeof certs === 'object' && Object.keys(certs).length > 0) return 'Provided';
      return '—';
    default:
      return (data && data[key]) ?? '—';
  }
}

function getStatusBadge(status: string) {
  const s = (status || '').toLowerCase();
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    shortlisted: 'bg-blue-100 text-blue-800',
    under_review: 'bg-purple-100 text-purple-800',
    accepted: 'bg-green-100 text-green-800',
    hired: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  const labels: Record<string, string> = {
    under_review: 'Reserved',
    accepted: 'Accepted',
  };
  const label = labels[s] ?? s.charAt(0).toUpperCase() + s.slice(1);
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${styles[s] || 'bg-gray-100 text-gray-800'}`}>
      {label}
    </span>
  );
}

export default function ApplicantDetail() {
  const { jobId, applicationId } = useParams<{ jobId: string; applicationId: string }>();
  const [job, setJob] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [profileDetail, setProfileDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (jobId && applicationId) {
      fetchData();
    }
  }, [jobId, applicationId]);

  const fetchData = async () => {
    if (!jobId || !applicationId) return;
    setLoading(true);
    setProfileDetail(null);
    try {
      const [jobRes, appsRes] = await Promise.all([
        api.get(`/v1/organisation/jobs/${jobId}`),
        api.get('/v1/organisation/applications', { params: { jobId, limit: 500 } }),
      ]);
      const jobData = jobRes.data?.data ?? jobRes.data;
      setJob(jobData);
      const apps = appsRes.data?.data?.applications ?? [];
      const app = apps.find((a: any) => a.id === applicationId);
      setApplication(app || null);
      if (!app) {
        toast.error('Application not found');
        return;
      }
      if (app.professionalId) {
        try {
          const profileRes = await api.get(`/v1/organisation/professionals/${app.professionalId}`);
          setProfileDetail(profileRes.data?.data ?? null);
        } catch {
          setProfileDetail(null);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load application');
      setApplication(null);
      setJob(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string, reason?: string) => {
    if (!application?.id) return;
    setUpdatingStatus(true);
    try {
      await api.put(`/v1/organisation/applications/${application.id}/status`, {
        status: newStatus,
        ...(reason != null && reason.trim() ? { reason: reason.trim() } : {}),
      });
      const msg = newStatus === 'shortlisted' ? 'Shortlisted' : newStatus === 'rejected' ? 'Declined' : newStatus === 'under_review' ? 'Reserved' : newStatus === 'hired' ? 'Hired' : 'Status updated';
      toast.success(msg);
      setRejectModalOpen(false);
      setRejectReason('');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <OrganisationLayout>
        <div className="p-6 flex items-center justify-center min-h-[40vh]">
          <p className="text-gray-600">Loading application...</p>
        </div>
      </OrganisationLayout>
    );
  }

  if (!application || !job) {
    return (
      <OrganisationLayout>
        <div className="p-6 max-w-2xl mx-auto text-center">
          <p className="text-gray-600 mb-4">Application not found.</p>
          <Link to={`/organization/jobs/${jobId}`} className="text-brand-600 hover:text-brand-700 font-medium">
            Back to job
          </Link>
        </div>
      </OrganisationLayout>
    );
  }

  const applicantName =
    application.applicantName ||
    `${application.professional?.user?.firstName || ''} ${application.professional?.user?.lastName || ''}`.trim() ||
    'Applicant';
  const requiredKeys: string[] =
    Array.isArray(job.requiredApplicantData) && job.requiredApplicantData.length > 0
      ? job.requiredApplicantData
      : ['full_name', 'email'];
  const appData = application.applicationData && typeof application.applicationData === 'object' ? application.applicationData : {};
  const qualifyingAnswers = appData.qualifyingAnswers || [];

  const PERSONAL_KEYS = ['full_name', 'email', 'phone', 'nationality', 'location', 'government_id'];
  const PROFESSIONAL_KEYS = ['academic_data', 'work_data', 'skill_set', 'certifications'];
  const OTHER_KEYS = ['social_media', 'financial_data', 'reference_data'];

  const segmentKeys = (keys: string[]) => keys.filter((k) => requiredKeys.includes(k));
  const pro = application?.professional;
  const profile = profileDetail || pro;
  const educationList = profileDetail?.education ?? pro?.education ?? [];
  const workList = profileDetail?.workExperience ?? pro?.workExperience ?? [];
  const socialMedia = profileDetail?.socialMedia ?? pro?.socialMedia ?? {};
  const description = profileDetail?.description ?? pro?.description ?? '';
  const locationsList = pro?.locations ?? [];
  const familyInfo = pro?.familyInfo && typeof pro.familyInfo === 'object' ? pro.familyInfo : null;
  const certifications = pro?.certifications;

  const formatWorkMode = (mode: string) => (mode || '').replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  const formatEmploymentType = (type: string) => (type || '').replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

  const hasPersonal = profile?.name || profile?.email || profile?.country || profile?.nationality || (pro?.user && (pro.user.firstName || pro.user.email));
  const hasLocation = (Array.isArray(locationsList) && locationsList.length > 0) || profile?.country || profile?.location;
  const hasEducation = Array.isArray(educationList) && educationList.length > 0;
  const hasWork = Array.isArray(workList) && workList.length > 0;
  const hasSocial = Object.values(socialMedia || {}).some((v) => v && String(v).trim());
  const hasCertifications = (Array.isArray(certifications) && certifications.length > 0) || (certifications && typeof certifications === 'object' && Object.keys(certifications).length > 0);
  const hasFamily = familyInfo && (familyInfo.maritalStatus || familyInfo.spouseName || (familyInfo.relations && familyInfo.relations.length > 0));

  return (
    <OrganisationLayout>
      <div className="min-h-[60vh] bg-gray-50/50">
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link
              to={`/organization/jobs/${jobId}`}
              className="inline-flex items-center text-gray-600 hover:text-brand-600"
            >
              <HiArrowLeft className="w-5 h-5 mr-2" />
              Back to job
            </Link>
            {getStatusBadge(application.hiringStatus || application.status)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: Job, Applicant + CTAs, Qualifying answers (sticky on scroll) */}
            <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-6 lg:self-start">
              {/* Job summary */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Job</h2>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{job.jobTitle}</h3>
                {job.organisation && (
                  <p className="text-gray-600 mb-2">{job.organisation.companyName}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  {job.location && (
                    <span className="inline-flex items-center gap-1">
                      <HiLocationMarker className="w-4 h-4" />
                      {job.location}
                    </span>
                  )}
                  {job.workMode && (
                    <span className="inline-flex items-center gap-1">
                      <HiBriefcase className="w-4 h-4" />
                      {formatWorkMode(job.workMode)}
                    </span>
                  )}
                  {job.employmentType && (
                    <span>{formatEmploymentType(job.employmentType)}</span>
                  )}
                  {job.closingDate && (
                    <span className="inline-flex items-center gap-1">
                      <HiClock className="w-4 h-4" />
                      Closes {new Date(job.closingDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Applicant + CTAs */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h1 className="text-2xl font-bold text-gray-900">{applicantName}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">Applied {application.createdAt ? new Date(application.createdAt).toLocaleDateString() : ''}</p>
                  {profileDetail?.verificationStatus && (
                    <span className="inline-flex mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-100 text-brand-800">
                      {profileDetail.verificationStatus.percentage}% · {profileDetail.verificationStatus.status}
                    </span>
                  )}
                </div>
                <div className="px-6 py-4 bg-gray-50">
                  {application.status === 'pending' ? (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => handleUpdateStatus('shortlisted')} disabled={updatingStatus} className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">Shortlist</button>
                      <button type="button" onClick={() => handleUpdateStatus('hired')} disabled={updatingStatus} className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">Hire</button>
                      <button type="button" onClick={() => handleUpdateStatus('under_review')} disabled={updatingStatus} className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">Reserve</button>
                      <button type="button" onClick={() => setRejectModalOpen(true)} disabled={updatingStatus} className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50">Reject</button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Application status: {getStatusBadge(application.hiringStatus || application.status)}
                    </p>
                  )}
                </div>
              </div>

              {/* Qualifying answers */}
              {Array.isArray(qualifyingAnswers) && qualifyingAnswers.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Qualifying answers</h3>
                  <div className="space-y-3">
                    {qualifyingAnswers.map((q: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                        <p className="text-sm font-medium text-gray-700">{q.question}</p>
                        <p className="text-sm text-gray-900 mt-0.5">{q.answer ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right column: Verification-style data (actual data from profile/application) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 sm:p-8">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Applicant data (from Verification Center)</h2>

                  {/* Personal */}
                  {(hasPersonal || segmentKeys(PERSONAL_KEYS).length > 0) && (
                    <section className="mb-6">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <HiUsers className="w-4 h-4" />
                        Personal
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(['full_name', 'email', 'phone', 'nationality', 'government_id'] as const).map((key) => {
                          const label = REQUIRED_APPLICANT_DATA_LABELS[key] ?? key.replace(/_/g, ' ');
                          const value = getRequiredDataValue(key, application);
                          const hasValue = value && value !== '—';
                          return (
                            <div key={key} className={`p-3 rounded-lg border ${hasValue ? 'border-gray-200 bg-gray-50/50' : 'border-gray-100 bg-gray-50/30'}`}>
                              <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
                              <p className={`text-sm ${hasValue ? 'text-gray-900' : 'text-gray-400'}`}>{value}</p>
                            </div>
                          );
                        })}

                        {/* CV */}
                        {(appData.cvUrl || requiredKeys.includes('cvUrl')) && (
                          <section className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                            <h3 className="text-xs font-medium text-gray-500 mb-0.5">CV</h3>
                            <div className="p-3 rounded-lg border border-brand-500 bg-brand-50/50">
                              {appData.cvUrl ? (
                                <a href={appData.cvUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                                  <HiDocumentDownload className="w-4 h-4" />
                                  View CV
                                </a>
                              ) : (
                                <p className="text-sm text-gray-400">—</p>
                              )}
                            </div>
                          </section>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Education */}
                  {(hasEducation || segmentKeys(PROFESSIONAL_KEYS).includes('academic_data')) && (
                    <section className="mb-6">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <HiAcademicCap className="w-4 h-4" />
                        Education
                      </h3>
                      {educationList.length > 0 ? (
                        <ul className="space-y-3">
                          {educationList.map((edu: any, i: number) => (
                            <li key={i} className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                              <p className="font-medium text-gray-900">{edu.institutionName || edu.school || '—'}</p>
                              <p className="text-sm text-gray-600 mt-0.5">
                                {[edu.levelOfEducation, edu.degreeType, edu.fieldOfStudy].filter(Boolean).join(' · ')}
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
                        <p className="text-sm text-gray-400 p-3">No education added</p>
                      )}
                    </section>
                  )}

                  {/* Work experience */}
                  {(hasWork || segmentKeys(PROFESSIONAL_KEYS).includes('work_data')) && (
                    <section className="mb-6">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <HiBriefcase className="w-4 h-4" />
                        Work experience
                      </h3>
                      {workList.length > 0 ? (
                        <ul className="space-y-3">
                          {workList.map((exp: any, i: number) => (
                            <li key={i} className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                              <p className="font-medium text-gray-900">{exp.role || exp.jobTitle || '—'}</p>
                              <p className="text-sm text-gray-600 mt-0.5">{exp.organisationName || exp.companyName || ''}</p>
                              {(exp.startDate || exp.endDate) && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {exp.startDate ? new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}
                                  {exp.endDate ? ` – ${new Date(exp.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ' – Present'}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-400 p-3">No work experience added</p>
                      )}
                    </section>
                  )}

                  {/* Skill set / Description */}
                  {(description || segmentKeys(PROFESSIONAL_KEYS).includes('skill_set')) && (
                    <section className="mb-6">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Skill set / Summary</h3>
                      <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{description || '—'}</p>
                      </div>
                    </section>
                  )}

                  {/* Certifications */}
                  {(hasCertifications || segmentKeys(PROFESSIONAL_KEYS).includes('certifications')) && (
                    <section className="mb-6">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Certifications</h3>
                      {Array.isArray(certifications) && certifications.length > 0 ? (
                        <ul className="space-y-2">
                          {certifications.map((c: any, i: number) => (
                            <li key={i} className="p-3 rounded-lg border border-gray-200 bg-gray-50/50 text-sm text-gray-900">
                              {c.name || c.issuedBy || '—'}
                              {c.issuedDate && <span className="text-gray-500 block text-xs mt-0.5">{new Date(c.issuedDate).toLocaleDateString()}</span>}
                            </li>
                          ))}
                        </ul>
                      ) : certifications && typeof certifications === 'object' ? (
                        <p className="text-sm text-gray-600 p-3">Provided</p>
                      ) : (
                        <p className="text-sm text-gray-400 p-3">—</p>
                      )}
                    </section>
                  )}

                  {/* Family */}
                  {hasFamily && (
                    <section className="mb-6">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <HiUsers className="w-4 h-4" />
                        Family & relationship
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {familyInfo.maritalStatus && (
                          <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                            <p className="text-xs font-medium text-gray-500 mb-0.5">Marital status</p>
                            <p className="text-sm text-gray-900">{familyInfo.maritalStatus}</p>
                          </div>
                        )}
                        {familyInfo.spouseName && (
                          <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                            <p className="text-xs font-medium text-gray-500 mb-0.5">Spouse name</p>
                            <p className="text-sm text-gray-900">{familyInfo.spouseName}</p>
                          </div>
                        )}
                        {familyInfo.relations && familyInfo.relations.length > 0 && (
                          <div className="sm:col-span-2 p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                            <p className="text-xs font-medium text-gray-500 mb-1">Relations</p>
                            <ul className="text-sm text-gray-900 space-y-0.5">
                              {familyInfo.relations.map((r: any, i: number) => (
                                <li key={i}>{r.relationType ? `${r.relationType}: ` : ''}{r.fullName || '—'}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Location */}
                  {(hasLocation || (segmentKeys(PERSONAL_KEYS).length > 0 && requiredKeys.includes('location'))) && (
                    <section className="mb-6">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <HiLocationMarker className="w-4 h-4" />
                        Location
                      </h3>
                      {Array.isArray(locationsList) && locationsList.length > 0 ? (
                        <ul className="space-y-2">
                          {locationsList.map((loc: any, i: number) => (
                            <li key={i} className="p-3 rounded-lg border border-gray-200 bg-gray-50/50 text-sm text-gray-900">
                              {[loc.country, loc.address, loc.city, loc.state].filter(Boolean).join(', ') || '—'}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50 text-sm text-gray-900">
                          {getApplicantLocation(application)}
                        </div>
                      )}
                    </section>
                  )}


                  {/* Other required (financial_data, reference_data) if in requiredKeys */}
                  {/* {segmentKeys(OTHER_KEYS).filter((k) => k !== 'social_media').length > 0 && (
                    <section className="mt-6 pt-6 border-t border-gray-200">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Other</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {segmentKeys(OTHER_KEYS)
                          .filter((k) => k !== 'social_media')
                          .map((key: string) => {
                            const label = REQUIRED_APPLICANT_DATA_LABELS[key] ?? key.replace(/_/g, ' ');
                            const value = getRequiredDataValue(key, application);
                            const hasValue = value && value !== '—';
                            return (
                              <div key={key} className={`p-3 rounded-lg border ${hasValue ? 'border-gray-200 bg-gray-50/50' : 'border-gray-100 bg-gray-50/30'}`}>
                                <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
                                <p className={`text-sm ${hasValue ? 'text-gray-900' : 'text-gray-400'}`}>{value}</p>
                              </div>
                            );
                          })}
                      </div>
                    </section>
                  )} */}

                  {/* Social media */}
                  {(hasSocial || segmentKeys(OTHER_KEYS).includes('social_media')) && (
                    <section className="mb-6">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <HiShare className="w-4 h-4" />
                        Social media
                      </h3>
                      <div className="flex flex-wrap gap-3">
                        {Object.entries(socialMedia).map(([key, value]) => {
                          const url = typeof value === 'string' ? value.trim() : '';
                          if (!url) return null;
                          const label = key.charAt(0).toUpperCase() + key.slice(1);
                          return (
                            <a key={key} href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:underline">
                              {label}
                            </a>
                          );
                        })}
                        {!Object.values(socialMedia).some((v) => v && String(v).trim()) && (
                          <p className="text-sm text-gray-400">—</p>
                        )}
                      </div>
                    </section>
                  )}

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject reason modal */}
      {rejectModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { setRejectModalOpen(false); setRejectReason(''); }} aria-hidden />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Reject application</h3>
                <button type="button" onClick={() => { setRejectModalOpen(false); setRejectReason(''); }} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
                  <HiX className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-3">Optionally provide a reason for the rejection (visible to the candidate or for your records).</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Experience level doesn’t match the role..."
                rows={4}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none text-sm"
              />
              <div className="flex gap-2 mt-4 justify-end">
                <button
                  type="button"
                  onClick={() => { setRejectModalOpen(false); setRejectReason(''); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('rejected', rejectReason)}
                  disabled={updatingStatus}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {updatingStatus ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </OrganisationLayout>
  );
}
