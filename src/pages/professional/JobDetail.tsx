import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
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
  hasApplied?: boolean;
}

export default function ProfessionalJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [hasApplied, setHasApplied] = useState(false);

  useEffect(() => {
    if (id) fetchJob(id);
  }, [id]);

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

  const handleApply = async () => {
    if (!id) return;
    setApplying(true);
    try {
      await api.post(`/v1/jobs/${id}/apply`, {});
      toast.success('Application submitted successfully!');
      setHasApplied(true);
      fetchJob(id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to apply for job');
    } finally {
      setApplying(false);
    }
  };

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
            className="inline-flex items-center px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700"
          >
            <HiArrowLeft className="w-5 h-5 mr-2" />
            Back to Jobs
          </button>
        </div>
      </ProfessionalLayout>
    );
  }

  return (
    <ProfessionalLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <button
          onClick={() => navigate('/professional/jobs')}
          className="flex items-center text-gray-600 hover:text-teal-600 mb-6"
        >
          <HiArrowLeft className="w-5 h-5 mr-2" />
          Back to Jobs
        </button>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-16 h-16 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
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
              <div className="shrink-0">
                {!hasApplied ? (
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50"
                  >
                    {applying ? 'Applying...' : 'Apply Now'}
                  </button>
                ) : (
                  <div className="px-6 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg font-medium">
                    ✓ Applied
                  </div>
                )}
              </div>
            </div>
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
                      <HiCheckCircle className="w-5 h-5 text-teal-600 mr-2 flex-shrink-0 mt-0.5" />
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
                  className="inline-flex items-center mt-4 text-teal-600 hover:text-teal-700 font-medium"
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
                      {job.pay.currency} {job.pay.amount.toLocaleString()}
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
                <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
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
                className="block mt-4 text-center px-4 py-2 bg-teal-50 text-teal-700 rounded-lg font-medium hover:bg-teal-100"
              >
                View Company Profile
              </Link>
            </div>
            {!hasApplied && (
              <button
                onClick={handleApply}
                disabled={applying}
                className="w-full px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50"
              >
                {applying ? 'Applying...' : 'Apply Now'}
              </button>
            )}
          </div>
        </div>
      </div>
    </ProfessionalLayout>
  );
}
