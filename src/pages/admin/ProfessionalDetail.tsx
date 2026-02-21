import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  HiArrowLeft,
  HiUser,
  HiCheckCircle,
  HiXCircle,
  HiClock,
  HiAcademicCap,
  HiBriefcase,
  HiShare,
  HiBadgeCheck,
  HiUsers,
  HiDotsVertical,
} from 'react-icons/hi';
import toast from 'react-hot-toast';

type TabKey = 'personal' | 'education' | 'social' | 'work' | 'certification' | 'family';
type SectionStatus = 'verified' | 'pending' | 'rejected' | 'empty' | 'view_only';

const SIDE_TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: 'personal', label: 'Personal Information', icon: HiUser },
  { key: 'education', label: 'Educational Information', icon: HiAcademicCap },
  { key: 'social', label: 'Social Media Profiles', icon: HiShare },
  { key: 'work', label: 'Work Experience', icon: HiBriefcase },
  { key: 'certification', label: 'Certification', icon: HiBadgeCheck },
  { key: 'family', label: 'Family & Relationship', icon: HiUsers },
];

const SOCIAL_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  snapchat: 'Snapchat',
};

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm">{description}</p>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-500 mb-0.5">{label}</label>
      <p className="text-gray-900">{value ?? '—'}</p>
    </div>
  );
}

export default function ProfessionalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [professional, setProfessional] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('personal');
  const [verifying, setVerifying] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [verifyingComplete, setVerifyingComplete] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenuOpen(null);
      }
    };
    if (userMenuOpen || actionMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen, actionMenuOpen]);

  const fetchProfessional = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/v1/admin/professionals/${id}`);
      setProfessional(res.data?.data ?? null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load professional');
      setProfessional(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfessional();
  }, [id]);

  const handleVerify = async (
    type: 'identity' | 'education' | 'experience',
    verificationId: string,
    status: 'verified' | 'rejected' = 'verified',
  ) => {
    if (!id) return;
    setVerifying(`${type}-${verificationId}`);
    try {
      await api.put(`/v1/admin/professionals/${id}/verify/${type}/${verificationId}`, { status });
      toast.success(
        status === 'verified'
          ? `${type.charAt(0).toUpperCase() + type.slice(1)} verified`
          : `${type.charAt(0).toUpperCase() + type.slice(1)} rejected`,
      );
      fetchProfessional();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update verification');
    } finally {
      setVerifying(null);
    }
  };

  const handleApprove = async () => {
    if (!professional?.user?.id) return;
    setUpdating(true);
    try {
      await api.put(`/v1/admin/users/${professional.user.id}/activate`);
      toast.success('Professional approved');
      setProfessional((prev: any) => ({
        ...prev,
        user: { ...prev.user, status: 'ACTIVE' },
      }));
      fetchProfessional();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally {
      setUpdating(false);
    }
  };

  const handleUnapprove = async () => {
    if (!professional?.user?.id) return;
    setUpdating(true);
    try {
      await api.put(`/v1/admin/users/${professional.user.id}/suspend`);
      toast.success('Professional suspended');
      setProfessional((prev: any) => ({
        ...prev,
        user: { ...prev.user, status: 'SUSPENDED' },
      }));
      fetchProfessional();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to suspend');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 text-center text-gray-600">Loading...</div>
      </AdminLayout>
    );
  }

  if (!professional) {
    return (
      <AdminLayout>
        <div className="p-6 text-center text-gray-600">Professional not found</div>
      </AdminLayout>
    );
  }

  const user = professional.user || {};
  const education = professional.education || [];
  const workExperience = professional.workExperience || [];
  const socialMedia = professional.socialMedia || {};
  const identityVerification = professional.identityVerification;
  const addressData = professional.address && typeof professional.address === 'object' ? professional.address : {};

  const hasPersonalData =
    user.firstName ||
    user.lastName ||
    user.email ||
    professional.dateOfBirth ||
    professional.nationality ||
    professional.country ||
    identityVerification;
  const hasSocialData = Object.keys(socialMedia).some((k) => socialMedia[k]);

  const getSectionStatus = (key: TabKey): SectionStatus => {
    switch (key) {
      case 'personal': {
        if (!identityVerification) return 'empty';
        const s = identityVerification.status || professional.identityStatus;
        if (s === 'verified') return 'verified';
        if (s === 'rejected') return 'rejected';
        if (s === 'pending' || s === 'under_review') return 'pending';
        return 'empty';
      }
      case 'education': {
        if (education.length === 0) return 'empty';
        const hasPending = education.some((e: any) => e.verificationStatus === 'pending' || e.verificationStatus === 'under_review');
        const hasRejected = education.some((e: any) => e.verificationStatus === 'rejected');
        const allVerified = education.every((e: any) => e.verificationStatus === 'verified');
        if (hasPending) return 'pending';
        if (allVerified) return 'verified';
        if (hasRejected) return 'rejected';
        return 'empty';
      }
      case 'social':
        return hasSocialData ? 'view_only' : 'empty';
      case 'work': {
        if (workExperience.length === 0) return 'empty';
        const hasPending = workExperience.some((w: any) => w.verificationStatus === 'pending' || w.verificationStatus === 'under_review');
        const hasRejected = workExperience.some((w: any) => w.verificationStatus === 'rejected');
        const allVerified = workExperience.every((w: any) => w.verificationStatus === 'verified');
        if (hasPending) return 'pending';
        if (allVerified) return 'verified';
        if (hasRejected) return 'rejected';
        return 'empty';
      }
      case 'certification':
      case 'family':
        return 'empty';
      default:
        return 'empty';
    }
  };

  const canVerifyProfessional =
    getSectionStatus('personal') === 'verified' &&
    (education.length === 0 || getSectionStatus('education') === 'verified') &&
    (workExperience.length === 0 || getSectionStatus('work') === 'verified');
  const verifiedByAdminAt = professional.verifiedByAdminAt
    ? new Date(professional.verifiedByAdminAt)
    : null;

  const handleVerifyProfessional = async () => {
    if (!id || !canVerifyProfessional) return;
    setVerifyingComplete(true);
    try {
      await api.put(`/v1/admin/professionals/${id}/verification-complete`);
      toast.success('Professional marked as fully verified');
      fetchProfessional();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to verify professional');
    } finally {
      setVerifyingComplete(false);
    }
  };

  const statusLabel: Record<SectionStatus, string> = {
    verified: 'Verified',
    pending: 'Pending',
    rejected: 'Rejected',
    empty: 'Not submitted',
    view_only: 'View only',
  };
  const statusBadgeClass: Record<SectionStatus, string> = {
    verified: 'bg-green-100 text-green-800',
    pending: 'bg-amber-100 text-amber-800',
    rejected: 'bg-red-100 text-red-800',
    empty: 'bg-gray-100 text-gray-600',
    view_only: 'bg-gray-100 text-gray-600',
  };

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

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center">
                <HiUser className="w-7 h-7 text-brand-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-gray-600 text-sm">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  {user.status === 'ACTIVE' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <HiCheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </span>
                  ) : user.status === 'SUSPENDED' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <HiXCircle className="w-3 h-3 mr-1" />
                      Suspended
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <HiClock className="w-3 h-3 mr-1" />
                      {user.status || 'Pending'}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    Profile: {professional.profileCompleteness ?? 0}%
                  </span>
                  {verifiedByAdminAt && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      <HiBadgeCheck className="w-3 h-3 mr-1" />
                      Fully verified {verifiedByAdminAt.toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  aria-label="User actions"
                >
                  <HiDotsVertical className="w-5 h-5" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 py-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-10">
                    {user.status !== 'ACTIVE' ? (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleApprove();
                        }}
                        disabled={updating}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <HiCheckCircle className="w-4 h-4" />
                        {updating ? 'Approving...' : 'Approve user'}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleUnapprove();
                        }}
                        disabled={updating}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <HiXCircle className="w-4 h-4" />
                        {updating ? 'Suspending...' : 'Suspend'}
                      </button>
                    )}
                  </div>
                )}
              </div>
              {canVerifyProfessional && !verifiedByAdminAt && (
                <button
                  onClick={handleVerifyProfessional}
                  disabled={verifyingComplete}
                  className="px-4 py-2 bg-brand-50 text-brand-700 border border-brand-200 rounded-lg hover:bg-brand-100 text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {verifyingComplete ? 'Verifying...' : 'Verify professional'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Side menu */}
          <nav className="lg:w-56 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {SIDE_TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors border-b border-gray-100 last:border-b-0 ${
                    activeTab === key
                      ? 'bg-brand-50 text-brand-700 border-l-4 border-l-brand-500'
                      : 'text-gray-700 hover:bg-gray-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {/* Personal Information — dot-to-dot with /professional/verification */}
              {activeTab === 'personal' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Personal Information
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass[getSectionStatus('personal')]}`}>
                        {statusLabel[getSectionStatus('personal')]}
                      </span>
                      <div
                        className="relative"
                        ref={actionMenuOpen === 'personal' ? actionMenuRef : undefined}
                      >
                        <button
                          type="button"
                          onClick={() => setActionMenuOpen((o) => (o === 'personal' ? null : 'personal'))}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          aria-label="Actions"
                        >
                          <HiDotsVertical className="w-5 h-5" />
                        </button>
                        {actionMenuOpen === 'personal' && (
                          <div className="absolute right-0 top-full mt-1 py-1 w-44 bg-white rounded-lg border border-gray-200 shadow-lg z-10">
                            <button
                              onClick={() => {
                                setActionMenuOpen(null);
                                identityVerification && handleVerify('identity', identityVerification.id, 'verified');
                              }}
                              disabled={!identityVerification || verifying === `identity-${identityVerification?.id}` || getSectionStatus('personal') === 'verified'}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 disabled:opacity-50 flex items-center gap-2"
                            >
                              <HiCheckCircle className="w-4 h-4 flex-shrink-0" />
                              Validate
                            </button>
                            {getSectionStatus('personal') !== 'verified' && (
                              <button
                                onClick={() => {
                                  setActionMenuOpen(null);
                                  identityVerification && handleVerify('identity', identityVerification.id, 'rejected');
                                }}
                                disabled={!identityVerification || verifying === `identity-${identityVerification?.id}` || getSectionStatus('personal') === 'rejected'}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 flex items-center gap-2"
                              >
                                <HiXCircle className="w-4 h-4 flex-shrink-0" />
                                Reject
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {!hasPersonalData ? (
                    <EmptyState
                      icon={HiUser}
                      title="No personal data"
                      description="This professional has not added personal or identity information yet."
                    />
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FieldRow label="First Name" value={user.firstName} />
                        <FieldRow label="Last Name" value={user.lastName} />
                        <FieldRow label="Middle / Other names" value={addressData.middleName ?? professional.middleName} />
                        <FieldRow label="Email address" value={user.email} />
                        <FieldRow
                          label="Date of birth"
                          value={
                            professional.dateOfBirth
                              ? new Date(professional.dateOfBirth).toLocaleDateString()
                              : null
                          }
                        />
                        <FieldRow label="Gender" value={addressData.gender ?? professional.gender} />
                        <FieldRow label="Nationality" value={professional.nationality} />
                        <FieldRow label="Country of residence" value={professional.country} />
                        <div className="md:col-span-2">
                          <FieldRow label="Address" value={addressData.address ?? professional.address} />
                        </div>
                        <FieldRow label="City" value={addressData.city ?? professional.city} />
                        <FieldRow label="State" value={addressData.state ?? professional.state} />
                      </div>

                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-md font-semibold text-gray-900 mb-3">Identity verification</h3>
                        {identityVerification ? (
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <FieldRow
                                label="ID type"
                                value={
                                  identityVerification.idType
                                    ? String(identityVerification.idType).replace(/_/g, ' ')
                                    : null
                                }
                              />
                              <FieldRow label="Nationality" value={identityVerification.nationality} />
                              <FieldRow
                                label="Date of birth"
                                value={
                                  identityVerification.dateOfBirth
                                    ? new Date(identityVerification.dateOfBirth).toLocaleDateString()
                                    : null
                                }
                              />
                              {identityVerification.verifiedAt && (
                                <FieldRow
                                  label="Verified at"
                                  value={new Date(identityVerification.verifiedAt).toLocaleString()}
                                />
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">No identity verification submitted</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Educational Information */}
              {activeTab === 'education' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Educational Information
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass[getSectionStatus('education')]}`}>
                        {statusLabel[getSectionStatus('education')]}
                      </span>
                      <div
                        className="relative"
                        ref={actionMenuOpen === 'education-empty' ? actionMenuRef : undefined}
                      >
                        <button
                          type="button"
                          onClick={() => setActionMenuOpen((o) => (o === 'education-empty' ? null : 'education-empty'))}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          aria-label="Actions"
                        >
                          <HiDotsVertical className="w-5 h-5" />
                        </button>
                        {actionMenuOpen === 'education-empty' && (
                          <div className="absolute right-0 top-full mt-1 py-1 w-44 bg-white rounded-lg border border-gray-200 shadow-lg z-10">
                            <span className="block px-4 py-2 text-sm text-gray-500">No data to verify</span>
                            <button disabled className="w-full px-4 py-2 text-left text-sm text-gray-400 flex items-center gap-2 cursor-not-allowed">
                              <HiCheckCircle className="w-4 h-4" />
                              Validate
                            </button>
                            <button disabled className="w-full px-4 py-2 text-left text-sm text-gray-400 flex items-center gap-2 cursor-not-allowed">
                              <HiXCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {education.length === 0 ? (
                    <EmptyState
                      icon={HiAcademicCap}
                      title="No education records"
                      description="This professional has not added any educational information."
                    />
                  ) : (
                    <div className="space-y-6">
                      {education.map((edu: any) => (
                        <div
                          key={edu.id}
                          className="p-4 border border-gray-200 rounded-lg space-y-4"
                          ref={actionMenuOpen === `edu-${edu.id}` ? actionMenuRef : undefined}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldRow label="Level of education" value={edu.levelOfEducation?.replace(/_/g, ' ')} />
                            <FieldRow label="Degree type" value={edu.degreeType} />
                            <FieldRow label="Institution" value={edu.institutionName} />
                            <FieldRow
                              label="Duration / Period"
                              value={edu.startDate && (edu.endDate || 'Present') ? `${edu.startDate} – ${edu.endDate || 'Present'}` : null}
                            />
                            <FieldRow
                              label="Cost of education"
                              value={
                                edu.costOfEducation != null
                                  ? `${edu.currency || ''} ${Number(edu.costOfEducation).toLocaleString()}`
                                  : null
                              }
                            />
                            <FieldRow label="Country" value={edu.country} />
                            <FieldRow label="Field of study" value={edu.fieldOfStudy} />
                          </div>
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                edu.verificationStatus || 'pending',
                              )}`}
                            >
                              {(edu.verificationStatus || 'pending').charAt(0).toUpperCase() +
                                (edu.verificationStatus || 'pending').slice(1)}
                            </span>
                            <div className="relative ml-auto">
                              <button
                                type="button"
                                onClick={() => setActionMenuOpen((o) => (o === `edu-${edu.id}` ? null : `edu-${edu.id}`))}
                                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                                aria-label="Actions"
                              >
                                <HiDotsVertical className="w-5 h-5" />
                              </button>
                              {actionMenuOpen === `edu-${edu.id}` && (
                                <div className="absolute right-0 top-full mt-1 py-1 w-44 bg-white rounded-lg border border-gray-200 shadow-lg z-10">
                                  <button
                                    onClick={() => {
                                      setActionMenuOpen(null);
                                      handleVerify('education', edu.id, 'verified');
                                    }}
                                    disabled={verifying === `education-${edu.id}` || edu.verificationStatus === 'verified'}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 disabled:opacity-50 flex items-center gap-2"
                                  >
                                    <HiCheckCircle className="w-4 h-4 flex-shrink-0" />
                                    Validate
                                  </button>
                                  {edu.verificationStatus !== 'verified' && (
                                    <button
                                      onClick={() => {
                                        setActionMenuOpen(null);
                                        handleVerify('education', edu.id, 'rejected');
                                      }}
                                      disabled={verifying === `education-${edu.id}` || edu.verificationStatus === 'rejected'}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                      <HiXCircle className="w-4 h-4 flex-shrink-0" />
                                      Reject
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Social Media — dot-to-dot */}
              {activeTab === 'social' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Social Media Profiles
                    </h2>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass[getSectionStatus('social')]}`}>
                      {statusLabel[getSectionStatus('social')]}
                    </span>
                  </div>
                  {!hasSocialData ? (
                    <EmptyState
                      icon={HiShare}
                      title="No social profiles connected"
                      description="This professional has not linked any social media accounts."
                    />
                  ) : (
                    <div className="space-y-3">
                      {['linkedin', 'twitter', 'facebook', 'instagram', 'tiktok', 'snapchat'].map(
                        (key) => (
                          <div key={key} className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-lg">
                            <div className="min-w-0 flex-1">
                              <label className="block text-sm font-medium text-gray-500 mb-0.5">
                                {SOCIAL_LABELS[key] || key}
                              </label>
                              <p className="text-gray-900 truncate">{socialMedia[key] || '—'}</p>
                            </div>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {socialMedia[key] ? 'Linked' : 'Not linked'}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Work Experience — dot-to-dot */}
              {activeTab === 'work' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Work Experience
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass[getSectionStatus('work')]}`}>
                        {statusLabel[getSectionStatus('work')]}
                      </span>
                      <div
                        className="relative"
                        ref={actionMenuOpen === 'work-empty' ? actionMenuRef : undefined}
                      >
                        <button
                          type="button"
                          onClick={() => setActionMenuOpen((o) => (o === 'work-empty' ? null : 'work-empty'))}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          aria-label="Actions"
                        >
                          <HiDotsVertical className="w-5 h-5" />
                        </button>
                        {actionMenuOpen === 'work-empty' && (
                          <div className="absolute right-0 top-full mt-1 py-1 w-44 bg-white rounded-lg border border-gray-200 shadow-lg z-10">
                            <span className="block px-4 py-2 text-sm text-gray-500">No data to verify</span>
                            <button disabled className="w-full px-4 py-2 text-left text-sm text-gray-400 flex items-center gap-2 cursor-not-allowed">
                              <HiCheckCircle className="w-4 h-4" />
                              Validate
                            </button>
                            <button disabled className="w-full px-4 py-2 text-left text-sm text-gray-400 flex items-center gap-2 cursor-not-allowed">
                              <HiXCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {workExperience.length === 0 ? (
                    <EmptyState
                      icon={HiBriefcase}
                      title="No work experience"
                      description="This professional has not added any work experience."
                    />
                  ) : (
                    <div className="space-y-6">
                      {workExperience.map((exp: any) => {
                        const loc = exp.location && typeof exp.location === 'object' ? exp.location : {};
                        const salaryRange =
                          exp.salaryRange && typeof exp.salaryRange === 'object' ? exp.salaryRange : {};
                        const sal =
                          salaryRange.min != null || salaryRange.max != null
                            ? `${exp.currency || ''} ${[salaryRange.min, salaryRange.max].filter(Boolean).join(' – ')}`
                            : null;
                        return (
                          <div
                            key={exp.id}
                            className="p-4 border border-gray-200 rounded-lg space-y-4"
                            ref={actionMenuOpen === `work-${exp.id}` ? actionMenuRef : undefined}
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FieldRow label="Name of organisation" value={exp.organisationName} />
                              <FieldRow label="Industry / Sector" value={exp.industry} />
                              <FieldRow label="Role / Position" value={exp.role} />
                              <FieldRow
                                label="Employment type"
                                value={exp.employmentType?.replace(/_/g, ' ')}
                              />
                              <FieldRow label="Work mode" value={exp.workMode?.replace(/_/g, ' ')} />
                              <FieldRow
                                label="Start date"
                                value={exp.startDate}
                              />
                              <FieldRow label="End date" value={exp.endDate || 'Present'} />
                              <FieldRow label="Salary" value={sal} />
                              <div className="md:col-span-2">
                                <FieldRow label="Other compensation" value={exp.paymentMode || (exp.achievements?.length ? exp.achievements.join(', ') : null)} />
                              </div>
                              {(loc.city || loc.state || loc.country) && (
                                <div className="md:col-span-2">
                                  <FieldRow
                                    label="Location"
                                    value={[loc.city, loc.state, loc.country].filter(Boolean).join(', ')}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                              <span
                                className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                  exp.verificationStatus || 'pending',
                                )}`}
                              >
                                {(exp.verificationStatus || 'pending').charAt(0).toUpperCase() +
                                  (exp.verificationStatus || 'pending').slice(1)}
                              </span>
                              <div className="relative ml-auto">
                                <button
                                  type="button"
                                  onClick={() => setActionMenuOpen((o) => (o === `work-${exp.id}` ? null : `work-${exp.id}`))}
                                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                                  aria-label="Actions"
                                >
                                  <HiDotsVertical className="w-5 h-5" />
                                </button>
                                {actionMenuOpen === `work-${exp.id}` && (
                                  <div className="absolute right-0 top-full mt-1 py-1 w-44 bg-white rounded-lg border border-gray-200 shadow-lg z-10">
                                    <button
                                      onClick={() => {
                                        setActionMenuOpen(null);
                                        handleVerify('experience', exp.id, 'verified');
                                      }}
                                      disabled={verifying === `experience-${exp.id}` || exp.verificationStatus === 'verified'}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                      <HiCheckCircle className="w-4 h-4 flex-shrink-0" />
                                      Validate
                                    </button>
                                    {exp.verificationStatus !== 'verified' && (
                                      <button
                                        onClick={() => {
                                          setActionMenuOpen(null);
                                          handleVerify('experience', exp.id, 'rejected');
                                        }}
                                        disabled={verifying === `experience-${exp.id}` || exp.verificationStatus === 'rejected'}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 flex items-center gap-2"
                                      >
                                        <HiXCircle className="w-4 h-4 flex-shrink-0" />
                                        Reject
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Certification — dot-to-dot fields, empty state */}
              {activeTab === 'certification' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Certification
                    </h2>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass[getSectionStatus('certification')]}`}>
                      {statusLabel[getSectionStatus('certification')]}
                    </span>
                  </div>
                  <EmptyState
                    icon={HiBadgeCheck}
                    title="No certification data"
                    description="Certification fields (name of certificate, issued by, issued date, expiration date, credential ID, reporting URL, supporting media) are not stored yet. This section will be available when the professional verification flow supports certifications."
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
                    <p>Name of certificate</p>
                    <p>Issued by</p>
                    <p>Issued date</p>
                    <p>Expiration date</p>
                    <p>Credential ID</p>
                    <p>Reporting URL</p>
                    <p className="md:col-span-2">Supporting media</p>
                  </div>
                </div>
              )}

              {/* Family & Relationship — empty state */}
              {activeTab === 'family' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Family & Relationship
                    </h2>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass[getSectionStatus('family')]}`}>
                      {statusLabel[getSectionStatus('family')]}
                    </span>
                  </div>
                  <EmptyState
                    icon={HiUsers}
                    title="No family data"
                    description="Family and relationship information is not collected yet. This section will be available when the professional verification flow includes family & relationship."
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
