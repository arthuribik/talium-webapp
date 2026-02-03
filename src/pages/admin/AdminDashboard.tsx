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
  FaUsers,
  FaShoppingCart,
  FaGraduationCap,
  FaIdCard,
  FaMapMarkerAlt,
  FaBriefcase,
  FaBuilding,
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
  organisationEntities?: {
    totalCreated: number;
    totalActive: number;
    newOrganisations: {
      today: number;
      thisWeek: number;
      thisMonth: number;
      yearToDate: number;
    };
    pendingActivation: number;
  };
  professionalEntities?: {
    totalCreated: number;
    totalActivated: number;
    totalVerifiedGovernmentId: number;
    totalAddressInfoCreated: number;
    verifiedAddressInfo: number;
    graduateCertificatesAdded: number;
  };
  jobs?: {
    totalCreated: number;
    activeJobRoles: number;
    totalApplications: number;
    totalHires: number;
  };
  professionalVerifications?: {
    idVerificationRequests: number;
    verifiedIds: number;
    addressVerificationRequests: number;
    verifiedAddress: number;
    educationVerificationRequests: number;
    verifiedEducation: number;
    workExperienceVerificationRequests: number;
    verifiedWorkExperience: number;
  };
  organisationVerifications?: {
    idVerificationRequests: number;
    verifiedIds: number;
    addressVerificationRequests: number;
    verifiedAddress: number;
    educationVerificationRequests: number;
    verifiedEducation: number;
    workExperienceVerificationRequests: number;
    verifiedWorkExperience: number;
  };
  professionalBilling?: {
    totalRevenue: number;
    taldiumExpress: number;
    taldiumBloom: number;
    taldiumPrime: number;
  };
  organisationBilling?: {
    totalRevenue: number;
    taldiumStarter: number;
    taldiumStandard: number;
    taldiumPremium: number;
    taldiumEnterprise: number;
  };
}

type DashboardTab = 'overall' | 'organisations' | 'professionals' | 'jobs' | 'verifications' | 'billing';

export default function AdminDashboard() {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overall');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Load tab from URL on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab') as DashboardTab;
    if (tabParam && ['overall', 'organisations', 'professionals', 'jobs', 'verifications', 'billing'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  useEffect(() => {
    if (user?.userType !== 'ADMIN') {
      // Redirect based on user type
      if (user?.userType === 'PROFESSIONAL') {
        navigate('/professional');
      } else if (user?.userType === 'ORGANISATION') {
        navigate('/organization');
      } else {
        navigate('/login');
      }
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
      // Set default values on error
      setStats({
        totalUsers: 0,
        totalOrganisations: 0,
        totalProfessionals: 0,
        totalJobs: 0,
        totalApplications: 0,
        verifiedProfessionals: 0,
        verifiedOrganisations: 0,
        pendingVerifications: 0,
      });
    }
  };

  const fetchDashboardData = async () => {
    try {
      await fetchDashboardStats();
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

  // Calculate metrics for Overall tab
  const totalRevenue = (stats?.professionalBilling?.totalRevenue || 0) + (stats?.organisationBilling?.totalRevenue || 0);
  const totalProfessionals = stats?.totalProfessionals || 0;
  const totalOrganisations = stats?.totalOrganisations || 0;
  const totalJobs = stats?.totalJobs || 0;
  const activeJobs = stats?.jobs?.activeJobRoles || 0;
  const totalApplications = stats?.totalApplications || 0;
  const totalHires = stats?.jobs?.totalHires || 0;
  const verifiedProfessionals = stats?.verifiedProfessionals || 0;
  const verifiedOrganisations = stats?.verifiedOrganisations || 0;
  const activeOrganisations = stats?.organisationEntities?.totalActive || 0;
  const activatedProfessionals = stats?.professionalEntities?.totalActivated || 0;

  // Organisation Entities Analytics
  const organisationAnalytics: AnalyticsCard[] = [
    {
      title: 'Total Organisation Entities Created',
      value: String(stats?.organisationEntities?.totalCreated || 0),
      icon: <FaBuilding className="w-6 h-6" />,
      filters: ['Country', 'City', 'Registered', 'Not Registered', 'School', 'Company', 'Religious Organisation', 'Government Agency', 'Date'],
    },
    {
      title: 'Total Active Organisation',
      value: String(stats?.organisationEntities?.totalActive || 0),
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
    {
      title: 'Verified Organisations',
      value: String(stats?.verifiedOrganisations || 0),
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
    {
      title: 'New Organisation (Today)',
      value: String(stats?.organisationEntities?.newOrganisations?.today || 0),
      icon: <HiCalendar className="w-6 h-6" />,
    },
    {
      title: 'New Organisation (This Week)',
      value: String(stats?.organisationEntities?.newOrganisations?.thisWeek || 0),
      icon: <HiCalendar className="w-6 h-6" />,
    },
    {
      title: 'New Organisation (This Month)',
      value: String(stats?.organisationEntities?.newOrganisations?.thisMonth || 0),
      icon: <HiCalendar className="w-6 h-6" />,
    },
    {
      title: 'New Organisation (Year to Date)',
      value: String(stats?.organisationEntities?.newOrganisations?.yearToDate || 0),
      icon: <HiCalendar className="w-6 h-6" />,
      filters: ['Month', 'Week', 'Today', 'Year to Date'],
    },
    {
      title: 'Organisation Pending Activation',
      value: String(stats?.organisationEntities?.pendingActivation || 0),
      icon: <HiClock className="w-6 h-6" />,
    },
  ];

  // Professional Entities Analytics
  const professionalAnalytics: AnalyticsCard[] = [
    {
      title: 'Total Professional Entity Created',
      value: String(stats?.professionalEntities?.totalCreated || 0),
      icon: <HiUser className="w-6 h-6" />,
      filters: ['Country', 'City', 'Dual Citizenship', 'Job Title', 'Years of Work Experience'],
    },
    {
      title: 'Total Activated Professional Entity',
      value: String(stats?.professionalEntities?.totalActivated || 0),
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
    {
      title: 'Total Verified Government ID',
      value: String(stats?.professionalEntities?.totalVerifiedGovernmentId || 0),
      icon: <FaIdCard className="w-6 h-6" />,
      filters: ['Country', 'ID Type (Passport, etc.)'],
    },
    {
      title: 'Total Address Information Created',
      value: String(stats?.professionalEntities?.totalAddressInfoCreated || 0),
      icon: <FaMapMarkerAlt className="w-6 h-6" />,
    },
    {
      title: 'Number of Verified Address Information',
      value: String(stats?.professionalEntities?.verifiedAddressInfo || 0),
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
    {
      title: 'Number of Graduate Certificates Added',
      value: String(stats?.professionalEntities?.graduateCertificatesAdded || 0),
      icon: <FaGraduationCap className="w-6 h-6" />,
    },
  ];

  // Jobs Analytics
  const jobsAnalytics: AnalyticsCard[] = [
    {
      title: 'Total Number of Job Role Created',
      value: String(stats?.jobs?.totalCreated || 0),
      icon: <HiBriefcase className="w-6 h-6" />,
      filters: ['Country', 'Organisation', 'Industry', 'Category', 'Status (Paused, Expired, Under Review)', 'Date'],
    },
    {
      title: 'Active Job Roles',
      value: String(stats?.jobs?.activeJobRoles || 0),
      icon: <HiCheckCircle className="w-6 h-6" />,
      filters: ['Organisation', 'Job Title', 'Industry'],
    },
    {
      title: 'Total Number of Job Application (Applicants)',
      value: String(stats?.jobs?.totalApplications || 0),
      icon: <FaUsers className="w-6 h-6" />,
      filters: ['Organisation', 'Country', 'Job Title', 'Date'],
    },
    {
      title: 'Total Number of Hire',
      value: String(stats?.jobs?.totalHires || 0),
      icon: <FaBriefcase className="w-6 h-6" />,
    },
  ];

  // Verifications - Professional Entity
  const professionalVerifications: AnalyticsCard[] = [
    {
      title: 'Total Number of ID Verification Request',
      value: String(stats?.professionalVerifications?.idVerificationRequests || 0),
      icon: <FaIdCard className="w-6 h-6" />,
    },
    {
      title: 'Number of Verified IDs',
      value: String(stats?.professionalVerifications?.verifiedIds || 0),
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
    {
      title: 'Total of Address Verification Request',
      value: String(stats?.professionalVerifications?.addressVerificationRequests || 0),
      icon: <FaMapMarkerAlt className="w-6 h-6" />,
    },
    {
      title: 'Number of Verified Address',
      value: String(stats?.professionalVerifications?.verifiedAddress || 0),
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
    {
      title: 'Total Number Educational Verification Request',
      value: String(stats?.professionalVerifications?.educationVerificationRequests || 0),
      icon: <FaGraduationCap className="w-6 h-6" />,
    },
    {
      title: 'Number of Verified Educational Data',
      value: String(stats?.professionalVerifications?.verifiedEducation || 0),
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
    {
      title: 'Total Number of Work Experience Verification Request',
      value: String(stats?.professionalVerifications?.workExperienceVerificationRequests || 0),
      icon: <FaBriefcase className="w-6 h-6" />,
    },
    {
      title: 'Number of Verified Work Experience',
      value: String(stats?.professionalVerifications?.verifiedWorkExperience || 0),
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
  ];

  // Verifications - Organisation Entity
  const organisationVerifications: AnalyticsCard[] = [
    {
      title: 'Total Number of ID Verification Request',
      value: String(stats?.organisationVerifications?.idVerificationRequests || 0),
      icon: <FaIdCard className="w-6 h-6" />,
    },
    {
      title: 'Number of Verified IDs',
      value: String(stats?.organisationVerifications?.verifiedIds || 0),
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
    {
      title: 'Total of Address Verification Request',
      value: String(stats?.organisationVerifications?.addressVerificationRequests || 0),
      icon: <FaMapMarkerAlt className="w-6 h-6" />,
    },
    {
      title: 'Number of Verified Address',
      value: String(stats?.organisationVerifications?.verifiedAddress || 0),
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
    {
      title: 'Total Number Educational Verification Request',
      value: String(stats?.organisationVerifications?.educationVerificationRequests || 0),
      icon: <FaGraduationCap className="w-6 h-6" />,
    },
    {
      title: 'Number of Verified Educational Data',
      value: String(stats?.organisationVerifications?.verifiedEducation || 0),
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
    {
      title: 'Total Number of Work Experience Verification Request',
      value: String(stats?.organisationVerifications?.workExperienceVerificationRequests || 0),
      icon: <FaBriefcase className="w-6 h-6" />,
    },
    {
      title: 'Number of Verified Work Experience',
      value: String(stats?.organisationVerifications?.verifiedWorkExperience || 0),
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
  ];

  // Billing - Professional Entity
  const professionalBilling: AnalyticsCard[] = [
    {
      title: 'Total Revenue',
      value: `$${(stats?.professionalBilling?.totalRevenue || 0).toLocaleString()}`,
      icon: <FaDollarSign className="w-6 h-6" />,
      filters: ['Country', 'City', 'Job Title', 'Company', 'Plan type'],
    },
    {
      title: 'Total Number of Taldium Express',
      value: String(stats?.professionalBilling?.taldiumExpress || 0),
      icon: <FaShoppingCart className="w-6 h-6" />,
    },
    {
      title: 'Total number on Taldium Bloom',
      value: String(stats?.professionalBilling?.taldiumBloom || 0),
      icon: <FaShoppingCart className="w-6 h-6" />,
    },
    {
      title: 'Total Number on Taldium Prime',
      value: String(stats?.professionalBilling?.taldiumPrime || 0),
      icon: <FaShoppingCart className="w-6 h-6" />,
    },
  ];

  // Billing - Organisation Entity
  const organisationBilling: AnalyticsCard[] = [
    {
      title: 'Total Revenue',
      value: `$${(stats?.organisationBilling?.totalRevenue || 0).toLocaleString()}`,
      icon: <FaDollarSign className="w-6 h-6" />,
      filters: ['Country', 'Industry', 'Plan Type', 'Incorporated', 'Not Registered', 'Category (School, Company, Government Agency)'],
    },
    {
      title: 'Total Number of Taldium Starter Plan',
      value: String(stats?.organisationBilling?.taldiumStarter || 0),
      icon: <FaShoppingCart className="w-6 h-6" />,
    },
    {
      title: 'Total number on Taldium Standard Plan',
      value: String(stats?.organisationBilling?.taldiumStandard || 0),
      icon: <FaShoppingCart className="w-6 h-6" />,
    },
    {
      title: 'Total Number on Taldium Premium Plan',
      value: String(stats?.organisationBilling?.taldiumPremium || 0),
      icon: <FaShoppingCart className="w-6 h-6" />,
    },
    {
      title: 'Total Number on Taldium Enterprise',
      value: String(stats?.organisationBilling?.taldiumEnterprise || 0),
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
            {/* Total Revenue */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
                  <FaDollarSign className="w-6 h-6 text-brand-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Revenue</h3>
              <p className="text-3xl font-bold text-gray-900">${totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">Professional + Organisation</p>
            </div>

            {/* Total Professionals */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
                  <HiUser className="w-6 h-6 text-brand-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Professionals</h3>
              <p className="text-3xl font-bold text-gray-900">{totalProfessionals.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{activatedProfessionals} activated</p>
            </div>

            {/* Total Organisations */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
                  <HiOfficeBuilding className="w-6 h-6 text-brand-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Organisations</h3>
              <p className="text-3xl font-bold text-gray-900">{totalOrganisations.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{activeOrganisations} active</p>
            </div>

            {/* Total Jobs */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
                  <HiBriefcase className="w-6 h-6 text-brand-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Jobs</h3>
              <p className="text-3xl font-bold text-gray-900">{totalJobs.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{activeJobs} active</p>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Professionals Stats */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <HiUser className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Professionals</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Total</span>
                  <span className="text-sm font-semibold text-gray-900">{totalProfessionals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Activated</span>
                  <span className="text-sm font-semibold text-green-600">{activatedProfessionals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Verified</span>
                  <span className="text-sm font-semibold text-blue-600">{verifiedProfessionals}</span>
                </div>
              </div>
            </div>

            {/* Organisations Stats */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <HiOfficeBuilding className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Organisations</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Total</span>
                  <span className="text-sm font-semibold text-gray-900">{totalOrganisations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Active</span>
                  <span className="text-sm font-semibold text-green-600">{activeOrganisations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Verified</span>
                  <span className="text-sm font-semibold text-purple-600">{verifiedOrganisations}</span>
                </div>
              </div>
            </div>

            {/* Jobs Stats */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <HiBriefcase className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Jobs</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Total</span>
                  <span className="text-sm font-semibold text-gray-900">{totalJobs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Active</span>
                  <span className="text-sm font-semibold text-green-600">{activeJobs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Applications</span>
                  <span className="text-sm font-semibold text-blue-600">{totalApplications}</span>
                </div>
              </div>
            </div>

            {/* Billing Stats */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <FaDollarSign className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Billing</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Total Revenue</span>
                  <span className="text-sm font-semibold text-gray-900">${totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Prof. Plans</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {(stats?.professionalBilling?.taldiumExpress || 0) + 
                     (stats?.professionalBilling?.taldiumBloom || 0) + 
                     (stats?.professionalBilling?.taldiumPrime || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Org. Plans</span>
                  <span className="text-sm font-semibold text-purple-600">
                    {(stats?.organisationBilling?.taldiumStarter || 0) + 
                     (stats?.organisationBilling?.taldiumStandard || 0) + 
                     (stats?.organisationBilling?.taldiumPremium || 0) + 
                     (stats?.organisationBilling?.taldiumEnterprise || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Stats Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Jobs Overview */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Jobs Overview</h3>
                  <p className="text-sm text-gray-500">Job statistics</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <HiBriefcase className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Total Jobs Created</p>
                      <p className="text-xs text-gray-500">All time</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{totalJobs}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <HiCheckCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Active Jobs</p>
                      <p className="text-xs text-gray-500">Currently published</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{activeJobs}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <FaUsers className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Total Applications</p>
                      <p className="text-xs text-gray-500">All applications</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-purple-600">{totalApplications}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <HiCheckCircle className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Total Hires</p>
                      <p className="text-xs text-gray-500">Successful placements</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-yellow-600">{totalHires}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Status */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Verification Status</h3>
                  <p className="text-sm text-gray-500">Verification overview</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <HiUser className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Verified Professionals</p>
                      <p className="text-xs text-gray-500">Identity verified</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-600">{verifiedProfessionals}</p>
                    <p className="text-xs text-gray-400">of {totalProfessionals}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <HiOfficeBuilding className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Verified Organisations</p>
                      <p className="text-xs text-gray-500">Business verified</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-purple-600">{verifiedOrganisations}</p>
                    <p className="text-xs text-gray-400">of {totalOrganisations}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <HiCheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Activated Professionals</p>
                      <p className="text-xs text-gray-500">Account activated</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{activatedProfessionals}</p>
                    <p className="text-xs text-gray-400">of {totalProfessionals}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <HiOfficeBuilding className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Active Organisations</p>
                      <p className="text-xs text-gray-500">Currently active</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-yellow-600">{activeOrganisations}</p>
                    <p className="text-xs text-gray-400">of {totalOrganisations}</p>
                  </div>
                </div>
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
