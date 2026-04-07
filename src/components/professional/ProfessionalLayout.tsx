import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import type { RootState } from '@/store/store';
import { logout } from '@/store/authSlice';
import {
  HiHome,
  HiCog,
  HiSearch,
  HiChevronLeft,
  HiChevronRight,
  HiChevronDown,
  HiLogout,
  HiDocumentText,
  HiShieldCheck,
  HiBriefcase,
  HiX,
  HiClock,
} from 'react-icons/hi';
import { MdPerson } from 'react-icons/md';
import logoWhite from '@/assets/logo-white.svg';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';
import { useLogoutCountdown } from '@/hooks/useLogoutCountdown';
import { userTypeTitle } from '@/utils/userTypeLabel';
import { LogoutCountdownModal } from '@/components/common/LogoutCountdownModal';

interface ProfessionalLayoutProps {
  children: React.ReactNode;
}

export default function ProfessionalLayout({ children }: ProfessionalLayoutProps) {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showManualLogoutModal, setShowManualLogoutModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const performLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const { timeRemaining, formatTime, resetTimer } = useInactivityTimer({
    timeout: 5 * 60 * 1000, // 5 minutes
    onTimeout: () => {
      performLogout();
    },
    enabled: !!user,
  });

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

  // Show inactivity modal when countdown starts
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0) {
      setShowLogoutModal(true);
    } else if (timeRemaining === 0) {
      setShowLogoutModal(false);
    }
  }, [timeRemaining]);

  // Show manual logout modal when countdown starts
  useEffect(() => {
    if (isLogoutCountdownActive && logoutCountdown !== null) {
      setShowManualLogoutModal(true);
    } else {
      setShowManualLogoutModal(false);
    }
  }, [isLogoutCountdownActive, logoutCountdown]);

  const handleLogoutClick = () => {
    setDropdownOpen(false);
    startLogoutCountdown();
  };

  const navItems = [
    { path: '/professional', label: 'Dashboard', icon: HiHome },
    { path: '/professional/jobs', label: 'Jobs', icon: HiBriefcase },
    { path: '/professional/shared-data', label: 'Shared Data History', icon: HiDocumentText },
    { path: '/professional/verification', label: 'Verification Center', icon: HiShieldCheck },
    { path: '/professional/settings', label: 'Settings', icon: HiCog },
    { path: '/professional/profile', label: 'Profile', icon: MdPerson },
  ];

  const isActive = (path: string) => {
    if (path === '/professional') {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
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
      <div
        className={`${sidebarOpen ? 'w-64' : 'w-20'} fixed left-0 top-0 h-screen bg-[#0c192c] shadow-lg shadow-black/20 transition-all duration-300 flex flex-col z-10 overflow-y-auto`}
      >
        {/* Branding */}
        <div className={`flex items-center ${sidebarOpen ? 'justify-between px-5 py-5' : 'flex-col gap-3 px-3 py-4'}`}>
          <div className={`flex items-center min-w-0 ${sidebarOpen ? 'gap-3' : 'justify-center w-full'}`}>
            {sidebarOpen ? (
              <img src={logoWhite} alt="Taldium" className="h-8 w-auto max-w-[140px] object-left object-contain" />
            ) : (
              <img
                src={logoWhite}
                alt=""
                className="h-9 w-9 shrink-0 object-cover object-left rounded-full"
                aria-hidden
              />
            )}
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="shrink-0 rounded-lg p-1.5 text-[#94a3b8] transition-colors hover:bg-white/5 hover:text-white"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <HiChevronLeft className="w-5 h-5" /> : <HiChevronRight className="w-5 h-5" />}
          </button>
        </div>

        <div className="mx-4 border-t border-white/10" />

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {sidebarOpen && (
            <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-3 px-3">
              Main Menu
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  active
                    ? 'bg-[#1e2d44] text-brand-300'
                    : 'text-[#94a3b8] hover:bg-white/[0.06] hover:text-[#cbd5e1]'
                } ${sidebarOpen ? '' : 'justify-center'}`}
              >
                <Icon className={`w-[18px] h-[18px] shrink-0 ${sidebarOpen ? 'mr-3' : ''}`} />
                {sidebarOpen && <span className="font-medium truncate text-left">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="mx-4 border-t border-white/10" />

        <div className="p-4">
          <button
            type="button"
            onClick={handleLogoutClick}
            className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm text-[#94a3b8] transition-colors hover:bg-white/[0.06] hover:text-[#cbd5e1] ${sidebarOpen ? '' : 'justify-center'}`}
          >
            <HiLogout className={`w-[18px] h-[18px] shrink-0 ${sidebarOpen ? 'mr-3' : ''}`} />
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-2">
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
                  {(user?.firstName || 'P').charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-gray-700">
                    {user?.firstName || 'Professional'} {user?.lastName || ''}
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
                      navigate('/professional/profile');
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <MdPerson className="w-4 h-4 mr-3" />
                    My Profile
                  </button>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/professional/settings');
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <HiCog className="w-4 h-4 mr-3" />
                    Settings
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

      {/* Logout Countdown Modal */}
      {showLogoutModal && timeRemaining !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setShowLogoutModal(false);
                resetTimer();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <HiX className="w-6 h-6" />
            </button>
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HiClock className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Session Timeout Warning
              </h3>
              <p className="text-gray-600 mb-4">
                You've been inactive for a while. You will be logged out in:
              </p>
              <div className="text-4xl font-bold text-brand-600 mb-6">
                {formatTime(timeRemaining)}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowLogoutModal(false);
                    resetTimer();
                  }}
                  className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors"
                >
                  Stay Logged In
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

      <LogoutCountdownModal
        open={showManualLogoutModal && logoutCountdown !== null}
        formattedTime={logoutCountdown !== null ? formatLogoutTime(logoutCountdown) : ''}
        onDismiss={() => {
          cancelLogoutCountdown();
          setShowManualLogoutModal(false);
        }}
        onLogoutNow={performLogout}
      />
    </div>
  );
}

