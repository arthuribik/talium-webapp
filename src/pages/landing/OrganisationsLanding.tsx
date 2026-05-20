import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import LandingLayout from '@/components/landing/LandingLayout';
import { HiBriefcase, HiLocationMarker, HiStar, HiChevronDown } from 'react-icons/hi';
import { COUNTRIES } from '@/utils/countries';

interface Organization {
  id: string;
  companyName: string;
  country: string;
  description?: string;
  industry?: string;
  verificationStatus: string;
  createdAt: string;
  jobCount?: number;
  category?: {
    category?: string;
    schoolType?: string;
    religiousOrgType?: string;
    internationalOrgType?: string;
    politicalPartyCountry?: string;
    associatedSchool?: string;
  };
  user: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

export default function OrganisationsLanding() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      // Try to fetch from admin endpoint (may require auth)
      const response = await api.get('/v1/admin/organisations?limit=100');
      setOrganizations(response.data.data.organisations || []);
    } catch (err: any) {
      // If unauthorized or error, show empty state
      console.error('Failed to fetch organizations:', err);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrganizations = organizations.filter((org) => {
    const matchesSearch = org.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (org.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesLocation = !selectedCountry || org.country.toLowerCase() === selectedCountry.toLowerCase();
    return matchesSearch && matchesLocation;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by filteredOrganizations
  };

  // Mock data for ratings (since these aren't in the API response yet)
  const getRating = (orgId: string) => {
    // Use org ID to generate consistent rating
    const hash = orgId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return ((hash % 20) / 10 + 3).toFixed(1); // Between 3.0 and 5.0
  };

  const getReviewCount = (orgId: string) => {
    // Use org ID to generate consistent review count
    const hash = orgId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hash % 50) + 10; // Between 10 and 60
  };


  return (
    <LandingLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <section className="bg-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 text-center mb-8">
              Find organisations, apply for jobs, engage with customer support, or leave reviews.
            </h1>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <HiBriefcase className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search for organization"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="flex-1 relative">
                  <HiLocationMarker className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full pl-12 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none bg-white"
                  >
                    <option value="">All Locations</option>
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                  <HiChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
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

        {/* Organizations Grid */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="text-center py-16">
                <div className="text-gray-600">Loading organisations...</div>
              </div>
            ) : filteredOrganizations.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HiBriefcase className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No organisations found</h3>
                <p className="text-gray-600 mb-4">
                  {organizations.length === 0
                    ? 'There are no organisations available at the moment.'
                    : 'No organisations match your search criteria.'}
                </p>
                {searchTerm || selectedCountry ? (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCountry('');
                    }}
                    className="text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOrganizations.map((org) => (
                  <div
                    key={org.id}
                    onClick={() => navigate(`/organisations/${org.id}`)}
                    className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  >
                    {/* Logo and Name */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-lg">
                          {org.companyName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{org.companyName}</h3>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {org.description ||
                        'We are a company that builds innovative products to help businesses establish relationships and grow.'}
                    </p>

                    {/* Footer Info */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center text-sm text-gray-600">
                        <span>{org.jobCount || 0} job{org.jobCount !== 1 ? 's' : ''} opening</span>
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <HiStar className="w-4 h-4 text-yellow-400 mr-1" />
                        <span>{getRating(org.id)} Ratings | {getReviewCount(org.id)} reviews</span>
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
