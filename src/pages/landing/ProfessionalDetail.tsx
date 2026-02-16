import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/services/api';
import LandingLayout from '@/components/landing/LandingLayout';
import { HiArrowLeft, HiCheckCircle, HiUser, HiLocationMarker } from 'react-icons/hi';
import { FaFacebook, FaTwitter, FaLinkedin, FaInstagram, FaYoutube } from 'react-icons/fa';
import toast from 'react-hot-toast';

interface Professional {
  id: string;
  country?: string;
  nationality?: string;
  dateOfBirth?: string;
  description?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
  };
  profileImage?: string;
  identityStatus: string;
  profileCompleteness: number;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  identityVerification?: {
    status: string;
  } | null;
  education?: Education[];
  workExperience?: WorkExperience[];
}

interface Education {
  id: string;
  institutionName: string;
  degreeType?: string;
  levelOfEducation?: string;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string;
  currentlyAttending: boolean;
  country: string;
  verificationStatus: string;
}

interface WorkExperience {
  id: string;
  organisationName: string;
  role: string;
  industry: string;
  location: any;
  startDate: string;
  endDate?: string;
  currentlyWorking: boolean;
  responsibilities: string[];
  achievements: string[];
  verificationStatus: string;
}

export default function ProfessionalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProfessionalDetail();
      setImageError(false);
    }
  }, [id]);

  const fetchProfessionalDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Fetch professional by ID from admin endpoint
      const response = await api.get(`/v1/admin/professionals/${id}`);
      if (response.data.success && response.data.data) {
        const prof = response.data.data;
        setProfessional({
          ...prof,
          education: prof.education || [],
          workExperience: prof.workExperience || [],
          description: prof.description || null,
          socialMedia: prof.socialMedia || {},
          profileImage: prof.profileImage || null,
        });
      } else {
        setProfessional(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch professional:', err);
      if (err.response?.status === 404) {
        setProfessional(null);
      } else {
        toast.error('Failed to load professional profile');
        setProfessional(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const getProfileImage = (professional: Professional) => {
    if (professional.profileImage && !imageError) {
      return professional.profileImage;
    }
    return null; // Will show placeholder icon
  };

  const getProfession = (professional: Professional): string => {
    if (professional.workExperience && professional.workExperience.length > 0) {
      // Get the most recent work experience role
      const sorted = [...professional.workExperience].sort((a, b) => 
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
      return sorted[0].role;
    }
    return 'Professional';
  };

  const calculateDuration = (startDate: string, endDate?: string, isCurrent?: boolean) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : isCurrent ? new Date() : new Date();
    const years = end.getFullYear() - start.getFullYear();
    const months = end.getMonth() - start.getMonth();
    let totalMonths = years * 12 + months;
    const totalYears = Math.floor(totalMonths / 12);
    const remainingMonths = totalMonths % 12;
    
    if (totalYears > 0 && remainingMonths > 0) {
      return `${totalYears} year${totalYears > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    } else if (totalYears > 0) {
      return `${totalYears} year${totalYears > 1 ? 's' : ''}`;
    } else {
      return `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    }
  };

  const formatDateRange = (startDate: string, endDate?: string, isCurrent?: boolean) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    const startMonth = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const endMonth = end ? end.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null;
    const duration = calculateDuration(startDate, endDate, isCurrent);
    
    if (endMonth) {
      return `${startMonth} - ${endMonth} (${duration})`;
    } else if (isCurrent) {
      return `${startMonth} - Present (${duration})`;
    } else {
      return `${startMonth} (${duration})`;
    }
  };

  const getCompanyLogo = (companyName: string) => {
    return companyName.charAt(0).toUpperCase();
  };

  const getInstitutionLogo = (institutionName: string) => {
    return institutionName.charAt(0).toUpperCase();
  };

  const getLocationDisplay = (location: any): string => {
    if (!location) return 'Not specified';
    if (typeof location === 'string') return location;
    if (typeof location === 'object') {
      const parts = [];
      if (location.city) parts.push(location.city);
      if (location.country) parts.push(location.country);
      return parts.length > 0 ? parts.join(', ') : 'Not specified';
    }
    return 'Not specified';
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

  if (!professional) {
    return (
      <LandingLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiUser className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Professional not found</h2>
            <p className="text-gray-600 mb-4">The professional profile you're looking for doesn't exist or has been removed.</p>
            <button
              onClick={() => navigate('/professionals')}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
            >
              Back to Professionals
            </button>
          </div>
        </div>
      </LandingLayout>
    );
  }

  const fullName = `${professional.user.firstName} ${professional.user.lastName}`;
  const profession = getProfession(professional);
  const profileImageUrl = getProfileImage(professional);

  return (
    <LandingLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <button
            onClick={() => navigate('/professionals')}
            className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <HiArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>

          {/* Profile Header Card */}
          <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left: Profile Picture and Info */}
              <div className="flex-1">
                <div className="flex items-start gap-6">
                  <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0 bg-brand-100 flex items-center justify-center">
                    {profileImageUrl ? (
                      <img
                        src={profileImageUrl}
                        alt={fullName}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <HiUser className="w-12 h-12 text-brand-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h1 className="text-3xl font-bold text-gray-900">{fullName}</h1>
                      {professional.identityStatus === 'verified' && (
                        <HiCheckCircle className="w-6 h-6 text-brand-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-lg text-gray-600 mb-2">{profession}</p>
                    {professional.country && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <HiLocationMarker className="w-4 h-4" />
                        {professional.country}
                        {professional.nationality && professional.nationality !== professional.country && (
                          <span> • {professional.nationality}</span>
                        )}
                      </p>
                    )}
                    <div className="flex gap-3 mt-4">
                      <button className="px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors">
                        View full profile
                      </button>
                      <button className="px-4 py-2 border border-brand-500 text-brand-500 rounded-lg font-medium hover:bg-brand-50 transition-colors">
                        Send a Message
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Contact Information */}
              <div className="md:w-64">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="space-y-3">
                  {professional.socialMedia?.facebook && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FaFacebook className="w-5 h-5 text-gray-400" />
                      <span className="truncate">{professional.socialMedia.facebook}</span>
                    </div>
                  )}
                  {professional.socialMedia?.twitter && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FaTwitter className="w-5 h-5 text-gray-400" />
                      <span className="truncate">{professional.socialMedia.twitter}</span>
                    </div>
                  )}
                  {professional.socialMedia?.linkedin && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FaLinkedin className="w-5 h-5 text-gray-400" />
                      <span className="truncate">{professional.socialMedia.linkedin}</span>
                    </div>
                  )}
                  {professional.socialMedia?.instagram && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FaInstagram className="w-5 h-5 text-gray-400" />
                      <span className="truncate">{professional.socialMedia.instagram}</span>
                    </div>
                  )}
                  {professional.socialMedia?.youtube && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FaYoutube className="w-5 h-5 text-gray-400" />
                      <span className="truncate">{professional.socialMedia.youtube}</span>
                    </div>
                  )}
                  {(!professional.socialMedia || 
                    (!professional.socialMedia.facebook && 
                     !professional.socialMedia.twitter && 
                     !professional.socialMedia.linkedin && 
                     !professional.socialMedia.instagram && 
                     !professional.socialMedia.youtube)) && (
                    <p className="text-sm text-gray-500 italic">No social media links available</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white rounded-xl shadow-sm mb-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'profile'
                    ? 'text-brand-500 border-b-2 border-brand-500'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('circle')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'circle'
                    ? 'text-brand-500 border-b-2 border-brand-500'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Circle Interaction
              </button>
              <button
                onClick={() => setActiveTab('creative')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'creative'
                    ? 'text-brand-500 border-b-2 border-brand-500'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Creative Activity
              </button>
            </div>
          </div>

          {/* Profile Content */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* About Section */}
              {professional.description ? (
                <div className="bg-white rounded-xl shadow-sm p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {professional.description}
                  </p>
                </div>
              ) : null}

              {/* Experience Section */}
              <div className="bg-white rounded-xl shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Experience / Associated Organization</h2>
                {professional.workExperience && professional.workExperience.length > 0 ? (
                  <div className="space-y-6">
                    {professional.workExperience.map((exp) => (
                      <div key={exp.id} className="flex gap-4">
                        <div className="w-12 h-12 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-lg">
                            {getCompanyLogo(exp.organisationName)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{exp.role}</h3>
                          <p className="text-gray-600 mb-1">{exp.organisationName}</p>
                          <p className="text-sm text-gray-500 mb-2">
                            {formatDateRange(exp.startDate, exp.endDate, exp.currentlyWorking)}
                            {getLocationDisplay(exp.location) !== 'Not specified' && (
                              <span className="ml-2">• {getLocationDisplay(exp.location)}</span>
                            )}
                          </p>
                          {exp.responsibilities && exp.responsibilities.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-700 mb-1">Responsibilities:</p>
                              <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                                {exp.responsibilities.map((resp, idx) => (
                                  <li key={idx}>{resp}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {exp.achievements && exp.achievements.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-700 mb-1">Achievements:</p>
                              <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                                {exp.achievements.map((ach, idx) => (
                                  <li key={idx}>{ach}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No work experience information available</p>
                  </div>
                )}
              </div>

              {/* Education Section */}
              <div className="bg-white rounded-xl shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Education</h2>
                {professional.education && professional.education.length > 0 ? (
                  <div className="space-y-6">
                    {professional.education.map((edu) => (
                      <div key={edu.id} className="flex gap-4">
                        <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-lg">
                            {getInstitutionLogo(edu.institutionName)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{edu.institutionName}</h3>
                          <p className="text-gray-600 mb-1">
                            {edu.levelOfEducation && `${edu.levelOfEducation} in `}
                            {edu.fieldOfStudy}
                            {edu.degreeType && ` - ${edu.degreeType}`}
                          </p>
                          <p className="text-sm text-gray-500 mb-2">
                            {formatDateRange(edu.startDate, edu.endDate, edu.currentlyAttending)}
                            {edu.country && <span className="ml-2">• {edu.country}</span>}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No education information available</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Circle Interaction Tab */}
          {activeTab === 'circle' && (
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Circle Interaction</h2>
              <p className="text-gray-600">Circle interaction content coming soon...</p>
            </div>
          )}

          {/* Creative Activity Tab */}
          {activeTab === 'creative' && (
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Creative Activity</h2>
              <p className="text-gray-600">Creative activity content coming soon...</p>
            </div>
          )}

          {/* Promotional Banner */}
          <div className="mt-12 bg-brand-500 rounded-xl overflow-hidden">
            <div className="flex flex-col md:flex-row items-center">
              <div className="flex-1 p-8 md:p-12 text-white">
                <h2 className="text-3xl font-bold mb-4">
                  Interact with a Trusted Circle of Professional Colleagues
                </h2>
                <p className="text-lg mb-4 opacity-90">
                  Connect with verified professionals, build meaningful relationships, and expand your network in a trusted environment.
                </p>
                <p className="text-base opacity-80">
                  Join a community where identity verification ensures authentic connections and professional growth.
                </p>
              </div>
              <div className="w-full md:w-96 h-64 md:h-auto relative">
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop"
                  alt="Professional collaboration"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
}
