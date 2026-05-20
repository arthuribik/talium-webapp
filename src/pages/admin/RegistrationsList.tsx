import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  HiSearch,
  HiFilter,
  HiChevronLeft,
  HiChevronRight,
  HiDocumentText,
} from 'react-icons/hi';

interface Registration {
  id: string;
  step1?: {
    isRegistered: boolean;
  };
  step2?: {
    legalName: string;
    countryOfIncorporation: string;
    incorporationNumber: string;
  };
  step7?: {
    organisationName: string;
    organisationCountry: string;
    description: string;
    industry: string;
    foundedDate: string;
  };
  step5?: {
    organisationEmail: string;
  };
  currentStep: number;
  updatedAt: string;
}

export default function RegistrationsList() {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchRegistrations();
  }, [page, statusFilter]);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/v1/admin/registrations?page=${page}&limit=${limit}`);
      setRegistrations(response.data.data.registrations || []);
      setTotalPages(response.data.data.pagination?.totalPages || 1);
      setTotal(response.data.data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const getOrganisationName = (reg: Registration): string => {
    if (reg.step2?.legalName) return reg.step2.legalName;
    if (reg.step7?.organisationName) return reg.step7.organisationName;
    return 'N/A';
  };

  const getCountry = (reg: Registration): string => {
    if (reg.step2?.countryOfIncorporation) return reg.step2.countryOfIncorporation;
    if (reg.step7?.organisationCountry) return reg.step7.organisationCountry;
    return 'N/A';
  };

  const getEmail = (reg: Registration): string => {
    return reg.step5?.organisationEmail || 'N/A';
  };

  const getStatus = (reg: Registration): { label: string; color: string } => {
    if (reg.currentStep >= 6) {
      return { label: 'Completed', color: 'bg-green-100 text-green-800' };
    } else if (reg.currentStep >= 5) {
      return { label: 'Email Verified', color: 'bg-blue-100 text-blue-800' };
    } else if (reg.currentStep >= 1) {
      return { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { label: 'Started', color: 'bg-gray-100 text-gray-800' };
  };

  const isRegistered = (reg: Registration): boolean => {
    return reg.step1?.isRegistered === true;
  };

  const filteredRegistrations = registrations.filter((reg) => {
    const matchesSearch =
      getOrganisationName(reg).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCountry(reg).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getEmail(reg).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'completed' && reg.currentStep >= 6) ||
      (statusFilter === 'in-progress' && reg.currentStep < 6 && reg.currentStep >= 1) ||
      (statusFilter === 'registered' && isRegistered(reg)) ||
      (statusFilter === 'non-registered' && !isRegistered(reg));

    return matchesSearch && matchesStatus;
  });

  const handleRowClick = (regId: string) => {
    navigate(`/admin/registrations/${regId}`);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Organisation Registrations</h1>
          <p className="text-gray-600">View and manage all organisation registration submissions</p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by organisation name, country, or email..."
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
                <option value="completed">Completed</option>
                <option value="in-progress">In Progress</option>
                <option value="registered">Registered</option>
                <option value="non-registered">Non-Registered</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table or Empty State */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-600">Loading...</div>
          ) : registrations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <HiDocumentText className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Registrations Yet</h3>
              <p className="text-sm text-gray-500 text-center max-w-md mb-6">
                There are no organisation registrations submitted yet. They will appear here once organisations start the registration process.
              </p>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <HiSearch className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Found</h3>
              <p className="text-sm text-gray-500 text-center max-w-md mb-6">
                No registrations match your search criteria. Try adjusting your filters or search terms.
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
                        Organisation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Country
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Step
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRegistrations.map((reg) => {
                      const status = getStatus(reg);
                      return (
                        <tr
                          key={reg.id}
                          onClick={() => handleRowClick(reg.id)}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center mr-3">
                                <HiDocumentText className="w-5 h-5 text-brand-600" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{getOrganisationName(reg)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {isRegistered(reg) ? 'Registered' : 'Non-Registered'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{getCountry(reg)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{getEmail(reg)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">Step {reg.currentStep || 1}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {reg.updatedAt ? new Date(reg.updatedAt).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(page * limit, total)}</span> of{' '}
                        <span className="font-medium">{total}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setPage(Math.max(1, page - 1))}
                          disabled={page === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <HiChevronLeft className="h-5 w-5" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              pageNum === page
                                ? 'z-10 bg-brand-50 border-brand-500 text-brand-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))}
                        <button
                          onClick={() => setPage(Math.min(totalPages, page + 1))}
                          disabled={page === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <HiChevronRight className="h-5 w-5" />
                        </button>
                      </nav>
                    </div>
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

