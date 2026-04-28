import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import { useAppSelector } from '@/store/hooks';
import {
  VERIFICATION_TABS,
  mergeVerificationStatusFromSources,
  verificationProgressFromMerged,
} from '@/utils/verificationProgress';
import {
  HiClock,
  HiArrowRight,
  HiUser,
  HiBriefcase,
  HiCheckCircle,
  HiChartBar,
  HiShieldCheck,
  HiSparkles,
} from 'react-icons/hi';

interface DashboardStats {
  totalApplications: number;
  pendingApplications: number;
  acceptedApplications: number;
  profileCompleteness: number;
  recentApplications: Array<{
    id: string;
    jobId: string;
    jobTitle: string;
    companyName: string;
    location?: string;
    status: string;
    appliedAt: string;
    job?: { jobTitle?: string; organisation?: { companyName?: string } };
  }>;
}

export default function ProfessionalDashboard() {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [verificationProgress, setVerificationProgress] = useState({
    completedVerificationSteps: 0,
    progressPct: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, profileRes, statusRes] = await Promise.all([
        api.get('/v1/professional/dashboard/stats'),
        api.get('/v1/professional/profile'),
        api.get('/v1/professional/verification-status').catch(() => ({ data: { data: null } })),
      ]);
      const data = statsRes.data?.data;
      if (data) {
        setStats({
          totalApplications: data.totalApplications ?? 0,
          pendingApplications: data.pendingApplications ?? 0,
          acceptedApplications: data.acceptedApplications ?? 0,
          profileCompleteness: data.profileCompleteness ?? 0,
          recentApplications: data.recentApplications ?? [],
        });
      } else {
        setStats({
          totalApplications: 0,
          pendingApplications: 0,
          acceptedApplications: 0,
          profileCompleteness: 0,
          recentApplications: [],
        });
      }
      const profileData = profileRes.data?.data;
      setProfile(profileData ?? null);
      const statusPayload = statusRes.data?.data;
      const merged = mergeVerificationStatusFromSources(statusPayload, profileData);
      const { completedVerificationSteps, progressPct } = verificationProgressFromMerged(merged);
      setVerificationProgress({ completedVerificationSteps, progressPct });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setStats({
        totalApplications: 0,
        pendingApplications: 0,
        acceptedApplications: 0,
        profileCompleteness: 0,
        recentApplications: [],
      });
      setVerificationProgress({ completedVerificationSteps: 0, progressPct: 0 });
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const hasStartedVerification = (profileData: any): boolean => {
    if (!profileData) return false;
    const hasArrayData = (...keys: string[]) =>
      keys.some((key) => Array.isArray(profileData[key]) && profileData[key].length > 0);
    const hasObjectData = (...keys: string[]) =>
      keys.some((key) => {
        const value = profileData[key];
        return (
          value &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          Object.values(value).some((item) => {
            if (Array.isArray(item)) return item.length > 0;
            if (item && typeof item === 'object') return Object.values(item).some(Boolean);
            return Boolean(item);
          })
        );
      });

    return Boolean(
      profileData.dateOfBirth ||
        profileData.gender ||
        profileData.nationality ||
        profileData.idType ||
        profileData.idNumber ||
        profileData.idDocumentUrl ||
        profileData.livenessSelfieUrl ||
        profileData.identityVerification ||
        hasArrayData('locations', 'education', 'workExperience', 'projects', 'professionalProjects', 'certifications') ||
        hasObjectData('socialMedia', 'familyInfo', 'address'),
    );
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      hired: 'bg-emerald-100 text-emerald-800',
      accepted: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800',
      withdrawn: 'bg-gray-100 text-gray-600',
    };
    const style = map[status] ?? 'bg-amber-100 text-amber-800';
    const label = status?.replace(/_/g, ' ') ?? 'pending';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${style}`}>
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <ProfessionalLayout>
        <div className="p-6">
          <div className="flex items-center justify-center min-h-[320px]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Loading analytics...</p>
            </div>
          </div>
        </div>
      </ProfessionalLayout>
    );
  }

  const statCards = [
    {
      title: 'Total applications',
      value: stats?.totalApplications ?? 0,
      sub: 'All time',
      icon: HiBriefcase,
      href: '/professional/jobs',
      color: 'bg-brand-500',
      bgLight: 'bg-brand-50',
      textColor: 'text-brand-600',
    },
    {
      title: 'Pending',
      value: stats?.pendingApplications ?? 0,
      sub: 'Under review',
      icon: HiClock,
      href: '/professional/jobs',
      color: 'bg-amber-500',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
    {
      title: 'Accepted / Hired',
      value: stats?.acceptedApplications ?? 0,
      sub: 'Success',
      icon: HiCheckCircle,
      href: '/professional/jobs',
      color: 'bg-emerald-500',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
    },
    {
      title: 'Profile strength',
      value: `${stats?.profileCompleteness ?? 0}%`,
      sub: 'Complete your profile',
      icon: HiUser,
      href: '/professional/verification',
      color: 'bg-violet-500',
      bgLight: 'bg-violet-50',
      textColor: 'text-violet-600',
    },
  ];

  const { completedVerificationSteps, progressPct } = verificationProgress;
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  const profileDetails = [
    { label: 'Full Name', value: fullName || '—' },
    { label: 'Job Title', value: profile?.profession || '—' },
    { label: 'Email', value: user?.email || profile?.email || '—' },
    { label: 'Nationality', value: profile?.nationality || '—' },
    { label: 'Phone', value: profile?.phoneNumber || '—' },
  ];
  const showNewAccountIntro = completedVerificationSteps === 0 && !hasStartedVerification(profile);

  if (showNewAccountIntro) {
    return (
      <ProfessionalLayout>
        <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-brand-50 via-white to-indigo-50/60 px-4 py-10 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <p className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700 shadow-sm">
                <HiSparkles className="h-4 w-4" />
                Welcome
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
                Welcome, <span className="text-brand-600">{user?.firstName || 'Professional'}</span>
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Your Taldium profile is ready. Start verification to activate your trusted professional identity.
              </p>
            </div>

            <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                  <HiUser className="h-4 w-4" />
                  Profile details
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-100">
                  <HiClock className="h-3.5 w-3.5" />
                  Verification pending
                </span>
              </div>
              <dl className="divide-y divide-gray-100">
                {profileDetails.map((item) => (
                  <div key={item.label} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{item.label}</dt>
                    <dd className="break-words text-sm font-medium text-gray-900 sm:text-right">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
                <p className="text-2xl font-bold text-brand-600">0</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Connections</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
                <p className="text-2xl font-bold text-brand-600">0</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Credentials</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                <HiShieldCheck className="h-4 w-4" />
                Next steps
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Complete your verification profile to become discoverable and connect with organisations on the network.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/professional/verification"
                  className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
                >
                  Complete Verification
                </Link>
                <Link
                  to="/professional/jobs"
                  className="inline-flex items-center justify-center rounded-lg border border-brand-100 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100"
                >
                  Find Jobs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </ProfessionalLayout>
    );
  }

  return (
    <ProfessionalLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <HiChartBar className="w-4 h-4 text-brand-500" />
            <span>Analytics</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Welcome back, {user?.firstName || 'Professional'}
          </h1>
          <p className="mt-1 text-gray-600">
            Here’s an overview of your activity and profile.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => (
            <Link
              key={card.title}
              to={card.href}
              className="group block bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {card.title}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">
                    {card.value}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">{card.sub}</p>
                </div>
                <div
                  className={`p-2.5 rounded-lg ${card.bgLight} ${card.textColor} group-hover:opacity-90`}
                >
                  <card.icon className="w-5 h-5" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Same progress card as Verification Center (8 verification steps) */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-sm font-medium text-gray-800">
            <span>Profile Completion</span>
            <span>{progressPct}%</span>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              {completedVerificationSteps}/{VERIFICATION_TABS.length} verification steps completed
            </p>
            <Link
              to="/professional/verification"
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Complete profile →
            </Link>
          </div>
        </div>

        {/* Recent applications */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Recent applications
            </h2>
            <Link
              to="/professional/jobs"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              View all
              <HiArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="p-5">
            {(stats?.recentApplications?.length ?? 0) === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <HiBriefcase className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">No applications yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  Apply to jobs to see them here
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/professional/jobs')}
                  className="mt-4 px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors"
                >
                  Browse jobs
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {stats?.recentApplications?.map((app) => (
                  <li key={app.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/professional/jobs/${app.jobId}`)}
                      className="w-full text-left py-4 flex items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors -mx-2 px-2 rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">
                          {app.jobTitle || app.job?.jobTitle || 'Application'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {app.companyName ||
                            app.job?.organisation?.companyName ||
                            'Company'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {statusBadge(app.status)}
                        {app.appliedAt && (
                          <span className="text-xs text-gray-400">
                            {new Date(app.appliedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </ProfessionalLayout>
  );
}
