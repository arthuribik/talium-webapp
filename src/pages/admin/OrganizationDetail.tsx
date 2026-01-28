import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';
import { HiArrowLeft, HiOfficeBuilding, HiCheckCircle, HiClock, HiDocumentText, HiGlobe, HiCalendar, HiShieldCheck, HiX } from 'react-icons/hi';
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

type Tab = 'overview' | 'compliance';

export default function OrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [organization, setOrganization] = useState<any>(null);
  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOrganizationDetail();
    }
  }, [id]);

  // Load tab from URL on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab') as Tab;
    if (tabParam && ['overview', 'compliance'].includes(tabParam)) {
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

  const renderField = (label: string, value: any, showIfEmpty = false) => {
    if (!value && !showIfEmpty) return null;
    return (
      <div>
        <label className="text-sm font-medium text-gray-500 mb-1 block">{label}</label>
        <p className="text-base text-gray-900">{value || 'N/A'}</p>
      </div>
    );
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'reviewing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <HiCheckCircle className="w-5 h-5 text-green-600" />;
      case 'reviewing':
        return <HiClock className="w-5 h-5 text-yellow-600" />;
      case 'pending':
        return <HiClock className="w-5 h-5 text-gray-600" />;
      case 'failed':
        return <HiX className="w-5 h-5 text-red-600" />;
      default:
        return <HiClock className="w-5 h-5 text-gray-600" />;
    }
  };

  const overallCompliance = complianceChecks.filter(check => check.status === 'passed').length;
  const totalChecks = complianceChecks.length;
  const compliancePercentage = Math.round((overallCompliance / totalChecks) * 100);

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
              onClick={() => handleTabChange('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
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
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Company Name</label>
                <p className="text-gray-900">{organization.companyName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Country</label>
                <p className="text-gray-900">{organization.country}</p>
              </div>
              {organization.industry && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Industry</label>
                  <p className="text-gray-900">{organization.industry}</p>
                </div>
              )}
              {organization.companySize && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Company Size</label>
                  <p className="text-gray-900">{organization.companySize}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Contact Email</label>
                <p className="text-gray-900">{organization.user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Contact Name</label>
                <p className="text-gray-900">
                  {organization.user.firstName} {organization.user.lastName}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Verification Status</label>
                <p className="text-gray-900 capitalize">{organization.verificationStatus}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Member Since</label>
                <p className="text-gray-900">{new Date(organization.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

        {registration && (
          <>
            {/* Registration Header */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
                    <HiDocumentText className="w-6 h-6 mr-2 text-brand-600" />
                    Registration Form Data
                  </h2>
                  <p className="text-gray-600">Registration ID: {registration.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  {registration.currentStep >= 6 ? (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full flex items-center">
                      <HiCheckCircle className="w-4 h-4 mr-1" />
                      Completed
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full flex items-center">
                      <HiClock className="w-4 h-4 mr-1" />
                      Step {registration.currentStep || 1}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Step 1: Registration Status */}
            {registration.step1 && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Step 1: Registration Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderField('Is Registered', registration.step1.isRegistered ? 'Yes' : 'No')}
                </div>
              </div>
            )}

            {/* Step 2: Incorporation Details (Registered Flow) */}
            {isRegistered && registration.step2 && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Step 2: Incorporation Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderField('Legal Name', registration.step2.legalName)}
                  {renderField('Country of Incorporation', registration.step2.countryOfIncorporation)}
                  {renderField('Incorporation Number', registration.step2.incorporationNumber)}
                </div>
              </div>
            )}

            {/* Step 3: Category (Registered Flow) */}
            {isRegistered && registration.step3 && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Step 3: Category</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderField('Category', getCategoryLabel(registration.step3.category))}
                  {registration.step3.schoolType && renderField('School Type', registration.step3.schoolType)}
                  {registration.step3.religiousOrgType && renderField('Religious Organisation Type', registration.step3.religiousOrgType)}
                  {registration.step3.internationalOrgType && renderField('International Organisation Type', registration.step3.internationalOrgType)}
                  {registration.step3.politicalPartyCountry && renderField('Political Party Country', registration.step3.politicalPartyCountry)}
                  {registration.step3.associatedSchool && renderField('Associated School', registration.step3.associatedSchool)}
                </div>
              </div>
            )}

            {/* Step 4: Description & Details (Registered Flow) */}
            {isRegistered && registration.step4 && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Step 4: Organisation Details</h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderField('Description', registration.step4.description)}
                    {renderField('Other Name (Known As)', registration.step4.otherName)}
                    {renderField('Industry', registration.step4.industry)}
                    {renderField('Headquarters City', registration.step4.headquartersCity)}
                    {renderField('Headquarters Country', registration.step4.headquartersCountry)}
                    {renderField('Founded Date', registration.step4.foundedDate ? new Date(registration.step4.foundedDate).toLocaleDateString() : null)}
                  </div>
                  
                  {registration.step4.address && (
                    <div className="border-t pt-6">
                      <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                        <HiGlobe className="w-5 h-5 mr-2 text-brand-600" />
                        Address
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderField('Building Name', registration.step4.address.buildingName)}
                        {renderField('Street Number', registration.step4.address.streetNumber)}
                        {renderField('Street', registration.step4.address.street)}
                        {renderField('City', registration.step4.address.city)}
                        {renderField('Country', registration.step4.address.country)}
                      </div>
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500 mb-1">Full Address</p>
                        <p className="text-gray-900">
                          {[
                            registration.step4.address.buildingName,
                            registration.step4.address.streetNumber,
                            registration.step4.address.street,
                            registration.step4.address.city,
                            registration.step4.address.country,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Email Verification */}
            {registration.step5 && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Step 5: Email Verification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderField('Organisation Email', registration.step5.organisationEmail, true)}
                </div>
              </div>
            )}

            {/* Step 7: Organisation Details (Non-Registered Flow) */}
            {!isRegistered && registration.step7 && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Step 7: Organisation Details</h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderField('Organisation Name', registration.step7.organisationName)}
                    {renderField('Organisation Country', registration.step7.organisationCountry)}
                    {renderField('Description', registration.step7.description)}
                    {renderField('Industry', registration.step7.industry)}
                    {renderField('Founded Date', registration.step7.foundedDate ? new Date(registration.step7.foundedDate).toLocaleDateString() : null)}
                  </div>
                  
                  {registration.step7.address && (
                    <div className="border-t pt-6">
                      <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                        <HiGlobe className="w-5 h-5 mr-2 text-brand-600" />
                        Address
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderField('Building Name', registration.step7.address.buildingName)}
                        {renderField('Street Number', registration.step7.address.streetNumber)}
                        {renderField('Street', registration.step7.address.street)}
                        {renderField('City', registration.step7.address.city)}
                        {renderField('Country', registration.step7.address.country)}
                      </div>
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500 mb-1">Full Address</p>
                        <p className="text-gray-900">
                          {[
                            registration.step7.address.buildingName,
                            registration.step7.address.streetNumber,
                            registration.step7.address.street,
                            registration.step7.address.city,
                            registration.step7.address.country,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 8: Category (Non-Registered Flow) */}
            {!isRegistered && registration.step8 && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Step 8: Category</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderField('Category', getCategoryLabel(registration.step8.category))}
                  {registration.step8.schoolType && renderField('School Type', registration.step8.schoolType)}
                  {registration.step8.religiousOrgType && renderField('Religious Organisation Type', registration.step8.religiousOrgType)}
                  {registration.step8.internationalOrgType && renderField('International Organisation Type', registration.step8.internationalOrgType)}
                  {registration.step8.politicalPartyCountry && renderField('Political Party Country', registration.step8.politicalPartyCountry)}
                  {registration.step8.associatedSchool && renderField('Associated School', registration.step8.associatedSchool)}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <HiCalendar className="w-5 h-5 mr-2 text-brand-600" />
                Timestamps
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {registration.createdAt && renderField('Created At', new Date(registration.createdAt).toLocaleString())}
                {registration.updatedAt && renderField('Last Updated', new Date(registration.updatedAt).toLocaleString())}
              </div>
            </div>
          </>
        )}
        </>
      )}

      {/* Compliance Tab */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          {/* Compliance Overview Card */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                  <HiShieldCheck className="w-6 h-6 mr-2 text-brand-600" />
                  Business Compliance
                </h2>
                <p className="text-gray-600">Comprehensive compliance status for {organization?.companyName}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-4xl font-bold text-brand-600">{compliancePercentage}%</div>
                  <div className="text-sm text-gray-500">Compliance Score</div>
                </div>
                {/* Toggle Verify Button */}
                <div>
                  {organization?.verificationStatus === 'verified' ? (
                    <button
                      onClick={handleToggleVerify}
                      disabled={updating}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                    >
                      <HiX className="w-4 h-4 mr-1" />
                      {updating ? 'Unverifying...' : 'Unverify Business'}
                    </button>
                  ) : (
                    <button
                      onClick={handleToggleVerify}
                      disabled={updating}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                    >
                      <HiCheckCircle className="w-4 h-4 mr-1" />
                      {updating ? 'Verifying...' : 'Verify Business'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>{overallCompliance} of {totalChecks} checks passed</span>
                <span>{compliancePercentage}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    compliancePercentage === 100
                      ? 'bg-green-500'
                      : compliancePercentage >= 70
                      ? 'bg-brand-500'
                      : compliancePercentage >= 50
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${compliancePercentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Compliance Checks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {complianceChecks.map((check) => (
              <div
                key={check.id}
                className="bg-white rounded-xl shadow-sm p-6 border-2 border-transparent hover:border-brand-200 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{check.title}</h3>
                    <p className="text-sm text-gray-600">{check.description}</p>
                  </div>
                  <div className={`ml-4 p-2 rounded-lg border ${getStatusColor(check.status)}`}>
                    {getStatusIcon(check.status)}
                  </div>
                </div>

                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-4 ${getStatusColor(check.status)}`}>
                  {check.status.charAt(0).toUpperCase() + check.status.slice(1)}
                </div>

                {/* Check Details */}
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  {Object.entries(check.details).map(([key, value]) => {
                    if (value === null || value === undefined || value === '') return null;
                    if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
                      return Object.entries(value).map(([subKey, subValue]) => {
                        if (subValue === null || subValue === undefined || subValue === '') return null;
                        return (
                          <div key={`${key}-${subKey}`} className="flex justify-between text-sm">
                            <span className="text-gray-500 capitalize">{subKey.replace(/([A-Z])/g, ' $1').trim()}:</span>
                            <span className="text-gray-900 font-medium">{String(subValue)}</span>
                          </div>
                        );
                      });
                    }
                    return (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <span className="text-gray-900 font-medium">
                          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}

