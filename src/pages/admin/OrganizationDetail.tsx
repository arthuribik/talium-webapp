import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  HiArrowLeft,
  HiOfficeBuilding,
  HiCheckCircle,
  HiClock,
  HiDocumentText,
  HiShieldCheck,
  HiX,
  HiDownload,
  HiPlay,
  HiMinus,
} from 'react-icons/hi';
import toast from 'react-hot-toast';

interface RegistrationData {
  id: string;
  step1?: {
    isRegistered: boolean;
  };
  step2?: {
    legalName: string;
    countryOfIncorporation: string;
    incorporationNumber: string;
  };
  step3?: {
    category: string;
    schoolType?: string;
    religiousOrgType?: string;
    internationalOrgType?: string;
    politicalPartyCountry?: string;
    associatedSchool?: string;
  };
  step4?: {
    description: string;
    otherName?: string;
    industry: string;
    headquartersCity: string;
    headquartersCountry: string;
    foundedDate: string;
    address: {
      buildingName?: string;
      streetNumber?: string;
      street: string;
      city: string;
      country: string;
    };
  };
  step5?: {
    organisationEmail: string;
  };
  step7?: {
    organisationName: string;
    organisationCountry: string;
    description: string;
    industry: string;
    foundedDate: string;
    address: {
      buildingName?: string;
      streetNumber?: string;
      street: string;
      city: string;
      country: string;
    };
  };
  step8?: {
    category: string;
    schoolType?: string;
    religiousOrgType?: string;
    internationalOrgType?: string;
    politicalPartyCountry?: string;
    associatedSchool?: string;
  };
  currentStep: number;
  updatedAt: string;
  createdAt?: string;
}

type Tab = 'profile' | 'compliance' | 'billing' | 'invoice' | 'jobs' | 'team' | 'activity';

export default function OrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [organization, setOrganization] = useState<any>(null);
  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [updating, setUpdating] = useState(false);
  const [showKybDrawer, setShowKybDrawer] = useState(false);
  const [kybIncorporationNumber, setKybIncorporationNumber] = useState('');
  const [kybCountry, setKybCountry] = useState('Nigeria — CAC');
  const [kybChecks, setKybChecks] = useState({
    businessRegistration: true,
    directorshipRecords: true,
    taxIdentification: true,
    amlScreening: true,
    adverseMedia: false,
  });

  useEffect(() => {
    if (id) {
      fetchOrganizationDetail();
    }
  }, [id]);

  // Load tab from URL on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab') as Tab;
    if (tabParam && ['profile', 'compliance', 'billing', 'invoice', 'jobs', 'team', 'activity'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const fetchOrganizationDetail = async () => {
    try {
      const response = await api.get('/v1/admin/organisations?limit=1000');
      const org = response.data.data.organisations.find((o: any) => o.id === id);
      if (org) {
        setOrganization(org);
        // Fetch registration data
        await fetchRegistrationData(org.user.email, org.companyName);
      }
    } catch (err) {
      console.error('Failed to fetch organization:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrationData = async (email: string, companyName: string) => {
    try {
      const response = await api.get('/v1/admin/registrations?limit=1000');
      const registrations = response.data.data.registrations || [];
      // Find registration by matching email from step5 or organization name
      const matchedRegistration = registrations.find((reg: RegistrationData) => {
        return reg.step5?.organisationEmail === email ||
               reg.step2?.legalName === companyName ||
               reg.step7?.organisationName === companyName;
      });
      if (matchedRegistration) {
        setRegistration(matchedRegistration);
      }
    } catch (err) {
      console.error('Failed to fetch registration:', err);
    }
  };

  const handleToggleVerify = async () => {
    if (!id) return;
    setUpdating(true);
    try {
      if (organization?.verificationStatus === 'verified') {
        // Unverify - set status to under_review
        await api.put(`/v1/admin/organisations/${id}/verification-status`, {
          status: 'under_review',
        });
        toast.success('Business unverified successfully!');
        setOrganization((prev: any) => ({
          ...prev,
          verificationStatus: 'under_review',
        }));
      } else {
        // Verify
        await api.put(`/v1/admin/organisations/${id}/verification-status`, {
          status: 'verified',
        });
        toast.success('Business verified successfully!');
        setOrganization((prev: any) => ({
          ...prev,
          verificationStatus: 'verified',
        }));
      }
      // Refresh data
      await fetchOrganizationDetail();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update verification status';
      toast.error(errorMsg);
    } finally {
      setUpdating(false);
    }
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      company: 'Company',
      school: 'School',
      religious_organisation: 'Religious Organisation',
      government_agency: 'Government Agency',
      international_organisation: 'International Organisation',
      political_party: 'Political Party',
      student_union: 'Student Union',
      student_association: 'Student Association',
      association: 'Association',
      business: 'Business',
      ngo: 'NGO',
      other: 'Other',
    };
    return labels[category] || category;
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

  if (!organization) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center text-gray-600">Organization not found</div>
        </div>
      </AdminLayout>
    );
  }

  const isRegistered = registration?.step1?.isRegistered === true;

  // Compliance checks
  const complianceChecks = [
    {
      id: 'registration',
      title: 'Business Registration',
      description: 'Organization registration status and incorporation details',
      status: organization?.verificationStatus === 'verified' ? 'passed' : 'pending',
      details: isRegistered
        ? {
            registered: true,
            incorporationNumber: registration?.step2?.incorporationNumber,
            countryOfIncorporation: registration?.step2?.countryOfIncorporation,
            legalName: registration?.step2?.legalName,
          }
        : {
            registered: false,
            organisationName: registration?.step7?.organisationName,
            organisationCountry: registration?.step7?.organisationCountry,
          },
    },
    {
      id: 'email_verification',
      title: 'Email Verification',
      description: 'Organisation email address verification',
      status: registration?.step5?.organisationEmail ? 'passed' : 'pending',
      details: {
        email: registration?.step5?.organisationEmail || organization?.user?.email,
        verified: organization?.user?.emailVerified || false,
      },
    },
    {
      id: 'address_verification',
      title: 'Address Verification',
      description: 'Physical address and location verification',
      status: (registration?.step4?.address || registration?.step7?.address) ? 'passed' : 'pending',
      details: registration?.step4?.address || registration?.step7?.address || {},
    },
    {
      id: 'business_category',
      title: 'Business Category',
      description: 'Organization category and type classification',
      status: (registration?.step3?.category || registration?.step8?.category) ? 'passed' : 'pending',
      details: {
        category: getCategoryLabel(registration?.step3?.category || registration?.step8?.category || ''),
        categoryId: registration?.step3?.category || registration?.step8?.category,
        schoolType: registration?.step3?.schoolType || registration?.step8?.schoolType,
        religiousOrgType: registration?.step3?.religiousOrgType || registration?.step8?.religiousOrgType,
        internationalOrgType: registration?.step3?.internationalOrgType || registration?.step8?.internationalOrgType,
        politicalPartyCountry: registration?.step3?.politicalPartyCountry || registration?.step8?.politicalPartyCountry,
        associatedSchool: registration?.step3?.associatedSchool || registration?.step8?.associatedSchool,
      },
    },
    {
      id: 'business_details',
      title: 'Business Details',
      description: 'Complete business information and description',
      status: (registration?.step4?.description || registration?.step7?.description) ? 'passed' : 'pending',
      details: {
        description: registration?.step4?.description || registration?.step7?.description,
        industry: registration?.step4?.industry || registration?.step7?.industry,
        foundedDate: registration?.step4?.foundedDate || registration?.step7?.foundedDate,
        headquartersCity: registration?.step4?.headquartersCity,
        headquartersCountry: registration?.step4?.headquartersCountry,
      },
    },
    {
      id: 'document_verification',
      title: 'Document Verification',
      description: 'Submitted business documents and certificates',
      status: organization?.verificationStatus === 'verified' ? 'passed' : organization?.verificationStatus === 'under_review' ? 'reviewing' : 'pending',
      details: {
        verificationStatus: organization?.verificationStatus,
        documentsSubmitted: organization?.verificationStatus !== 'not_activated',
      },
    },
    {
      id: 'profile_completeness',
      title: 'Profile Completeness',
      description: 'Organization profile completion status',
      status: organization?.profileCompleteness >= 80 ? 'passed' : organization?.profileCompleteness >= 50 ? 'reviewing' : 'pending',
      details: {
        completeness: organization?.profileCompleteness || 0,
        setupCompleted: organization?.setupCompleted || false,
      },
    },
    {
      id: 'terms_acceptance',
      title: 'Terms & Conditions',
      description: 'Terms of service and privacy policy acceptance',
      status: organization?.user?.status === 'ACTIVE' ? 'passed' : 'pending',
      details: {
        userStatus: organization?.user?.status,
        accountActivated: organization?.user?.status === 'ACTIVE',
      },
    },
  ];


  const getStatusText = (status: string) => {
    switch (status) {
      case 'passed':
        return 'Verified';
      case 'reviewing':
        return 'Pending Review';
      case 'failed':
        return 'Failed';
      default:
        return 'Not Run';
    }
  };

  const getStatusPillClass = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'reviewing':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getStatusLeadingIcon = (status: string) => {
    if (status === 'passed') return <HiCheckCircle className="w-4 h-4 text-brand-600" />;
    if (status === 'reviewing') return <HiClock className="w-4 h-4 text-amber-500" />;
    if (status === 'failed') return <HiX className="w-4 h-4 text-red-500" />;
    return <HiMinus className="w-4 h-4 text-gray-400" />;
  };

  const overallCompliance = complianceChecks.filter(check => check.status === 'passed').length;
  const totalChecks = complianceChecks.length;
  const compliancePercentage = Math.round((overallCompliance / totalChecks) * 100);
  const incorporationNumber = registration?.step2?.incorporationNumber || 'Not available';
  const incorporationCountry = registration?.step2?.countryOfIncorporation || organization?.country || '—';
  const verificationAuthority = incorporationCountry === 'Nigeria' ? 'Corporate Affairs Commission (CAC)' : 'Registry';
  const lastKybDate = organization?.updatedAt || registration?.updatedAt || organization?.createdAt;
  const runByName = `${organization?.user?.firstName || ''} ${organization?.user?.lastName || ''}`.trim() || 'System';
  const complianceChecksUi = [
    {
      id: 'registration',
      title: 'CAC Business Registration',
      status: complianceChecks.find((c) => c.id === 'registration')?.status || 'pending',
    },
    {
      id: 'document_verification',
      title: 'Directorship / Ownership Records',
      status: complianceChecks.find((c) => c.id === 'document_verification')?.status || 'pending',
    },
    {
      id: 'tax',
      title: 'Tax Identification Number (TIN)',
      status:
        complianceChecks.find((c) => c.id === 'business_details')?.status === 'passed'
          ? 'passed'
          : 'reviewing',
    },
    {
      id: 'address_verification',
      title: 'Registered Business Address',
      status: complianceChecks.find((c) => c.id === 'address_verification')?.status || 'pending',
    },
    {
      id: 'bank',
      title: 'Bank Account Verification',
      status: organization?.verificationStatus === 'verified' ? 'passed' : 'pending',
    },
    {
      id: 'aml',
      title: 'AML Screening',
      status: 'pending',
    },
  ];
  const walletBalance = 0;
  const activePlanName = '—';
  const jobsRows: Array<{ title: string; location: string; workMode: string; status: string; applicants: number; postedAt: string }> = [];
  const teamRows: Array<{ name: string; role: string; email: string; status: string; joinedAt: string }> = [];
  const invoiceRows: Array<{ invoiceNo: string; description: string; amount: number; status: string; date: string }> = [];

  const handleOpenKybDrawer = () => {
    setKybIncorporationNumber(
      incorporationNumber === 'Not available' ? '' : incorporationNumber,
    );
    setShowKybDrawer(true);
  };

  const kybProgressSteps = [
    {
      id: 'submit',
      title: 'Submitting incorporation number',
      description: `${kybIncorporationNumber || '—'} · ${kybCountry}`,
    },
    {
      id: 'query',
      title: 'Querying CAC registry',
      description: 'Contacting Corporate Affairs Commission API',
    },
    {
      id: 'verify',
      title: 'Verifying directorship records',
      description: 'Cross-referencing beneficial owner data',
    },
    {
      id: 'report',
      title: 'Compiling KYB report',
      description: 'Generating compliance summary',
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6">
      <button
        onClick={() => navigate('/admin/organizations')}
          className="mb-6 flex items-center text-brand-600 hover:text-brand-700"
      >
        <HiArrowLeft className="w-5 h-5 mr-2" />
        Back to Organizations
      </button>

      {/* Header with Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
              <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mr-4">
                <HiOfficeBuilding className="w-8 h-8 text-brand-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{organization?.companyName}</h1>
              <p className="text-gray-600">{organization?.user?.email}</p>
            </div>
          </div>
          <div>
            {organization?.verificationStatus === 'verified' ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <HiCheckCircle className="w-4 h-4 mr-1" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                <HiClock className="w-4 h-4 mr-1" />
                Pending Verification
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => handleTabChange('profile')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Organisation Profile
            </button>
            <button
              onClick={() => handleTabChange('compliance')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'compliance'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <HiShieldCheck className="w-5 h-5 mr-2" />
              Compliance
            </button>
            <button
              onClick={() => handleTabChange('billing')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'billing'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Billing
            </button>
            <button
              onClick={() => handleTabChange('invoice')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invoice'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Invoice
            </button>
            <button
              onClick={() => handleTabChange('jobs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'jobs'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Jobs
            </button>
            <button
              onClick={() => handleTabChange('team')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'team'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Team
            </button>
            <button
              onClick={() => handleTabChange('activity')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'activity'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Activity Log
            </button>
          </nav>
        </div>
      </div>

      {/* Organisation Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-xs tracking-wider uppercase text-gray-500 font-semibold mb-4">
                Organisation Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 border-t border-gray-100 pt-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Organisation Name</p>
                  <p className="text-base font-semibold text-gray-900">{organization.companyName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Organisation ID</p>
                  <p className="text-base font-semibold text-gray-900">{organization.id}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Category</p>
                  <p className="text-base font-semibold text-gray-900">
                    {getCategoryLabel(
                      registration?.step3?.category || registration?.step8?.category || 'business',
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Industry</p>
                  <p className="text-base font-semibold text-gray-900">{organization.industry || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Registration Type</p>
                  <p className="text-base font-semibold text-gray-900">{isRegistered ? 'Incorporated' : 'Unregistered'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Country of Operation</p>
                  <p className="text-base font-semibold text-gray-900">{organization.country || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Date Founded</p>
                  <p className="text-base font-semibold text-gray-900">
                    {registration?.step4?.foundedDate
                      ? new Date(registration.step4.foundedDate).toLocaleDateString()
                      : registration?.step7?.foundedDate
                        ? new Date(registration.step7.foundedDate).toLocaleDateString()
                        : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Website</p>
                  <p className="text-base font-semibold text-brand-700">{organization.website || '—'}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Description</p>
                <p className="text-sm text-gray-700 mt-1">
                  {organization.description ||
                    registration?.step4?.description ||
                    registration?.step7?.description ||
                    'No description provided.'}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-xs tracking-wider uppercase text-gray-500 font-semibold mb-4">
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 border-t border-gray-100 pt-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Primary Email</p>
                  <p className="text-base font-semibold text-gray-900">{organization.user?.email || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Phone</p>
                  <p className="text-base font-semibold text-gray-900">{organization.user?.phoneNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Office Address</p>
                  <p className="text-base font-semibold text-gray-900">
                    {[
                      (organization.address as any)?.street || registration?.step4?.address?.street || registration?.step7?.address?.street,
                      (organization.address as any)?.city || registration?.step4?.address?.city || registration?.step7?.address?.city,
                      (organization.address as any)?.country || registration?.step4?.address?.country || registration?.step7?.address?.country,
                    ]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Admin Contact</p>
                  <p className="text-base font-semibold text-gray-900">
                    {`${organization.user?.firstName || ''} ${organization.user?.lastName || ''}`.trim() || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-xs tracking-wider uppercase text-gray-500 font-semibold mb-4">Account Status</h3>
              <div className="space-y-3 border-t border-gray-100 pt-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Status</p>
                  <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                    {organization.user?.status === 'ACTIVE' ? 'Active' : organization.user?.status || 'Pending'}
                  </span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">KYB Compliance</p>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border ${
                      organization.verificationStatus === 'verified'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    {organization.verificationStatus === 'verified' ? 'Verified' : 'Not Verified'}
                  </span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Date Joined</p>
                  <p className="text-base font-semibold text-gray-900">
                    {organization.createdAt ? new Date(organization.createdAt).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Last Active</p>
                  <p className="text-base font-semibold text-gray-900">
                    {organization.updatedAt ? new Date(organization.updatedAt).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Current Plan</p>
                  <p className="text-base font-semibold text-brand-700">{activePlanName}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-xs tracking-wider uppercase text-gray-500 font-semibold mb-4">At a Glance</h3>
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Active Jobs</span>
                  <span className="font-semibold text-gray-900">
                    {jobsRows.filter((job) => job.status === 'active').length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Team Members</span>
                  <span className="font-semibold text-gray-900">{teamRows.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Wallet Balance</span>
                  <span className="font-semibold text-green-700">₦{walletBalance.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Applicants</span>
                  <span className="font-semibold text-gray-900">
                    {jobsRows.reduce((acc, job) => acc + job.applicants, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Tab */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xs tracking-wider uppercase text-gray-500 font-semibold mb-4">
                  Incorporation Details
                </h3>
                <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Incorporation Number</p>
                  <p className="text-2xl font-semibold text-gray-900 mb-2">{incorporationNumber}</p>
                  <p className="text-sm text-gray-600 mb-3">
                    {incorporationCountry} · {verificationAuthority}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleVerify}
                      disabled={updating}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <HiPlay className="w-4 h-4" />
                      {updating
                        ? 'Running...'
                        : organization?.verificationStatus === 'verified'
                          ? 'Update KYB Status'
                          : 'Run KYB Check'}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      <HiDocumentText className="w-4 h-4" />
                      View Certificate
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xs tracking-wider uppercase text-gray-500 font-semibold mb-4">
                  KYB Compliance Checks
                </h3>
                <div className="space-y-3">
                  {complianceChecksUi.map((check) => (
                    <div
                      key={check.id}
                      className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-md bg-white border border-gray-200 flex items-center justify-center">
                          {getStatusLeadingIcon(check.status)}
                        </span>
                        <p className="text-sm font-medium text-gray-800">{check.title}</p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusPillClass(check.status)}`}
                      >
                        {getStatusText(check.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h4 className="text-xs tracking-wider uppercase text-gray-500 font-semibold mb-4">
                  KYB Score
                </h4>
                <div className="text-center mb-4">
                  <div className="text-5xl font-bold text-brand-600 leading-none">
                    {overallCompliance}/{totalChecks}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Checks Passed</p>
                </div>
                <div className="mb-3">
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all"
                      style={{ width: `${compliancePercentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{compliancePercentage}% completion</p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenKybDrawer}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <HiPlay className="w-4 h-4" />
                  Run Full KYB
                </button>
                <button
                  type="button"
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  <HiDownload className="w-4 h-4" />
                  Export KYB Report
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h4 className="text-xs tracking-wider uppercase text-gray-500 font-semibold mb-4">
                  Last KYB Run
                </h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500">Date</p>
                    <p className="font-medium text-gray-900">
                      {lastKybDate ? new Date(lastKybDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Run By</p>
                    <p className="font-medium text-gray-900">{runByName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Registry</p>
                    <p className="font-medium text-gray-900">{verificationAuthority} API</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Result</p>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusPillClass(
                        organization?.verificationStatus === 'verified' ? 'passed' : 'reviewing',
                      )}`}
                    >
                      {organization?.verificationStatus === 'verified' ? 'Passed' : 'Pending Review'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <p className="text-base font-medium text-gray-900">No billing data available</p>
          <p className="text-sm text-gray-500 mt-1">Billing details will appear here after API integration.</p>
        </div>
      )}

      {/* Invoice Tab */}
      {activeTab === 'invoice' && (
        invoiceRows.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
            <p className="text-base font-medium text-gray-900">No invoices available</p>
            <p className="text-sm text-gray-500 mt-1">Invoice history will appear here after API integration.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">{/* invoice table */}</div>
        )
      )}

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <p className="text-base font-medium text-gray-900">No jobs available</p>
          <p className="text-sm text-gray-500 mt-1">Job postings will appear here after API integration.</p>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <p className="text-base font-medium text-gray-900">No team members available</p>
          <p className="text-sm text-gray-500 mt-1">Team data will appear here after API integration.</p>
        </div>
      )}

      {/* Activity Log Tab */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <p className="text-base font-medium text-gray-900">No activity available</p>
          <p className="text-sm text-gray-500 mt-1">Activity log will appear here after API integration.</p>
        </div>
      )}

      {showKybDrawer && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close KYB drawer overlay"
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowKybDrawer(false)}
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l border-gray-200 flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-xs tracking-wider uppercase text-gray-500 font-semibold">Run Full KYB</p>
                <h3 className="text-lg font-semibold text-gray-900">{organization?.companyName || 'Organisation'}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowKybDrawer(false)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                <HiX className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Incorporation Number</p>
                <p className="text-2xl font-semibold text-gray-900">{incorporationNumber}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {incorporationCountry} · {verificationAuthority}
                </p>
              </div>

              <div>
                <label className="block text-xs tracking-wider uppercase text-gray-500 font-semibold mb-2">
                  Verify / Update Incorporation Number
                </label>
                <input
                  type="text"
                  value={kybIncorporationNumber}
                  onChange={(e) => setKybIncorporationNumber(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs tracking-wider uppercase text-gray-500 font-semibold mb-2">
                  Country of Incorporation
                </label>
                <select
                  value={kybCountry}
                  onChange={(e) => setKybCountry(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                >
                  <option>Nigeria — CAC</option>
                  <option>United Kingdom — Companies House</option>
                  <option>United States — State Registry</option>
                </select>
              </div>

              <div>
                <p className="text-xs tracking-wider uppercase text-gray-500 font-semibold mb-2">Checks to Run</p>
                <div className="space-y-2">
                  <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
                    <span className="text-gray-800">Business Registration Verification</span>
                    <input
                      type="checkbox"
                      checked={kybChecks.businessRegistration}
                      onChange={(e) => setKybChecks((prev) => ({ ...prev, businessRegistration: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
                    <span className="text-gray-800">Directorship Records</span>
                    <input
                      type="checkbox"
                      checked={kybChecks.directorshipRecords}
                      onChange={(e) => setKybChecks((prev) => ({ ...prev, directorshipRecords: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
                    <span className="text-gray-800">Tax Identification Number (TIN)</span>
                    <input
                      type="checkbox"
                      checked={kybChecks.taxIdentification}
                      onChange={(e) => setKybChecks((prev) => ({ ...prev, taxIdentification: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
                    <span className="text-gray-800">AML / Sanctions Screening</span>
                    <input
                      type="checkbox"
                      checked={kybChecks.amlScreening}
                      onChange={(e) => setKybChecks((prev) => ({ ...prev, amlScreening: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
                    <span className="text-gray-800">Adverse Media Check</span>
                    <input
                      type="checkbox"
                      checked={kybChecks.adverseMedia}
                      onChange={(e) => setKybChecks((prev) => ({ ...prev, adverseMedia: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                  </label>
                </div>
              </div>

              <div>
                <p className="text-xs tracking-wider uppercase text-gray-500 font-semibold mb-2">KYB Progress</p>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-3">
                  {kybProgressSteps.map((step) => (
                    <div key={step.id} className="flex items-start gap-3">
                      <span className="mt-0.5 w-6 h-6 rounded-full bg-green-100 border border-green-200 flex items-center justify-center">
                        <HiCheckCircle className="w-4 h-4 text-green-600" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{step.title}</p>
                        <p className="text-xs text-gray-500">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowKybDrawer(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setShowKybDrawer(false)}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                View Report
              </button>
            </div>
          </aside>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}

