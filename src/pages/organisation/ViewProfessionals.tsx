import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrganisationLayout from '@/components/organisation/OrganisationLayout';
import { api } from '@/services/api';
import { 
  HiSearch, 
  HiUser, 
  HiLocationMarker, 
  HiChevronDown,
  HiEye,
  HiMail,
  HiX,
  HiCheckCircle,
  HiClock,
  HiUserCircle
} from 'react-icons/hi';
import { COUNTRIES } from '@/utils/countries';
import toast from 'react-hot-toast';

interface Professional {
  id: string;
  name: string;
  email: string;
  location: {
    city: string | null;
    country: string | null;
  };
  profession: string;
  yearsOfExperience: number;
  verificationStatus: {
    percentage: number;
    status: string;
  };
  identityStatus: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
  };
}

interface SearchFilters {
  search: string;
  jobTitle: string;
  country: string;
  city: string;
  verified: boolean | null;
  minExperience: string;
}

export default function ViewProfessionals() {
  const navigate = useNavigate();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showHireModal, setShowHireModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [hireForm, setHireForm] = useState({
    jobTitle: '',
    message: '',
  });
  const [messageForm, setMessageForm] = useState({
    subject: '',
    message: '',
    jobTitle: '',
  });
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    jobTitle: '',
    country: '',
    city: '',
    verified: null,
    minExperience: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchProfessionals();
  }, [filters, page]);

  const fetchProfessionals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (filters.search) params.append('search', filters.search);
      if (filters.jobTitle) params.append('jobTitle', filters.jobTitle);
      if (filters.country) params.append('country', filters.country);
      if (filters.city) params.append('city', filters.city);
      if (filters.verified !== null) params.append('verified', filters.verified.toString());
      if (filters.minExperience) params.append('minExperience', filters.minExperience);

      const response = await api.get(`/v1/organisation/professionals?${params.toString()}`);
      const data = response.data.data;
      setProfessionals(data.professionals || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch professionals:', err);
      setProfessionals([]);
      toast.error('Failed to load professionals');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters({ ...filters, [key]: value });
    setPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      jobTitle: '',
      country: '',
      city: '',
      verified: null,
      minExperience: '',
    });
    setPage(1);
  };

  const handleViewProfile = (professionalId: string) => {
    navigate(`/organization/professionals/${professionalId}`);
  };

  const handleScout = (professional: Professional) => {
    setSelectedProfessional(professional);
    setHireForm({ jobTitle: '', message: '' });
    setShowHireModal(true);
  };

  const handleSendMessage = (professional: Professional) => {
    setSelectedProfessional(professional);
    setMessageForm({ subject: '', message: '', jobTitle: '' });
    setShowMessageModal(true);
  };

  const handleHireSubmit = async () => {
    if (!selectedProfessional) return;

    try {
      await api.post(`/v1/organisation/professionals/${selectedProfessional.id}/hire`, {
        jobTitle: hireForm.jobTitle,
        message: hireForm.message,
      });
      toast.success('Professional hired successfully!');
      setShowHireModal(false);
      setSelectedProfessional(null);
      await fetchProfessionals();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to hire professional');
    }
  };

  const handleMessageSubmit = async () => {
    if (!selectedProfessional) return;

    if (!messageForm.message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      await api.post(`/v1/organisation/professionals/${selectedProfessional.id}/message`, {
        subject: messageForm.subject,
        message: messageForm.message,
        jobTitle: messageForm.jobTitle,
      });
      toast.success('Message sent successfully!');
      setShowMessageModal(false);
      setSelectedProfessional(null);
      setMessageForm({ subject: '', message: '', jobTitle: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    }
  };

  const getVerificationBadge = (status: { percentage: number; status: string }) => {
    const { percentage, status: statusText } = status;
    let bgColor = 'bg-gray-100 text-gray-700';
    let icon = <HiClock className="w-4 h-4" />;

    if (statusText === 'Verified with Gov ID') {
      bgColor = 'bg-green-100 text-green-700';
      icon = <HiCheckCircle className="w-4 h-4" />;
    } else if (statusText === 'Self Declared') {
      bgColor = 'bg-blue-100 text-blue-700';
      icon = <HiUserCircle className="w-4 h-4" />;
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bgColor}`}>
        {icon}
        {percentage}% - {statusText}
      </span>
    );
  };

  const getLocationDisplay = (location: { city: string | null; country: string | null }) => {
    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.country) parts.push(location.country);
    return parts.length > 0 ? parts.join(', ') : 'Not specified';
  };

  return (
    <OrganisationLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Professionals</h1>
          <p className="text-gray-600">Search and filter through all available professionals</p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col gap-4">
            {/* Main Search Bar */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <span>Filters</span>
                <HiChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'transform rotate-180' : ''}`} />
              </button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g., Ambassador, AI Engineer"
                    value={filters.jobTitle}
                    onChange={(e) => handleFilterChange('jobTitle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <div className="relative">
                    <select
                      value={filters.country}
                      onChange={(e) => handleFilterChange('country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none bg-white"
                    >
                      <option value="">All Countries</option>
                      {COUNTRIES.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                    <HiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Enter city"
                    value={filters.city}
                    onChange={(e) => handleFilterChange('city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verified Profile</label>
                  <div className="relative">
                    <select
                      value={filters.verified === null ? '' : filters.verified ? 'true' : 'false'}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleFilterChange('verified', value === '' ? null : value === 'true');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none bg-white"
                    >
                      <option value="">All</option>
                      <option value="true">Verified</option>
                      <option value="false">Not Verified</option>
                    </select>
                    <HiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Years of Experience</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g., 5"
                    value={filters.minExperience}
                    onChange={(e) => handleFilterChange('minExperience', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="mb-4 text-sm text-gray-600">
            Showing {professionals.length} professional{professionals.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Table View */}
        {loading ? (
          <div className="text-center text-gray-600 py-16">Loading professionals...</div>
        ) : professionals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-xl shadow-sm">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <HiUser className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Professionals Found</h3>
            <p className="text-sm text-gray-500 text-center max-w-md">
              {Object.values(filters).some(v => v !== '' && v !== null)
                ? 'No professionals match your search criteria. Try adjusting your filters.'
                : 'No professionals available at the moment.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profession
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Years of Experience
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Verification Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {professionals.map((prof) => (
                    <tr key={prof.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center mr-3">
                            <HiUser className="w-5 h-5 text-brand-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{prof.name}</div>
                            <div className="text-xs text-gray-500">{prof.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <HiLocationMarker className="w-4 h-4 mr-1 text-gray-400" />
                          {getLocationDisplay(prof.location)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{prof.profession}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {prof.yearsOfExperience} {prof.yearsOfExperience === 1 ? 'year' : 'years'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getVerificationBadge(prof.verificationStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewProfile(prof.id)}
                            className="px-3 py-1.5 text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                            title="View Profile"
                          >
                            <HiEye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleScout(prof)}
                            className="px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Scout (Hire)"
                          >
                            Scout
                          </button>
                          <button
                            onClick={() => handleSendMessage(prof)}
                            className="px-3 py-1.5 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1"
                            title="Send Message"
                          >
                            <HiMail className="w-4 h-4" />
                            Message
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hire Modal (Direct Scout) */}
        {showHireModal && selectedProfessional && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Direct Scout - Hire Professional</h2>
                  <button
                    onClick={() => {
                      setShowHireModal(false);
                      setSelectedProfessional(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <HiX className="w-6 h-6" />
                  </button>
                </div>
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Hiring:</p>
                  <p className="font-medium text-gray-900">{selectedProfessional.name}</p>
                  <p className="text-sm text-gray-500">{selectedProfessional.email}</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={hireForm.jobTitle}
                      onChange={(e) => setHireForm({ ...hireForm, jobTitle: e.target.value })}
                      placeholder="e.g., Ambassador, AI Engineer"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea
                      rows={4}
                      value={hireForm.message}
                      onChange={(e) => setHireForm({ ...hireForm, message: e.target.value })}
                      placeholder="Enter your hiring message (optional)..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This message will be sent to the professional along with the job title.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowHireModal(false);
                      setSelectedProfessional(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleHireSubmit}
                    disabled={!hireForm.jobTitle.trim()}
                    className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Hire Professional
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Send Message Modal */}
        {showMessageModal && selectedProfessional && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Send Message</h2>
                  <button
                    onClick={() => {
                      setShowMessageModal(false);
                      setSelectedProfessional(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <HiX className="w-6 h-6" />
                  </button>
                </div>
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">To:</p>
                  <p className="font-medium text-gray-900">{selectedProfessional.name}</p>
                  <p className="text-sm text-gray-500">{selectedProfessional.email}</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title (Optional)</label>
                    <input
                      type="text"
                      value={messageForm.jobTitle}
                      onChange={(e) => setMessageForm({ ...messageForm, jobTitle: e.target.value })}
                      placeholder="e.g., Ambassador, AI Engineer"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject (Optional)</label>
                    <input
                      type="text"
                      value={messageForm.subject}
                      onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                      placeholder="Message subject"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={6}
                      required
                      value={messageForm.message}
                      onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                      placeholder="Enter your message..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowMessageModal(false);
                      setSelectedProfessional(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMessageSubmit}
                    disabled={!messageForm.message.trim()}
                    className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Send Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </OrganisationLayout>
  );
}
