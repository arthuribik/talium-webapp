import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import OrganisationLayout from '@/components/organisation/OrganisationLayout';
import { api } from '@/services/api';
import { useAppSelector } from '@/store/hooks';
import {
  HiUser,
  HiBriefcase,
  HiCheckCircle,
  HiClock,
  HiArrowRight,
  HiOfficeBuilding,
} from 'react-icons/hi';
import {
  FaBriefcase,
  FaUserCheck,
  FaFileAlt,
} from 'react-icons/fa';

interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  hiredProfessionals: number;
  pendingApplications: number;
  publishedJobs: number;
}

export default function OrganisationDashboard() {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [recentApplications, setRecentApplications] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch dashboard stats
      const statsResponse = await api.get('/v1/organisation/dashboard/stats');
      const statsData = statsResponse.data.data;
      
      setStats({
        totalJobs: statsData.totalJobs || 0,
        activeJobs: statsData.activeJobs || 0,
        totalApplications: statsData.totalApplications || 0,
        hiredProfessionals: statsData.hiredProfessionals || 0,
        pendingApplications: statsData.pendingApplications || 0,
        publishedJobs: statsData.publishedJobs || 0,
      });

      // Fetch recent jobs
      const jobsResponse = await api.get('/v1/organisation/jobs');
      const jobs = jobsResponse.data.data?.jobs || [];
      setRecentJobs(jobs.slice(0, 5));

      // Fetch recent applications
      const applicationsResponse = await api.get('/v1/organisation/applications');
      const applications = applicationsResponse.data.data?.applications || [];
      setRecentApplications(applications.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      // Set default values on error
      setStats({
        totalJobs: 0,
        activeJobs: 0,
        totalApplications: 0,
        hiredProfessionals: 0,
        pendingApplications: 0,
        publishedJobs: 0,
      });
      setRecentJobs([]);
      setRecentApplications([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
      title: 'Total Jobs',
      value: stats?.totalJobs || 0,
      icon: <FaBriefcase className="w-6 h-6" />,
      color: 'bg-blue-500',
      link: '/organization/jobs',
    },
    {
      title: 'Active Jobs',
      value: stats?.activeJobs || 0,
      icon: <HiBriefcase className="w-6 h-6" />,
      color: 'bg-green-500',
      link: '/organization/jobs',
    },
    {
      title: 'Total Applications',
      value: stats?.totalApplications || 0,
      icon: <FaFileAlt className="w-6 h-6" />,
      color: 'bg-purple-500',
      link: '/organization/jobs',
    },
    {
      title: 'Hired Professionals',
      value: stats?.hiredProfessionals || 0,
      icon: <FaUserCheck className="w-6 h-6" />,
      color: 'bg-orange-500',
      link: '/organization/professionals',
    },
  ];

  return (
    <OrganisationLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
          <p className="text-gray-600">Welcome back, {user?.firstName || 'Organization'}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {kpiCards.map((card, idx) => (
            <Link
              key={idx}
              to={card.link}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-200 hover:border-brand-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg text-white`}>
                  {card.icon}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Published Jobs</h3>
              <HiCheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats?.publishedJobs || 0}</p>
            <p className="text-sm text-gray-500 mt-2">Jobs currently live</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Pending Applications</h3>
              <HiClock className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats?.pendingApplications || 0}</p>
            <p className="text-sm text-gray-500 mt-2">Awaiting review</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Profile Completeness</h3>
              <HiOfficeBuilding className="w-5 h-5 text-brand-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{user?.organisation?.profileCompleteness || 0}%</p>
            <p className="text-sm text-gray-500 mt-2">Organization profile</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Jobs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Jobs</h2>
              <Link
                to="/organization/jobs"
                className="text-brand-600 hover:text-brand-700 text-sm font-medium flex items-center"
              >
                View All
                <HiArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            <div className="p-6">
              {recentJobs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <HiBriefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No jobs posted yet</p>
                  <Link
                    to="/organization/jobs"
                    className="mt-4 inline-block px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors text-sm"
                  >
                    Create First Job
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentJobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => navigate(`/organization/jobs/${job.id}`)}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{job.jobTitle}</h3>
                          <p className="text-sm text-gray-600 mb-2">{job.location}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{job.applicants || 0} applicants</span>
                            <span>•</span>
                            <span className={`px-2 py-1 rounded-full ${
                              job.status === 'published' 
                                ? 'bg-green-100 text-green-800' 
                                : job.status === 'paused'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {job.status || 'draft'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Applications */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
              <Link
                to="/organization/jobs"
                className="text-brand-600 hover:text-brand-700 text-sm font-medium flex items-center"
              >
                View All
                <HiArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            <div className="p-6">
              {recentApplications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FaFileAlt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No applications yet</p>
                  <p className="text-xs text-gray-400 mt-1">Applications will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentApplications.map((app, idx) => (
                    <div
                      key={app.id || idx}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{app.jobTitle || 'Job Application'}</h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {app.applicantName || app.user?.firstName || 'Applicant'}
                          </p>
                          <div className="flex items-center gap-3 text-xs">
                            <span className={`px-2 py-1 rounded-full ${
                              app.status === 'hired' || app.status === 'accepted'
                                ? 'bg-green-100 text-green-800'
                                : app.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {app.status || 'pending'}
                            </span>
                            {app.createdAt && (
                              <span className="text-gray-500">
                                {new Date(app.createdAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {/* <div className="mt-6 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/organization/jobs"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <HiBriefcase className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Post a Job</p>
                  <p className="text-sm text-gray-500">Create a new job posting</p>
                </div>
              </div>
              <HiArrowRight className="w-5 h-5 text-gray-400" />
            </Link>

            <Link
              to="/organization/professionals"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <HiUser className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Find Professionals</p>
                  <p className="text-sm text-gray-500">Search and hire talent</p>
                </div>
              </div>
              <HiArrowRight className="w-5 h-5 text-gray-400" />
            </Link>

            <Link
              to="/organization/settings?tab=profile"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mr-3">
                  <HiOfficeBuilding className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Update Profile</p>
                  <p className="text-sm text-gray-500">Manage organization info</p>
                </div>
              </div>
              <HiArrowRight className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
        </div> */}
      </div>
    </OrganisationLayout>
  );
}
