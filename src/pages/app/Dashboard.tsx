import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/authSlice';
import logo from '@/assets/logo.svg';
import { HiCheckCircle, HiArrowRight, HiLogout } from 'react-icons/hi';

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const getSetupRoute = () => {
    if (user?.userType === 'PROFESSIONAL') {
      return '/professional/setup';
    } else if (user?.userType === 'ORGANISATION') {
      return '/organisation/setup';
    }
    return '/';
  };

  const getSetupText = () => {
    if (user?.userType === 'PROFESSIONAL') {
      return {
        title: 'Complete Your Professional Profile',
        description: 'Finish setting up your professional profile to unlock all features and connect with opportunities. Complete your identity verification, add your education, and showcase your work experience.',
        cta: 'Complete Profile Setup',
      };
    } else if (user?.userType === 'ORGANISATION') {
      return {
        title: 'Complete Your Organisation Setup',
        description: 'Finish setting up your organisation profile to start posting jobs, managing applications, and connecting with top talent. Complete your company information and verification.',
        cta: 'Complete Organisation Setup',
      };
    }
    return {
      title: 'Get Started',
      description: 'Complete your setup to get started.',
      cta: 'Get Started',
    };
  };

  const setupInfo = getSetupText();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <img src={logo} alt="Taldium" className="h-8" />
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <HiLogout className="w-4 h-4" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Welcome back, {user?.firstName || 'there'}!
          </h1>
          <p className="text-lg text-gray-600">
            {user?.userType === 'PROFESSIONAL'
              ? 'Your professional dashboard'
              : user?.userType === 'ORGANISATION'
              ? 'Your organisation dashboard'
              : 'Your dashboard'}
          </p>
        </div>

        {/* Setup Completion Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center">
                  <HiCheckCircle className="w-8 h-8 text-brand-500" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{setupInfo.title}</h2>
                <p className="text-gray-600 leading-relaxed mb-6">{setupInfo.description}</p>
                  <button
                  onClick={() => navigate(getSetupRoute())}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors shadow-sm"
                  >
                  {setupInfo.cta}
                  <HiArrowRight className="w-5 h-5" />
                  </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {user?.userType === 'PROFESSIONAL' && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/app/jobs')}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Browse Jobs</h3>
                <p className="text-sm text-gray-600 mb-4">Explore available job opportunities</p>
                <div className="flex items-center text-brand-600 font-medium text-sm">
                  View Jobs
                  <HiArrowRight className="w-4 h-4 ml-2" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/professional/setup')}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">My Profile</h3>
                <p className="text-sm text-gray-600 mb-4">View and edit your professional profile</p>
                <div className="flex items-center text-brand-600 font-medium text-sm">
                  Go to Profile
                  <HiArrowRight className="w-4 h-4 ml-2" />
                </div>
              </div>
            </>
              )}

              {user?.userType === 'ORGANISATION' && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/jobs/create')}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Post a Job</h3>
                <p className="text-sm text-gray-600 mb-4">Create and publish a new job opening</p>
                <div className="flex items-center text-brand-600 font-medium text-sm">
                  Create Job
                  <HiArrowRight className="w-4 h-4 ml-2" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/app/jobs')}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">View Jobs</h3>
                <p className="text-sm text-gray-600 mb-4">Manage your posted job listings</p>
                <div className="flex items-center text-brand-600 font-medium text-sm">
                  View All Jobs
                  <HiArrowRight className="w-4 h-4 ml-2" />
                </div>
              </div>
            </>
              )}

              {user?.userType === 'ADMIN' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin')}>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin Dashboard</h3>
              <p className="text-sm text-gray-600 mb-4">Access the admin control panel</p>
              <div className="flex items-center text-brand-600 font-medium text-sm">
                Go to Admin
                <HiArrowRight className="w-4 h-4 ml-2" />
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

