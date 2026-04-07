import { useState, useEffect } from 'react';
import { APP_NAME } from '@/constants/app';
import { plainTextFromHtml } from '@/seo/applySeo';
import { buildCanonicalUrl } from '@/seo/resolveRouteSeo';
import { usePageSeo } from '@/seo/usePageSeo';
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
import { FaInstagram, FaFacebook, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';
import toast from 'react-hot-toast';

interface Organization {
  id: string;
  companyName: string;
  country: string;
  industry?: string;
  description?: string;
  website?: string;
  verificationStatus: string;
  createdAt: string;
  foundedDate?: string;
  isRegistered?: boolean;
  countryOfIncorporation?: string;
  incorporationNumber?: string;
  companySize?: string;
  headquartersCity?: string;
  headquartersCountry?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
  };
  address?: {
    buildingName?: string;
    streetNumber?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
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
    phoneNumber?: string;
  };
  jobs?: Array<{
    id: string;
    jobTitle: string;
    location: string;
    status: string;
    createdAt: string;
  }>;
  jobCount?: number;
}

export default function OrganisationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOrganization();
      fetchJobs();
    }
  }, [id]);

  const fetchOrganization = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Fetch from admin endpoint
      const response = await api.get('/v1/admin/organisations?limit=1000');
      const org = response.data.data.organisations.find((o: any) => o.id === id);
      
      if (org) {
        // Parse description if it's JSON
        let descriptionText = '';
        let categoryData: any = {};
        
        if (org.description) {
          try {
            if (typeof org.description === 'string' && org.description.trim().startsWith('{')) {
              const parsed = JSON.parse(org.description);
              descriptionText = parsed.textDescription || '';
              if (parsed.category || parsed.schoolType || parsed.religiousOrgType) {
                categoryData = {
                  category: parsed.category || null,
                  schoolType: parsed.schoolType || null,
                  religiousOrgType: parsed.religiousOrgType || null,
                  internationalOrgType: parsed.internationalOrgType || null,
                  politicalPartyCountry: parsed.politicalPartyCountry || null,
                  associatedSchool: parsed.associatedSchool || null,
                };
              }
            } else {
              descriptionText = org.description;
            }
          } catch (e) {
            descriptionText = org.description;
          }
        }

        // Parse address if it's JSON
        let addressData: any = {};
        if (org.address) {
          try {
            if (typeof org.address === 'string') {
              addressData = JSON.parse(org.address);
            } else {
              addressData = org.address;
            }
          } catch (e) {
            addressData = {};
          }
        }

        // Parse social media if it's JSON
        let socialMediaData: any = {};
        if (addressData.socialMedia) {
          socialMediaData = addressData.socialMedia;
        }

        setOrganization({
          ...org,
          description: descriptionText,
          category: categoryData,
          address: addressData,
          socialMedia: socialMediaData,
          foundedDate: org.yearOfCommencement
            ? `${org.yearOfCommencement}-01-01`
            : undefined,
        });
      } else {
        setOrganization(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch organization:', err);
      if (err.response?.status === 404) {
        setOrganization(null);
      } else {
        toast.error('Failed to load organization details');
        setOrganization(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    if (!id) return;
    setJobsLoading(true);
    try {
      const response = await api.get(`/v1/jobs?organisationId=${id}`);
      if (response.data.success) {
        setJobs(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setJobsLoading(false);
    }
  };

  usePageSeo(
    !loading && organization
      ? {
          title: organization.companyName,
          description:
            plainTextFromHtml(organization.description || '') ||
            `${organization.companyName}${organization.industry ? ` — ${organization.industry}` : ''}. Verified organisation on ${APP_NAME}.`,
          canonicalUrl: buildCanonicalUrl(`/organisations/${organization.id}`, ''),
          noIndex: false,
        }
      : null,
    [loading, organization],
  );

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
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiBriefcase className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Organization not found</h2>
            <p className="text-gray-600 mb-4">The organization you're looking for doesn't exist or has been removed.</p>
            <Link
              to="/organisations"
              className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors inline-block"
            >
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

  const getLocationDisplay = () => {
    if (organization.address) {
      const parts = [];
      if (organization.address.city) parts.push(organization.address.city);
      if (organization.address.state) parts.push(organization.address.state);
      if (organization.address.country) parts.push(organization.address.country);
      if (parts.length > 0) return parts.join(', ');
    }
    return organization.country || 'Not specified';
  };

  const getFoundedYear = () => {
    if (organization.foundedDate) {
      return new Date(organization.foundedDate).getFullYear().toString();
    }
    return null;
  };

  const getProfileAge = () => {
    if (organization.createdAt) {
      const created = new Date(organization.createdAt);
      const years = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 365));
      return years;
    }
    return null;
  };

  const publishedJobs = jobs.filter((job) => job.status === 'published');

  return (
    <LandingLayout>
      <div className="min-h-screen bg-gray-50">
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
                <div className="w-24 h-24 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
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
                    <span>{getLocationDisplay()}</span>
                  </div>
                  {organization.industry && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <HiLightningBolt className="w-5 h-5" />
                      <span>{organization.industry}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side - Social Links */}
              <div className="flex flex-col items-end gap-2 text-sm">
                {organization.website && (
                  <a
                    href={organization.website.startsWith('http') ? organization.website : `https://${organization.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-600 hover:text-brand-500"
                  >
                    <HiGlobe className="w-4 h-4" />
                    <span>{organization.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
                {organization.socialMedia?.facebook && (
                  <a
                    href={organization.socialMedia.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-600 hover:text-brand-500"
                  >
                    <FaFacebook className="w-4 h-4" />
                    <span>Facebook</span>
                  </a>
                )}
                {organization.socialMedia?.twitter && (
                  <a
                    href={organization.socialMedia.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-600 hover:text-brand-500"
                  >
                    <FaTwitter className="w-4 h-4" />
                    <span>Twitter</span>
                  </a>
                )}
                {organization.socialMedia?.instagram && (
                  <a
                    href={organization.socialMedia.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-600 hover:text-brand-500"
                  >
                    <FaInstagram className="w-4 h-4" />
                    <span>Instagram</span>
                  </a>
                )}
                {organization.socialMedia?.linkedin && (
                  <a
                    href={organization.socialMedia.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-600 hover:text-brand-500"
                  >
                    <FaLinkedin className="w-4 h-4" />
                    <span>LinkedIn</span>
                  </a>
                )}
                {organization.socialMedia?.youtube && (
                  <a
                    href={organization.socialMedia.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-600 hover:text-brand-500"
                  >
                    <FaYoutube className="w-4 h-4" />
                    <span>YouTube</span>
                  </a>
                )}
                {(!organization.website && 
                  (!organization.socialMedia || 
                   (!organization.socialMedia.facebook && 
                    !organization.socialMedia.twitter && 
                    !organization.socialMedia.instagram && 
                    !organization.socialMedia.linkedin && 
                    !organization.socialMedia.youtube))) && (
                  <p className="text-gray-500 italic text-xs">No social media links available</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Company Description */}
        {organization.description && (
          <section className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <p className="text-gray-700 leading-relaxed max-w-4xl whitespace-pre-line">
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
                  <HiBriefcase className="w-6 h-6 text-brand-500" />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{publishedJobs.length}</div>
                    <div className="text-sm text-gray-600">Active Jobs</div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">Published job openings</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <HiUser className="w-6 h-6 text-brand-500" />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {organization.companySize || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">Company Size</div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">Number of employees</div>
              </div>

              {getFoundedYear() && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <HiCalendar className="w-6 h-6 text-brand-500" />
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{getFoundedYear()}</div>
                      <div className="text-sm text-gray-600">Founded</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">Year established</div>
                </div>
              )}

              {getProfileAge() !== null && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <HiDocumentText className="w-6 h-6 text-brand-500" />
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {new Date(organization.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-sm text-gray-600">
                        {getProfileAge()} {getProfileAge() === 1 ? 'year' : 'years'} ago
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">Profile Created</div>
                </div>
              )}
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
                {getFoundedYear() && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Founded</label>
                    <p className="text-lg text-gray-900 mt-1">{getFoundedYear()}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Founder & CEO</label>
                  <p className="text-lg text-gray-900 mt-1">
                    {organization.user.firstName} {organization.user.lastName}
                  </p>
                </div>
                {organization.industry && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Industry</label>
                    <p className="text-lg text-gray-900 mt-1">{organization.industry}</p>
                  </div>
                )}
                {organization.companySize && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Company Size</label>
                    <p className="text-lg text-gray-900 mt-1">{organization.companySize}</p>
                  </div>
                )}
                {organization.isRegistered !== undefined && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Registration Status</label>
                    <p className="text-lg text-gray-900 mt-1">
                      {organization.isRegistered ? 'Registered' : 'Unregistered'}
                    </p>
                  </div>
                )}
                {organization.isRegistered && organization.countryOfIncorporation && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Country of Incorporation</label>
                    <p className="text-lg text-gray-900 mt-1">{organization.countryOfIncorporation}</p>
                  </div>
                )}
                {organization.isRegistered && organization.incorporationNumber && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Incorporation Number</label>
                    <p className="text-lg text-gray-900 mt-1">{organization.incorporationNumber}</p>
                  </div>
                )}
                {organization.headquartersCity && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Headquarters</label>
                    <p className="text-lg text-gray-900 mt-1">
                      {organization.headquartersCity}
                      {organization.headquartersCountry && `, ${organization.headquartersCountry}`}
                    </p>
                  </div>
                )}
                {organization.address && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Address</label>
                    <p className="text-lg text-gray-900 mt-1">
                      {[
                        organization.address.buildingName,
                        organization.address.streetNumber,
                        organization.address.street,
                        organization.address.city,
                        organization.address.state,
                        organization.address.country,
                        organization.address.zipCode,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                )}
                {organization.category?.category && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Category</label>
                    <p className="text-lg text-gray-900 mt-1">{organization.category.category}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'jobs' && (
              <div>
                {jobsLoading ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">Loading jobs...</p>
                  </div>
                ) : publishedJobs.length > 0 ? (
                  <div className="space-y-4">
                    {publishedJobs.map((job) => (
                      <Link
                        key={job.id}
                        to={`/jobs/${job.id}`}
                        className="block bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors"
                      >
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{job.jobTitle}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <HiLocationMarker className="w-4 h-4" />
                            {job.location}
                          </span>
                          <span>
                            {new Date(job.createdAt).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <HiBriefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No job openings available at the moment</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="text-center py-12">
                <HiStar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Reviews feature coming soon</p>
              </div>
            )}

            {activeTab === 'communications' && (
              <div className="text-center py-12">
                <HiDocumentText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Communications feature coming soon</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </LandingLayout>
  );
}
