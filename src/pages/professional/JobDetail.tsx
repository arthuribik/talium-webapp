import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import { formatMoney } from '@/utils/formatMoney';
import toast from 'react-hot-toast';
import {
  HiBriefcase,
  HiLocationMarker,
  HiClock,
  HiCurrencyDollar,
  HiOfficeBuilding,
  HiGlobe,
  HiArrowLeft,
  HiCheckCircle,
  HiBookmark,
} from 'react-icons/hi';

interface QualifyingQuestion {
  question: string;
  type?: string;
  optional?: boolean;
  options?: string[];
}

interface Job {
  id: string;
  jobTitle: string;
  location: string;
  workMode: string;
  employmentType: string;
  description: string;
  requirements: string[];
  qualifyingQuestions?: QualifyingQuestion[] | null;
  requiredApplicantData?: string[];
  pay?: {
    amount?: number;
    min?: number;
    max?: number;
    currency?: string;
    period?: string;
    type?: string;
  };
  experienceYears?: number;
  jobLevel?: string;
  closingDate?: string;
  createdAt: string;
  views?: number;
  organisation: {
    id: string;
    companyName: string;
    description?: string;
    industry?: string;
    country?: string;
  };
  hasApplied?: boolean;
  isSaved?: boolean;
}

export default function ProfessionalJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [hasApplied, setHasApplied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [qualifyingAnswers, setQualifyingAnswers] = useState<Record<number, string>>({});
  const [professionalProfile, setProfessionalProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUploading, setCvUploading] = useState(false);

  useEffect(() => {
    if (id) fetchJob(id);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setProfileLoading(true);
    api
      .get('/v1/professional/profile')
      .then((res) => {
        if (!cancelled) setProfessionalProfile(res.data?.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setProfessionalProfile(null);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync apply view with URL param (e.g. ?apply=true)
  useEffect(() => {
    const apply = searchParams.get('apply') === 'true';
    setShowApplyForm(apply);
  }, [searchParams]);

  const canApplyToJobs = professionalProfile?.canApplyToJobs === true;
  const applyBlocked = !profileLoading && !canApplyToJobs;

  const fetchJob = async (jobId: string) => {
    setLoading(true);
    setError('');
    try {
      const viewedJobs = JSON.parse(localStorage.getItem('viewedJobs') || '[]');
      const isUniqueView = !viewedJobs.includes(jobId);
      if (isUniqueView) {
        viewedJobs.push(jobId);
        localStorage.setItem('viewedJobs', JSON.stringify(viewedJobs));
      }
      const response = await api.get(`/v1/jobs/${jobId}?isUniqueView=${isUniqueView}`);
      const jobData = response.data.data || response.data;
      setJob(jobData);
      setHasApplied(jobData.hasApplied || false);
      setIsSaved(jobData.isSaved || false);
    } catch (err: any) {
      console.error('Failed to fetch job:', err);
      setError(err.response?.data?.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const jobDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - jobDate.getTime()) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  };

  const getCompanyInitial = (name: string) => name.charAt(0).toUpperCase();
  const formatWorkMode = (mode: string) =>
    mode.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  const formatEmploymentType = (type: string) =>
    type.replace(/_/g, '-').replace(/\b\w/g, (l) => l.toUpperCase());

  const questions = Array.isArray(job?.qualifyingQuestions) ? job.qualifyingQuestions : [];
  const hasQuestions = questions.length > 0;

  const handleApplyClick = () => {
    if (applyBlocked) {
      toast.error(
        'Finish account setup or wait for administrator activation before applying.',
      );
      return;
    }
    setCvUrl(null);
    setCvFile(null);
    setSearchParams({ apply: 'true' });
    setQualifyingAnswers({});
  };

  const closeApplyForm = () => {
    setShowApplyForm(false);
    setQualifyingAnswers({});
    setCvUrl(null);
    setCvFile(null);
    const next = new URLSearchParams(searchParams);
    next.delete('apply');
    setSearchParams(next, { replace: true });
  };

  const handleCvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/i)) {
      toast.error('Please upload a PDF or Word document.');
      return;
    }
    setCvFile(file);
    setCvUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ data?: { url?: string }; url?: string }>('/v1/professional/upload-cv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.data?.url ?? res.data?.url;
      if (url) setCvUrl(url);
      else toast.error('Upload failed');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload CV');
      setCvFile(null);
    } finally {
      setCvUploading(false);
    }
  };

  const clearCv = () => {
    setCvUrl(null);
    setCvFile(null);
  };

  const handleSaveJob = async () => {
    if (!id || savingJob) return;
    setSavingJob(true);
    try {
      if (isSaved) {
        await api.delete(`/v1/professional/saved-jobs/${id}`);
        setIsSaved(false);
        toast.success('Job removed from saved');
      } else {
        await api.post('/v1/professional/saved-jobs', { jobId: id });
        setIsSaved(true);
        toast.success('Job saved');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || (isSaved ? 'Failed to unsave job' : 'Failed to save job'));
    } finally {
      setSavingJob(false);
    }
  };

  const handleApplySubmit = async (applicationData?: Record<string, unknown>) => {
    if (!id) return;
    if (applyBlocked) {
      toast.error(
        'Finish account setup or wait for administrator activation before applying.',
      );
      return;
    }
    setApplying(true);
    try {
      const data = { ...(applicationData ?? {}), ...(cvUrl ? { cvUrl } : {}) };
      await api.post(`/v1/jobs/${id}/apply`, {
        applicationData: data,
      });
      toast.success('Application submitted successfully!');
      setHasApplied(true);
      closeApplyForm();
      fetchJob(id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to apply for job');
    } finally {
      setApplying(false);
    }
  };

  const handleApplyWithQuestions = () => {
    const answers: Record<string, unknown> = {
      qualifyingAnswers: questions.map((_, i) => ({
        questionIndex: i,
        question: questions[i].question,
        answer: qualifyingAnswers[i] ?? '',
      })),
    };
    handleApplySubmit(answers);
  };

  const requiredDataLabels: Record<string, string> = {
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

  const getRequiredDataValue = (key: string, profile: any): string => {
    if (!profile) return '—';
    const u = profile.user || {};
    switch (key) {
      case 'full_name':
        return [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';
      case 'email':
        return u.email || '—';
      case 'nationality':
        return profile.nationality || '—';
      case 'location':
        return profile.country || (profile.locations?.[0]?.country) || '—';
      case 'phone':
        return u.phoneNumber || '—';
      case 'government_id':
        return profile.idType && profile.idNumber
          ? `${profile.idType}: ****`
          : profile.identityStatus === 'verified'
            ? 'Verified'
            : '—';
      case 'academic_data':
        return Array.isArray(profile.education) && profile.education.length > 0
          ? `${profile.education.length} entr${profile.education.length === 1 ? 'y' : 'ies'}`
          : '—';
      case 'work_data':
        return Array.isArray(profile.workExperience) && profile.workExperience.length > 0
          ? `${profile.workExperience.length} entr${profile.workExperience.length === 1 ? 'y' : 'ies'}`
          : '—';
      case 'skill_set':
        return profile.description ? 'Provided' : '—';
      case 'social_media': {
        const sm = profile.socialMedia || {};
        const has = ['linkedin', 'twitter', 'facebook', 'instagram'].some((k) => sm[k]);
        return has ? 'Provided' : '—';
      }
      case 'financial_data':
      case 'reference_data':
        return '—';
      case 'certifications': {
        const certs = profile.certifications;
        if (Array.isArray(certs) && certs.length > 0) return `${certs.length} item(s)`;
        if (certs && typeof certs === 'object' && Object.keys(certs).length > 0) return 'Provided';
        return '—';
      }
      default:
        return '—';
    }
  };

  const requiredApplicantData = Array.isArray(job?.requiredApplicantData) && job.requiredApplicantData.length > 0
    ? job.requiredApplicantData
    : ['full_name', 'email'];

  if (loading) {
    return (
      <ProfessionalLayout>
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </ProfessionalLayout>
    );
  }

  if (error || !job) {
    return (
      <ProfessionalLayout>
        <div className="p-6 max-w-2xl mx-auto text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HiBriefcase className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The job you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/professional/jobs')}
            className="inline-flex items-center px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700"
          >
            <HiArrowLeft className="w-5 h-5 mr-2" />
            Back to Jobs
          </button>
        </div>
      </ProfessionalLayout>
    );
  }

  // Clean application page (same URL): when Apply Now was clicked, show only application details
  if (!hasApplied && showApplyForm && job) {
    return (
      <ProfessionalLayout>
        <div className="min-h-[60vh] bg-gray-50/50">
          <div className="p-6 max-w-2xl mx-auto">
            <button
              type="button"
              onClick={closeApplyForm}
              className="flex items-center text-gray-600 hover:text-brand-600 mb-6"
            >
              <HiArrowLeft className="w-5 h-5 mr-2" />
              Back to job
            </button>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 sm:p-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Application</h1>
                <p className="text-sm text-gray-500 mb-6">
                  Applying to <span className="font-medium text-gray-700">{job.jobTitle}</span> at {job.organisation.companyName}
                </p>

                {applyBlocked && (
                  <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <p className="font-medium">Account not ready to apply</p>
                    <p className="mt-1 text-amber-800">
                      Verify your email and phone, complete identity verification (including liveness), or wait until an administrator activates your account. You can continue in{' '}
                      <Link to="/professional/verification" className="font-medium text-brand-700 underline hover:text-brand-800">
                        Verification Center
                      </Link>
                      .
                    </p>
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-gray-900 mb-1">Required Applicant Data</h2>
                    <p className="text-sm text-gray-500 mb-3">
                      The following data will be shared with the employer when you apply. Shown below is what we will send from your profile.
                    </p>
                    {profileLoading ? (
                      <p className="text-sm text-gray-500">Loading your profile data...</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {requiredApplicantData.map((key) => {
                          const label = requiredDataLabels[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                          const value = getRequiredDataValue(key, professionalProfile);
                          const hasValue = value && value !== '—';
                          return (
                            <div
                              key={key}
                              className={`flex items-start gap-2 p-3 rounded-lg border ${
                                hasValue ? 'border-brand-500 bg-brand-50/50' : 'border-gray-200 bg-gray-50/50'
                              }`}
                            >
                              <HiCheckCircle className="mt-0.5 flex-shrink-0 w-5 h-5 text-brand-600" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900">{label}</p>
                                <p className={`text-xs mt-0.5 truncate ${hasValue ? 'text-gray-700' : 'text-gray-500'}`}>
                                  {value}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-gray-200">
                    <h2 className="text-base font-bold text-gray-900 mb-1">Upload CV</h2>
                    <p className="text-sm text-gray-500 mb-3">
                      Attach your CV or resume (PDF or Word). Optional but recommended.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer disabled:opacity-50">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          className="sr-only"
                          onChange={handleCvChange}
                          disabled={cvUploading}
                        />
                        {cvUploading ? 'Uploading...' : cvFile ? 'Change file' : 'Choose file'}
                      </label>
                      {cvFile && (
                        <>
                          <span className="text-sm text-gray-600 truncate max-w-[12rem]" title={cvFile.name}>
                            {cvFile.name}
                          </span>
                          {cvUrl && (
                            <span className="text-sm text-brand-600">Uploaded</span>
                          )}
                          <button
                            type="button"
                            onClick={clearCv}
                            className="text-sm text-gray-500 hover:text-red-600"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {hasQuestions && (
                    <div className="pt-6 border-t border-gray-200">
                      <h2 className="text-base font-bold text-gray-900 mb-3">Questions</h2>
                      <p className="text-sm text-gray-600 mb-4">Please answer the following questions.</p>
                      <div className="space-y-6">
                        {questions.map((q, idx) => (
                          <div key={idx} className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700">
                              {q.question}
                              {q.optional && <span className="text-gray-500 font-normal ml-1">(optional)</span>}
                            </label>
                            {q.type === 'yes_no' ? (
                              <div className="flex flex-wrap gap-x-6 gap-y-2">
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`q-${idx}`}
                                    checked={qualifyingAnswers[idx] === 'yes'}
                                    onChange={() => setQualifyingAnswers((prev) => ({ ...prev, [idx]: 'yes' }))}
                                    className="text-brand-600 focus:ring-brand-500"
                                  />
                                  <span>Yes</span>
                                </label>
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`q-${idx}`}
                                    checked={qualifyingAnswers[idx] === 'no'}
                                    onChange={() => setQualifyingAnswers((prev) => ({ ...prev, [idx]: 'no' }))}
                                    className="text-brand-600 focus:ring-brand-500"
                                  />
                                  <span>No</span>
                                </label>
                              </div>
                            ) : q.type === 'multiple_choice' && Array.isArray(q.options) && q.options.length > 0 ? (
                              <div className="space-y-1">
                                {q.options.map((opt, oi) => (
                                  <label key={oi} className="flex items-center gap-2 cursor-pointer py-1 rounded hover:bg-gray-50">
                                    <input
                                      type="radio"
                                      name={`q-${idx}`}
                                      checked={qualifyingAnswers[idx] === opt}
                                      onChange={() => setQualifyingAnswers((prev) => ({ ...prev, [idx]: opt }))}
                                      className="text-brand-600 focus:ring-brand-500 flex-shrink-0"
                                    />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <input
                                type="text"
                                value={qualifyingAnswers[idx] ?? ''}
                                onChange={(e) => setQualifyingAnswers((prev) => ({ ...prev, [idx]: e.target.value }))}
                                placeholder="Your answer"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={hasQuestions ? handleApplyWithQuestions : () => handleApplySubmit({})}
                    disabled={applying || applyBlocked || profileLoading}
                    className="flex-1 px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50"
                  >
                    {applying ? 'Submitting...' : 'Submit application'}
                  </button>
                  <button
                    type="button"
                    onClick={closeApplyForm}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProfessionalLayout>
    );
  }

  return (
    <ProfessionalLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <button
          onClick={() => navigate('/professional/jobs')}
          className="flex items-center text-gray-600 hover:text-brand-600 mb-6"
        >
          <HiArrowLeft className="w-5 h-5 mr-2" />
          Back to Jobs
        </button>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-16 h-16 bg-brand-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-2xl">
                    {getCompanyInitial(job.organisation.companyName)}
                  </span>
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{job.jobTitle}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-2">
                    <span className="flex items-center">
                      <HiOfficeBuilding className="w-5 h-5 mr-2" />
                      {job.organisation.companyName}
                    </span>
                    <span className="flex items-center">
                      <HiLocationMarker className="w-5 h-5 mr-2" />
                      {job.location}
                    </span>
                    <span className="flex items-center">
                      <HiGlobe className="w-5 h-5 mr-2" />
                      {formatWorkMode(job.workMode)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <HiClock className="w-4 h-4 mr-1" />
                      {getTimeAgo(job.createdAt)}
                    </span>
                    {job.views !== undefined && (
                      <span>{job.views} view{job.views !== 1 ? 's' : ''}</span>
                    )}
                    {job.closingDate && (
                      <span>Closes: {new Date(job.closingDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-3">
                {!hasApplied && (
                  <button
                    type="button"
                    onClick={handleSaveJob}
                    disabled={savingJob}
                    className={`inline-flex items-center px-4 py-2.5 border rounded-lg font-medium transition-colors disabled:opacity-50 ${
                      isSaved
                        ? 'border-gray-300 bg-gray-50 text-gray-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <HiBookmark className={`w-5 h-5 mr-2 ${isSaved ? 'fill-current' : ''}`} />
                    {isSaved ? 'Saved' : 'Save Job'}
                  </button>
                )}
                {!hasApplied ? (
                  !showApplyForm ? (
                    <button
                      onClick={handleApplyClick}
                      disabled={applying || profileLoading || applyBlocked}
                      className="px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50"
                      title={
                        applyBlocked
                          ? 'Finish account setup or wait for administrator activation'
                          : undefined
                      }
                    >
                      {profileLoading ? 'Loading…' : applyBlocked ? 'Apply unavailable' : 'Apply Now'}
                    </button>
                  ) : null
                ) : (
                  <>
                  <div className="px-6 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg font-medium">
                    You already applied
                  </div>
                  </>
                )}
              </div>
            </div>
            {applyBlocked && !hasApplied && !showApplyForm && (
              <div className="border-t border-amber-100 bg-amber-50/80 px-6 py-3 text-sm text-amber-900">
                Applications are disabled until your account is activated or you finish setup (
                <Link to="/professional/verification" className="font-medium text-brand-700 underline hover:text-brand-800">
                  Verification Center
                </Link>
                ).
              </div>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Job Description</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {job.description || 'No description available.'}
              </p>
            </div>
            {job.requirements && job.requirements.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Key Responsibilities</h2>
                <ul className="space-y-2">
                  {job.requirements.map((req, i) => (
                    <li key={i} className="flex items-start">
                      <HiCheckCircle className="w-5 h-5 text-brand-600 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {job.organisation.description && (
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">About the Company</h2>
                <p className="text-gray-700 leading-relaxed">{job.organisation.description}</p>
                <Link
                  to={`/organisations/${job.organisation.id}`}
                  className="inline-flex items-center mt-4 text-brand-600 hover:text-brand-700 font-medium"
                >
                  View Company Profile
                  <HiArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                </Link>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Job Details</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500 block">Employment Type</span>
                  <span className="font-medium text-gray-900">{formatEmploymentType(job.employmentType)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Work Mode</span>
                  <span className="font-medium text-gray-900">{formatWorkMode(job.workMode)}</span>
                </div>
                {job.experienceYears != null && (
                  <div>
                    <span className="text-gray-500 block">Experience</span>
                    <span className="font-medium text-gray-900">{job.experienceYears} year{job.experienceYears !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {job.jobLevel && (
                  <div>
                    <span className="text-gray-500 block">Job Level</span>
                    <span className="font-medium text-gray-900 capitalize">{job.jobLevel.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {job.pay?.amount != null && (
                  <div>
                    <span className="text-gray-500 block">Salary</span>
                    <div className="flex items-center font-medium text-gray-900">
                      <HiCurrencyDollar className="w-4 h-4 mr-1" />
                      {formatMoney(job.pay.currency, job.pay.amount)}
                      {job.pay.period && ` / ${job.pay.period}`}
                    </div>
                  </div>
                )}
                {job.closingDate && (
                  <div>
                    <span className="text-gray-500 block">Deadline</span>
                    <span className="font-medium text-gray-900">
                      {new Date(job.closingDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Company</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">{getCompanyInitial(job.organisation.companyName)}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{job.organisation.companyName}</p>
                  {job.organisation.industry && (
                    <p className="text-sm text-gray-500">{job.organisation.industry}</p>
                  )}
                </div>
              </div>
              {job.organisation.country && (
                <div className="flex items-center text-sm text-gray-600">
                  <HiLocationMarker className="w-4 h-4 mr-2" />
                  {job.organisation.country}
                </div>
              )}
              <Link
                to={`/organisations/${job.organisation.id}`}
                className="block mt-4 text-center px-4 py-2 bg-brand-50 text-brand-700 rounded-lg font-medium hover:bg-brand-100"
              >
                View Company Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ProfessionalLayout>
  );
}
