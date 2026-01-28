import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';
import { HiArrowLeft, HiUser, HiCheckCircle, HiXCircle, HiShieldCheck, HiClock, HiDocumentText, HiAcademicCap, HiBriefcase } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function ProfessionalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [professional, setProfessional] = useState<any>(null);
  const [education, setEducation] = useState<any[]>([]);
  const [workExperience, setWorkExperience] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProfessionalDetail(true);
      fetchEducation();
      fetchWorkExperience();
    }
  }, [id]);

  const fetchProfessionalDetail = async (isInitialLoad = false) => {
    try {
      // Since we don't have a detail endpoint, we'll fetch from the list and filter
      const response = await api.get('/v1/admin/professionals?limit=1000');
      const prof = response.data.data.professionals.find((p: any) => p.id === id);
      if (prof) {
        setProfessional(prof);
      }
    } catch (err) {
      console.error('Failed to fetch professional:', err);
    } finally {
      if (isInitialLoad) {
      setLoading(false);
      }
    }
  };

  const fetchEducation = async () => {
    try {
      // Fetch education data - assuming it's included in the professional object or we need a separate endpoint
      // For now, we'll check if it's in the professional object
      if (professional?.education) {
        setEducation(professional.education);
      }
    } catch (err) {
      console.error('Failed to fetch education:', err);
    }
  };

  const fetchWorkExperience = async () => {
    try {
      // Fetch work experience data - assuming it's included in the professional object or we need a separate endpoint
      // For now, we'll check if it's in the professional object
      if (professional?.workExperience) {
        setWorkExperience(professional.workExperience);
      }
    } catch (err) {
      console.error('Failed to fetch work experience:', err);
    }
  };

  // Update education and work experience when professional data is loaded
  useEffect(() => {
    if (professional) {
      if (professional.education) {
        setEducation(professional.education);
      }
      if (professional.workExperience) {
        setWorkExperience(professional.workExperience);
      }
    }
  }, [professional]);

  const handleVerify = async (type: 'identity' | 'education' | 'experience', verificationId: string) => {
    if (!id) return;
    
    setVerifying(`${type}-${verificationId}`);
    try {
      await api.put(`/v1/admin/professionals/${id}/verify/${type}/${verificationId}`);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} verification approved successfully!`);
      
      // Refresh data
      await fetchProfessionalDetail(false);
      await fetchEducation();
      await fetchWorkExperience();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to approve verification';
      toast.error(errorMsg);
    } finally {
      setVerifying(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };


  const handleApprove = async () => {
    if (!professional?.user?.id) return;
    setUpdating(true);
    try {
      await api.put(`/v1/admin/users/${professional.user.id}/activate`);
      toast.success('Professional approved successfully!');
      // Update the professional state immediately
      setProfessional((prev: any) => ({
        ...prev,
        user: {
          ...prev.user,
          status: 'ACTIVE',
        },
      }));
      // Also refresh from server to ensure consistency
      await fetchProfessionalDetail(false);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to approve professional';
      toast.error(errorMsg);
    } finally {
      setUpdating(false);
    }
  };

  const handleUnapprove = async () => {
    if (!professional?.user?.id) return;
    setUpdating(true);
    try {
      await api.put(`/v1/admin/users/${professional.user.id}/suspend`);
      toast.success('Professional unapproved successfully!');
      // Update the professional state immediately
      setProfessional((prev: any) => ({
        ...prev,
        user: {
          ...prev.user,
          status: 'SUSPENDED',
        },
      }));
      // Also refresh from server to ensure consistency
      await fetchProfessionalDetail(false);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to unapprove professional';
      toast.error(errorMsg);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center text-gray-600">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!professional) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center text-gray-600">Professional not found</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
      <button
        onClick={() => navigate('/admin/professionals')}
        className="mb-6 flex items-center text-brand-600 hover:text-brand-700"
      >
        <HiArrowLeft className="w-5 h-5 mr-2" />
        Back to Professionals
      </button>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mr-4">
              <HiUser className="w-8 h-8 text-brand-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {professional.user.firstName} {professional.user.lastName}
              </h1>
              <p className="text-gray-600">{professional.user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {professional.user.status === 'ACTIVE' ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <HiCheckCircle className="w-4 h-4 mr-1" />
                Active
              </span>
            ) : professional.user.status === 'SUSPENDED' ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                <HiXCircle className="w-4 h-4 mr-1" />
                Suspended
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                <HiClock className="w-4 h-4 mr-1" />
                {professional.user.status || 'Pending'}
              </span>
            )}
            
            {/* Approve/Unapprove Buttons */}
            <div className="flex items-center gap-2">
              {professional.user.status !== 'ACTIVE' ? (
                <button
                  onClick={handleApprove}
                  disabled={updating}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                >
                  <HiCheckCircle className="w-4 h-4 mr-1" />
                  {updating ? 'Approving...' : 'Approve'}
                </button>
              ) : (
                <button
                  onClick={handleUnapprove}
                  disabled={updating}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                >
                  <HiXCircle className="w-4 h-4 mr-1" />
                  {updating ? 'Unapproving...' : 'Unapprove'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">First Name</label>
                <p className="text-gray-900">{professional.user.firstName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Name</label>
                <p className="text-gray-900">{professional.user.lastName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{professional.user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Profile Completeness</label>
                <div className="flex items-center mt-1">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-brand-500 h-2 rounded-full"
                      style={{ width: `${professional.profileCompleteness || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">{professional.profileCompleteness || 0}%</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Verification Status</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Identity Status</label>
                <p className="text-gray-900 capitalize">{professional.identityStatus || 'Not verified'}</p>
              </div>
              {professional.identityVerification && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Verification Type</label>
                    <p className="text-gray-900">Identity Verification</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Verification Status</label>
                    <p className="text-gray-900 capitalize">{professional.identityVerification.status}</p>
                  </div>
                </>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Member Since</label>
                <p className="text-gray-900">{new Date(professional.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <HiShieldCheck className="w-6 h-6 text-brand-600 mr-2" />
            <h2 className="text-xl font-bold text-gray-900">Verification Status</h2>
          </div>
        </div>

        <div className="space-y-6">
          {/* Identity Verification */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <HiDocumentText className="w-5 h-5 text-brand-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Identity Verification</h3>
              </div>
              <div className="flex items-center gap-3">
                {professional?.identityVerification && (
                  <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(professional.identityVerification.status)}`}>
                    {professional.identityVerification.status.charAt(0).toUpperCase() + professional.identityVerification.status.slice(1)}
                  </div>
                )}
                {professional?.identityVerification && 
                 professional.identityVerification.status !== 'verified' && 
                 professional.identityVerification.status !== 'rejected' && (
                  <button
                    onClick={() => handleVerify('identity', professional.identityVerification.id)}
                    disabled={verifying === `identity-${professional.identityVerification.id}`}
                    className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {verifying === `identity-${professional.identityVerification.id}` ? 'Verifying...' : 'Verify'}
                  </button>
                )}
              </div>
            </div>
            {professional?.identityVerification ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <span className="text-gray-500">ID Type:</span>
                  <span className="text-gray-900 font-medium ml-2 capitalize">
                    {professional.identityVerification.idType?.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Nationality:</span>
                  <span className="text-gray-900 font-medium ml-2">{professional.identityVerification.nationality}</span>
                </div>
                <div>
                  <span className="text-gray-500">Date of Birth:</span>
                  <span className="text-gray-900 font-medium ml-2">
                    {professional.identityVerification.dateOfBirth 
                      ? new Date(professional.identityVerification.dateOfBirth).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
                {professional.identityVerification.verifiedAt && (
                  <div>
                    <span className="text-gray-500">Verified At:</span>
                    <span className="text-gray-900 font-medium ml-2">
                      {new Date(professional.identityVerification.verifiedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm mt-2">No identity verification submitted</p>
            )}
          </div>

          {/* Education Verifications */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <HiAcademicCap className="w-5 h-5 text-brand-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Education Verifications</h3>
            </div>
            {education && education.length > 0 ? (
              <div className="space-y-4 mt-4">
                {education.map((edu: any) => (
                  <div key={edu.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{edu.institutionName}</h4>
                        <p className="text-sm text-gray-600">{edu.degreeType || edu.levelOfEducation} - {edu.fieldOfStudy}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(edu.verificationStatus || 'pending')}`}>
                          {(edu.verificationStatus || 'pending').charAt(0).toUpperCase() + (edu.verificationStatus || 'pending').slice(1)}
                        </div>
                        {edu.verificationStatus !== 'verified' && edu.verificationStatus !== 'rejected' && (
                          <button
                            onClick={() => handleVerify('education', edu.id)}
                            disabled={verifying === `education-${edu.id}`}
                            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                          >
                            {verifying === `education-${edu.id}` ? 'Verifying...' : 'Verify'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mt-2">
                      <div>
                        <span className="text-gray-500">Period:</span>
                        <span className="text-gray-900 font-medium ml-2">
                          {edu.startDate} - {edu.endDate || 'Present'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Country:</span>
                        <span className="text-gray-900 font-medium ml-2">{edu.country}</span>
                      </div>
                      {edu.verifiedAt && (
                        <div>
                          <span className="text-gray-500">Verified At:</span>
                          <span className="text-gray-900 font-medium ml-2">
                            {new Date(edu.verifiedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm mt-2">No education records found</p>
            )}
          </div>

          {/* Work Experience Verifications */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <HiBriefcase className="w-5 h-5 text-brand-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Work Experience Verifications</h3>
            </div>
            {workExperience && workExperience.length > 0 ? (
              <div className="space-y-4 mt-4">
                {workExperience.map((exp: any) => (
                  <div key={exp.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{exp.role}</h4>
                        <p className="text-sm text-gray-600">{exp.organisationName} - {exp.industry}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(exp.verificationStatus || 'pending')}`}>
                          {(exp.verificationStatus || 'pending').charAt(0).toUpperCase() + (exp.verificationStatus || 'pending').slice(1)}
                        </div>
                        {exp.verificationStatus !== 'verified' && exp.verificationStatus !== 'rejected' && (
                          <button
                            onClick={() => handleVerify('experience', exp.id)}
                            disabled={verifying === `experience-${exp.id}`}
                            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                          >
                            {verifying === `experience-${exp.id}` ? 'Verifying...' : 'Verify'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mt-2">
                      <div>
                        <span className="text-gray-500">Period:</span>
                        <span className="text-gray-900 font-medium ml-2">
                          {exp.startDate} - {exp.endDate || 'Present'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Employment Type:</span>
                        <span className="text-gray-900 font-medium ml-2 capitalize">
                          {exp.employmentType?.replace('_', ' ')}
                        </span>
                      </div>
                      {exp.verifiedAt && (
                        <div>
                          <span className="text-gray-500">Verified At:</span>
                          <span className="text-gray-900 font-medium ml-2">
                            {new Date(exp.verifiedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm mt-2">No work experience records found</p>
            )}
          </div>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}

