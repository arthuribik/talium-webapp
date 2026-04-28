import { useState, useEffect } from 'react';
import { APP_NAME } from '@/constants/app';
import { plainTextFromHtml } from '@/seo/applySeo';
import { buildCanonicalUrl } from '@/seo/resolveRouteSeo';
import { usePageSeo } from '@/seo/usePageSeo';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/services/api';
import { formatMoney } from '@/utils/formatMoney';
import { useAppSelector } from '@/store/hooks';
import toast from 'react-hot-toast';
import LandingLayout from '@/components/landing/LandingLayout';
import {
  HiBriefcase,
  HiLocationMarker,
  HiClock,
  HiCurrencyDollar,
  HiOfficeBuilding,
  HiGlobe,
  HiArrowLeft,
  HiCheckCircle,
  HiX,
} from 'react-icons/hi';

interface Job {
  id: string;
  jobTitle: string;
  location: string;
  workMode: string;
  employmentType: string;
  description: string;
  requirements: string[];
  pay?: {
    amount?: number;
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
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [canApplyToJobs, setCanApplyToJobs] = useState<boolean | null>(null);

  usePageSeo(
    job
      ? {
          title: `${job.jobTitle} — ${job.organisation?.companyName || 'Company'}`,
          description:
            plainTextFromHtml(job.description) ||
            `${job.jobTitle} in ${job.location || 'multiple locations'}. Apply on ${APP_NAME}.`,
          canonicalUrl: buildCanonicalUrl(`/jobs/${job.id}`, ''),
          noIndex: false,
        }
      : null,
    [job],
  );

  useEffect(() => {
    if (id) {
      fetchJob(id);
    }
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated || user?.userType !== 'PROFESSIONAL') {
      setCanApplyToJobs(null);
      return;
    }
    let cancelled = false;
    api
      .get('/v1/professional/profile')
      .then((res) => {
        if (!cancelled) setCanApplyToJobs(res.data?.data?.canApplyToJobs === true);
      })
      .catch(() => {
        if (!cancelled) setCanApplyToJobs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.userType]);

  const professionalApplyBlocked =
    isAuthenticated &&
    user?.userType === 'PROFESSIONAL' &&
    canApplyToJobs === false;
  const professionalApplyLoading =
    isAuthenticated &&
    user?.userType === 'PROFESSIONAL' &&
    canApplyToJobs === null;

  const fetchJob = async (jobId: string) => {
    setLoading(true);
    setError('');
    try {
      // Check if this job has been viewed before (unique view tracking)
      const viewedJobs = JSON.parse(localStorage.getItem('viewedJobs') || '[]');
      const isUniqueView = !viewedJobs.includes(jobId);
      
      // Add to viewed jobs if it's a unique view
      if (isUniqueView) {
        viewedJobs.push(jobId);
        localStorage.setItem('viewedJobs', JSON.stringify(viewedJobs));
      }
      
      const response = await api.get(`/v1/jobs/${jobId}?isUniqueView=${isUniqueView}`);
      const jobData = response.data.data || response.data;
      setJob(jobData);
      setHasApplied(jobData.hasApplied || false);
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

  const getCompanyInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const formatWorkMode = (mode: string) => {
    return mode.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatEmploymentType = (type: string) => {
    return type.replace(/_/g, '-').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleApply = async () => {
    if (!id) return;

    // Check if user is logged in
    if (!isAuthenticated || !user) {
      // Store the current job URL to redirect back after registration
      const currentUrl = `/jobs/${id}`;
      navigate(`/join?redirect=${encodeURIComponent(currentUrl)}`);
      return;
    }

    // Check if user is a professional
    if (user.userType !== 'PROFESSIONAL') {
      setShowProfessionalModal(true);
      return;
    }

    if (canApplyToJobs === false) {
      toast.error(
        'Finish account setup or wait for administrator activation before applying.',
      );
      return;
    }

    setApplying(true);
    try {
      await api.post(`/v1/jobs/${id}/apply`, {});
      toast.success('Application submitted successfully!');
      setHasApplied(true);
      // Optionally refresh job data to show updated applicant count
      if (id) {
        fetchJob(id);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to apply for job';
      toast.error(errorMessage);
    } finally {
      setApplying(false);
    }
  };

  // Check for redirect parameter after registration
  useEffect(() => {
    const redirect = searchParams.get('redirect');
    if (
      !redirect ||
      !isAuthenticated ||
      user?.userType !== 'PROFESSIONAL' ||
      canApplyToJobs === null
    ) {
      return;
    }
    if (canApplyToJobs) {
      toast.success('Welcome back. You can apply from this page when you are ready.');
    } else {
      toast(
        'Welcome back. Finish verification (email, phone, identity) or wait for account activation before applying.',
        { icon: 'ℹ️' },
      );
    }
  }, [searchParams, isAuthenticated, user?.userType, canApplyToJobs]);

  if (loading) {
    return (
      <LandingLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-600 mb-4">Loading job details...</div>
          </div>
        </div>
      </LandingLayout>
    );
  }

  if (error || !job) {
    return (
      <LandingLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiBriefcase className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'The job you are looking for does not exist.'}</p>
            <Link
              to="/jobs"
              className="inline-flex items-center px-6 py-3 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors"
            >
              <HiArrowLeft className="w-5 h-5 mr-2" />
              Back to Jobs
            </Link>
          </div>
        </div>
      </LandingLayout>
    );
  }

  return (
    <LandingLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Back Button */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => navigate('/jobs')}
              className="flex items-center text-gray-600 hover:text-brand-500 transition-colors"
            >
              <HiArrowLeft className="w-5 h-5 mr-2" />
              Back to Jobs
            </button>
          </div>
        </div>

        {/* Job Header */}
        <section className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-20 h-20 bg-brand-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-3xl">
                    {getCompanyInitial(job.organisation.companyName)}
                  </span>
                </div>
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">{job.jobTitle}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-4">
                    <div className="flex items-center">
                      <HiOfficeBuilding className="w-5 h-5 mr-2" />
                      <span className="font-medium">{job.organisation.companyName}</span>
                    </div>
                    <div className="flex items-center">
                      <HiLocationMarker className="w-5 h-5 mr-2" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center">
                      <HiGlobe className="w-5 h-5 mr-2" />
                      <span>{formatWorkMode(job.workMode)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <HiClock className="w-4 h-4 mr-1" />
                      <span>{getTimeAgo(job.createdAt)}</span>
                    </div>
                    {job.views !== undefined && (
                      <span>{job.views} view{job.views !== 1 ? 's' : ''}</span>
                    )}
                    {job.closingDate && (
                      <span>
                        Closes: {new Date(job.closingDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Show buttons only if not already applied and for authenticated professionals or unauthenticated users */}
              {!hasApplied && ((isAuthenticated && user?.userType === 'PROFESSIONAL') || !isAuthenticated) ? (
                <div className="flex flex-col gap-3">
                  {isAuthenticated && user?.userType === 'PROFESSIONAL' ? (
                    <>
                      <button
                        onClick={handleApply}
                        disabled={applying || professionalApplyLoading || professionalApplyBlocked}
                        className="px-8 py-3 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {applying
                          ? 'Applying...'
                          : professionalApplyLoading
                            ? 'Loading…'
                            : professionalApplyBlocked
                              ? 'Apply unavailable'
                              : 'Apply Now'}
                      </button>
                      {professionalApplyBlocked && (
                        <p className="text-xs text-amber-800 max-w-xs text-center">
                          Complete setup in{' '}
                          <Link to="/professional/verification" className="underline font-medium text-brand-700">
                            Verification Center
                          </Link>{' '}
                          or wait for an administrator to activate your account.
                        </p>
                      )}
                      {!hasApplied && (
                        <button className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors whitespace-nowrap">
                          Save Job
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        const currentUrl = `/jobs/${id}`;
                        navigate(`/join?redirect=${encodeURIComponent(currentUrl)}`);
                      }}
                      className="px-8 py-3 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors whitespace-nowrap"
                    >
                      Apply Now
                    </button>
                  )}
                </div>
              ) : hasApplied && isAuthenticated && user?.userType === 'PROFESSIONAL' ? (
                <div className="px-8 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg font-medium whitespace-nowrap text-center">
                  ✓ You have already applied for this job
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Job Description */}
              <div className="bg-white rounded-xl p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Job Description</h2>
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {job.description || 'No description available.'}
                  </p>
                </div>
              </div>

              {/* Key Responsibilities */}
              {job.requirements && job.requirements.length > 0 && (
                <div className="bg-white rounded-xl p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Key Responsibilities</h2>
                  <ul className="space-y-3">
                    {job.requirements.map((requirement, index) => (
                      <li key={index} className="flex items-start">
                        <HiCheckCircle className="w-5 h-5 text-brand-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* About the Company */}
              {job.organisation.description && (
                <div className="bg-white rounded-xl p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">About the Company</h2>
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

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Job Details Card */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Job Details</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-500 block mb-1">Employment Type</span>
                    <span className="text-gray-900 font-medium">
                      {formatEmploymentType(job.employmentType)}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 block mb-1">Work Mode</span>
                    <span className="text-gray-900 font-medium">{formatWorkMode(job.workMode)}</span>
                  </div>
                  {job.experienceYears && (
                    <div>
                      <span className="text-sm text-gray-500 block mb-1">Experience Required</span>
                      <span className="text-gray-900 font-medium">
                        {job.experienceYears} year{job.experienceYears > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  {job.jobLevel && (
                    <div>
                      <span className="text-sm text-gray-500 block mb-1">Job Level</span>
                      <span className="text-gray-900 font-medium capitalize">
                        {job.jobLevel.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                  {job.pay?.amount && (
                    <div>
                      <span className="text-sm text-gray-500 block mb-1">Salary</span>
                      <div className="flex items-center text-gray-900 font-medium">
                        <HiCurrencyDollar className="w-5 h-5 mr-1" />
                        <span>
                          {formatMoney(job.pay.currency, job.pay.amount)}
                          {job.pay.period && ` / ${job.pay.period}`}
                        </span>
                      </div>
                    </div>
                  )}
                  {job.closingDate && (
                    <div>
                      <span className="text-sm text-gray-500 block mb-1">Application Deadline</span>
                      <span className="text-gray-900 font-medium">
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

              {/* Company Info Card */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Company</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">
                        {getCompanyInitial(job.organisation.companyName)}
                      </span>
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
                      <span>{job.organisation.country}</span>
                    </div>
                  )}
                  <Link
                    to={`/organisations/${job.organisation.id}`}
                    className="block mt-4 text-center px-4 py-2 bg-brand-50 text-brand-600 rounded-lg font-medium hover:bg-brand-100 transition-colors"
                  >
                    View Company Profile
                  </Link>
                </div>
              </div>

              {/* Apply Button (Sticky) - Only show for authenticated professionals or unauthenticated users, and only if not already applied */}
              {!hasApplied && ((isAuthenticated && user?.userType === 'PROFESSIONAL') || !isAuthenticated) ? (
                <div className="lg:sticky lg:top-4">
                  {isAuthenticated && user?.userType === 'PROFESSIONAL' ? (
                    <>
                      <button
                        onClick={handleApply}
                        disabled={applying || professionalApplyLoading || professionalApplyBlocked}
                        className="w-full px-6 py-4 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {applying
                          ? 'Applying...'
                          : professionalApplyLoading
                            ? 'Loading…'
                            : professionalApplyBlocked
                              ? 'Apply unavailable'
                              : 'Apply Now'}
                      </button>
                      <p className="text-xs text-gray-500 text-center mt-2">
                        {professionalApplyBlocked
                          ? 'Finish account setup or wait for activation to apply.'
                          : "You'll need a verified profile to apply"}
                      </p>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          const currentUrl = `/jobs/${id}`;
                          navigate(`/join?redirect=${encodeURIComponent(currentUrl)}`);
                        }}
                        className="w-full px-6 py-4 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors text-lg"
                      >
                        Apply Now
                      </button>
                      <p className="text-xs text-gray-500 text-center mt-2">
                        Sign up as a professional to apply
                      </p>
                    </>
                  )}
                </div>
              ) : hasApplied && isAuthenticated && user?.userType === 'PROFESSIONAL' ? (
                <div className="lg:sticky lg:top-4">
                  <div className="w-full px-6 py-4 bg-green-50 border border-green-200 text-green-700 rounded-lg font-medium text-center text-lg">
                    ✓ You have already applied for this job
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      {/* Professional Only Modal */}
      {showProfessionalModal && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowProfessionalModal(false)}
          >
            {/* Modal */}
            <div
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowProfessionalModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <HiX className="w-6 h-6" />
              </button>

              {/* Content */}
              <div className="text-center">
                <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HiBriefcase className="w-8 h-8 text-brand-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Professional Account Required
                </h3>
                <p className="text-gray-600 mb-6">
                  Only professionals can apply for jobs. Please sign up as a professional to apply for this position.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowProfessionalModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowProfessionalModal(false);
                      navigate('/join?redirect=' + encodeURIComponent(`/jobs/${id}`));
                    }}
                    className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors"
                  >
                    Sign Up as Professional
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </LandingLayout>
  );
}

