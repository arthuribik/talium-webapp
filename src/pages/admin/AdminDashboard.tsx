import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import type { RootState } from '@/store/store';
import { api } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  HiOfficeBuilding,
  HiUser,
  HiBriefcase,
  HiCheckCircle,
  HiClock,
  HiFilter,
  HiCalendar,
} from 'react-icons/hi';
import {
  FaDollarSign,
  FaGlobe,
  FaUsers,
  FaShoppingCart,
  FaGraduationCap,
  FaIdCard,
  FaMapMarkerAlt,
  FaBriefcase,
  FaBuilding,
  FaRocket,
} from 'react-icons/fa';

interface AnalyticsCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  filters?: string[];
  trend?: string;
  trendColor?: string;
}

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

type DashboardTab = 'overall' | 'organisations' | 'professionals' | 'jobs' | 'verifications' | 'billing';

export default function AdminDashboard() {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overall');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [organisations, setOrganisations] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);

  // Load tab from URL on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab') as DashboardTab;
    if (tabParam && ['overall', 'organisations', 'professionals', 'jobs', 'verifications', 'billing'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  useEffect(() => {
    if (user?.userType !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }
    fetchDashboardData();
  }, [user, navigate]);

  // Update URL when tab changes
  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/v1/admin/dashboard/stats');
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
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

  const fetchDashboardData = async () => {
    try {
      await Promise.all([fetchDashboardStats(), fetchOrganisations(), fetchJobs()]);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
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

  // Sample data for charts
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

  // Organisation Entities Analytics
  const organisationAnalytics: AnalyticsCard[] = [
    {
      title: 'Total Organisation Entities Created',
      value: '0',
      icon: <FaBuilding className="w-6 h-6" />,
      filters: ['Country', 'City', 'Registered', 'Not Registered', 'School', 'Company', 'Religious Organisation', 'Government Agency', 'Date'],
    },
    {
      title: 'Total Active Organisation',
      value: '0',
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
    {
      title: 'New Organisation',
      value: '0',
      icon: <HiCalendar className="w-6 h-6" />,
      filters: ['Month', 'Week', 'Today', 'Year to Date'],
    },
    {
      title: 'Organisation Pending Activation',
      value: '0',
      icon: <HiClock className="w-6 h-6" />,
    },
  ];

  // Professional Entities Analytics
  const professionalAnalytics: AnalyticsCard[] = [
    {
      title: 'Total Professional Entity Created',
      value: '0',
      icon: <HiUser className="w-6 h-6" />,
      filters: ['Country', 'City', 'Dual Citizenship', 'Job Title', 'Years of Work Experience'],
    },
    {
      title: 'Total Activated Professional Entity',
      value: '0',
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
    {
      title: 'Total Verified Government ID',
      value: '0',
      icon: <FaIdCard className="w-6 h-6" />,
      filters: ['Country', 'ID Type (Passport, etc.)'],
    },
    {
      title: 'Total Address Information Created',
      value: '0',
      icon: <FaMapMarkerAlt className="w-6 h-6" />,
    },
    {
      title: 'Number of Verified Address Information',
      value: '0',
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
    {
      title: 'Number of Graduate Certificates Added',
      value: '0',
      icon: <FaGraduationCap className="w-6 h-6" />,
    },
  ];

  // Jobs Analytics
  const jobsAnalytics: AnalyticsCard[] = [
    {
      title: 'Total Number of Job Role Created',
      value: '0',
      icon: <HiBriefcase className="w-6 h-6" />,
      filters: ['Country', 'Organisation', 'Industry', 'Category', 'Status (Paused, Expired, Under Review)', 'Date'],
    },
    {
      title: 'Active Job Roles',
      value: '0',
      icon: <HiCheckCircle className="w-6 h-6" />,
      filters: ['Organisation', 'Job Title', 'Industry'],
    },
    {
      title: 'Total Number of Job Application (Applicants)',
      value: '0',
      icon: <FaUsers className="w-6 h-6" />,
      filters: ['Organisation', 'Country', 'Job Title', 'Date'],
    },
    {
      title: 'Total Number of Hire',
      value: '0',
      icon: <FaBriefcase className="w-6 h-6" />,
    },
  ];

  // Verifications - Professional Entity
  const professionalVerifications: AnalyticsCard[] = [
    {
      title: 'Total Number of ID Verification Request',
      value: '0',
      icon: <FaIdCard className="w-6 h-6" />,
    },
    {
      title: 'Number of Verified IDs',
      value: '0',
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
    {
      title: 'Total of Address Verification Request',
      value: '0',
      icon: <FaMapMarkerAlt className="w-6 h-6" />,
    },
    {
      title: 'Number of Verified Address',
      value: '0',
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
    {
      title: 'Total Number Educational Verification Request',
      value: '0',
      icon: <FaGraduationCap className="w-6 h-6" />,
    },
    {
      title: 'Number of Verified Educational Data',
      value: '0',
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
    {
      title: 'Total Number of Work Experience Verification Request',
      value: '0',
      icon: <FaBriefcase className="w-6 h-6" />,
    },
    {
      title: 'Number of Verified Work Experience',
      value: '0',
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
  ];

  // Verifications - Organisation Entity
  const organisationVerifications: AnalyticsCard[] = [
    {
      title: 'Total Number of ID Verification Request',
      value: '0',
      icon: <FaIdCard className="w-6 h-6" />,
    },
    {
      title: 'Number of Verified IDs',
      value: '0',
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
    {
      title: 'Total of Address Verification Request',
      value: '0',
      icon: <FaMapMarkerAlt className="w-6 h-6" />,
    },
    {
      title: 'Number of Verified Address',
      value: '0',
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
    {
      title: 'Total Number Educational Verification Request',
      value: '0',
      icon: <FaGraduationCap className="w-6 h-6" />,
    },
    {
      title: 'Number of Verified Educational Data',
      value: '0',
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
    {
      title: 'Total Number of Work Experience Verification Request',
      value: '0',
      icon: <FaBriefcase className="w-6 h-6" />,
    },
    {
      title: 'Number of Verified Work Experience',
      value: '0',
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
  ];

  // Billing - Professional Entity
  const professionalBilling: AnalyticsCard[] = [
    {
      title: 'Total Revenue',
      value: '$0',
      icon: <FaDollarSign className="w-6 h-6" />,
      filters: ['Country', 'City', 'Job Title', 'Company', 'Plan type'],
    },
    {
      title: 'Total Number of Taldium Express',
      value: '0',
      icon: <FaShoppingCart className="w-6 h-6" />,
    },
    {
      title: 'Total number on Taldium Bloom',
      value: '0',
      icon: <FaShoppingCart className="w-6 h-6" />,
    },
    {
      title: 'Total Number on Taldium Prime',
      value: '0',
      icon: <FaShoppingCart className="w-6 h-6" />,
    },
  ];

  // Billing - Organisation Entity
  const organisationBilling: AnalyticsCard[] = [
    {
      title: 'Total Revenue',
      value: '$0',
      icon: <FaDollarSign className="w-6 h-6" />,
      filters: ['Country', 'Industry', 'Plan Type', 'Incorporated', 'Not Registered', 'Category (School, Company, Government Agency)'],
    },
    {
      title: 'Total Number of Taldium Starter Plan',
      value: '0',
      icon: <FaShoppingCart className="w-6 h-6" />,
    },
    {
      title: 'Total number on Taldium Standard Plan',
      value: '0',
      icon: <FaShoppingCart className="w-6 h-6" />,
    },
    {
      title: 'Total Number on Taldium Premium Plan',
      value: '0',
      icon: <FaShoppingCart className="w-6 h-6" />,
    },
    {
      title: 'Total Number on Taldium Enterprise',
      value: '0',
      icon: <FaShoppingCart className="w-6 h-6" />,
    },
  ];

  const renderAnalyticsCard = (card: AnalyticsCard, index: number) => (
    <div key={index} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-600">
          {card.icon}
        </div>
        {card.filters && card.filters.length > 0 && (
          <button className="text-gray-400 hover:text-gray-600">
            <HiFilter className="w-5 h-5" />
          </button>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-500 mb-2">{card.title}</h3>
      <p className="text-3xl font-bold text-gray-900 mb-2">{card.value}</p>
      {card.trend && (
        <span className={`text-sm font-semibold ${card.trendColor || 'text-green-600'}`}>
          {card.trend}
        </span>
      )}
      {card.filters && card.filters.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Filters:</p>
          <div className="flex flex-wrap gap-1">
            {card.filters.slice(0, 3).map((filter, idx) => (
              <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {filter}
              </span>
            ))}
            {card.filters.length > 3 && (
              <span className="text-xs text-gray-500">+{card.filters.length - 3} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderSection = (title: string, analytics: AnalyticsCard[], icon?: React.ReactNode) => (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-6">
        {icon && <div className="text-brand-600">{icon}</div>}
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {analytics.map((card, index) => renderAnalyticsCard(card, index))}
      </div>
    </div>
  );

  const tabs = [
    { id: 'overall' as DashboardTab, label: 'Overall' },
    { id: 'organisations' as DashboardTab, label: 'Organisations' },
    { id: 'professionals' as DashboardTab, label: 'Professionals' },
    { id: 'jobs' as DashboardTab, label: 'Jobs' },
    { id: 'verifications' as DashboardTab, label: 'Verifications' },
    { id: 'billing' as DashboardTab, label: 'Billing' },
  ];

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Breadcrumbs */}
        <div className="mb-6">
          <span className="text-sm text-gray-500">Pages / </span>
          <span className="text-lg font-bold text-gray-900">Dashboard</span>
        </div>

        {/* Tabs */}
        <div className="mb-6 bg-white rounded-xl shadow-sm p-2">
          <div className="flex space-x-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overall Tab Content */}
        {activeTab === 'overall' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
                    <FaDollarSign className="w-6 h-6 text-brand-600" />
                </div>
                <span className="text-sm font-semibold text-green-600">+55%</span>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Today's Moneys</h3>
              <p className="text-3xl font-bold text-gray-900">{todayMoney}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
                    <FaGlobe className="w-6 h-6 text-brand-600" />
                </div>
                <span className="text-sm font-semibold text-green-600">+5%</span>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Today's Users</h3>
              <p className="text-3xl font-bold text-gray-900">{todayUsers.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
                    <FaUsers className="w-6 h-6 text-brand-600" />
                </div>
                <span className="text-sm font-semibold text-red-600">-14%</span>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">New Clients</h3>
              <p className="text-3xl font-bold text-gray-900">{newClients.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
                    <FaShoppingCart className="w-6 h-6 text-brand-600" />
                </div>
                <span className="text-sm font-semibold text-green-600">+8%</span>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Sales</h3>
              <p className="text-3xl font-bold text-gray-900">{totalSales}</p>
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
                      <div className="bg-brand-500 h-1 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Clicks</p>
                  <p className="text-sm font-bold text-white">2.42m</p>
                  <div className="w-full bg-gray-700 rounded-full h-1 mt-2">
                      <div className="bg-brand-500 h-1 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Sales</p>
                  <p className="text-sm font-bold text-white">2,400$</p>
                  <div className="w-full bg-gray-700 rounded-full h-1 mt-2">
                      <div className="bg-brand-500 h-1 rounded-full" style={{ width: '80%' }}></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Items</p>
                  <p className="text-sm font-bold text-white">320</p>
                  <div className="w-full bg-gray-700 rounded-full h-1 mt-2">
                      <div className="bg-brand-500 h-1 rounded-full" style={{ width: '50%' }}></div>
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
                      <linearGradient id="brandGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#2966FF" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#2966FF" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="grayGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#6b7280" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#6b7280" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polyline
                    points="20,180 60,150 100,120 140,100 180,80 220,70 260,60 300,50 340,40 380,30"
                      fill="url(#brandGradient)"
                      stroke="#2966FF"
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
                              className="w-6 h-6 rounded-full bg-brand-500 border-2 border-white -ml-2 first:ml-0"
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
                            className="bg-brand-500 h-1.5 rounded-full"
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
                        <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-600">
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
        )}

        {/* Other Tabs Content */}
        {activeTab === 'organisations' && (
          <div className="space-y-8">
            {renderSection('Organisation Entities', organisationAnalytics, <HiOfficeBuilding className="w-6 h-6" />)}
          </div>
        )}

        {activeTab === 'professionals' && (
          <div className="space-y-8">
            {renderSection('Professional Entities', professionalAnalytics, <HiUser className="w-6 h-6" />)}
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="space-y-8">
            {renderSection('Jobs', jobsAnalytics, <HiBriefcase className="w-6 h-6" />)}
          </div>
        )}

        {activeTab === 'verifications' && (
          <div className="space-y-8">
            {renderSection('Verifications (For Professional Entity)', professionalVerifications, <HiCheckCircle className="w-6 h-6" />)}
            {renderSection('Verifications (For Organisation Entity)', organisationVerifications, <HiCheckCircle className="w-6 h-6" />)}
            </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-8">
            {renderSection('Billing (For Professional Entity)', professionalBilling, <FaDollarSign className="w-6 h-6" />)}
            {renderSection('Billing (For Organisation Entity)', organisationBilling, <FaDollarSign className="w-6 h-6" />)}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
