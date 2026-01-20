import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import type { RootState } from '@/store/store';
import {
  HiHome,
  HiUser,
  HiOfficeBuilding,
  HiBriefcase,
  HiCurrencyDollar,
  HiCog,
  HiSearch,
  HiBell,
  HiQuestionMarkCircle,
  HiChevronLeft,
  HiChevronRight,
} from 'react-icons/hi';
import { MdPerson } from 'react-icons/md';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: HiHome },
    { path: '/admin/professionals', label: 'Professionals', icon: HiUser },
    { path: '/admin/organizations', label: 'Organizations', icon: HiOfficeBuilding },
    { path: '/admin/jobs', label: 'Jobs', icon: HiBriefcase },
    { path: '/admin/transactions', label: 'Transactions', icon: HiCurrencyDollar },
    { path: '/admin/settings', label: 'Settings', icon: HiCog },
  ];

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
        {/* Branding */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-teal-500 rounded flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-sm"></div>
            </div>
            {sidebarOpen && (
              <h1 className="text-lg font-bold text-gray-800">Taldium Admin</h1>
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
                    ? 'bg-teal-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <IconComponent className="w-5 h-5 mr-3" />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Help Section */}
        {/* <div className="p-4 border-t border-gray-200">
          <div className="bg-teal-50 rounded-lg p-4 mb-4">
            <HiQuestionMarkCircle className="w-6 h-6 text-teal-600 mb-2" />
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
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type here..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <HiSearch className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{user?.email || 'Admin'}</span>
              <button className="text-gray-600 hover:text-gray-900">
                <MdPerson className="w-5 h-5" />
              </button>
              <button className="text-gray-600 hover:text-gray-900">
                <HiCog className="w-5 h-5" />
              </button>
              <button className="text-gray-600 hover:text-gray-900">
                <HiBell className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}

