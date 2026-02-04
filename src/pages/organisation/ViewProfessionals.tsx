import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrganisationLayout from '@/components/organisation/OrganisationLayout';
import { api } from '@/services/api';
import { HiSearch, HiUser, HiLocationMarker, HiPlus, HiChevronDown } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function ViewProfessionals() {
  const navigate = useNavigate();
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  useEffect(() => {
    fetchProfessionals();
  }, []);

  const fetchProfessionals = async () => {
    setLoading(true);
    try {
      // Fetch all professionals (public endpoint)
      const response = await api.get('/v1/admin/professionals?limit=1000');
      const allProfessionals = response.data.data.professionals || [];
      
      // Filter to only show approved professionals (ACTIVE or VERIFIED status)
      const approvedProfessionals = allProfessionals.filter((prof: any) => {
        const userStatus = prof.user?.status;
        return userStatus === 'ACTIVE' || userStatus === 'VERIFIED';
      });
      
      setProfessionals(approvedProfessionals);
    } catch (err) {
      console.error('Failed to fetch professionals:', err);
      setProfessionals([]);
      toast.error('Failed to load professionals');
    } finally {
      setLoading(false);
    }
  };

  const handleHireProfessional = async (professionalId: string) => {
    try {
      await api.post(`/v1/organisations/professionals/${professionalId}/hire`);
      toast.success('Professional hired successfully!');
      // Refresh the list to update any status changes
      await fetchProfessionals();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to hire professional');
    }
  };

  const handleViewProfile = (professionalId: string) => {
    navigate(`/organization/professionals/${professionalId}`);
  };

  // Filter professionals based on search term and location
  const filteredProfessionals = professionals.filter((prof) => {
    const fullName = `${prof.user?.firstName || ''} ${prof.user?.lastName || ''}`.toLowerCase();
    const email = prof.user?.email?.toLowerCase() || '';
    const matchesSearch = !searchTerm || 
      fullName.includes(searchTerm.toLowerCase()) ||
      email.includes(searchTerm.toLowerCase());
    
    const matchesLocation = !selectedLocation || 
      prof.country?.toLowerCase() === selectedLocation.toLowerCase() ||
      prof.nationality?.toLowerCase() === selectedLocation.toLowerCase();
    
    return matchesSearch && matchesLocation;
  });

  // Get unique countries from professionals for location dropdown
  const uniqueCountries = Array.from(
    new Set(
      professionals
        .map((prof) => [prof.country, prof.nationality])
        .flat()
        .filter(Boolean)
    )
  ).sort();

  return (
    <OrganisationLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">View Professionals</h1>
          <p className="text-gray-600">Search and filter through all available professionals</p>
        </div>

        {/* Search and Filter Section */}
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
            <div className="relative md:w-64">
              <HiLocationMarker className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none bg-white"
              >
                <option value="">All Locations</option>
                {uniqueCountries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              <HiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredProfessionals.length} of {professionals.length} professionals
            {(searchTerm || selectedLocation) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedLocation('');
                }}
                className="ml-2 text-brand-600 hover:text-brand-700 underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-600 py-16">Loading professionals...</div>
        ) : filteredProfessionals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-xl shadow-sm">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <HiUser className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Professionals Found</h3>
            <p className="text-sm text-gray-500 text-center max-w-md">
              {searchTerm || selectedLocation 
                ? 'No professionals match your search criteria. Try adjusting your filters.' 
                : 'No professionals available at the moment.'}
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
                    {prof.country && (
                      <p className="text-sm text-gray-500 flex items-center">
                        <HiLocationMarker className="w-4 h-4 mr-1" />
                        {prof.country}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center">
                    <span className="text-gray-500">Profile Completeness: </span>
                    <span className="ml-2 font-medium">{prof.profileCompleteness || 0}%</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewProfile(prof.id)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    View Profile
                  </button>
                  <button
                    onClick={() => handleHireProfessional(prof.id)}
                    className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors text-sm flex items-center justify-center"
                  >
                    <HiPlus className="w-4 h-4 mr-1" />
                    Hire
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </OrganisationLayout>
  );
}
