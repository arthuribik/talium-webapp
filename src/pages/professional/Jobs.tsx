import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import { 
  HiBriefcase, 
  HiLocationMarker, 
  HiClock, 
  HiCalendar,
  HiSearch,
  HiX,
  HiChevronDown,
  HiBookmark,
  HiStar
} from 'react-icons/hi';
import { COUNTRIES } from '@/utils/countries';
import { SearchableList } from '@/components/common/SearchableList';

interface Job {
  id: string;
  jobTitle: string;
  location: string;
  workMode: string;
  employmentType: string;
  experienceYears?: number;
  jobLevel?: string;
  description: string;
  requirements: string[];
  createdAt: string;
  closingDate?: string;
  organisation: {
    id: string;
    companyName: string;
  };
  hasApplied?: boolean;
}

interface JobFilters {
  search: string;
  country: string;
  city: string;
  organisation: string;
  workMode: string;
  jobTitle: string;
  dateFrom: string;
  dateTo: string;
}

const TAB_PARAM = 'tab';
const VALID_TABS = ['available', 'applications', 'saved', 'offers'] as const;

export default function Jobs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get(TAB_PARAM);
  const initialTab = VALID_TABS.includes(tabFromUrl as any) ? tabFromUrl : 'available';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab from URL on load / when URL changes (e.g. back button)
  useEffect(() => {
    const t = searchParams.get(TAB_PARAM);
    if (VALID_TABS.includes(t as any)) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const setTab = (tab: string) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'available') {
      next.delete(TAB_PARAM);
    } else {
      next.set(TAB_PARAM, tab);
    }
    setSearchParams(next, { replace: true });
  };

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [headhuntOffers, setHeadhuntOffers] = useState<any[]>([]);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<JobFilters>({
    search: '',
    country: '',
    city: '',
    organisation: '',
    workMode: '',
    jobTitle: '',
    dateFrom: '',
    dateTo: '',
  });

  const fetchSavedJobIds = async () => {
    try {
      const res = await api.get('/v1/professional/saved-jobs');
      const ids = res.data?.data?.jobIds ?? [];
      setSavedJobs(Array.isArray(ids) ? ids : []);
    } catch {
      setSavedJobs([]);
    }
  };

  useEffect(() => {
    fetchSavedJobIds();
  }, []);

  useEffect(() => {
    if (activeTab === 'available') {
      fetchJobs();
    } else if (activeTab === 'applications') {
      fetchApplications();
    } else if (activeTab === 'saved') {
      fetchSavedJobs();
    } else if (activeTab === 'offers') {
      fetchHeadhuntOffers();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'available') {
      fetchJobs();
    }
  }, [filters]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.country) params.append('country', filters.country);
      if (filters.city) params.append('city', filters.city);
      if (filters.organisation) params.append('organisationId', filters.organisation);
      if (filters.workMode) params.append('workMode', filters.workMode);
      if (filters.jobTitle) params.append('jobTitle', filters.jobTitle);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await api.get(`/v1/jobs?${params.toString()}`);
      const jobsData = response.data.data || response.data || [];
      setJobs(Array.isArray(jobsData) ? jobsData : []);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      toast.error('Failed to load jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v1/professional/applications');
      const apps = response.data.data?.applications || [];
      setApplications(apps);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedJobs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/v1/professional/saved-jobs');
      const savedIds: string[] = res.data?.data?.jobIds ?? [];
      setSavedJobs(Array.isArray(savedIds) ? savedIds : []);
      if (savedIds.length === 0) {
        setJobs([]);
        setLoading(false);
        return;
      }
      const jobsPromises = savedIds.map((id: string) =>
        (async () => {
          const viewedJobs = JSON.parse(localStorage.getItem('viewedJobs') || '[]');
          const isUniqueView = !viewedJobs.includes(id);
          if (isUniqueView) {
            viewedJobs.push(id);
            localStorage.setItem('viewedJobs', JSON.stringify(viewedJobs));
          }
          return api.get(`/v1/jobs/${id}?isUniqueView=${isUniqueView}`).catch(() => null);
        })()
      );
      const jobsResponses = await Promise.all(jobsPromises);
      const savedJobsData = jobsResponses
        .filter((r): r is NonNullable<typeof r> => !!r?.data?.data)
        .map((r) => r.data.data);
      setJobs(savedJobsData);
    } catch (err) {
      console.error('Failed to fetch saved jobs:', err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchHeadhuntOffers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v1/professional/headhunt-offers');
      setHeadhuntOffers(response.data.data?.offers || []);
    } catch (err) {
      console.error('Failed to fetch headhunt offers:', err);
      setHeadhuntOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJob = async (jobId: string) => {
    const isCurrentlySaved = savedJobs.includes(jobId);
    try {
      if (isCurrentlySaved) {
        await api.delete(`/v1/professional/saved-jobs/${jobId}`);
        setSavedJobs((prev) => prev.filter((id) => id !== jobId));
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
        toast.success('Job removed from saved');
      } else {
        await api.post('/v1/professional/saved-jobs', { jobId });
        setSavedJobs((prev) => [...prev, jobId]);
        toast.success('Job saved');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || (isCurrentlySaved ? 'Failed to unsave job' : 'Failed to save job'));
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      country: '',
      city: '',
      organisation: '',
      workMode: '',
      jobTitle: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  const filteredJobs = jobs.filter((job) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!job.jobTitle.toLowerCase().includes(searchLower) &&
          !job.description.toLowerCase().includes(searchLower) &&
          !job.organisation.companyName.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    if (filters.country && !job.location.toLowerCase().includes(filters.country.toLowerCase())) {
      return false;
    }
    if (filters.workMode && job.workMode !== filters.workMode) {
      return false;
    }
    if (filters.jobTitle && !job.jobTitle.toLowerCase().includes(filters.jobTitle.toLowerCase())) {
      return false;
    }
    if (filters.dateFrom) {
      const jobDate = new Date(job.createdAt);
      const fromDate = new Date(filters.dateFrom);
      if (jobDate < fromDate) return false;
    }
    if (filters.dateTo) {
      const jobDate = new Date(job.createdAt);
      const toDate = new Date(filters.dateTo);
      if (jobDate > toDate) return false;
    }
    return true;
  });

  // Get unique organisations for filter
  const uniqueOrganisations = Array.from(
    new Set(jobs.map(job => job.organisation.companyName))
  ).sort();

  return (
    <ProfessionalLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <HiBriefcase className="w-6 h-6 mr-2 text-brand-600" />
            Jobs
          </h1>
          <p className="text-gray-600">Browse, search, save and apply for jobs</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex space-x-4">
            <button
              onClick={() => setTab('available')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'available'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Available Jobs {activeTab === 'available' && `(${filteredJobs.length})`}
            </button>
            <button
              onClick={() => setTab('applications')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'applications'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              My Applications
            </button>
            <button
              onClick={() => setTab('saved')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'saved'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Saved Jobs
            </button>
            <button
              onClick={() => setTab('offers')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'offers'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Job Offer Requests
            </button>
          </div>
        </div>

        {/* Available Jobs Tab */}
        {activeTab === 'available' && (
          <>
            {/* Search and Filters */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search jobs by title, description, or company..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <span>Filters</span>
                    <HiChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'transform rotate-180' : ''}`} />
                  </button>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <HiX className="w-4 h-4" />
                      Clear Filters
                    </button>
                  )}
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <SearchableList
                        value={filters.country}
                        onChange={(country) => setFilters({ ...filters, country })}
                        options={[{ value: '', label: 'All Countries' }, ...COUNTRIES.map((c) => ({ value: c, label: c }))]}
                        placeholder="All Countries"
                        className="focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        placeholder="Enter city"
                        value={filters.city}
                        onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Organisation</label>
                      <SearchableList
                        value={filters.organisation}
                        onChange={(organisation) => setFilters({ ...filters, organisation })}
                        options={[{ value: '', label: 'All Organisations' }, ...uniqueOrganisations.map((org) => ({ value: org, label: org }))]}
                        placeholder="All Organisations"
                        className="focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Work Mode</label>
                      <SearchableList
                        value={filters.workMode}
                        onChange={(workMode) => setFilters({ ...filters, workMode })}
                        options={[
                          { value: '', label: 'All Work Modes' },
                          { value: 'remote', label: 'Remote' },
                          { value: 'onsite', label: 'Onsite' },
                          { value: 'hybrid', label: 'Hybrid' },
                        ]}
                        placeholder="All Work Modes"
                        className="focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                      <input
                        type="text"
                        placeholder="e.g., Software Engineer"
                        value={filters.jobTitle}
                        onChange={(e) => setFilters({ ...filters, jobTitle: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                      <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                      <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Jobs List */}
            {loading ? (
              <div className="text-center text-gray-600 py-16">Loading jobs...</div>
            ) : filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-xl shadow-sm">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <HiBriefcase className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Jobs Found</h3>
                <p className="text-sm text-gray-500 text-center max-w-md">
                  {hasActiveFilters
                    ? 'No jobs match your search criteria. Try adjusting your filters.'
                    : 'No jobs available at the moment.'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-4 py-2 text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-1 truncate" title={job.jobTitle}>
                          {job.jobTitle}
                        </h3>
                        <p className="text-gray-600 text-sm truncate" title={job.organisation.companyName}>
                          {job.organisation.companyName}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSaveJob(job.id); }}
                        className={`ml-2 p-2 shrink-0 transition-colors rounded-lg ${
                          savedJobs.includes(job.id)
                            ? 'text-brand-500 hover:text-brand-600 hover:bg-brand-50'
                            : 'text-gray-400 hover:text-brand-500 hover:bg-gray-100'
                        }`}
                        title={savedJobs.includes(job.id) ? 'Unsave job' : 'Save job'}
                      >
                        <HiBookmark className={`w-5 h-5 ${savedJobs.includes(job.id) ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mb-3">
                      <span className="flex items-center">
                        <HiLocationMarker className="w-4 h-4 mr-1 shrink-0" />
                        <span className="truncate">{job.location}</span>
                      </span>
                      <span className="flex items-center">
                        <HiBriefcase className="w-4 h-4 mr-1 shrink-0" />
                        {job.workMode.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                      {job.experienceYears && (
                        <span className="flex items-center">
                          <HiClock className="w-4 h-4 mr-1 shrink-0" />
                          {job.experienceYears}y
                        </span>
                      )}
                      <span className="flex items-center">
                        <HiCalendar className="w-4 h-4 mr-1 shrink-0" />
                        {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm line-clamp-2 mb-4 flex-1">{job.description}</p>
                    <div className="pt-3 border-t border-gray-100">
                      {job.hasApplied ? (
                        <div className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg font-medium text-center text-sm">
                          ✓ Applied
                        </div>
                      ) : (
                        <button
                          onClick={() => navigate(`/professional/jobs/${job.id}`)}
                          className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* My Applications Tab */}
        {activeTab === 'applications' && (
          <>
            {loading ? (
              <div className="text-center text-gray-600 py-16">Loading applications...</div>
            ) : applications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-xl shadow-sm">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <HiBriefcase className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications</h3>
                <p className="text-sm text-gray-500 text-center max-w-md mb-4">
                  You haven't applied to any jobs yet.
                </p>
                <button
                  onClick={() => setTab('available')}
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
                >
                  Browse Jobs
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {applications.map((app) => {
                  const jobTitle = app.jobTitle ?? app.job?.jobTitle ?? 'Job Title';
                  const companyName = app.companyName ?? app.job?.organisation?.companyName ?? 'Company';
                  const location = app.location ?? app.job?.location ?? 'Location';
                  const appliedAt = app.appliedAt ?? app.createdAt;
                  return (
                    <div
                      key={app.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow flex flex-col"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-gray-900 mb-1 truncate" title={jobTitle}>
                            {jobTitle}
                          </h3>
                          <p className="text-gray-600 text-sm truncate" title={companyName}>
                            {companyName}
                          </p>
                        </div>
                        <div className="ml-2 p-2 shrink-0 text-gray-400">
                          <HiBookmark className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mb-3">
                        <span className="flex items-center">
                          <HiLocationMarker className="w-4 h-4 mr-1 shrink-0" />
                          <span className="truncate">{location}</span>
                        </span>
                        <span className="flex items-center">
                          <HiBriefcase className="w-4 h-4 mr-1 shrink-0" />
                          {app.status === 'hired' || app.status === 'accepted' ? 'Hired' : app.status === 'rejected' ? 'Rejected' : 'Pending'}
                        </span>
                        <span className="flex items-center">
                          <HiCalendar className="w-4 h-4 mr-1 shrink-0" />
                          {appliedAt ? `Applied ${new Date(appliedAt).toLocaleDateString()}` : '—'}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm line-clamp-2 mb-4 flex-1">
                        {app.status === 'pending'
                          ? 'Your application has been submitted and is under review.'
                          : app.status === 'hired' || app.status === 'accepted'
                            ? 'Congratulations! Your application was accepted.'
                            : app.status === 'rejected'
                              ? 'This application was not successful.'
                              : `Application status: ${app.status || 'Pending'}.`}
                      </p>
                      <div className="pt-3 border-t border-gray-100">
                        <button
                          onClick={() => navigate(`/professional/jobs/${app.jobId}`)}
                          className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Saved Jobs Tab */}
        {activeTab === 'saved' && (
          <>
            {loading ? (
              <div className="text-center text-gray-600 py-16">Loading saved jobs...</div>
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-xl shadow-sm">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <HiBookmark className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Saved Jobs</h3>
                <p className="text-sm text-gray-500 text-center max-w-md mb-4">
                  You haven't saved any jobs yet. Save jobs to view them here.
                </p>
                <button
                  onClick={() => setTab('available')}
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
                >
                  Browse Jobs
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-1 truncate" title={job.jobTitle}>
                          {job.jobTitle}
                        </h3>
                        <p className="text-gray-600 text-sm truncate" title={job.organisation?.companyName}>
                          {job.organisation?.companyName}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSaveJob(job.id); }}
                        className="ml-2 p-2 shrink-0 transition-colors rounded-lg text-brand-500 hover:text-brand-600 hover:bg-brand-50"
                        title="Unsave job"
                      >
                        <HiBookmark className="w-5 h-5 fill-current" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mb-3">
                      <span className="flex items-center">
                        <HiLocationMarker className="w-4 h-4 mr-1 shrink-0" />
                        <span className="truncate">{job.location}</span>
                      </span>
                      <span className="flex items-center">
                        <HiBriefcase className="w-4 h-4 mr-1 shrink-0" />
                        {job.workMode?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) ?? '—'}
                      </span>
                      {job.experienceYears && (
                        <span className="flex items-center">
                          <HiClock className="w-4 h-4 mr-1 shrink-0" />
                          {job.experienceYears}y
                        </span>
                      )}
                      <span className="flex items-center">
                        <HiCalendar className="w-4 h-4 mr-1 shrink-0" />
                        {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm line-clamp-2 mb-4 flex-1">{job.description}</p>
                    <div className="pt-3 border-t border-gray-100">
                      {job.hasApplied ? (
                        <div className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg font-medium text-center text-sm">
                          ✓ Applied
                        </div>
                      ) : (
                        <button
                          onClick={() => navigate(`/professional/jobs/${job.id}`)}
                          className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Job Offer Requests Tab */}
        {activeTab === 'offers' && (
          <>
            {loading ? (
              <div className="text-center text-gray-600 py-16">Loading headhunt offers...</div>
            ) : headhuntOffers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-xl shadow-sm">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <HiStar className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Headhunt Offers</h3>
                <p className="text-sm text-gray-500 text-center max-w-md">
                  When organisations directly scout you, their offers will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {headhuntOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow flex flex-col"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <HiStar className="w-5 h-5 text-yellow-500 shrink-0" />
                      <h3 className="text-lg font-bold text-gray-900 truncate" title={`Headhunted by ${offer.organisationName}`}>
                        {offer.organisationName}
                      </h3>
                    </div>
                    {offer.jobTitle && (
                      <p className="text-gray-600 text-sm mb-2 truncate" title={offer.jobTitle}>
                        {offer.jobTitle}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mb-3">
                      {offer.location && (
                        <span className="flex items-center">
                          <HiLocationMarker className="w-4 h-4 mr-1 shrink-0" />
                          <span className="truncate">{offer.location}</span>
                        </span>
                      )}
                      <span className="flex items-center">
                        <HiCalendar className="w-4 h-4 mr-1 shrink-0" />
                        {new Date(offer.sentAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex-1 min-h-0">
                      <p className="text-gray-700 text-sm line-clamp-3 whitespace-pre-line leading-relaxed">
                        {offer.message}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-gray-100 flex gap-2">
                      {offer.jobId ? (
                        <button
                          onClick={() => navigate(`/professional/jobs/${offer.jobId}`)}
                          className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors text-sm"
                        >
                          View Job
                        </button>
                      ) : null}
                      <button
                        onClick={() => {
                          if (offer.organisationId) {
                            navigate(`/organisations/${offer.organisationId}`);
                          }
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
                      >
                        View Organisation
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ProfessionalLayout>
  );
}

