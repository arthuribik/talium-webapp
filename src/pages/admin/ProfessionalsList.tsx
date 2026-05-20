import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  HiSearch,
  HiFilter,
  HiChevronLeft,
  HiChevronRight,
  HiUser,
  HiCheckCircle,
  HiXCircle,
  HiClock,
} from 'react-icons/hi';

interface Professional {
  id: string;
  userId: string;
  country: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  identityVerified: boolean;
  identityStatus: string;
  setupCompleted: boolean;
  profileCompleteness: number;
  createdAt: string;
  updatedAt: string;
  profession?: string | null;
  yearsOfExperience?: number | null;
  city?: string | null;
  address?: unknown;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
  };
  identityVerification: {
    status: string;
  } | null;
}

export default function ProfessionalsList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchProfessionals();
  }, [page, statusFilter]);

  // Refresh when location changes (e.g., when returning from detail page)
  useEffect(() => {
    if (location.pathname === '/admin/professionals') {
      fetchProfessionals();
    }
  }, [location.pathname]);

  // Refresh when page becomes visible or focused (e.g., when returning from detail page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchProfessionals();
      }
    };
    
    const handleFocus = () => {
      fetchProfessionals();
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [page, statusFilter]);

  const fetchProfessionals = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/v1/admin/professionals?page=${page}&limit=${limit}`);
      setProfessionals(response.data.data.professionals || []);
      setTotalPages(response.data.data.pagination?.totalPages || 1);
      setTotal(response.data.data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch professionals:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfessionals = professionals.filter((prof) => {
    const matchesSearch =
      prof.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prof.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prof.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'verified' && (prof.user?.status === 'ACTIVE' || prof.user?.status === 'VERIFIED')) ||
      (statusFilter === 'pending' && prof.user?.status !== 'ACTIVE' && prof.user?.status !== 'VERIFIED');

    return matchesSearch && matchesStatus;
  });

  const handleRowClick = (professionalId: string) => {
    navigate(`/admin/professionals/${professionalId}`);
  };

  return (
    <AdminLayout>
      <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Professionals</h1>
        <p className="text-gray-600">Manage and view all professionals on the platform</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <HiFilter className="text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table or Empty State */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading...</div>
        ) : professionals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <HiUser className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Professionals Yet</h3>
            <p className="text-sm text-gray-500 text-center max-w-md mb-6">
              There are no professionals registered on the platform. They will appear here once they create an account.
            </p>
          </div>
        ) : filteredProfessionals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <HiSearch className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Found</h3>
            <p className="text-sm text-gray-500 text-center max-w-md mb-6">
              No professionals match your search criteria. Try adjusting your filters or search terms.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="text-brand-600 hover:text-brand-700 text-sm font-medium"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Professional
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nationality
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profession
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Experience
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Identity Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profile Complete
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProfessionals.map((prof) => (
                      <tr
                        key={prof.id}
                        onClick={() => handleRowClick(prof.id)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center mr-3">
                              <HiUser className="w-5 h-5 text-brand-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {prof.user.firstName} {prof.user.lastName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{prof.user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{prof.nationality ?? '—'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {[prof.city, prof.country].filter(Boolean).join(', ') || '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{prof.profession ?? '—'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {prof.yearsOfExperience != null ? `${prof.yearsOfExperience} yrs` : '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            // Use user.status from the user object
                            const userStatus = prof.user?.status || 'UNVERIFIED';
                            
                            if (userStatus === 'ACTIVE' || userStatus === 'VERIFIED') {
                              return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <HiCheckCircle className="w-4 h-4 mr-1" />
                                  {userStatus === 'VERIFIED' ? 'Verified' : 'Active'}
                                </span>
                              );
                            } else if (userStatus === 'SUSPENDED') {
                              return (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <HiXCircle className="w-4 h-4 mr-1" />
                                  Suspended
                            </span>
                              );
                            } else if (userStatus === 'PENDING_INVITATION') {
                              return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <HiClock className="w-4 h-4 mr-1" />
                                  Pending Invitation
                                </span>
                              );
                            } else {
                              // UNVERIFIED or any other status
                              return (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <HiXCircle className="w-4 h-4 mr-1" />
                                  Unverified
                            </span>
                              );
                            }
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-brand-500 h-2 rounded-full"
                                style={{ width: `${prof.profileCompleteness || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">{prof.profileCompleteness || 0}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(prof.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredProfessionals.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                <span className="font-medium">{Math.min(page * limit, total)}</span> of{' '}
                <span className="font-medium">{total}</span> results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <HiChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <HiChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
            )}
          </>
        )}
      </div>
      </div>
    </AdminLayout>
  );
}

