import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/services/api';
import LandingLayout from '@/components/landing/LandingLayout';
import { HiArrowLeft, HiCheckCircle, HiGlobe, HiMail } from 'react-icons/hi';
import { FaFacebook, FaTwitter } from 'react-icons/fa';

interface Professional {
  id: string;
  country?: string;
  nationality?: string;
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

  useEffect(() => {
    if (id) {
      fetchProfessionalDetail();
    }
  }, [id]);

  const fetchProfessionalDetail = async () => {
    setLoading(true);
    try {
      // Fetch from admin endpoint (may require auth, but we'll try)
      const response = await api.get('/v1/admin/professionals?limit=1000');
      const prof = response.data.data.professionals.find((p: any) => p.id === id);
      if (prof) {
        // Fetch additional details if available
        try {
          const detailResponse = await api.get(`/v1/admin/professionals?limit=1000`);
          const fullProf = detailResponse.data.data.professionals.find((p: any) => p.id === id);
          if (fullProf) {
            setProfessional({
              ...fullProf,
              education: fullProf.education || [],
              workExperience: fullProf.workExperience || [],
            });
          } else {
            setProfessional({
              ...prof,
              education: [],
              workExperience: [],
            });
          }
        } catch (err) {
          // If detail fetch fails, use basic data
          setProfessional({
            ...prof,
            education: [],
            workExperience: [],
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch professional:', err);
    } finally {
      setLoading(false);
    }
  };

  const getProfileImage = (profId: string) => {
    const images = [
      'photo-1507003211169-0a1dd7228f2d',
      'photo-1472099645785-5658abf4ff4e',
      'photo-1494790108377-be9c29b29330',
      'photo-1500648767791-00dcc994a43e',
      'photo-1534528741775-53994a69daeb',
      'photo-1529626455594-4ff0802cfb7e',
      'photo-1517841905240-472988babdf9',
      'photo-1539571696357-5a69c17a67c6',
    ];
    const index = parseInt(profId.slice(-1), 16) || 0;
    return `https://images.unsplash.com/${images[index % images.length]}?w=200&h=200&fit=crop`;
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
    // Use first letter as logo for now
    return companyName.charAt(0).toUpperCase();
  };

  const getInstitutionLogo = (institutionName: string) => {
    // Use first letter as logo for now
    return institutionName.charAt(0).toUpperCase();
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Professional not found</h2>
            <button
              onClick={() => navigate('/professionals')}
              className="text-brand-600 hover:text-brand-700"
            >
              Back to Professionals
            </button>
          </div>
        </div>
      </LandingLayout>
    );
  }

  const fullName = `${professional.user.firstName} ${professional.user.lastName}`;
  const circlesCount = Math.floor(Math.random() * 50) + 10; // Mock data

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
                  <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0">
                    <img
                      src={getProfileImage(professional.id)}
                      alt={fullName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h1 className="text-3xl font-bold text-gray-900">{fullName}</h1>
                      {professional.identityStatus === 'verified' && (
                        <HiCheckCircle className="w-6 h-6 text-brand-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-lg text-gray-600 mb-2">Senior Product Designer</p>
                    <p className="text-sm text-gray-500">{circlesCount}K circles</p>
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
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <HiGlobe className="w-5 h-5 text-gray-400" />
                    <span>www.{professional.user.firstName.toLowerCase()}-{professional.user.lastName.toLowerCase()}.com</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <HiMail className="w-5 h-5 text-gray-400" />
                    <span>@{professional.user.firstName.charAt(0)}{professional.user.lastName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FaFacebook className="w-5 h-5 text-gray-400" />
                    <span>{fullName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FaTwitter className="w-5 h-5 text-gray-400" />
                    <span>@{professional.user.firstName.charAt(0)}{professional.user.lastName}</span>
                  </div>
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
                  Experienced professional specializing in B2B SaaS and PaaS solutions, with a strong focus on compliance products. 
                  Passionate about user-centered design and delivering meaningful products that solve real-world problems. 
                  Committed to creating intuitive experiences that drive business value.
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
                            {getCompanyLogo(exp.organisationName)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{exp.role}</h3>
                          <p className="text-gray-600 mb-1">{exp.organisationName}</p>
                          <p className="text-sm text-gray-500 mb-3">
                            {formatDateRange(exp.startDate, exp.endDate, exp.currentlyWorking)}
                          </p>
                          <p className="text-gray-700">
                            {exp.responsibilities && exp.responsibilities.length > 0
                              ? exp.responsibilities.join('. ')
                              : 'Building and managing company\'s internal tools for end to end address verification across Nigeria and other African countries.'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">G</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Product Designer</h3>
                      <p className="text-gray-600 mb-1">Google Inc.</p>
                      <p className="text-sm text-gray-500 mb-3">April 2022 - Present (3 years, 2 months)</p>
                      <p className="text-gray-700">
                        Building and managing company's internal tools for end to end address verification across Nigeria and other African countries.
                      </p>
                    </div>
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
                            {edu.degreeType || edu.fieldOfStudy}
                          </p>
                          <p className="text-sm text-gray-500 mb-3">
                            {formatDateRange(edu.startDate, edu.endDate, edu.currentlyAttending)}
                          </p>
                          <p className="text-gray-700">
                            Building and managing company's internal tools for end to end address verification across Nigeria and other African countries.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="flex gap-4 mb-6">
                      <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-lg">N</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Nexford University</h3>
                        <p className="text-gray-600 mb-1">Google Inc.</p>
                        <p className="text-sm text-gray-500 mb-3">April 2022 - Present (3 years, 2 months)</p>
                        <p className="text-gray-700">
                          Building and managing company's internal tools for end to end address verification across Nigeria and other African countries.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-lg">U</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Utiva</h3>
                        <p className="text-gray-600 mb-1">Product Design bootcamp</p>
                        <p className="text-sm text-gray-500 mb-3">2019 - 2020</p>
                        <p className="text-gray-700">
                          Building and managing company's internal tools for end to end address verification across Nigeria and other African countries.
                        </p>
                      </div>
                    </div>
                  </>
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

