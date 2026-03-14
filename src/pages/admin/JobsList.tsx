import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  HiSearch,
  HiFilter,
  HiChevronLeft,
  HiChevronRight,
  HiBriefcase,
  HiCheckCircle,
  HiPause,
  HiX,
  HiPlus,
  HiDotsVertical,
} from 'react-icons/hi';

const REQUIRED_APPLICANT_DATA_OPTIONS: { id: string; label: string }[] = [
  { id: 'full_name', label: 'Full Name' },
  { id: 'email', label: 'Email' },
  { id: 'nationality', label: 'Nationality' },
  { id: 'location', label: 'Location' },
  { id: 'phone', label: 'Phone Number' },
  { id: 'government_id', label: 'Government ID' },
  { id: 'academic_data', label: 'Academic Data' },
  { id: 'work_data', label: 'Work Data' },
  { id: 'skill_set', label: 'Skill Set Data' },
  { id: 'social_media', label: 'Social Media' },
  { id: 'financial_data', label: 'Financial Data' },
  { id: 'reference_data', label: 'Reference Data' },
];

const DISTRIBUTION_CHANNELS: { id: string; label: string; subtitle: string; isDefault?: boolean }[] = [
  { id: 'taldium_network', label: 'Taldium Network', subtitle: 'Organisation page & Taldium Professional Network', isDefault: true },
  { id: 'google_search', label: 'Google Search', subtitle: 'Index on Google Jobs' },
  { id: 'monday_com', label: 'Monday.com', subtitle: 'Post to Monday.com job board' },
  { id: 'lensa', label: 'Lensa', subtitle: 'Distribute via Lensa' },
  { id: 'linkedin', label: 'LinkedIn', subtitle: 'Share on LinkedIn Jobs' },
  { id: 'indeed', label: 'Indeed', subtitle: 'Post to Indeed' },
  { id: 'glassdoor', label: 'Glassdoor', subtitle: 'List on Glassdoor' },
];

interface Job {
  id: string;
  jobTitle: string;
  location: string;
  workMode: string;
  employmentType: string;
  status: string;
  views: number;
  applicants: number;
  createdAt: string;
  organisation: {
    companyName: string;
  };
}

export default function JobsList() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    fetchJobs();
    fetchOrganisations();
  }, [page, statusFilter]);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (actionMenuOpen) {
        setActionMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [actionMenuOpen]);

  const fetchOrganisations = async () => {
    setLoadingOrganisations(true);
    try {
      const response = await api.get('/v1/admin/organisations?limit=1000');
      setOrganisations(response.data.data.organisations || []);
    } catch (err) {
      console.error('Failed to fetch organisations:', err);
    } finally {
      setLoadingOrganisations(false);
    }
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/v1/admin/jobs?page=${page}&limit=${limit}`);
      setJobs(response.data.data.jobs || []);
      setTotalPages(response.data.data.pagination?.totalPages || 1);
      setTotal(response.data.data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.organisation.companyName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'published' && job.status === 'published') ||
      (statusFilter === 'draft' && job.status === 'draft') ||
      (statusFilter === 'paused' && job.status === 'paused') ||
      (statusFilter === 'closed' && job.status === 'closed');

    return matchesSearch && matchesStatus;
  });

  const handleRowClick = (jobId: string) => {
    navigate(`/admin/jobs/${jobId}`);
  };

  const handleJobAction = async (jobId: string, action: 'publish' | 'pause' | 'draft' | 'closed') => {
    setActionMenuOpen(null);
    try {
      let status: 'published' | 'paused' | 'draft' | 'closed' = 'draft';
      if (action === 'publish') status = 'published';
      else if (action === 'pause') status = 'paused';
      else if (action === 'closed') status = 'closed';
      else status = 'draft';

      await api.put(`/v1/admin/jobs/${jobId}/status`, { status });
      const msg = action === 'publish' ? 'published' : action === 'pause' ? 'paused' : action === 'closed' ? 'closed' : 'returned to draft';
      toast.success(`Job ${msg} successfully!`);
      fetchJobs();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || `Failed to update job`;
      toast.error(errorMsg);
    }
  };

  const handlePublishModalAction = async (action: 'draft' | 'publish') => {
    if (!createdJobId) return;

    try {
      const status = action === 'publish' ? 'published' : 'draft';
      await api.put(`/v1/admin/jobs/${createdJobId}/status`, { status });
      toast.success(`Job ${action === 'publish' ? 'published' : 'saved as draft'} successfully!`);
      setShowPublishModal(false);
      setCreatedJobId(null);
      fetchJobs();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || `Failed to ${action} job`;
      toast.error(errorMsg);
    }
  };

  const [organisations, setOrganisations] = useState<any[]>([]);
  const [loadingOrganisations, setLoadingOrganisations] = useState(false);
  const [formData, setFormData] = useState({
    organisationId: '',
    jobTitle: '',
    location: '',
    workMode: '',
    employmentType: '',
    experienceYears: '',
    jobLevel: '',
    pay: {
      amount: '',
      currency: 'USD',
      type: 'Gross',
      period: 'Per annum',
    },
    closingDate: '',
    description: '',
    requirements: [''],
    benefits: [''],
    applyCTA: {
      label: 'Apply Now',
      requireVerification: [] as string[],
    },
    qualifyingQuestions: [] as Array<{ question: string }>,
    requiredApplicantData: ['full_name', 'email'] as string[],
    distributionChannels: ['taldium_network'] as string[],
  });
  const [formLoading, setFormLoading] = useState(false);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('pay.')) {
      const payField = name.split('.')[1];
      setFormData({
        ...formData,
        pay: { ...formData.pay, [payField]: value },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleRequirementChange = (index: number, value: string) => {
    const newRequirements = [...formData.requirements];
    newRequirements[index] = value;
    setFormData({ ...formData, requirements: newRequirements });
  };

  const handleBenefitChange = (index: number, value: string) => {
    const newBenefits = [...formData.benefits];
    newBenefits[index] = value;
    setFormData({ ...formData, benefits: newBenefits });
  };

  const handleApplyCTAChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      applyCTA: {
        ...formData.applyCTA,
        [field]: value,
      },
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      // Use admin endpoint - it will automatically select an organisation if none provided
      const payload = {
        jobTitle: formData.jobTitle,
        location: formData.location,
        workMode: formData.workMode,
        employmentType: formData.employmentType,
        experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : undefined,
        jobLevel: formData.jobLevel || undefined,
        pay: {
          amount: formData.pay.amount ? parseInt(formData.pay.amount) : 0,
          currency: formData.pay.currency,
          type: formData.pay.type,
          period: formData.pay.period,
        },
        closingDate: formData.closingDate || undefined,
        description: formData.description,
        requirements: formData.requirements.filter((r) => r.trim() !== ''),
        benefits: formData.benefits.filter((b) => b.trim() !== ''),
        applyCTA: formData.applyCTA.requireVerification.length > 0 ? {
          label: formData.applyCTA.label,
          requireVerification: formData.applyCTA.requireVerification,
        } : undefined,
        qualifyingQuestions: formData.qualifyingQuestions.filter((q) => (q.question || '').trim()).length
          ? formData.qualifyingQuestions.filter((q) => (q.question || '').trim()).map((q) => ({ question: (q.question || '').trim() }))
          : undefined,
        requiredApplicantData: formData.requiredApplicantData,
        distributionChannels: formData.distributionChannels.length ? formData.distributionChannels : ['taldium_network'],
      };

      const url = formData.organisationId 
        ? `/v1/admin/jobs?organisationId=${formData.organisationId}`
        : '/v1/admin/jobs';
      const response = await api.post(url, payload);
      const jobId = response.data.data?.id;
      
      // Reset form and close sidebar
      setFormData({
        organisationId: '',
        jobTitle: '',
        location: '',
        workMode: '',
        employmentType: '',
        experienceYears: '',
        jobLevel: '',
        pay: {
          amount: '',
          currency: 'USD',
          type: 'Gross',
          period: 'Per annum',
        },
        closingDate: '',
        description: '',
        requirements: [''],
        benefits: [''],
        applyCTA: {
          label: 'Apply Now',
          requireVerification: [],
        },
        qualifyingQuestions: [],
        requiredApplicantData: ['full_name', 'email'],
        distributionChannels: ['taldium_network'],
      });
      setSidebarOpen(false);
      
      // Show publish modal
      if (jobId) {
        setCreatedJobId(jobId);
        setShowPublishModal(true);
      } else {
        toast.success('Job created successfully!');
        fetchJobs(); // Refresh the jobs list
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to create job';
      toast.error(errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Jobs</h1>
        <p className="text-gray-600">Manage and view all job postings on the platform</p>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex items-center px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
        >
          <HiPlus className="w-5 h-5 mr-2" />
          Create Job
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by job title, location, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <HiFilter className="text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Status</option>
              <option value="published">Active</option>
              <option value="draft">Under Review</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table or Empty State */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading...</div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <HiBriefcase className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Jobs Posted Yet</h3>
            <p className="text-sm text-gray-500 text-center max-w-md mb-6">
              There are no job postings on the platform. Jobs will appear here once organizations start posting opportunities.
            </p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <HiSearch className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Found</h3>
            <p className="text-sm text-gray-500 text-center max-w-md mb-6">
              No jobs match your search criteria. Try adjusting your filters or search terms.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="text-brand-600 hover:text-brand-700 text-sm font-medium"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Job Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applicants
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Posted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredJobs.map((job) => (
                      <tr
                        key={job.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center mr-3">
                              <HiBriefcase className="w-5 h-5 text-brand-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{job.jobTitle}</div>
                              <div className="text-xs text-gray-500">{job.employmentType}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{job.organisation.companyName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{job.location}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {job.status === 'published' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#10B981]">
                              <HiCheckCircle className="w-4 h-4 mr-1" />
                              Active
                            </span>
                          ) : job.status === 'paused' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFFBEB] text-[#D97706]">
                              <HiPause className="w-4 h-4 mr-1" />
                              Paused
                            </span>
                          ) : job.status === 'closed' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              Closed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EFF6FF] text-[#3B82F6]">
                              Under Review
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{job.applicants || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{job.views || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuOpen(actionMenuOpen === job.id ? null : job.id);
                              }}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <HiDotsVertical className="w-5 h-5 text-gray-600" />
                            </button>
                            {actionMenuOpen === job.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                {job.status === 'draft' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleJobAction(job.id, 'publish');
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                  >
                                    Publish
                                  </button>
                                )}
                                {job.status === 'published' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleJobAction(job.id, 'pause');
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                  >
                                    Pause
                                  </button>
                                )}
                                {job.status === 'paused' && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleJobAction(job.id, 'publish');
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                      Resume
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleJobAction(job.id, 'draft');
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                      Return to Draft
                                    </button>
                                  </>
                                )}
                                {(job.status === 'published' || job.status === 'paused') && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleJobAction(job.id, 'closed');
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                  >
                                    Close
                                  </button>
                                )}
                                {job.status !== 'draft' && job.status !== 'closed' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleJobAction(job.id, 'draft');
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                  >
                                    Return to Draft
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRowClick(job.id);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  View Details
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredJobs.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                <span className="font-medium">{Math.min(page * limit, total)}</span> of{' '}
                <span className="font-medium">{total}</span> results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <HiChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <HiChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
            )}
          </>
        )}
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b">
                <h2 className="text-2xl font-bold text-gray-900">Create Job</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <HiX className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organisation *</label>
                  <select
                    name="organisationId"
                    required
                    value={formData.organisationId}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    disabled={loadingOrganisations}
                  >
                    <option value="">Select an organisation...</option>
                    {organisations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.companyName}
                      </option>
                    ))}
                  </select>
                  {loadingOrganisations && (
                    <p className="mt-1 text-sm text-gray-500">Loading organisations...</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                  <input
                    type="text"
                    name="jobTitle"
                    required
                    value={formData.jobTitle}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                  <input
                    type="text"
                    name="location"
                    required
                    value={formData.location}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Work Mode *</label>
                    <select
                      name="workMode"
                      required
                      value={formData.workMode}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Select Work Mode</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="on_site">On Site</option>
                      <option value="global_remote">Global Remote</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type *</label>
                    <select
                      name="employmentType"
                      required
                      value={formData.employmentType}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Select Type</option>
                      <option value="full_time">Full-time</option>
                      <option value="part_time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience Years</label>
                    <input
                      type="number"
                      name="experienceYears"
                      value={formData.experienceYears}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Level</label>
                    <input
                      type="text"
                      name="jobLevel"
                      value={formData.jobLevel}
                      onChange={handleFormChange}
                      placeholder="e.g., Senior, Junior"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    name="description"
                    required
                    value={formData.description}
                    onChange={handleFormChange}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
                  {formData.requirements.map((req, index) => (
                    <input
                      key={index}
                      type="text"
                      value={req}
                      onChange={(e) => handleRequirementChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder={`Requirement ${index + 1}`}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, requirements: [...formData.requirements, ''] })}
                    className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                  >
                    + Add Requirement
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Benefits</label>
                  {formData.benefits.map((benefit, index) => (
                    <input
                      key={index}
                      type="text"
                      value={benefit}
                      onChange={(e) => handleBenefitChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder={`Benefit ${index + 1}`}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, benefits: [...formData.benefits, ''] })}
                    className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                  >
                    + Add Benefit
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pay Information</label>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Amount</label>
                      <input
                        type="number"
                        name="pay.amount"
                        value={formData.pay.amount}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Currency</label>
                      <select
                        name="pay.currency"
                        value={formData.pay.currency}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Type</label>
                      <select
                        name="pay.type"
                        value={formData.pay.type}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="Gross">Gross</option>
                        <option value="Net">Net</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Period</label>
                      <select
                        name="pay.period"
                        value={formData.pay.period}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="Per annum">Per annum</option>
                        <option value="Per month">Per month</option>
                        <option value="Per week">Per week</option>
                        <option value="Per hour">Per hour</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apply CTA Label</label>
                  <input
                    type="text"
                    value={formData.applyCTA.label}
                    onChange={(e) => handleApplyCTAChange('label', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Apply Now"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Required Verifications</label>
                  <div className="space-y-2">
                    {['Identity', 'Education', 'Experience'].map((verification) => (
                      <label key={verification} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.applyCTA.requireVerification.includes(verification)}
                          onChange={(e) => {
                            const current = formData.applyCTA.requireVerification;
                            const updated = e.target.checked
                              ? [...current, verification]
                              : current.filter((v) => v !== verification);
                            handleApplyCTAChange('requireVerification', updated);
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{verification}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Qualifying Questions */}
                <div className="border-t border-gray-200 pt-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Qualifying Questions</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Add screening questions for applicants</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData((f) => ({ ...f, qualifyingQuestions: [...f.qualifyingQuestions, { question: '' }] }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg"
                    >
                      <HiPlus className="w-4 h-4" />
                      Add Question
                    </button>
                  </div>
                  {formData.qualifyingQuestions.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {formData.qualifyingQuestions.map((q, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            type="text"
                            value={q.question}
                            onChange={(e) => {
                              const next = [...formData.qualifyingQuestions];
                              next[i] = { question: e.target.value };
                              setFormData((f) => ({ ...f, qualifyingQuestions: next }));
                            }}
                            placeholder="e.g. How many years of experience do you have?"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData((f) => ({ ...f, qualifyingQuestions: f.qualifyingQuestions.filter((_, j) => j !== i) }))}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <HiX className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Required Applicant Data */}
                <div className="border-t border-gray-200 pt-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Required Applicant Data</h3>
                  <p className="text-xs text-gray-500 mb-3">Select the information applicants must share when applying. This will notify professionals what data they are sharing.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {REQUIRED_APPLICANT_DATA_OPTIONS.map((opt) => {
                      const checked = formData.requiredApplicantData.includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                            checked ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData((f) => ({ ...f, requiredApplicantData: [...f.requiredApplicantData, opt.id] }));
                              } else {
                                setFormData((f) => ({ ...f, requiredApplicantData: f.requiredApplicantData.filter((id) => id !== opt.id) }));
                              }
                            }}
                            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          />
                          <span className="text-sm font-medium text-gray-800">{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Job Distribution Channels */}
                <div className="border-t border-gray-200 pt-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Job Distribution Channels</h3>
                  <p className="text-xs text-gray-500 mb-3">Choose where this job will be published</p>
                  <div className="space-y-2">
                    {DISTRIBUTION_CHANNELS.map((ch) => {
                      const selected = formData.distributionChannels.includes(ch.id);
                      return (
                        <label
                          key={ch.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selected ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData((f) => ({ ...f, distributionChannels: [...f.distributionChannels, ch.id] }));
                              } else {
                                setFormData((f) => ({ ...f, distributionChannels: f.distributionChannels.filter((id) => id !== ch.id) }));
                              }
                            }}
                            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900">{ch.label}</span>
                            <p className="text-xs text-gray-500 truncate">{ch.subtitle}</p>
                          </div>
                          {ch.isDefault && (
                            <span className="text-xs font-medium text-gray-500 shrink-0">Default</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Closing Date</label>
                  <input
                    type="date"
                    name="closingDate"
                    value={formData.closingDate}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {formLoading ? 'Creating...' : 'Create Job'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
        )}
      </div>

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Job Created Successfully!</h3>
            <p className="text-gray-600 mb-6">
              What would you like to do with this job?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handlePublishModalAction('draft')}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Keep as Draft
              </button>
              <button
                onClick={() => handlePublishModalAction('publish')}
                className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors"
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

