import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrganisationLayout from '@/components/organisation/OrganisationLayout';
import { api } from '@/services/api';
import { useAppSelector } from '@/store/hooks';
import { HiSearch, HiUser, HiLocationMarker, HiPlus } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function ViewProfessionals() {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [hiredProfessionals, setHiredProfessionals] = useState<any[]>([]);
  const [availableProfessionals, setAvailableProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationTerm, setLocationTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'hired' | 'search'>('hired');

  useEffect(() => {
    fetchHiredProfessionals();
  }, [user]);

  const fetchHiredProfessionals = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v1/organisation/professionals');
      setHiredProfessionals(response.data.data?.professionals || []);
    } catch (err) {
      console.error('Failed to fetch hired professionals:', err);
      setHiredProfessionals([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableProfessionals = async () => {
    setLoading(true);
    try {
      // Search for available professionals (public endpoint)
      const response = await api.get('/v1/admin/professionals?limit=1000');
      const allProfessionals = response.data.data.professionals || [];
      
      // Filter out already hired professionals
      const hiredIds = new Set(hiredProfessionals.map(p => p.id));
      const available = allProfessionals.filter((p: any) => !hiredIds.has(p.id));
      
      setAvailableProfessionals(available);
    } catch (err) {
      console.error('Failed to fetch available professionals:', err);
      setAvailableProfessionals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleHireProfessional = async (professionalId: string) => {
    try {
      await api.post(`/v1/organisations/professionals/${professionalId}/hire`);
      toast.success('Professional hired successfully!');
      await fetchHiredProfessionals();
      // Also refresh available professionals list
      await fetchAvailableProfessionals();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to hire professional');
    }
  };

  useEffect(() => {
    if (activeTab === 'search' && availableProfessionals.length === 0 && !loading) {
      fetchAvailableProfessionals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const currentProfessionals = activeTab === 'hired' ? hiredProfessionals : availableProfessionals;

  const filteredProfessionals = currentProfessionals.filter((prof) => {
    const fullName = `${prof.user?.firstName || ''} ${prof.user?.lastName || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
      prof.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = !locationTerm || 
      prof.country?.toLowerCase().includes(locationTerm.toLowerCase()) ||
      prof.nationality?.toLowerCase().includes(locationTerm.toLowerCase());
    return matchesSearch && matchesLocation;
  });

  return (
    <OrganisationLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">View Professionals</h1>
          <p className="text-gray-600">View hired professionals and search for new ones</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-1 mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('hired')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'hired'
                ? 'bg-brand-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Hired Professionals
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'search'
                ? 'bg-brand-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Search & Hire
          </button>
        </div>

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
            <div className="relative">
              <HiLocationMarker className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Location..."
                value={locationTerm}
                onChange={(e) => setLocationTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-600 py-16">Loading professionals...</div>
        ) : filteredProfessionals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-xl shadow-sm">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <HiUser className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === 'hired' ? 'No Hired Professionals' : 'No Professionals Found'}
            </h3>
            <p className="text-sm text-gray-500 text-center max-w-md">
              {activeTab === 'hired' 
                ? 'You haven\'t hired any professionals yet. Use the "Search & Hire" tab to find and hire professionals.'
                : searchTerm || locationTerm 
                  ? 'No professionals match your search criteria.' 
                  : 'No professionals available.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfessionals.map((prof) => (
              <div
                key={prof.id}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mr-4">
                    <HiUser className="w-6 h-6 text-brand-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {prof.user?.firstName} {prof.user?.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{prof.user?.email}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  {prof.country && (
                    <div className="flex items-center text-gray-600">
                      <HiLocationMarker className="w-4 h-4 mr-2" />
                      {prof.country}
                    </div>
                  )}
                  <div className="flex items-center">
                    <span className="text-gray-500">Profile Completeness: </span>
                    <span className="ml-2 font-medium">{prof.profileCompleteness || 0}%</span>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      prof.identityStatus === 'verified' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {prof.identityStatus === 'verified' ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/professionals/${prof.id}`)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    View Profile
                  </button>
                  {activeTab === 'search' && (
                    <button
                      onClick={() => handleHireProfessional(prof.id)}
                      className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors text-sm flex items-center justify-center"
                    >
                      <HiPlus className="w-4 h-4 mr-1" />
                      Hire
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </OrganisationLayout>
  );
}

