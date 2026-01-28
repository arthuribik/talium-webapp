import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '@/services/api';
import LandingLayout from '@/components/landing/LandingLayout';
import {
  HiArrowLeft,
  HiBriefcase,
  HiLocationMarker,
  HiCheckCircle,
  HiGlobe,
  HiStar,
  HiDocumentText,
  HiUser,
  HiCalendar,
  HiLightningBolt,
} from 'react-icons/hi';
import { FaInstagram, FaFacebook, FaTwitter } from 'react-icons/fa';

interface Organization {
  id: string;
  companyName: string;
  country: string;
  industry?: string;
  description?: string;
  verificationStatus: string;
  createdAt: string;
  website?: string;
  user: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

export default function OrganisationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [locationTerm, setLocationTerm] = useState('');

  useEffect(() => {
    if (id) {
      fetchOrganization();
    }
  }, [id]);

  const fetchOrganization = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v1/admin/organisations?limit=1000');
      const org = response.data.data.organisations.find((o: any) => o.id === id);
      if (org) {
        setOrganization(org);
        // Try to fetch registration data for additional details
        try {
          const regResponse = await api.get('/v1/admin/registrations?limit=1000');
          const registrations = regResponse.data.data.registrations || [];
          const matchedReg = registrations.find((reg: any) => 
            reg.step5?.organisationEmail === org.user.email ||
            reg.step2?.legalName === org.companyName ||
            reg.step7?.organisationName === org.companyName
          );
          if (matchedReg) {
            // Store registration data for use in overview
            setOrganization((prev) => ({
              ...prev!,
              registration: matchedReg,
            } as any));
          }
        } catch (regErr) {
          // Registration data is optional
        }
      }
    } catch (err) {
      console.error('Failed to fetch organization:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/organisations?search=${searchTerm}&location=${locationTerm}`);
  };

  // Mock data for metrics (since these aren't in the API)
  const metrics = {
    rating: '3.7',
    reviewedBy: 12,
    employees: 345,
    profileCreated: organization?.createdAt ? new Date(organization.createdAt) : new Date('2020-04-01'),
  };

  // Get overview details from organization and registration data
  const registration = (organization as any)?.registration;
  const foundedDate = registration?.step4?.foundedDate || registration?.step7?.foundedDate;
  const isRegistered = registration?.step1?.isRegistered;
  
  const overviewDetails = {
    founded: foundedDate ? new Date(foundedDate).getFullYear().toString() : '2019',
    founderCEO: organization?.user?.firstName + ' ' + organization?.user?.lastName || 'N/A',
    cto: 'N/A',
    coo: 'N/A',
    organizationType: organization?.industry || 'N/A',
    incorporationStatus: isRegistered ? 'Private Limited Liability' : 'Unincorporated',
  };

  if (loading) {
    return (
      <LandingLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      </LandingLayout>
    );
  }

  if (!organization) {
    return (
      <LandingLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Organization not found</h2>
            <Link to="/organisations" className="text-brand-600 hover:text-brand-700">
              Back to Organisations
            </Link>
          </div>
        </div>
      </LandingLayout>
    );
  }

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <LandingLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Search Bar Section */}
        <section className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 text-center mb-6">
              Find organisations, apply for jobs, engage with customer support, or leave reviews.
            </h1>

            <form onSubmit={handleSearch} className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <HiBriefcase className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Company"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="flex-1 relative">
                  <HiLocationMarker className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="City, State or Zip code"
                    value={locationTerm}
                    onChange={(e) => setLocationTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="flex-1 relative">
                  <HiCheckCircle className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option>Verified</option>
                    <option>All</option>
                  </select>
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

        {/* Back Button */}
        <div className="bg-brand-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => navigate('/organisations')}
              className="flex items-center text-white hover:text-gray-100 transition-colors"
            >
              <HiArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
          </div>
        </div>

        {/* Company Profile Header */}
        <section className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Left Side - Logo and Info */}
              <div className="flex items-start gap-6 flex-1">
                <div className="w-24 h-24 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-4xl">
                    {getInitial(organization.companyName)}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900">{organization.companyName}</h1>
                    {organization.verificationStatus === 'verified' && (
                      <HiCheckCircle className="w-6 h-6 text-brand-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <HiLocationMarker className="w-5 h-5" />
                    <span>{organization.country}</span>
                  </div>
                  {organization.industry && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <HiLightningBolt className="w-5 h-5" />
                      <span>{organization.industry}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side - Team Members and Social Links */}
              <div className="flex flex-col items-end gap-4">
                {/* Team Members */}
                <div className="flex items-center gap-2">
                  {[
                    'photo-1507003211169-0a1dd7228f2d',
                    'photo-1472099645785-5658abf4ff4e',
                    'photo-1494790108377-be9c29b29330',
                    'photo-1500648767791-00dcc994a43e',
                  ].map((photoId, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center border-2 border-white -ml-2 first:ml-0 overflow-hidden"
                    >
                      <img
                        src={`https://images.unsplash.com/${photoId}?w=40&h=40&fit=crop`}
                        alt="Team member"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  <button className="text-sm text-gray-600 hover:text-gray-900 ml-2">
                    Show more
                  </button>
                </div>

                {/* Social Links */}
                <div className="flex flex-col gap-2 text-sm">
                  {organization.website && (
                    <a
                      href={organization.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-600 hover:text-brand-500"
                    >
                      <HiGlobe className="w-4 h-4" />
                      <span>{organization.website.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                  <a
                    href="#"
                    className="flex items-center gap-2 text-gray-600 hover:text-brand-500"
                  >
                    <FaInstagram className="w-4 h-4" />
                    <span>@{organization.companyName.toLowerCase().replace(/\s+/g, '')}</span>
                  </a>
                  <a
                    href="#"
                    className="flex items-center gap-2 text-gray-600 hover:text-brand-500"
                  >
                    <FaFacebook className="w-4 h-4" />
                    <span>{organization.companyName}</span>
                  </a>
                  <a
                    href="#"
                    className="flex items-center gap-2 text-gray-600 hover:text-brand-500"
                  >
                    <FaTwitter className="w-4 h-4" />
                    <span>@{organization.companyName.toLowerCase().replace(/\s+/g, '')}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Company Description */}
        {organization.description && (
          <section className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <p className="text-gray-700 leading-relaxed max-w-4xl">
                {organization.description}
              </p>
            </div>
          </section>
        )}

        {/* Key Metrics Section */}
        <section className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <HiStar className="w-6 h-6 text-yellow-400" />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{metrics.rating}</div>
                    <div className="text-sm text-gray-600">out of 5</div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">Reviews</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <HiDocumentText className="w-6 h-6 text-brand-500" />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{metrics.reviewedBy}</div>
                    <div className="text-sm text-gray-600">Taldium Users</div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">Reviewed by</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <HiUser className="w-6 h-6 text-brand-500" />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{metrics.employees}</div>
                    <div className="text-sm text-gray-600">Employees</div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">No. of employees</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <HiCalendar className="w-6 h-6 text-brand-500" />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {metrics.profileCreated.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                    <div className="text-sm text-gray-600">
                      {Math.floor((Date.now() - metrics.profileCreated.getTime()) / (1000 * 60 * 60 * 24 * 365))} years ago
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">Profile Created</div>
              </div>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <section className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              {['overview', 'jobs', 'reviews', 'communications'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab
                      ? 'border-brand-500 text-brand-500'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Tab Content */}
        <section className="bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Founded</label>
                  <p className="text-lg text-gray-900 mt-1">{overviewDetails.founded}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Founder & CEO</label>
                  <p className="text-lg text-gray-900 mt-1">{overviewDetails.founderCEO}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">CTO</label>
                  <p className="text-lg text-gray-900 mt-1">{overviewDetails.cto}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">COO</label>
                  <p className="text-lg text-gray-900 mt-1">{overviewDetails.coo}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Organization Type</label>
                  <p className="text-lg text-gray-900 mt-1">{overviewDetails.organizationType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Incorporation Status</label>
                  <p className="text-lg text-gray-900 mt-1">{overviewDetails.incorporationStatus}</p>
                </div>
              </div>
            )}

            {activeTab === 'jobs' && (
              <div className="text-center py-12">
                <p className="text-gray-600">Jobs will be displayed here</p>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="text-center py-12">
                <p className="text-gray-600">Reviews will be displayed here</p>
              </div>
            )}

            {activeTab === 'communications' && (
              <div className="text-center py-12">
                <p className="text-gray-600">Communications will be displayed here</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </LandingLayout>
  );
}

