import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import type { RootState } from '@/store/store';
import { logout } from '@/store/authSlice';
import {
  HiHome,
  HiUser,
  HiOfficeBuilding,
  HiBriefcase,
  HiCurrencyDollar,
  HiCreditCard,
  HiCog,
  HiUsers,
  HiSearch,
  HiChevronLeft,
  HiChevronRight,
  HiChevronDown,
  HiLogout,
} from 'react-icons/hi';
import { MdPerson } from 'react-icons/md';
import logo from '@/assets/logo.svg';
import { useLogoutCountdown } from '@/hooks/useLogoutCountdown';
import { LogoutCountdownModal } from '@/components/common/LogoutCountdownModal';
import { userTypeTitle } from '@/utils/userTypeLabel';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: HiHome },
    { path: '/admin/team', label: 'Team', icon: HiUsers },
    { path: '/admin/professionals', label: 'Professionals', icon: HiUser },
    { path: '/admin/organizations', label: 'Organizations', icon: HiOfficeBuilding },
    { path: '/admin/jobs', label: 'Jobs', icon: HiBriefcase },
    { path: '/admin/transactions', label: 'Transactions', icon: HiCurrencyDollar },
    { path: '/admin/billing', label: 'Billing', icon: HiCreditCard },
    { path: '/admin/settings', label: 'Settings', icon: HiCog },
  ];

  const isActive = (path: string) => {
    // For exact match paths like '/admin', only match exactly
    if (path === '/admin') {
      return location.pathname === path;
    }
    // For other paths, match exact or starts with path + '/'
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const performLogout = () => {
    dispatch(logout());
    navigate('/admin/login');
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
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} fixed left-0 top-0 h-screen bg-white shadow-lg transition-all duration-300 flex flex-col z-10`}>
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
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sidebarOpen && (
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
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
                className={`w-full flex items-center px-4 py-2.5 rounded-lg transition-colors text-sm ${
                  active
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <IconComponent className="w-4 h-4 shrink-0 mr-3" />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Help Section */}
        {/* <div className="p-4 border-t border-gray-200">
          <div className="bg-brand-50 rounded-lg p-4 mb-4">
            <HiQuestionMarkCircle className="w-6 h-6 text-brand-600 mb-2" />
            {sidebarOpen && (
              <>
                <p className="text-sm text-gray-700 mb-1">Need help?</p>
                <p className="text-xs text-gray-600">Please check our docs</p>
              </>
            )}
          </div>
          {sidebarOpen && (
            <button className="w-full bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
              DOCUMENTATION
            </button>
          )}
        </div> */}
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
                  {(user?.firstName || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-gray-700">
                    {user?.firstName || 'Admin'} {user?.lastName || ''}
                  </span>
                  <span className="text-xs text-gray-500">{userTypeTitle(user?.userType)}</span>
                </div>
                <HiChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/admin/settings?tab=general');
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

      <LogoutCountdownModal
        open={showLogoutModal && logoutCountdown !== null}
        formattedTime={logoutCountdown !== null ? formatLogoutTime(logoutCountdown) : ''}
        onDismiss={() => {
          cancelLogoutCountdown();
          setShowLogoutModal(false);
        }}
        onLogoutNow={performLogout}
      />
    </div>
  );
}

