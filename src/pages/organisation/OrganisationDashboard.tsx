import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import OrganisationLayout from '@/components/organisation/OrganisationLayout';
import { api } from '@/services/api';
import {
  HiBriefcase,
  HiTrendingUp,
  HiUserGroup,
  HiBadgeCheck,
  HiOfficeBuilding,
  HiArrowRight,
} from 'react-icons/hi';
import { COUNTRIES } from '@/utils/countries';

const WORK_MODES = [
  { value: '', label: 'All Work Mode' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'on_site', label: 'On-site' },
  { value: 'global_remote', label: 'Global Remote' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'published', label: 'Active' },
  { value: 'draft', label: 'Under Review' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
];

function formatJobStatus(status: string): string {
  const map: Record<string, string> = {
    published: 'Active',
    draft: 'Under Review',
    paused: 'Paused',
    closed: 'Closed',
  };
  return map[status] || status;
}

function statusTagClass(status: string): string {
  const map: Record<string, string> = {
    published: 'bg-green-600 text-white',
    draft: 'bg-blue-600 text-white',
    paused: 'bg-amber-500 text-white',
    closed: 'bg-gray-500 text-white',
  };
  return map[status] || 'bg-gray-200 text-gray-800';
}

interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  hiredProfessionals: number;
  totalJobsChange: number;
  activeJobsChange: number;
  totalApplicationsChange: number;
  totalHiresChange: number;
}

interface RecentJobPosting {
  id: string;
  jobTitle: string;
  applicants: number;
  postedDate: string;
  status: string;
}

export default function OrganisationDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentJobPostings, setRecentJobPostings] = useState<RecentJobPosting[]>([]);
  const [country, setCountry] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [status, setStatus] = useState('');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (country) params.set('country', country);
      if (workMode) params.set('workMode', workMode);
      if (status) params.set('status', status);
      const qs = params.toString();
      const url = `/v1/organisation/dashboard/stats${qs ? `?${qs}` : ''}`;
      const res = await api.get(url);
      const d = res.data?.data || {};
      setStats({
        totalJobs: d.totalJobs ?? 0,
        activeJobs: d.activeJobs ?? 0,
        totalApplications: d.totalApplications ?? 0,
        hiredProfessionals: d.hiredProfessionals ?? 0,
        totalJobsChange: d.totalJobsChange ?? 0,
        activeJobsChange: d.activeJobsChange ?? 0,
        totalApplicationsChange: d.totalApplicationsChange ?? 0,
        totalHiresChange: d.totalHiresChange ?? 0,
      });
      setRecentJobPostings(Array.isArray(d.recentJobPostings) ? d.recentJobPostings : []);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setStats({
        totalJobs: 0,
        activeJobs: 0,
        totalApplications: 0,
        hiredProfessionals: 0,
        totalJobsChange: 0,
        activeJobsChange: 0,
        totalApplicationsChange: 0,
        totalHiresChange: 0,
      });
      setRecentJobPostings([]);
    } finally {
      setLoading(false);
    }
  }, [country, workMode, status]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatPostedDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading && !stats) {
    return (
      <OrganisationLayout>
        <div className="p-6">
          <div className="text-center text-gray-600 py-16">Loading dashboard...</div>
        </div>
      </OrganisationLayout>
    );
  }

  const kpiCards = [
    {
      title: 'Total Job Roles',
      value: stats?.totalJobs ?? 0,
      change: stats?.totalJobsChange ?? 0,
      description: 'All time job postings',
      icon: HiOfficeBuilding,
      link: '/organization/jobs',
    },
    {
      title: 'Active Job Roles',
      value: stats?.activeJobs ?? 0,
      change: stats?.activeJobsChange ?? 0,
      description: 'Currently accepting applications',
      icon: HiTrendingUp,
      link: '/organization/jobs',
    },
    {
      title: 'Total Applications',
      value: stats?.totalApplications ?? 0,
      change: stats?.totalApplicationsChange ?? 0,
      description: 'Total job applicants',
      icon: HiUserGroup,
      link: '/organization/jobs',
    },
    {
      title: 'Total Hires',
      value: stats?.hiredProfessionals ?? 0,
      change: stats?.totalHiresChange ?? 0,
      description: 'Successful placements',
      icon: HiBadgeCheck,
      link: '/organization/professionals',
    },
  ];

  return (
    <OrganisationLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Dashboard</h1>
          <p className="text-gray-500 text-sm md:text-base">Overview of your organisation's hiring activity</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 min-w-[160px] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27m6 8 4 4 4-4%27/%3E%3C/svg%3E')] bg-[length:1.5rem_1.5rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
          >
            <option value="">All Country</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 min-w-[160px] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27m6 8 4 4 4-4%27/%3E%3C/svg%3E')] bg-[length:1.5rem_1.5rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
          >
            {WORK_MODES.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 min-w-[160px] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27m6 8 4 4 4-4%27/%3E%3C/svg%3E')] bg-[length:1.5rem_1.5rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {kpiCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Link
                key={idx}
                to={card.link}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6 hover:shadow-md hover:border-gray-300 transition-all flex flex-col"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-0.5">{card.title}</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900">{card.value}</p>
                    <p className="text-sm text-green-600 font-medium mt-1">
                      {card.change >= 0 ? '+' : ''}{card.change}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{card.description}</p>
                  </div>
                  <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                    <Icon className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Recent Job Postings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-5 md:px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-bold text-gray-900">Recent Job Postings</h2>
            <Link
              to="/organization/jobs"
              className="text-brand-600 hover:text-brand-700 text-sm font-medium inline-flex items-center"
            >
              View All
              <HiArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="p-5 md:p-6">
            {recentJobPostings.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <HiBriefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium">No jobs posted yet</p>
                <Link
                  to="/organization/jobs"
                  className="mt-4 inline-block px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors text-sm"
                >
                  Create First Job
                </Link>
              </div>
            ) : (
              <ul className="space-y-4">
                {recentJobPostings.map((job) => (
                  <li
                    key={job.id}
                    onClick={() => navigate(`/organization/jobs/${job.id}`)}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1">{job.jobTitle}</h3>
                      <p className="text-sm text-gray-500">
                        {job.applicants} applicant{job.applicants !== 1 ? 's' : ''} • Posted {formatPostedDate(job.postedDate)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 w-fit ${statusTagClass(job.status)}`}
                    >
                      {formatJobStatus(job.status)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </OrganisationLayout>
  );
}
