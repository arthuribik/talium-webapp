import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import { useAppSelector } from '@/store/hooks';
import {
  HiClock,
  HiArrowRight,
  HiUser,
} from 'react-icons/hi';
import {
  FaFileAlt,
  FaUserCheck,
} from 'react-icons/fa';

interface DashboardStats {
  totalApplications: number;
  pendingApplications: number;
  acceptedApplications: number;
  profileCompleteness: number;
}

export default function ProfessionalDashboard() {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentApplications, setRecentApplications] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch applications
      const applicationsResponse = await api.get('/v1/professional/applications');
      const applications = applicationsResponse.data.data?.applications || [];
      
      // Calculate stats
      const totalApplications = applications.length;
      const pendingApplications = applications.filter((app: any) => 
        app.status === 'pending' || app.status === 'under_review'
      ).length;
      const acceptedApplications = applications.filter((app: any) => 
        app.status === 'accepted' || app.status === 'hired'
      ).length;

      // Fetch profile for completeness
      let profileCompleteness = 0;
      try {
        const profileResponse = await api.get('/v1/professional/profile');
        profileCompleteness = profileResponse.data.data?.profileCompleteness || 0;
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }

      setStats({
        totalApplications,
        pendingApplications,
        acceptedApplications,
        profileCompleteness,
      });

      setRecentApplications(applications.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setStats({
        totalApplications: 0,
        pendingApplications: 0,
        acceptedApplications: 0,
        profileCompleteness: 0,
      });
      setRecentApplications([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProfessionalLayout>
        <div className="p-6">
          <div className="text-center text-gray-600 py-16">Loading dashboard...</div>
        </div>
      </ProfessionalLayout>
    );
  }

  const kpiCards = [
    {
      title: 'Total Applications',
      value: stats?.totalApplications || 0,
      icon: <FaFileAlt className="w-6 h-6" />,
      color: 'bg-blue-500',
      link: '/professional/applications',
    },
    {
      title: 'Pending Applications',
      value: stats?.pendingApplications || 0,
      icon: <HiClock className="w-6 h-6" />,
      color: 'bg-yellow-500',
      link: '/professional/applications',
    },
    {
      title: 'Accepted Applications',
      value: stats?.acceptedApplications || 0,
      icon: <FaUserCheck className="w-6 h-6" />,
      color: 'bg-green-500',
      link: '/professional/applications',
    },
    {
      title: 'Profile Completeness',
      value: `${stats?.profileCompleteness || 0}%`,
      icon: <HiUser className="w-6 h-6" />,
      color: 'bg-purple-500',
      link: '/professional/settings',
    },
  ];

  return (
    <ProfessionalLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
          <p className="text-gray-600">Welcome back, {user?.firstName || 'Professional'}</p>
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

        {/* Recent Applications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
            <Link
              to="/professional/applications"
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
                <p className="text-xs text-gray-400 mt-1">Start applying to jobs to see your applications here</p>
                <button
                  onClick={() => navigate('/professional/jobs')}
                  className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors text-sm"
                >
                  Browse Jobs
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentApplications.map((app, idx) => (
                  <div
                    key={app.id || idx}
                    onClick={() => navigate(`/jobs/${app.jobId}`)}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{app.job?.jobTitle || 'Job Application'}</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {app.job?.organisation?.companyName || 'Company'}
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
                              Applied {new Date(app.createdAt).toLocaleDateString()}
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

        {/* Quick Actions */}
        {/* <div className="mt-6 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/jobs')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between text-left"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <HiBriefcase className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Browse Jobs</p>
                  <p className="text-sm text-gray-500">Find new opportunities</p>
                </div>
              </div>
              <HiArrowRight className="w-5 h-5 text-gray-400" />
            </button>

            <Link
              to="/professional/applications"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <FaFileAlt className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">View Applications</p>
                  <p className="text-sm text-gray-500">Track your applications</p>
                </div>
              </div>
              <HiArrowRight className="w-5 h-5 text-gray-400" />
            </Link>

            <Link
              to="/professional/settings"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mr-3">
                  <HiUser className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Update Profile</p>
                  <p className="text-sm text-gray-500">Manage your profile</p>
                </div>
              </div>
              <HiArrowRight className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
        </div> */}
      </div>
    </ProfessionalLayout>
  );
}

