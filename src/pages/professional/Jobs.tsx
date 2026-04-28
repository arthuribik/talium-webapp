import { useState, useEffect, useMemo, type ComponentType } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import { formatMoney } from '@/utils/formatMoney';
import toast from 'react-hot-toast';
import {
  HiBriefcase,
  HiCalendar,
  HiSearch,
  HiBookmark,
  HiStar,
  HiChevronDown,
  HiPaperAirplane,
  HiLightningBolt,
  HiBadgeCheck,
  HiPlus,
  HiTrash,
} from 'react-icons/hi';

interface Job {
  id: string;
  jobTitle: string;
  location: string;
  workMode: string;
  employmentType: string;
  experienceYears?: number;
  jobLevel?: string;
  department?: string | null;
  description: string;
  requirements: string[];
  createdAt: string;
  closingDate?: string;
  pay?: {
    min?: number;
    max?: number;
    amount?: number;
    currency?: string;
    period?: string;
  } | null;
  organisation: {
    id: string;
    companyName: string;
  };
  hasApplied?: boolean;
}

interface JobFilters {
  search: string;
  industry: string;
  datePreset: string;
  payPreset: string;
}

interface JobAutomationFlow {
  id: string;
  role: string;
  workMode: string;
  employmentType: string;
  payRange: string;
  organisations: string;
  location: string;
}

interface JobSettingsState {
  jobTitles: string;
  workMode: string;
  location: string;
  employmentType: string;
  allowRecruiters: boolean;
  automationFlows: JobAutomationFlow[];
}

const TAB_PARAM = 'tab';
const MY_JOBS_VIEW_PARAM = 'view';
const VALID_MY_JOBS_VIEWS = ['applied', 'in_progress', 'hired'] as const;
type MyJobsView = 'all' | (typeof VALID_MY_JOBS_VIEWS)[number];

const VALID_TABS = ['available', 'applications', 'saved', 'offers'] as const;

const TAB_LABELS: Record<(typeof VALID_TABS)[number], string> = {
  available: 'Browse',
  applications: 'My Jobs',
  saved: 'Job Settings',
  offers: 'Headhunt',
};

const filterSelectClass =
  'w-full cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-9 text-sm text-gray-900 shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200';
const settingsInputClass =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20';
const settingsSelectClass =
  'w-full cursor-pointer appearance-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 pr-9 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20';

const JOB_WORK_MODE_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'on_site', label: 'Onsite' },
  { value: 'global_remote', label: 'Global Remote' },
];

const JOB_EMPLOYMENT_TYPE_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'freelance', label: 'Freelance' },
];

const emptyAutomationFlow = (): JobAutomationFlow => ({
  id:
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `flow-${Date.now()}`,
  role: '',
  workMode: '',
  employmentType: '',
  payRange: '',
  organisations: '',
  location: '',
});

function workModeLabel(mode: string): string {
  const m = (mode || '').toLowerCase();
  if (m === 'global_remote') return 'Global Remote';
  if (m === 'on_site') return 'Onsite';
  return m.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function workModePillClass(mode: string): string {
  const m = (mode || '').toLowerCase();
  if (m === 'global_remote') return 'bg-brand-50 text-brand-800';
  if (m === 'hybrid') return 'bg-amber-50 text-amber-800';
  if (m === 'remote') return 'bg-blue-50 text-blue-800';
  if (m === 'on_site') return 'bg-rose-50 text-rose-800';
  return 'bg-gray-100 text-gray-700';
}

function formatEmploymentType(t: string): string {
  return (t || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatPayRange(pay: Job['pay']): string | null {
  if (!pay || typeof pay !== 'object') return null;
  const fmt = (n: number) => formatMoney(pay.currency, n) || '';
  if (pay.min != null && pay.max != null) {
    return `${fmt(pay.min)} - ${fmt(pay.max)}`;
  }
  if (pay.amount != null) return fmt(pay.amount);
  if (pay.min != null) return `${fmt(pay.min)}+`;
  if (pay.max != null) return `Up to ${fmt(pay.max)}`;
  return null;
}

/** Midpoint salary in same units as stored pay (for band filter). */
function payMidpoint(pay: Job['pay']): number | null {
  if (!pay || typeof pay !== 'object') return null;
  if (pay.min != null && pay.max != null) {
    return (Number(pay.min) + Number(pay.max)) / 2;
  }
  if (pay.amount != null) return Number(pay.amount);
  if (pay.min != null) return Number(pay.min);
  if (pay.max != null) return Number(pay.max);
  return null;
}

function payMatchesPreset(mid: number | null, preset: string): boolean {
  if (!preset || preset === 'any') return true;
  if (mid == null || Number.isNaN(mid)) return true;
  if (preset === 'lt100') return mid < 100_000;
  if (preset === '100_150') return mid >= 100_000 && mid <= 150_000;
  if (preset === 'gt150') return mid > 150_000;
  return true;
}

function SelectChevron() {
  return (
    <HiChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
  );
}

function normStatus(s: string | undefined): string {
  return (s || '').toLowerCase();
}

function matchesMyJobsSegment(status: string | undefined, segment: MyJobsView): boolean {
  if (segment === 'all') return true;
  const s = normStatus(status);
  if (segment === 'applied') return s === 'pending';
  if (segment === 'in_progress') return s === 'under_review' || s === 'shortlisted';
  if (segment === 'hired') return s === 'hired' || s === 'accepted';
  return true;
}

type StatIcon = ComponentType<{ className?: string }>;

function MyJobsStatCard({
  icon: Icon,
  title,
  count,
  active,
  onClick,
}: {
  icon: StatIcon;
  title: string;
  count: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md ${
        active ? 'ring-2 ring-brand-500/45' : ''
      }`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">
          {count} {count === 1 ? 'item' : 'items'}
        </p>
      </div>
    </button>
  );
}

export default function Jobs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get(TAB_PARAM);
  const initialTab = VALID_TABS.includes(tabFromUrl as any) ? tabFromUrl : 'available';
  const [activeTab, setActiveTab] = useState(initialTab);

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
    if (tab !== 'applications') {
      next.delete(MY_JOBS_VIEW_PARAM);
    }
    setSearchParams(next, { replace: true });
  };

  const myJobsView: MyJobsView = (() => {
    const v = searchParams.get(MY_JOBS_VIEW_PARAM);
    if (VALID_MY_JOBS_VIEWS.includes(v as any)) return v as MyJobsView;
    return 'all';
  })();

  const setMyJobsView = (segment: MyJobsView) => {
    const next = new URLSearchParams(searchParams);
    if (segment === 'all') {
      next.delete(MY_JOBS_VIEW_PARAM);
    } else {
      next.set(MY_JOBS_VIEW_PARAM, segment);
    }
    setSearchParams(next, { replace: true });
  };

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [headhuntOffers, setHeadhuntOffers] = useState<any[]>([]);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [jobSettings, setJobSettings] = useState<JobSettingsState>({
    jobTitles: '',
    workMode: '',
    location: '',
    employmentType: '',
    allowRecruiters: true,
    automationFlows: [],
  });
  const [savingJobNotifications, setSavingJobNotifications] = useState(false);
  const [savingAutomationFlowId, setSavingAutomationFlowId] = useState<string | null>(null);

  const [filters, setFilters] = useState<JobFilters>({
    search: '',
    industry: '',
    datePreset: '',
    payPreset: '',
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
    setFilters((f) => ({ ...f, industry: '' }));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'available') {
      fetchJobs();
    } else if (activeTab === 'applications') {
      fetchMyJobsOverview();
    } else if (activeTab === 'saved') {
      fetchJobSettings();
    } else if (activeTab === 'offers') {
      fetchHeadhuntOffers();
    }
  }, [activeTab]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v1/jobs');
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

  const fetchMyJobsOverview = async () => {
    setLoading(true);
    try {
      const [appsRes, offersRes] = await Promise.all([
        api.get('/v1/professional/applications'),
        api.get('/v1/professional/headhunt-offers').catch(() => ({
          data: { data: { offers: [] } },
        })),
      ]);
      setApplications(appsRes.data.data?.applications || []);
      setHeadhuntOffers(offersRes.data?.data?.offers || []);
    } catch (err) {
      console.error('Failed to fetch My Jobs data:', err);
      setApplications([]);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/v1/professional/job-settings');
      const data = res.data?.data || {};
      const flows = Array.isArray(data.automationFlows) ? data.automationFlows : [];
      setJobSettings({
        jobTitles: Array.isArray(data.jobTitles) ? data.jobTitles.join(', ') : '',
        workMode: data.workMode || '',
        location: data.location || '',
        employmentType: data.employmentType || '',
        allowRecruiters: data.allowRecruiters !== false,
        automationFlows: flows.length
          ? flows.map((flow: Partial<JobAutomationFlow>) => ({ ...emptyAutomationFlow(), ...flow }))
          : [],
      });
    } catch (err) {
      console.error('Failed to fetch job settings:', err);
      toast.error('Failed to load job settings');
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

  const handleSaveJob = async (jobId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isCurrentlySaved = savedJobs.includes(jobId);
    try {
      if (isCurrentlySaved) {
        await api.delete(`/v1/professional/saved-jobs/${jobId}`);
        setSavedJobs((prev) => prev.filter((id) => id !== jobId));
        if (activeTab === 'saved') {
          setJobs((prev) => prev.filter((j) => j.id !== jobId));
        }
        toast.success('Job removed from saved');
      } else {
        await api.post('/v1/professional/saved-jobs', { jobId });
        setSavedJobs((prev) => [...prev, jobId]);
        toast.success('Job saved');
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || (isCurrentlySaved ? 'Failed to unsave job' : 'Failed to save job'),
      );
    }
  };

  const jobSettingsPayload = (settings = jobSettings) => ({
    jobTitles: settings.jobTitles
      .split(',')
      .map((title) => title.trim())
      .filter(Boolean),
    workMode: settings.workMode,
    location: settings.location,
    employmentType: settings.employmentType,
    allowRecruiters: settings.allowRecruiters,
    automationFlows: settings.automationFlows,
  });

  const saveJobNotifications = async () => {
    setSavingJobNotifications(true);
    try {
      const res = await api.put('/v1/professional/job-settings', jobSettingsPayload());
      const data = res.data?.data;
      if (data) {
        setJobSettings((prev) => ({
          ...prev,
          jobTitles: Array.isArray(data.jobTitles) ? data.jobTitles.join(', ') : prev.jobTitles,
          workMode: data.workMode || '',
          location: data.location || '',
          employmentType: data.employmentType || '',
          allowRecruiters: data.allowRecruiters !== false,
        }));
      }
      toast.success('Job preferences saved');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save job preferences');
    } finally {
      setSavingJobNotifications(false);
    }
  };

  const updateAutomationFlow = (id: string, patch: Partial<JobAutomationFlow>) => {
    setJobSettings((prev) => ({
      ...prev,
      automationFlows: prev.automationFlows.map((flow) =>
        flow.id === id ? { ...flow, ...patch } : flow,
      ),
    }));
  };

  const addAutomationFlow = () => {
    setJobSettings((prev) => ({
      ...prev,
      automationFlows: [...prev.automationFlows, emptyAutomationFlow()],
    }));
  };

  const removeAutomationFlow = async (id: string) => {
    const next = {
      ...jobSettings,
      automationFlows: jobSettings.automationFlows.filter((flow) => flow.id !== id),
    };
    setJobSettings(next);
    try {
      await api.put('/v1/professional/job-settings', jobSettingsPayload(next));
      toast.success('Flow removed');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove flow');
      fetchJobSettings();
    }
  };

  const saveAutomationFlow = async (id: string) => {
    setSavingAutomationFlowId(id);
    try {
      await api.put('/v1/professional/job-settings', jobSettingsPayload());
      toast.success('Flow saved');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save flow');
    } finally {
      setSavingAutomationFlowId(null);
    }
  };

  const industryOptions = useMemo(() => {
    if (activeTab === 'applications') {
      const set = new Set<string>();
      applications.forEach((a) => {
        const c = (a.companyName || '').trim();
        if (c) set.add(c);
      });
      return [...set].sort((a, b) => a.localeCompare(b));
    }
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.department?.trim()) set.add(j.department.trim());
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [activeTab, jobs, applications]);

  const myJobsStats = useMemo(() => {
    return {
      saved: savedJobs.length,
      recommended: headhuntOffers.length,
      applied: applications.filter((a) => normStatus(a.status) === 'pending').length,
      inProgress: applications.filter((a) =>
        ['under_review', 'shortlisted'].includes(normStatus(a.status)),
      ).length,
      hired: applications.filter((a) => ['hired', 'accepted'].includes(normStatus(a.status))).length,
    };
  }, [applications, savedJobs, headhuntOffers]);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (!matchesMyJobsSegment(app.status, myJobsView)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const title = (app.jobTitle || '').toLowerCase();
        const co = (app.companyName || '').toLowerCase();
        const loc = (app.location || '').toLowerCase();
        if (!title.includes(q) && !co.includes(q) && !loc.includes(q)) return false;
      }
      if (filters.industry) {
        if (activeTab === 'applications') {
          if ((app.companyName || '') !== filters.industry) return false;
        }
      }
      if (filters.datePreset) {
        const applied = new Date(app.appliedAt || app.createdAt);
        const now = new Date();
        const days = filters.datePreset === '7d' ? 7 : filters.datePreset === '30d' ? 30 : 90;
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - days);
        if (applied < cutoff) return false;
      }
      return true;
    });
  }, [applications, filters, myJobsView, activeTab]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !job.jobTitle.toLowerCase().includes(q) &&
          !job.description.toLowerCase().includes(q) &&
          !job.organisation.companyName.toLowerCase().includes(q) &&
          !(job.department || '').toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (filters.industry && (job.department || '') !== filters.industry) {
        return false;
      }
      if (filters.datePreset) {
        const jobDate = new Date(job.createdAt);
        const now = new Date();
        const days = filters.datePreset === '7d' ? 7 : filters.datePreset === '30d' ? 30 : 90;
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - days);
        if (jobDate < cutoff) return false;
      }
      if (!payMatchesPreset(payMidpoint(job.pay), filters.payPreset)) {
        return false;
      }
      return true;
    });
  }, [jobs, filters]);

  const clearFilters = () => {
    setFilters({ search: '', industry: '', datePreset: '', payPreset: '' });
  };

  const hasActiveFilters =
    filters.search !== '' || filters.industry !== '' || filters.datePreset !== '' || filters.payPreset !== '';

  const tabOrder: (typeof VALID_TABS)[number][] = ['available', 'applications', 'offers', 'saved'];

  const showFilterChrome = activeTab === 'available' || activeTab === 'applications';

  const myJobsViewLabel =
    myJobsView === 'applied'
      ? 'Applied'
      : myJobsView === 'in_progress'
        ? 'In progress'
        : myJobsView === 'hired'
          ? 'Hired'
          : null;

  const renderJobCard = (
    job: Job,
    opts: { showSave?: boolean; onNavigate: () => void; applied?: boolean },
  ) => {
    const subtitle = [job.organisation?.companyName, job.department].filter(Boolean).join(' · ');
    const payStr = formatPayRange(job.pay);
    const footerTag = job.department || job.jobLevel || '—';
    const dateStr = new Date(job.createdAt).toISOString().slice(0, 10);

    return (
      <div
        key={job.id}
        role="button"
        tabIndex={0}
        onClick={opts.onNavigate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            opts.onNavigate();
          }
        }}
        className="relative cursor-pointer rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
      >
        <div className="flex gap-4 pr-14">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900">{job.jobTitle}</h3>
            {subtitle ? <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p> : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${workModePillClass(job.workMode)}`}
              >
                {workModeLabel(job.workMode)}
              </span>
              <span className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-900">
                {formatEmploymentType(job.employmentType)}
              </span>
              {payStr ? <span className="text-sm font-medium text-gray-800">{payStr}</span> : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <HiCalendar className="h-3.5 w-3.5" />
                {dateStr}
              </span>
              <span className="text-gray-300">·</span>
              <span>{footerTag}</span>
              {opts.applied ? (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="font-medium text-brand-700">Applied</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {opts.showSave ? (
          <button
            type="button"
            onClick={(e) => handleSaveJob(job.id, e)}
            className={`absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors hover:bg-gray-50 ${
              savedJobs.includes(job.id) ? 'text-brand-600' : 'text-gray-500'
            }`}
            title={savedJobs.includes(job.id) ? 'Remove from saved' : 'Save job'}
          >
            <HiBookmark className={`h-5 w-5 ${savedJobs.includes(job.id) ? 'fill-current' : ''}`} />
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <ProfessionalLayout>
      <div className="min-h-full bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>

          {showFilterChrome ? (
            <>
              <div className="relative mt-5">
                <HiSearch className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  placeholder="Search by role, organisation, industry..."
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <div
                className={`mt-3 grid grid-cols-1 gap-3 ${activeTab === 'available' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
              >
                <div className="relative">
                  <select
                    value={filters.industry}
                    onChange={(e) => setFilters((f) => ({ ...f, industry: e.target.value }))}
                    className={filterSelectClass}
                  >
                    <option value="">All Industries</option>
                    {industryOptions.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                  <SelectChevron />
                </div>
                <div className="relative">
                  <select
                    value={filters.datePreset}
                    onChange={(e) => setFilters((f) => ({ ...f, datePreset: e.target.value }))}
                    className={filterSelectClass}
                  >
                    <option value="">Any Date</option>
                    <option value="7d">
                      {activeTab === 'applications' ? 'Applied in the last 7 days' : 'Posted in the last 7 days'}
                    </option>
                    <option value="30d">
                      {activeTab === 'applications' ? 'Applied in the last 30 days' : 'Posted in the last 30 days'}
                    </option>
                    <option value="90d">
                      {activeTab === 'applications' ? 'Applied in the last 90 days' : 'Posted in the last 90 days'}
                    </option>
                  </select>
                  <SelectChevron />
                </div>
                {activeTab === 'available' ? (
                  <div className="relative">
                    <select
                      value={filters.payPreset}
                      onChange={(e) => setFilters((f) => ({ ...f, payPreset: e.target.value }))}
                      className={filterSelectClass}
                    >
                      <option value="">Any Pay</option>
                      <option value="lt100">Under $100k</option>
                      <option value="100_150">$100k – $150k</option>
                      <option value="gt150">Over $150k</option>
                    </select>
                    <SelectChevron />
                  </div>
                ) : null}
              </div>

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-2 text-sm font-medium text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline"
                >
                  Clear filters
                </button>
              ) : null}
            </>
          ) : null}

          <div
            className={`inline-flex w-full flex-wrap rounded-xl bg-gray-100 p-1 sm:w-auto ${showFilterChrome ? 'mt-6' : 'mt-8'}`}
          >
            {tabOrder.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'border border-gray-200 bg-white text-gray-900 shadow-sm'
                    : 'border border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {TAB_LABELS[id]}
                {id === 'available' && activeTab === 'available' ? ` (${filteredJobs.length})` : ''}
              </button>
            ))}
          </div>

          {/* Browse */}
          {activeTab === 'available' && (
            <div className="mt-6 space-y-4">
              {loading ? (
                <p className="py-16 text-center text-gray-500">Loading jobs…</p>
              ) : filteredJobs.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                    <HiBriefcase className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">No jobs found</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {hasActiveFilters
                      ? 'Try changing search or filters.'
                      : 'No jobs are listed right now.'}
                  </p>
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-4 text-sm font-medium text-brand-700 hover:text-brand-800"
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              ) : (
                filteredJobs.map((job) =>
                  renderJobCard(job, {
                    showSave: true,
                    onNavigate: () => navigate(`/professional/jobs/${job.id}`),
                    applied: job.hasApplied,
                  }),
                )
              )}
            </div>
          )}

          {/* My Jobs (applications) */}
          {activeTab === 'applications' && (
            <div className="mt-6">
              {loading ? (
                <p className="py-16 text-center text-gray-500">Loading…</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <MyJobsStatCard
                      icon={HiBookmark}
                      title="Saved Jobs"
                      count={myJobsStats.saved}
                      onClick={() => setTab('saved')}
                    />
                    <MyJobsStatCard
                      icon={HiStar}
                      title="Recommended"
                      count={myJobsStats.recommended}
                      onClick={() => setTab('offers')}
                    />
                    <MyJobsStatCard
                      icon={HiPaperAirplane}
                      title="Applied"
                      count={myJobsStats.applied}
                      active={myJobsView === 'applied'}
                      onClick={() => setMyJobsView(myJobsView === 'applied' ? 'all' : 'applied')}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <MyJobsStatCard
                      icon={HiLightningBolt}
                      title="In Progress"
                      count={myJobsStats.inProgress}
                      active={myJobsView === 'in_progress'}
                      onClick={() => setMyJobsView(myJobsView === 'in_progress' ? 'all' : 'in_progress')}
                    />
                    <MyJobsStatCard
                      icon={HiBadgeCheck}
                      title="Hired"
                      count={myJobsStats.hired}
                      active={myJobsView === 'hired'}
                      onClick={() => setMyJobsView(myJobsView === 'hired' ? 'all' : 'hired')}
                    />
                  </div>

                  {myJobsView !== 'all' && myJobsViewLabel ? (
                    <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      <span>
                        Filter: <span className="font-semibold text-gray-900">{myJobsViewLabel}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setMyJobsView('all')}
                        className="font-medium text-brand-500 hover:text-brand-600"
                      >
                        Show all applications
                      </button>
                    </div>
                  ) : null}

                  <div className="mt-6 space-y-4">
                    {applications.length === 0 ? (
                      <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                          <HiBriefcase className="h-10 w-10 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No applications yet</h3>
                        <p className="mt-2 text-sm text-gray-500">
                          Browse open roles and apply to see them here.
                        </p>
                        <button
                          type="button"
                          onClick={() => setTab('available')}
                          className="mt-6 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
                        >
                          Browse jobs
                        </button>
                      </div>
                    ) : filteredApplications.length === 0 ? (
                      <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
                        <p className="text-sm text-gray-600">
                          No applications match your filters or the selected status.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            clearFilters();
                            setMyJobsView('all');
                          }}
                          className="mt-4 text-sm font-medium text-brand-500 hover:text-brand-600"
                        >
                          Clear filters and show all
                        </button>
                      </div>
                    ) : (
                      filteredApplications.map((app) => {
                        const jobTitle = app.jobTitle ?? app.job?.jobTitle ?? 'Role';
                        const companyName = app.companyName ?? app.job?.organisation?.companyName ?? 'Company';
                        const job = app.job as Job | undefined;
                        const synthetic: Job = {
                          id: app.jobId,
                          jobTitle,
                          location: app.location ?? job?.location ?? '',
                          workMode: job?.workMode ?? 'remote',
                          employmentType: job?.employmentType ?? 'full_time',
                          jobLevel: job?.jobLevel,
                          department: job?.department,
                          description: job?.description ?? '',
                          requirements: job?.requirements ?? [],
                          createdAt:
                            app.appliedAt ?? app.createdAt ?? job?.createdAt ?? new Date().toISOString(),
                          pay: job?.pay,
                          organisation: job?.organisation ?? { id: '', companyName: companyName },
                          hasApplied: true,
                        };
                        return renderJobCard(synthetic, {
                          showSave: false,
                          onNavigate: () => navigate(`/professional/jobs/${app.jobId}`),
                          applied: true,
                        });
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Job Settings */}
          {activeTab === 'saved' && (
            <div className="mt-6 space-y-5">
              {loading ? (
                <p className="py-16 text-center text-gray-500">Loading…</p>
              ) : (
                <>
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
                    <h2 className="text-base font-bold text-gray-900">Job Notifications</h2>
                    <div className="mt-6 space-y-5">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-gray-800">Job Titles (keywords)</span>
                        <input
                          type="text"
                          value={jobSettings.jobTitles}
                          onChange={(e) => setJobSettings((prev) => ({ ...prev, jobTitles: e.target.value }))}
                          placeholder="e.g., Product Engineer, Data Analyst"
                          className={settingsInputClass}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-gray-800">Work Mode</span>
                        <div className="relative">
                          <select
                            value={jobSettings.workMode}
                            onChange={(e) => setJobSettings((prev) => ({ ...prev, workMode: e.target.value }))}
                            className={settingsSelectClass}
                          >
                            {JOB_WORK_MODE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <SelectChevron />
                        </div>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-gray-800">Location</span>
                        <input
                          type="text"
                          value={jobSettings.location}
                          onChange={(e) => setJobSettings((prev) => ({ ...prev, location: e.target.value }))}
                          placeholder="Country or city"
                          className={settingsInputClass}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-gray-800">Employment Type</span>
                        <div className="relative">
                          <select
                            value={jobSettings.employmentType}
                            onChange={(e) =>
                              setJobSettings((prev) => ({ ...prev, employmentType: e.target.value }))
                            }
                            className={settingsSelectClass}
                          >
                            {JOB_EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <SelectChevron />
                        </div>
                      </label>

                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-semibold text-gray-800">Allow recruiters to see my profile</span>
                        <div className="relative">
                          <select
                            value={jobSettings.allowRecruiters ? 'yes' : 'no'}
                            onChange={(e) =>
                              setJobSettings((prev) => ({
                                ...prev,
                                allowRecruiters: e.target.value === 'yes',
                              }))
                            }
                            className="cursor-pointer appearance-none rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-3 pr-9 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                          <SelectChevron />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={saveJobNotifications}
                        disabled={savingJobNotifications}
                        className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingJobNotifications ? 'Saving…' : 'Save Preferences'}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-base font-bold text-gray-900">Application Automation</h2>
                      <button
                        type="button"
                        onClick={addAutomationFlow}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                      >
                        <HiPlus className="h-4 w-4" />
                        Add New
                      </button>
                    </div>

                    {jobSettings.automationFlows.length > 0 ? (
                      <div className="mt-6 space-y-4">
                        {jobSettings.automationFlows.map((flow, index) => (
                        <div key={flow.id} className="rounded-xl border border-gray-200 p-4 sm:p-5">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold text-gray-900">Flow {index + 1}</h3>
                            <button
                              type="button"
                              onClick={() => removeAutomationFlow(flow.id)}
                              className="rounded-md p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                              aria-label={`Remove flow ${index + 1}`}
                            >
                              <HiTrash className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <label className="block">
                              <span className="mb-1.5 block text-sm font-semibold text-gray-800">Role</span>
                              <input
                                type="text"
                                value={flow.role}
                                onChange={(e) => updateAutomationFlow(flow.id, { role: e.target.value })}
                                placeholder="Product Engineer"
                                className={settingsInputClass}
                              />
                            </label>

                            <label className="block">
                              <span className="mb-1.5 block text-sm font-semibold text-gray-800">Work Mode</span>
                              <div className="relative">
                                <select
                                  value={flow.workMode}
                                  onChange={(e) => updateAutomationFlow(flow.id, { workMode: e.target.value })}
                                  className={settingsSelectClass}
                                >
                                  {JOB_WORK_MODE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <SelectChevron />
                              </div>
                            </label>

                            <label className="block">
                              <span className="mb-1.5 block text-sm font-semibold text-gray-800">Employment Type</span>
                              <div className="relative">
                                <select
                                  value={flow.employmentType}
                                  onChange={(e) =>
                                    updateAutomationFlow(flow.id, { employmentType: e.target.value })
                                  }
                                  className={settingsSelectClass}
                                >
                                  {JOB_EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <SelectChevron />
                              </div>
                            </label>

                            <label className="block">
                              <span className="mb-1.5 block text-sm font-semibold text-gray-800">Pay Range</span>
                              <input
                                type="text"
                                value={flow.payRange}
                                onChange={(e) => updateAutomationFlow(flow.id, { payRange: e.target.value })}
                                placeholder="$100k - $150k"
                                className={settingsInputClass}
                              />
                            </label>

                            <label className="block">
                              <span className="mb-1.5 block text-sm font-semibold text-gray-800">
                                Organisation (up to 3)
                              </span>
                              <input
                                type="text"
                                value={flow.organisations}
                                onChange={(e) =>
                                  updateAutomationFlow(flow.id, { organisations: e.target.value })
                                }
                                placeholder="Apple, Google, Meta"
                                className={settingsInputClass}
                              />
                            </label>

                            <label className="block">
                              <span className="mb-1.5 block text-sm font-semibold text-gray-800">
                                Location (up to 3)
                              </span>
                              <input
                                type="text"
                                value={flow.location}
                                onChange={(e) => updateAutomationFlow(flow.id, { location: e.target.value })}
                                placeholder="Lagos, London, Singapore"
                                className={settingsInputClass}
                              />
                            </label>
                          </div>

                          <button
                            type="button"
                            onClick={() => saveAutomationFlow(flow.id)}
                            disabled={savingAutomationFlowId === flow.id}
                            className="mt-4 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingAutomationFlowId === flow.id ? 'Saving…' : 'Save Flow'}
                          </button>
                        </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Headhunt */}
          {activeTab === 'offers' && (
            <div className="mt-6 space-y-4">
              {loading ? (
                <p className="py-16 text-center text-gray-500">Loading…</p>
              ) : headhuntOffers.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                    <HiStar className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">No headhunt offers</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    When organisations reach out directly, you&apos;ll see those messages here.
                  </p>
                </div>
              ) : (
                headhuntOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <HiStar className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{offer.organisationName}</h3>
                        {offer.jobTitle ? (
                          <p className="mt-0.5 text-sm text-gray-500">{offer.jobTitle}</p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                          {offer.location ? <span>{offer.location}</span> : null}
                          <span className="inline-flex items-center gap-1">
                            <HiCalendar className="h-3.5 w-3.5" />
                            {new Date(offer.sentAt).toISOString().slice(0, 10)}
                          </span>
                        </div>
                        {offer.message ? (
                          <p className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                            {offer.message}
                          </p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {offer.jobId ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/professional/jobs/${offer.jobId}`)}
                              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                            >
                              View job
                            </button>
                          ) : null}
                          {offer.organisationId ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/organisations/${offer.organisationId}`)}
                              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                            >
                              View organisation
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </ProfessionalLayout>
  );
}
