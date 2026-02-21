import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import type { RootState } from '@/store/store';
import { logout } from '@/store/authSlice';
import {
  HiHome,
  HiUser,
  HiUserGroup,
  HiBriefcase,
  HiCog,
  HiCreditCard,
  HiSearch,
  HiChevronLeft,
  HiChevronRight,
  HiChevronDown,
  HiLogout,
  HiX,
} from 'react-icons/hi';
import { MdPerson } from 'react-icons/md';
import logo from '@/assets/logo.svg';
import { useLogoutCountdown } from '@/hooks/useLogoutCountdown';

interface OrganisationLayoutProps {
  children: React.ReactNode;
}

export default function OrganisationLayout({ children }: OrganisationLayoutProps) {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { path: '/organization', label: 'Dashboard', icon: HiHome },
    { path: '/organization/professionals', label: 'Professionals', icon: HiUser },
    { path: '/organization/jobs', label: 'Jobs', icon: HiBriefcase },
    { path: '/organization/team', label: 'Team', icon: HiUserGroup },
    { path: '/organization/billing', label: 'Billings', icon: HiCreditCard },
    { path: '/organization/settings', label: 'Settings', icon: HiCog },
  ];

  const isActive = (path: string) => {
    if (path === '/organization') {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const performLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const {
    timeRemaining: logoutCountdown,
    isActive: isLogoutCountdownActive,
    startCountdown: startLogoutCountdown,
    cancelCountdown: cancelLogoutCountdown,
    formatTime: formatLogoutTime,
  } = useLogoutCountdown({
    countdownDuration: 5000, // 5 seconds
    onComplete: performLogout,
  });

  // Show manual logout modal when countdown starts
  useEffect(() => {
    if (isLogoutCountdownActive && logoutCountdown !== null) {
      setShowLogoutModal(true);
    } else {
      setShowLogoutModal(false);
    }
  }, [isLogoutCountdownActive, logoutCountdown]);

  const handleLogoutClick = () => {
    setDropdownOpen(false);
    startLogoutCountdown();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar - Fixed */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} fixed left-0 top-0 h-screen bg-white shadow-lg transition-all duration-300 flex flex-col z-10 overflow-y-auto`}>
        {/* Branding */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {sidebarOpen ? (
              <img src={logo} alt="Taldium" className="h-8" />
            ) : (
              <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-sm"></div>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-600 hover:text-gray-900"
          >
            {sidebarOpen ? <HiChevronLeft className="w-5 h-5" /> : <HiChevronRight className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {sidebarOpen && (
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-3">
              Main Menu
            </div>
          )}
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <IconComponent className="w-5 h-5 mr-3" />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type here..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <HiSearch className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-white font-medium">
                  {(user?.firstName || 'O').charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-gray-700">
                    {user?.firstName || 'Organisation'} {user?.lastName || ''}
                  </span>
                  <span className="text-xs text-gray-500">{user?.email || 'org@taldium.com'}</span>
                </div>
                <HiChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/organization/settings?tab=profile');
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <MdPerson className="w-4 h-4 mr-3" />
                    Profile
                  </button>
                  <button
                    onClick={handleLogoutClick}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <HiLogout className="w-4 h-4 mr-3" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>

      {/* Manual Logout Countdown Modal */}
      {showLogoutModal && logoutCountdown !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                cancelLogoutCountdown();
                setShowLogoutModal(false);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <HiX className="w-6 h-6" />
            </button>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HiLogout className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Logging Out
              </h3>
              <p className="text-gray-600 mb-4">
                You will be logged out in:
              </p>
              <div className="text-4xl font-bold text-red-600 mb-6">
                {formatLogoutTime(logoutCountdown)}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    cancelLogoutCountdown();
                    setShowLogoutModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={performLogout}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Logout Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

