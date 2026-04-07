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
} from 'react-icons/hi';
import { MdPerson } from 'react-icons/md';
import logoWhite from '@/assets/logo-white.svg';
import { useLogoutCountdown } from '@/hooks/useLogoutCountdown';
import { userTypeTitle } from '@/utils/userTypeLabel';
import { LogoutCountdownModal } from '@/components/common/LogoutCountdownModal';

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
            const IconComponent = item.icon;
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
                <IconComponent className={`w-[18px] h-[18px] shrink-0 ${sidebarOpen ? 'mr-3' : ''}`} />
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
                  {(user?.firstName || 'O').charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-gray-700">
                    {user?.firstName || 'Organisation'} {user?.lastName || ''}
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

