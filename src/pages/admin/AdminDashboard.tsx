import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import type { RootState } from '@/store/store';
import { api } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  HiHeart,
} from 'react-icons/hi';
import {
  FaDollarSign,
  FaGlobe,
  FaUsers,
  FaShoppingCart,
  FaBolt,
  FaRocket,
} from 'react-icons/fa';

interface DashboardStats {
  totalUsers: number;
  totalOrganisations: number;
  totalProfessionals: number;
  totalJobs: number;
  totalApplications: number;
  verifiedProfessionals: number;
  verifiedOrganisations: number;
  pendingVerifications: number;
}

export default function AdminDashboard() {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [organisations, setOrganisations] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    if (user?.userType !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }
    fetchDashboardStats();
    fetchOrganisations();
    fetchJobs();
  }, [user, navigate]);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/v1/admin/dashboard/stats');
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganisations = async () => {
    try {
      const response = await api.get('/v1/admin/organisations');
      setOrganisations(response.data.data.organisations || []);
    } catch (err) {
      console.error('Failed to fetch organisations:', err);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await api.get('/v1/admin/jobs');
      setJobs(response.data.data.jobs || []);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center text-gray-600">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  // Calculate metrics for KPI cards
  const todayMoney = stats ? `$${(stats.totalUsers * 1000).toLocaleString()}` : '$53,000';
  const todayUsers = stats?.totalUsers || 2300;
  const newClients = stats?.totalOrganisations || 3020;
  const totalSales = stats ? `$${(stats.totalJobs * 5000).toLocaleString()}` : '$173,000';

  // Sample data for charts and tables
  const activeUsersData = [40, 60, 45, 70, 55, 80, 65];

  const projects = organisations.slice(0, 5).map((org, idx) => ({
    name: org.companyName || `Project ${idx + 1}`,
    members: 3 + idx,
    budget: `$${(10000 + idx * 2000).toLocaleString()}`,
    completion: 60 + idx * 10,
  }));

  const orders = jobs.slice(0, 5).map((job, idx) => ({
    icon: <FaRocket className="w-4 h-4" />,
    description: `$${(2400 + idx * 200).toLocaleString()}, ${job.jobTitle || 'New order'}`,
    orderId: `#${4219423 + idx}`,
    date: new Date(Date.now() - idx * 86400000).toLocaleDateString(),
  }));

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Breadcrumbs */}
        <div className="mb-6">
          <span className="text-sm text-gray-500">Pages / </span>
          <span className="text-lg font-bold text-gray-900">Dashboard</span>
        </div>

        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                  <FaDollarSign className="w-6 h-6 text-teal-600" />
                </div>
                <span className="text-sm font-semibold text-green-600">+55%</span>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Today's Moneys</h3>
              <p className="text-3xl font-bold text-gray-900">{todayMoney}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                  <FaGlobe className="w-6 h-6 text-teal-600" />
                </div>
                <span className="text-sm font-semibold text-green-600">+5%</span>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Today's Users</h3>
              <p className="text-3xl font-bold text-gray-900">{todayUsers.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                  <FaUsers className="w-6 h-6 text-teal-600" />
                </div>
                <span className="text-sm font-semibold text-red-600">-14%</span>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">New Clients</h3>
              <p className="text-3xl font-bold text-gray-900">{newClients.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                  <FaShoppingCart className="w-6 h-6 text-teal-600" />
                </div>
                <span className="text-sm font-semibold text-green-600">+8%</span>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Sales</h3>
              <p className="text-3xl font-bold text-gray-900">{totalSales}</p>
            </div>
          </div>

          {/* Info Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Built by Developers</h3>
              <p className="text-sm text-gray-600 mb-4">
                From colors, cards, typography to complex elements, you will find the full documentation.
              </p>
              <a href="#" className="text-sm text-teal-600 font-medium hover:underline">
                Read more →
              </a>
            </div>

            <div className="bg-teal-500 rounded-xl shadow-sm p-6 flex items-center justify-center">
              <div className="text-white text-center">
                <FaBolt className="w-12 h-12 mx-auto mb-2" />
                <div className="text-2xl font-bold">chakra</div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl shadow-sm p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 opacity-90"></div>
              <div className="relative z-10">
                <h3 className="text-lg font-bold text-white mb-2">Work with the rockets</h3>
                <p className="text-sm text-gray-300 mb-4">
                  Wealth creation is a revolutionary recent positive-sum game. It is all about who takes the opportunity first.
                </p>
                <a href="#" className="text-sm text-teal-400 font-medium hover:underline">
                  Read more →
                </a>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Users Chart */}
            <div className="bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Active Users</h3>
                  <p className="text-sm text-gray-400">+23% than last week</p>
                </div>
              </div>
              <div className="h-64 flex items-end justify-between space-x-2 mt-6">
                {activeUsersData.map((height, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-white rounded-t"
                      style={{ height: `${height}%` }}
                    ></div>
                    <span className="text-xs text-gray-400 mt-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-700">
                <div>
                  <p className="text-xs text-gray-400">Users</p>
                  <p className="text-sm font-bold text-white">{stats?.totalUsers || 32984}</p>
                  <div className="w-full bg-gray-700 rounded-full h-1 mt-2">
                    <div className="bg-teal-500 h-1 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Clicks</p>
                  <p className="text-sm font-bold text-white">2.42m</p>
                  <div className="w-full bg-gray-700 rounded-full h-1 mt-2">
                    <div className="bg-teal-500 h-1 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Sales</p>
                  <p className="text-sm font-bold text-white">2,400$</p>
                  <div className="w-full bg-gray-700 rounded-full h-1 mt-2">
                    <div className="bg-teal-500 h-1 rounded-full" style={{ width: '80%' }}></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Items</p>
                  <p className="text-sm font-bold text-white">320</p>
                  <div className="w-full bg-gray-700 rounded-full h-1 mt-2">
                    <div className="bg-teal-500 h-1 rounded-full" style={{ width: '50%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sales Overview Chart */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Sales Overview</h3>
                  <p className="text-sm text-gray-500">5% more in 2021</p>
                </div>
              </div>
              <div className="h-64 flex items-end justify-center mt-6 relative">
                <svg className="w-full h-full" viewBox="0 0 400 200">
                  <defs>
                    <linearGradient id="tealGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="grayGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#6b7280" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#6b7280" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polyline
                    points="20,180 60,150 100,120 140,100 180,80 220,70 260,60 300,50 340,40 380,30"
                    fill="url(#tealGradient)"
                    stroke="#14b8a6"
                    strokeWidth="3"
                  />
                  <polyline
                    points="20,190 60,170 100,140 140,120 180,100 220,90 260,80 300,70 340,60 380,50"
                    fill="url(#grayGradient)"
                    stroke="#6b7280"
                    strokeWidth="3"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Projects Table */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Projects</h3>
                  <p className="text-sm text-gray-500">30 done this month</p>
                </div>
              </div>
              <div className="space-y-4">
                {projects.map((project, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{project.name}</p>
                      <div className="flex items-center mt-1">
                        {Array.from({ length: project.members }).map((_, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-full bg-teal-500 border-2 border-white -ml-2 first:ml-0"
                            style={{ zIndex: project.members - i }}
                          ></div>
                        ))}
                      </div>
                    </div>
                    <div className="text-right mr-4">
                      <p className="text-sm font-medium text-gray-900">{project.budget}</p>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <p className="text-sm font-medium text-gray-900">{project.completion}%</p>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-teal-500 h-1.5 rounded-full"
                          style={{ width: `${project.completion}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Orders Overview */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Orders Overview</h3>
                  <p className="text-sm text-gray-500">30% this month</p>
                </div>
              </div>
              <div className="space-y-4">
                {orders.map((order, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600">
                        {order.icon}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{order.description}</p>
                        <p className="text-xs text-gray-500">{order.orderId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{order.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {/* <footer className="mt-6 bg-white border-t border-gray-200 px-6 py-4 rounded-xl">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 flex items-center">
              © 2026, Made with <HiHeart className="w-4 h-4 mx-1 text-red-500" /> by Creative Tim & Simmmple for a better web
            </p>
            <div className="flex items-center space-x-4">
              <a href="#" className="text-sm text-gray-600 hover:text-gray-900">Creative Tim</a>
              <a href="#" className="text-sm text-gray-600 hover:text-gray-900">Simmmple</a>
              <a href="#" className="text-sm text-gray-600 hover:text-gray-900">Blog</a>
              <a href="#" className="text-sm text-gray-600 hover:text-gray-900">License</a>
            </div>
          </div>
        </footer> */}
      </div>
    </AdminLayout>
  );
}
