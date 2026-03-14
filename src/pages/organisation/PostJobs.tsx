import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import OrganisationLayout from '@/components/organisation/OrganisationLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import {
  HiBriefcase,
  HiPlus,
  HiSearch,
  HiX,
  HiDotsVertical,
  HiLocationMarker,
  HiCurrencyDollar,
  HiUserGroup,
  HiPause,
  HiPlay,
  HiEye,
  HiDocumentText,
} from 'react-icons/hi';

type Tab = 'roles' | 'applicants';

interface JobCardData {
  id: string;
  jobTitle: string;
  category: string | null;
  jobLevel: string | null;
  employmentType: string;
  workMode: string;
  workModeLabel: string;
  employmentTypeLabel: string;
  location: string;
  salaryRange: string;
  applicantsCount: number;
  status: string;
  postedDate: string;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    published: 'Active',
    draft: 'Under Review',
    paused: 'Paused',
    closed: 'Closed',
  };
  return map[status] || status;
}

function statusBadgeClass(status: string): string {
  // Match design: Paused = amber, Under Review = blue, Active = emerald (light bg + darker text)
  const map: Record<string, string> = {
    published: 'bg-[#ECFDF5] text-[#10B981]',   // Active - light green / emerald
    draft: 'bg-[#EFF6FF] text-[#3B82F6]',      // Under Review - light blue / blue
    paused: 'bg-[#FFFBEB] text-[#D97706]',      // Paused - light yellow / amber
    closed: 'bg-gray-100 text-gray-700',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

function formatPosted(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

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

export default function PostJobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobCardData[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('roles');
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    jobTitle: '',
    department: '',
    jobLevel: 'Mid Level',
    employmentType: 'full_time',
    workMode: 'on_site',
    locations: [] as string[],
    locationInput: '',
    pay: { currency: 'USD', min: '', max: '', period: 'Per annum' },
    description: '',
    qualifyingQuestions: [] as Array<{ question: string }>,
    requiredApplicantData: ['full_name', 'email'] as string[],
    distributionChannels: ['taldium_network'] as string[],
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/v1/organisation/jobs');
      const list = res.data?.data?.jobs || [];
      setJobs(list);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    setApplicantsLoading(true);
    try {
      const res = await api.get('/v1/organisation/applications?limit=100');
      setApplications(res.data?.data?.applications || []);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
      setApplications([]);
    } finally {
      setApplicantsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (activeTab === 'applicants') fetchApplications();
  }, [activeTab]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredJobs = jobs.filter((job) => {
    const term = searchTerm.toLowerCase();
    return (
      job.jobTitle?.toLowerCase().includes(term) ||
      job.location?.toLowerCase().includes(term)
    );
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('pay.')) {
      const payField = name.split('.')[1];
      setFormData({ ...formData, pay: { ...formData.pay, [payField]: value } });
    } else if (name === 'locationInput') {
      setFormData({ ...formData, locationInput: value });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const addLocation = () => {
    const loc = formData.locationInput.trim();
    if (!loc) return;
    if (formData.locations.includes(loc)) return;
    setFormData({ ...formData, locations: [...formData.locations, loc], locationInput: '' });
  };

  const removeLocation = (index: number) => {
    setFormData({ ...formData, locations: formData.locations.filter((_, i) => i !== index) });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const locationStr = formData.locations.length > 0 ? formData.locations.join(', ') : formData.locationInput.trim();
    if (!locationStr) {
      toast.error('Add at least one location.');
      return;
    }
    setFormLoading(true);
    try {
      const payload: any = {
        jobTitle: formData.jobTitle,
        department: formData.department || undefined,
        jobLevel: formData.jobLevel || undefined,
        workMode: formData.workMode,
        employmentType: formData.employmentType,
        description: formData.description || '',
        requirements: [],
        qualifyingQuestions: formData.qualifyingQuestions.filter((q) => (q.question || '').trim()).length
          ? formData.qualifyingQuestions.filter((q) => (q.question || '').trim()).map((q) => ({ question: (q.question || '').trim() }))
          : undefined,
        requiredApplicantData: formData.requiredApplicantData,
        distributionChannels: formData.distributionChannels.length ? formData.distributionChannels : ['taldium_network'],
      };
      if (formData.locations.length > 0) {
        payload.locations = formData.locations;
        payload.location = locationStr;
      } else {
        payload.location = locationStr;
      }
      const min = formData.pay.min ? Number(formData.pay.min) : undefined;
      const max = formData.pay.max ? Number(formData.pay.max) : undefined;
      if (min != null && max != null) {
        payload.pay = { currency: formData.pay.currency, min, max, type: 'Gross', period: formData.pay.period };
      } else {
        payload.pay = { amount: 0, currency: formData.pay.currency, type: 'Gross', period: formData.pay.period };
      }
      await api.post('/v1/organisation/jobs', payload);
      setFormData({
        jobTitle: '',
        department: '',
        jobLevel: 'Mid Level',
        employmentType: 'full_time',
        workMode: 'on_site',
        locations: [],
        locationInput: '',
        pay: { currency: 'USD', min: '', max: '', period: 'Per annum' },
        description: '',
        qualifyingQuestions: [],
        requiredApplicantData: ['full_name', 'email'],
        distributionChannels: ['taldium_network'],
      });
      setSidebarOpen(false);
      toast.success('Job role created successfully!');
      fetchJobs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create job');
    } finally {
      setFormLoading(false);
    }
  };

  const handleJobStatus = async (jobId: string, status: 'published' | 'paused' | 'draft' | 'closed') => {
    setActionMenuId(null);
    try {
      await api.put(`/v1/organisation/jobs/${jobId}/status`, { status });
      toast.success('Job status updated');
      fetchJobs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <OrganisationLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Jobs</h1>
            <p className="text-gray-500 text-sm md:text-base mt-0.5">Manage your job postings and applicants.</p>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shrink-0"
          >
            <HiPlus className="w-5 h-5 mr-2" />
            Create a Job
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'roles'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Job Roles ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab('applicants')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'applicants'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Applicants
          </button>
        </div>

        {activeTab === 'roles' && (
          <>
            <div className="mb-4">
              <div className="relative max-w-md">
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search jobs by title or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center text-gray-600 py-16">Loading jobs...</div>
            ) : filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-xl border border-gray-200">
                <HiBriefcase className="w-14 h-14 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Jobs Found</h3>
                <p className="text-sm text-gray-500 text-center max-w-md mb-4">
                  {searchTerm ? 'No jobs match your search.' : "You haven't posted any jobs yet. Create your first job to get started."}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create a Job
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col"
                  >
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-bold text-gray-900 truncate">{job.jobTitle}</h3>
                          <p className="text-sm text-gray-500 mt-0.5">{job.category || '—'}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadgeClass(job.status)}`}>
                            {statusLabel(job.status)}
                          </span>
                          <div className="relative" ref={actionMenuId === job.id ? actionMenuRef : null}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuId(actionMenuId === job.id ? null : job.id);
                              }}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                            >
                              <HiDotsVertical className="w-5 h-5" />
                            </button>
                            {actionMenuId === job.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                <button
                                  type="button"
                                  onClick={() => { setActionMenuId(null); navigate(`/organization/jobs/${job.id}`); }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <HiEye className="w-4 h-4" /> View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleJobStatus(job.id, job.status === 'published' ? 'paused' : 'published')}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  {job.status === 'published' ? <HiPause className="w-4 h-4" /> : <HiPlay className="w-4 h-4" />}
                                  {job.status === 'published' ? 'Pause' : 'Publish'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleJobStatus(job.id, 'draft')}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <HiDocumentText className="w-4 h-4" /> Return to draft
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {job.jobLevel && (
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                            {job.jobLevel}
                          </span>
                        )}
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                          {job.employmentTypeLabel}
                        </span>
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                          {job.workModeLabel}
                        </span>
                      </div>

                      {job.workMode !== 'global_remote' && job.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <HiLocationMarker className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="truncate">{job.location}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <HiCurrencyDollar className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>{job.salaryRange}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-auto pt-3 border-t border-gray-100">
                        <HiUserGroup className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>{job.applicantsCount} Applicant{job.applicantsCount !== 1 ? 's' : ''}</span>
                        <span className="ml-auto text-gray-500 text-xs">Posted {formatPosted(job.postedDate)}</span>
                      </div>
                    </div>

                    <div
                      className="px-5 py-3 bg-gray-50 border-t border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => navigate(`/organization/jobs/${job.id}`)}
                    >
                      <span className="text-sm font-medium text-brand-600">View details & applicants</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'applicants' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {applicantsLoading ? (
              <div className="text-center text-gray-600 py-16">Loading applicants...</div>
            ) : applications.length === 0 ? (
              <div className="text-center py-16 px-6">
                <HiUserGroup className="w-14 h-14 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No applicants yet</h3>
                <p className="text-sm text-gray-500">Applications will appear here when candidates apply to your jobs.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Applicant</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Job</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-900">
                            {app.professional?.user
                              ? `${app.professional.user.firstName || ''} ${app.professional.user.lastName || ''}`.trim() || app.professional.user.email
                              : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{app.job?.jobTitle || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            app.status === 'hired' || app.status === 'accepted' ? 'bg-green-100 text-green-800' :
                            app.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {app.status || 'pending'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {app.createdAt ? formatPosted(app.createdAt) : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => app.job?.id && navigate(`/organization/jobs/${app.job.id}`)}
                            className="text-sm font-medium text-brand-600 hover:text-brand-700"
                          >
                            View job
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create New Job Role Drawer */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Create New Job Role</h2>
              <button type="button" onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                <HiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">What role are you hiring for? *</label>
                  <input
                    type="text"
                    name="jobTitle"
                    required
                    value={formData.jobTitle}
                    onChange={handleFormChange}
                    placeholder="e.g. Senior Software Engineer"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Department *</label>
                    <select
                      name="department"
                      required
                      value={formData.department}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select department</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Product">Product</option>
                      <option value="Design">Design</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                      <option value="Operations">Operations</option>
                      <option value="Finance">Finance</option>
                      <option value="HR">HR</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Level *</label>
                    <select
                      name="jobLevel"
                      value={formData.jobLevel}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Junior">Junior</option>
                      <option value="Mid Level">Mid Level</option>
                      <option value="Senior">Senior</option>
                      <option value="Lead">Lead</option>
                      <option value="Principal">Principal</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Employment Type *</label>
                    <select
                      name="employmentType"
                      value={formData.employmentType}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Work Mode *</label>
                    <select
                      name="workMode"
                      value={formData.workMode}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="on_site">Onsite</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="global_remote">Global Remote</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Location(s) *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="locationInput"
                      value={formData.locationInput}
                      onChange={handleFormChange}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                      placeholder="Add a location"
                      className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={addLocation}
                      className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Add location"
                    >
                      <HiPlus className="w-5 h-5" />
                    </button>
                  </div>
                  {formData.locations.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.locations.map((loc, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 text-sm text-gray-700"
                        >
                          {loc}
                          <button type="button" onClick={() => removeLocation(i)} className="text-gray-500 hover:text-gray-700 ml-0.5">
                            <HiX className="w-4 h-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Pay Range</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      name="pay.currency"
                      value={formData.pay.currency}
                      onChange={handleFormChange}
                      className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                    <input
                      type="number"
                      name="pay.min"
                      value={formData.pay.min}
                      onChange={handleFormChange}
                      placeholder="Min"
                      className="w-28 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="number"
                      name="pay.max"
                      value={formData.pay.max}
                      onChange={handleFormChange}
                      placeholder="Max"
                      className="w-28 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <select
                      name="pay.period"
                      value={formData.pay.period}
                      onChange={handleFormChange}
                      className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Per annum">Yearly</option>
                      <option value="Per month">Monthly</option>
                      <option value="Per hour">Hourly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Job Description</label>
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
                      <button type="button" className="p-1.5 rounded hover:bg-gray-200 text-gray-600" title="Bold" onClick={(e) => e.preventDefault()}>
                        <span className="font-bold text-sm">B</span>
                      </button>
                      <button type="button" className="p-1.5 rounded hover:bg-gray-200 text-gray-600 italic text-sm" title="Italic" onClick={(e) => e.preventDefault()}>
                        I
                      </button>
                      <button type="button" className="p-1.5 rounded hover:bg-gray-200 text-gray-600 text-sm underline" title="Underline" onClick={(e) => e.preventDefault()}>
                        U
                      </button>
                      <span className="w-px h-4 bg-gray-300 mx-1" />
                      <button type="button" className="p-1.5 rounded hover:bg-gray-200 text-gray-600" title="Align left" onClick={(e) => e.preventDefault()}>
                        ≡
                      </button>
                      <button type="button" className="p-1.5 rounded hover:bg-gray-200 text-gray-600" title="Align center" onClick={(e) => e.preventDefault()}>
                        ≡
                      </button>
                      <button type="button" className="p-1.5 rounded hover:bg-gray-200 text-gray-600" title="Align right" onClick={(e) => e.preventDefault()}>
                        ≡
                      </button>
                    </div>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleFormChange}
                      rows={6}
                      placeholder="Describe the role, responsibilities, and requirements..."
                      className="w-full px-3 py-2.5 border-0 focus:outline-none focus:ring-0 resize-none"
                    />
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
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
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
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                            checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
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
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                            selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
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
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
              </div>

              <div className="sticky bottom-0 px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {formLoading ? 'Creating...' : 'Create Job Role'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </OrganisationLayout>
  );
}
