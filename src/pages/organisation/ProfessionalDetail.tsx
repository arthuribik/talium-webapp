import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/services/api';
import OrganisationLayout from '@/components/organisation/OrganisationLayout';
import { HiArrowLeft, HiCheckCircle, HiGlobe, HiPlus, HiUser } from 'react-icons/hi';
import toast from 'react-hot-toast';

interface Professional {
  id: string;
  country?: string;
  nationality?: string;
  identityStatus: string;
  profileCompleteness: number;
  createdAt: string;
  description?: string;
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
  degree?: string;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string;
  currentlyAttending: boolean;
  country: string;
  verificationStatus: string;
}

interface WorkExperience {
  id: string;
  organisationName?: string;
  companyName?: string;
  role?: string;
  jobTitle?: string;
  industry?: string;
  location: any;
  startDate?: string;
  endDate?: string;
  currentlyWorking?: boolean;
  responsibilities?: string[];
  achievements?: string[];
  verificationStatus?: string;
  description?: string;
}

export default function OrganisationProfessionalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [hiring, setHiring] = useState(false);
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
      // Fetch professional by ID
      const response = await api.get(`/v1/admin/professionals/${id}`);
      if (response.data.success && response.data.data) {
        setProfessional({
          ...response.data.data,
          education: response.data.data.education || [],
          workExperience: response.data.data.workExperience || [],
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

  const handleHireProfessional = async () => {
    if (!id) return;
    setHiring(true);
    try {
      await api.post(`/v1/organisations/professionals/${id}/hire`);
      toast.success('Professional hired successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to hire professional');
    } finally {
      setHiring(false);
    }
  };

  const getProfileImage = (professional: Professional) => {
    // Check if professional has a profile image URL
    if ((professional as any).profileImage) {
      return (professional as any).profileImage;
    }
    // Return null to use placeholder icon
    return null;
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

  const formatDateRange = (startDate?: string, endDate?: string, isCurrent?: boolean) => {
    if (!startDate) return '--';
    try {
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
    } catch (err) {
      return '--';
    }
  };

  const getCompanyLogo = (companyName: string) => {
    return companyName.charAt(0).toUpperCase();
  };

  const getInstitutionLogo = (institutionName: string) => {
    return institutionName.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <OrganisationLayout>
        <div className="p-6">
          <div className="text-center text-gray-600 py-16">Loading profile...</div>
        </div>
      </OrganisationLayout>
    );
  }

  if (!professional && !loading) {
    return (
      <OrganisationLayout>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-xl shadow-sm">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <HiUser className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Professional not found</h2>
            <p className="text-sm text-gray-500 text-center max-w-md mb-4">
              The professional profile you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={() => navigate('/organization/professionals')}
              className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
            >
              Back to Professionals
            </button>
          </div>
        </div>
      </OrganisationLayout>
    );
  }

  if (!professional) return null;

  const fullName = `${professional.user?.firstName || '--'} ${professional.user?.lastName || '--'}`;

  return (
    <OrganisationLayout>
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate('/organization/professionals')}
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
                    {getProfileImage(professional) && !imageError ? (
                      <img
                        src={getProfileImage(professional)!}
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
                    <p className="text-sm text-gray-500">{professional.country || '--'}</p>
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={handleHireProfessional}
                        disabled={hiring}
                        className="px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <HiPlus className="w-5 h-5 mr-2" />
                        {hiring ? 'Hiring...' : 'Hire Professional'}
                      </button>
                      <button className="px-4 py-2 border border-brand-500 text-brand-500 rounded-lg font-medium hover:bg-brand-50 transition-colors">
                        Send a Message
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Location Information */}
              <div className="md:w-64">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Location Information</h3>
                <div className="space-y-3">
                  {professional.country && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <HiGlobe className="w-5 h-5 text-gray-400" />
                      <span>{professional.country}</span>
                    </div>
                  )}
                  {professional.nationality && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <HiGlobe className="w-5 h-5 text-gray-400" />
                      <span>Nationality: {professional.nationality}</span>
                    </div>
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
              <div className="bg-white rounded-xl shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
                <p className="text-gray-700 leading-relaxed">
                  {professional.description || 'No description available.'}
                </p>
              </div>

              {/* Experience Section */}
              <div className="bg-white rounded-xl shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Experience / Associated Organization</h2>
                {professional.workExperience && professional.workExperience.length > 0 ? (
                  <div className="space-y-6">
                    {professional.workExperience.map((exp) => (
                      <div key={exp.id} className="flex gap-4">
                        <div className="w-12 h-12 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-lg">
                            {getCompanyLogo(exp.organisationName || exp.companyName || '--')}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{exp.role || exp.jobTitle || '--'}</h3>
                          <p className="text-gray-600 mb-1">{exp.organisationName || exp.companyName || '--'}</p>
                          {exp.startDate && (
                            <p className="text-sm text-gray-500 mb-3">
                              {formatDateRange(exp.startDate, exp.endDate, exp.currentlyWorking)}
                            </p>
                          )}
                          {exp.description && (
                            <p className="text-gray-700">{exp.description}</p>
                          )}
                          {exp.responsibilities && exp.responsibilities.length > 0 && (
                            <ul className="list-disc list-inside text-gray-700 mt-2">
                              {exp.responsibilities.map((resp: string, idx: number) => (
                                <li key={idx}>{resp}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No work experience available</p>
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
                            {getInstitutionLogo(edu.institutionName || '--')}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{edu.institutionName || '--'}</h3>
                          <p className="text-gray-600 mb-1">
                            {edu.degreeType || edu.degree || edu.fieldOfStudy || '--'}
                          </p>
                          {edu.startDate && (
                            <p className="text-sm text-gray-500 mb-3">
                              {formatDateRange(edu.startDate, edu.endDate, edu.currentlyAttending)}
                            </p>
                          )}
                          {edu.country && (
                            <p className="text-sm text-gray-500">{edu.country}</p>
                          )}
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
        </div>
      </div>
    </OrganisationLayout>
  );
}

