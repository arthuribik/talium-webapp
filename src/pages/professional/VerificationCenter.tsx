import { useState, useEffect } from 'react';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import { 
  HiShieldCheck, 
  HiCheckCircle, 
  HiClock, 
  HiUserCircle, 
  HiBriefcase, 
  HiAcademicCap, 
  HiLocationMarker,
  HiUsers,
  HiPencil,
  HiPlus
} from 'react-icons/hi';

interface VerificationStatus {
  status: 'Self Declared' | 'Verified via Gov ID' | 'Verified via Workplace email' | 'Pending' | 'Not Started';
  percentage?: number;
}

export default function VerificationCenter() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [identityVerification, setIdentityVerification] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v1/professional/profile');
      const data = response.data.data;
      setProfile(data);
      setIdentityVerification(data.identityVerification);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      toast.error('Failed to load verification data');
    } finally {
      setLoading(false);
    }
  };

  const getVerificationStatus = (section: string): VerificationStatus => {
    switch (section) {
      case 'identity':
        if (profile?.identityStatus === 'verified') {
          return { status: 'Verified via Gov ID', percentage: 100 };
        } else if (identityVerification) {
          return { status: 'Pending', percentage: 50 };
        } else if (profile?.country || profile?.nationality || profile?.dateOfBirth) {
          return { status: 'Self Declared', percentage: 30 };
        }
        return { status: 'Not Started', percentage: 0 };
      
      case 'workExperience':
        if (profile?.workExperience && profile.workExperience.length > 0) {
          const verified = profile.workExperience.filter((exp: any) => 
            exp.verificationStatus === 'verified'
          );
          if (verified.length > 0) {
            return { status: 'Verified via Workplace email', percentage: 100 };
          }
          const pending = profile.workExperience.filter((exp: any) => 
            exp.verificationStatus === 'pending'
          );
          if (pending.length > 0) {
            return { status: 'Pending', percentage: 50 };
          }
          return { status: 'Self Declared', percentage: 30 };
        }
        return { status: 'Not Started', percentage: 0 };
      
      case 'education':
        if (profile?.education && profile.education.length > 0) {
          const verified = profile.education.filter((edu: any) => 
            edu.verificationStatus === 'verified'
          );
          if (verified.length > 0) {
            return { status: 'Verified via Workplace email', percentage: 100 };
          }
          const pending = profile.education.filter((edu: any) => 
            edu.verificationStatus === 'pending'
          );
          if (pending.length > 0) {
            return { status: 'Pending', percentage: 50 };
          }
          return { status: 'Self Declared', percentage: 30 };
        }
        return { status: 'Not Started', percentage: 0 };
      
      case 'location':
        if (profile?.country) {
          if (profile.identityStatus === 'verified') {
            return { status: 'Verified via Gov ID', percentage: 100 };
          }
          return { status: 'Self Declared', percentage: 30 };
        }
        return { status: 'Not Started', percentage: 0 };
      
      case 'family':
        // Family data verification - placeholder for future implementation
        return { status: 'Not Started', percentage: 0 };
      
      default:
        return { status: 'Not Started', percentage: 0 };
    }
  };

  const getStatusBadge = (status: VerificationStatus) => {
    const { status: statusText } = status;
    let bgColor = 'bg-gray-100 text-gray-700';
    let icon = <HiClock className="w-4 h-4" />;

    if (statusText === 'Verified via Gov ID' || statusText === 'Verified via Workplace email') {
      bgColor = 'bg-green-100 text-green-700';
      icon = <HiCheckCircle className="w-4 h-4" />;
    } else if (statusText === 'Self Declared') {
      bgColor = 'bg-blue-100 text-blue-700';
      icon = <HiUserCircle className="w-4 h-4" />;
    } else if (statusText === 'Pending') {
      bgColor = 'bg-yellow-100 text-yellow-700';
      icon = <HiClock className="w-4 h-4" />;
    }

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${bgColor}`}>
        {icon}
        {statusText}
      </span>
    );
  };

  const VerificationSection = ({ 
    title, 
    icon: Icon, 
    section, 
    description,
    onEdit,
    onAdd 
  }: { 
    title: string; 
    icon: any; 
    section: string;
    description: string;
    onEdit?: () => void;
    onAdd?: () => void;
  }) => {
    const status = getVerificationStatus(section);
    const hasData = (status.percentage ?? 0) > 0;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon className="w-6 h-6 text-brand-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                {getStatusBadge(status)}
              </div>
              <p className="text-sm text-gray-600 mb-4">{description}</p>
              {hasData && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Verification Progress</span>
                    <span className="text-xs font-medium text-gray-700">{status.percentage ?? 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-brand-500 h-2 rounded-full transition-all"
                      style={{ width: `${status.percentage ?? 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {hasData ? (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <HiPencil className="w-4 h-4" />
              Update
            </button>
          ) : (
            <button
              onClick={onAdd}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors text-sm font-medium"
            >
              <HiPlus className="w-4 h-4" />
              Add {title}
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <ProfessionalLayout>
        <div className="p-6">
          <div className="text-center text-gray-600 py-16">Loading verification data...</div>
        </div>
      </ProfessionalLayout>
    );
  }

  return (
    <ProfessionalLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <HiShieldCheck className="w-6 h-6 mr-2 text-brand-600" />
            Verification Center
          </h1>
          <p className="text-gray-600">
            Add, update and verify your personal information. Each section displays its verification status.
          </p>
        </div>

        <div className="space-y-6">
          {/* Identity Information */}
          <VerificationSection
            title="Identity Information"
            icon={HiShieldCheck}
            section="identity"
            description="Verify your identity using government-issued ID (National ID, Passport, Driver's License, or Voter's Card)"
            onEdit={() => window.location.href = '/professional/settings?tab=profile'}
            onAdd={() => window.location.href = '/professional/settings?tab=profile'}
          />

          {/* Work Experience */}
          <VerificationSection
            title="Work Experience"
            icon={HiBriefcase}
            section="workExperience"
            description="Add and verify your work experience. Verification can be done via workplace email confirmation."
            onEdit={() => window.location.href = '/professional/settings?tab=profile'}
            onAdd={() => window.location.href = '/professional/settings?tab=profile'}
          />

          {/* Educational Data */}
          <VerificationSection
            title="Educational Data"
            icon={HiAcademicCap}
            section="education"
            description="Add and verify your educational qualifications. Upload certificates for verification."
            onEdit={() => window.location.href = '/professional/settings?tab=profile'}
            onAdd={() => window.location.href = '/professional/settings?tab=profile'}
          />

          {/* Location Information */}
          <VerificationSection
            title="Location Information"
            icon={HiLocationMarker}
            section="location"
            description="Add your country and location details. This can be verified through identity verification."
            onEdit={() => window.location.href = '/professional/settings?tab=profile'}
            onAdd={() => window.location.href = '/professional/settings?tab=profile'}
          />

          {/* Family Data */}
          <VerificationSection
            title="Family Data"
            icon={HiUsers}
            section="family"
            description="Add family information (coming soon). This section will allow you to add and verify family member details."
            onEdit={() => window.location.href = '/professional/settings?tab=profile'}
            onAdd={() => window.location.href = '/professional/settings?tab=profile'}
          />
        </div>

        {/* Verification Status Legend */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Verification Status Types</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <HiCheckCircle className="w-3 h-3" />
                Verified via Gov ID
              </span>
              <span className="text-xs text-gray-600">Government-verified identity</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <HiCheckCircle className="w-3 h-3" />
                Verified via Workplace email
              </span>
              <span className="text-xs text-gray-600">Workplace-verified information</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                <HiUserCircle className="w-3 h-3" />
                Self Declared
              </span>
              <span className="text-xs text-gray-600">User-provided information</span>
            </div>
          </div>
        </div>
      </div>
    </ProfessionalLayout>
  );
}

