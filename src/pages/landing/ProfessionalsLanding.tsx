import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import LandingLayout from '@/components/landing/LandingLayout';
import { HiUser, HiLocationMarker, HiStar, HiCheckCircle } from 'react-icons/hi';

interface Professional {
  id: string;
  country?: string;
  nationality?: string;
  identityStatus: string;
  profileCompleteness: number;
  createdAt: string;
  profileImage?: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  identityVerification?: {
    status: string;
  } | null;
}

export default function ProfessionalsLanding() {
  const navigate = useNavigate();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationTerm, setLocationTerm] = useState('');
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProfessionals();
  }, []);

  const fetchProfessionals = async () => {
    setLoading(true);
    try {
      // Try to fetch from admin endpoint (may require auth)
      const response = await api.get('/v1/admin/professionals?limit=100');
      setProfessionals(response.data.data.professionals || []);
    } catch (err: any) {
      // If unauthorized or error, show empty state
      console.error('Failed to fetch professionals:', err);
      setProfessionals([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfessionals = professionals.filter((prof) => {
    const fullName = `${prof.user.firstName} ${prof.user.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
      prof.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = !locationTerm || 
      (prof.country?.toLowerCase().includes(locationTerm.toLowerCase()) || false) ||
      (prof.nationality?.toLowerCase().includes(locationTerm.toLowerCase()) || false);
    return matchesSearch && matchesLocation;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by filteredProfessionals
  };

  // Mock data for ratings and reviews (since these aren't in the API response)
  const getRating = () => {
    // In a real app, this would come from the API
    return (Math.random() * 2 + 3).toFixed(1); // Random between 3.0 and 5.0
  };

  const getReviewCount = () => {
    // In a real app, this would come from the API
    return Math.floor(Math.random() * 50) + 10;
  };

  return (
    <LandingLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <section className="bg-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 text-center mb-8">
              Find professionals, hire talent, connect with verified experts, or leave reviews.
            </h1>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <HiUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search for professional"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="flex-1 relative">
                  <HiLocationMarker className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Location"
                    value={locationTerm}
                    onChange={(e) => setLocationTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-8 py-3 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors whitespace-nowrap"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Professionals Grid */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="text-center py-16">
                <div className="text-gray-600">Loading professionals...</div>
              </div>
            ) : filteredProfessionals.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HiUser className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No professionals found</h3>
                <p className="text-gray-600 mb-4">
                  {professionals.length === 0
                    ? 'There are no professionals available at the moment.'
                    : 'No professionals match your search criteria.'}
                </p>
                {searchTerm || locationTerm ? (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setLocationTerm('');
                    }}
                    className="text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProfessionals.map((prof) => (
                  <div
                    key={prof.id}
                    onClick={() => navigate(`/professionals/${prof.id}`)}
                    className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  >
                    {/* Profile Picture and Name */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-brand-100 flex items-center justify-center">
                        {prof.profileImage && !imageErrors.has(prof.id) ? (
                          <img
                            src={prof.profileImage}
                            alt={`${prof.user.firstName} ${prof.user.lastName}`}
                            className="w-full h-full object-cover"
                            onError={() => {
                              setImageErrors((prev) => new Set(prev).add(prof.id));
                            }}
                          />
                        ) : (
                          <HiUser className="w-8 h-8 text-brand-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900 truncate">
                            {prof.user.firstName} {prof.user.lastName}
                          </h3>
                          {prof.identityStatus === 'verified' && (
                            <HiCheckCircle className="w-5 h-5 text-brand-500 flex-shrink-0" />
                          )}
                        </div>
                        {prof.country && (
                          <p className="text-sm text-gray-600 truncate">{prof.country}</p>
                        )}
                      </div>
                    </div>

                    {/* Description/Bio */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      Verified professional with {prof.profileCompleteness}% profile completeness. 
                      {prof.identityStatus === 'verified' && ' Identity verified and ready to connect.'}
                    </p>

                    {/* Footer Info */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="capitalize">{prof.identityStatus || 'Pending'}</span>
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <HiStar className="w-4 h-4 text-yellow-400 mr-1" />
                        <span>{getRating()} Ratings | {getReviewCount()} reviews</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </LandingLayout>
  );
}


