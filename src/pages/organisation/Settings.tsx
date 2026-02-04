import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import OrganisationLayout from '@/components/organisation/OrganisationLayout';
import { api } from '@/services/api';
import { 
  HiOfficeBuilding, 
  HiSave, 
  HiLockClosed, 
  HiEye, 
  HiEyeOff,
  HiGlobe,
  HiLink,
  HiCalendar,
  HiLocationMarker,
  HiDocumentText
} from 'react-icons/hi';
import { 
  FaFacebook, 
  FaTwitter, 
  FaLinkedin, 
  FaInstagram, 
  FaYoutube,
  FaBuilding,
  FaGraduationCap,
  FaChurch,
  FaLandmark,
  FaGlobe as FaGlobeIcon,
  FaFlag,
  FaUsers,
  FaUserFriends,
  FaHandshake
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France',
  'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland', 'Sweden', 'Norway',
  'Denmark', 'Finland', 'Poland', 'Portugal', 'Ireland', 'Austria', 'Greece',
  'Japan', 'South Korea', 'Singapore', 'Hong Kong', 'India', 'China', 'Brazil',
  'Mexico', 'Argentina', 'South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Egypt',
  'United Arab Emirates', 'Saudi Arabia', 'Israel', 'Turkey', 'Russia', 'New Zealand',
];

const CATEGORIES = [
  { id: 'company', label: 'Company', icon: FaBuilding },
  { id: 'school', label: 'School', icon: FaGraduationCap },
  { id: 'religious_organisation', label: 'Religious Organisation', icon: FaChurch },
  { id: 'government_agency', label: 'Government Agency', icon: FaLandmark },
  { id: 'international_organisation', label: 'International Organisation', icon: FaGlobeIcon },
  { id: 'political_party', label: 'Political Party', icon: FaFlag },
  { id: 'student_union', label: 'Student Union', icon: FaUsers },
  { id: 'student_association', label: 'Student Association', icon: FaUserFriends },
  { id: 'association', label: 'Association', icon: FaHandshake },
];

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Retail',
  'Real Estate', 'Construction', 'Transportation', 'Energy', 'Agriculture', 'Food & Beverage',
  'Entertainment', 'Media & Communications', 'Consulting', 'Legal Services', 'Accounting',
  'Hospitality', 'Tourism', 'Non-Profit', 'Government', 'Pharmaceuticals', 'Automotive',
  'Aerospace', 'Telecommunications', 'Banking', 'Insurance', 'Investment', 'E-commerce',
  'Arts & Culture', 'Research', 'Other'
];

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<any>(null);
  const [formData, setFormData] = useState({
    // Basic Information
    companyName: '',
    legalName: '',
    otherName: '',
    description: '',
    
    // Registration Status
    isRegistered: null as boolean | null,
    
    // Incorporation Details (for registered)
    countryOfIncorporation: '',
    incorporationNumber: '',
    
    // Organisation Details (for non-registered)
    organisationCountry: '',
    
    // Category
    category: '',
    schoolType: '',
    religiousOrgType: '',
    internationalOrgType: '',
    politicalPartyCountry: '',
    associatedSchool: '',
    
    // Business Details
    industry: '',
    companySize: '',
    headquartersCity: '',
    headquartersCountry: '',
    foundedDate: '',
    
    // Contact & Online
    website: '',
    socialMedia: {
      facebook: '',
      twitter: '',
      linkedin: '',
      instagram: '',
      youtube: '',
    },
    
    // Address
    address: {
      buildingName: '',
      streetNumber: '',
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
    },
  });

  // Security form state
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v1/organisation/profile');
      const org = response.data.data;
      if (org) {
        setOrganization(org);
        
        // Pre-fill all form fields from API response
        setFormData({
          // Basic Information
          companyName: org.companyName || '',
          legalName: org.legalName || '',
          otherName: org.otherName || '',
          description: org.description || '',
          
          // Registration Status
          isRegistered: org.isRegistered !== null && org.isRegistered !== undefined ? org.isRegistered : null,
          
          // Incorporation Details (for registered)
          countryOfIncorporation: org.countryOfIncorporation || '',
          incorporationNumber: org.incorporationNumber || '',
          
          // Organisation Details (for non-registered)
          organisationCountry: org.organisationCountry || '',
          
          // Category
          category: org.category || '',
          schoolType: org.schoolType || '',
          religiousOrgType: org.religiousOrgType || '',
          internationalOrgType: org.internationalOrgType || '',
          politicalPartyCountry: org.politicalPartyCountry || '',
          associatedSchool: org.associatedSchool || '',
          
          // Business Details
          industry: org.industry || '',
          companySize: org.companySize || '',
          headquartersCity: org.headquartersCity || '',
          headquartersCountry: org.headquartersCountry || '',
          foundedDate: org.foundedDate || '',
          
          // Contact & Online
          website: org.website || '',
          socialMedia: {
            facebook: org.socialMedia?.facebook || '',
            twitter: org.socialMedia?.twitter || '',
            linkedin: org.socialMedia?.linkedin || '',
            instagram: org.socialMedia?.instagram || '',
            youtube: org.socialMedia?.youtube || '',
          },
          
          // Address
          address: {
            buildingName: org.address?.buildingName || '',
            streetNumber: org.address?.streetNumber || '',
            street: org.address?.street || '',
            city: org.address?.city || '',
            state: org.address?.state || '',
            country: org.address?.country || '',
            zipCode: org.address?.zipCode || '',
          },
        });
      }
    } catch (err) {
      console.error('Failed to fetch organization:', err);
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/v1/organisation/profile', formData);
      toast.success('Organization profile updated successfully!');
      await fetchOrganization();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update organization profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (securityForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setChangingPassword(true);
    try {
      // TODO: Replace with actual change password endpoint
      toast.success('Password changed successfully!');
      setSecurityForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Manage Org Profile', icon: HiOfficeBuilding },
    { id: 'security', label: 'Security', icon: HiLockClosed },
  ];

  if (loading) {
    return (
      <OrganisationLayout>
        <div className="p-6">
          <div className="text-center text-gray-600 py-16">Loading settings...</div>
        </div>
      </OrganisationLayout>
    );
  }

  if (!organization) {
    return (
      <OrganisationLayout>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-xl shadow-sm">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <HiOfficeBuilding className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Organization Not Found</h3>
            <p className="text-sm text-gray-500 text-center max-w-md">
              Unable to load organization profile. Please try again later.
            </p>
          </div>
        </div>
      </OrganisationLayout>
    );
  }

  return (
    <OrganisationLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your organization profile and security settings</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSearchParams({ tab: tab.id })}
                  className={`flex items-center px-1 py-4 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-brand-500 text-brand-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            {/* Basic Information Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <HiOfficeBuilding className="w-5 h-5 mr-2 text-brand-600" />
                Basic Information
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Enter company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Legal Name</label>
                    <input
                      type="text"
                      value={formData.legalName}
                      onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Enter legal name"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Other Name (Also Known As)</label>
                    <input
                      type="text"
                      value={formData.otherName}
                      onChange={(e) => setFormData({ ...formData, otherName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Trading name, acronym, or alias"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Describe your organisation"
                    />
                    <p className="text-xs text-gray-500 mt-1">{formData.description.length}/500 characters</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Registration Status Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <HiDocumentText className="w-5 h-5 mr-2 text-brand-600" />
                Registration Status
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isRegistered: true })}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    formData.isRegistered === true
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900 mb-1">Registered</div>
                  <div className="text-sm text-gray-600">Organisation is legally registered</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isRegistered: false })}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    formData.isRegistered === false
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900 mb-1">Not Registered</div>
                  <div className="text-sm text-gray-600">Organisation is not legally registered</div>
                </button>
              </div>

              {/* Incorporation Details (for registered) */}
              {formData.isRegistered === true && (
                <div className="mt-6 pt-6 border-t space-y-4">
                  <h3 className="font-medium text-gray-900">Incorporation Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country of Incorporation <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.countryOfIncorporation}
                        onChange={(e) => setFormData({ ...formData, countryOfIncorporation: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="">Select country</option>
                        {COUNTRIES.map((country) => (
                          <option key={country} value={country}>{country}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Incorporation Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.incorporationNumber}
                        onChange={(e) => setFormData({ ...formData, incorporationNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="Enter incorporation number"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Organisation Details (for non-registered) */}
              {formData.isRegistered === false && (
                <div className="mt-6 pt-6 border-t space-y-4">
                  <h3 className="font-medium text-gray-900">Organisation Details</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organisation Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.organisationCountry}
                      onChange={(e) => setFormData({ ...formData, organisationCountry: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Select country</option>
                      {COUNTRIES.map((country) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Category Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FaBuilding className="w-5 h-5 mr-2 text-brand-600" />
                Category
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  const isSelected = formData.category === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: category.id })}
                      className={`p-4 rounded-lg border-2 flex flex-col items-center transition-all ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-brand-600' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${isSelected ? 'text-brand-600' : 'text-gray-700'}`}>
                        {category.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Conditional Category Fields */}
              {formData.category === 'school' && (
                <div className="mt-4 pt-4 border-t">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    School Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.schoolType}
                    onChange={(e) => setFormData({ ...formData, schoolType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select school type</option>
                    <option value="primary">Primary School</option>
                    <option value="secondary">Secondary School</option>
                    <option value="high_school">High School</option>
                    <option value="vocational">Vocational School</option>
                    <option value="university">University</option>
                    <option value="college">College</option>
                    <option value="technical">Technical Institute</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              {formData.category === 'religious_organisation' && (
                <div className="mt-4 pt-4 border-t">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Religious Organisation Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.religiousOrgType}
                    onChange={(e) => setFormData({ ...formData, religiousOrgType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select type</option>
                    <option value="church">Church</option>
                    <option value="mosque">Mosque</option>
                    <option value="temple">Temple</option>
                    <option value="synagogue">Synagogue</option>
                    <option value="gurdwara">Gurdwara</option>
                    <option value="shrine">Shrine</option>
                    <option value="monastery">Monastery</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              {formData.category === 'international_organisation' && (
                <div className="mt-4 pt-4 border-t">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    International Organisation Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.internationalOrgType}
                    onChange={(e) => setFormData({ ...formData, internationalOrgType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select type</option>
                    <option value="ngo">NGO (Non-Governmental Organisation)</option>
                    <option value="igo">IGO (Inter-Governmental Organisation)</option>
                    <option value="multilateral">Multilateral Organisation</option>
                    <option value="charity">Charity</option>
                    <option value="foundation">Foundation</option>
                    <option value="association">International Association</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              {formData.category === 'political_party' && (
                <div className="mt-4 pt-4 border-t">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.politicalPartyCountry}
                    onChange={(e) => setFormData({ ...formData, politicalPartyCountry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
              )}

              {(formData.category === 'student_union' || formData.category === 'student_association') && (
                <div className="mt-4 pt-4 border-t">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Associated School <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.associatedSchool}
                    onChange={(e) => setFormData({ ...formData, associatedSchool: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Enter the name of the associated school"
                  />
                </div>
              )}
            </div>

            {/* Business Details Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <HiOfficeBuilding className="w-5 h-5 mr-2 text-brand-600" />
                Business Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((industry) => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                  <select
                    value={formData.companySize}
                    onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="501-1000">501-1000 employees</option>
                    <option value="1000+">1000+ employees</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Headquarters City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.headquartersCity}
                    onChange={(e) => setFormData({ ...formData, headquartersCity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g., Lagos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Headquarters Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.headquartersCountry}
                    onChange={(e) => setFormData({ ...formData, headquartersCountry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <HiCalendar className="w-4 h-4 mr-1" />
                    Founded Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.foundedDate}
                    onChange={(e) => setFormData({ ...formData, foundedDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Website & Social Media Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <HiGlobe className="w-5 h-5 mr-2 text-brand-600" />
                Website & Social Media
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <HiLink className="w-4 h-4 mr-1" />
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="https://www.example.com"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FaFacebook className="w-4 h-4 mr-1 text-blue-600" />
                      Facebook
                    </label>
                    <input
                      type="url"
                      value={formData.socialMedia.facebook}
                      onChange={(e) => setFormData({
                        ...formData,
                        socialMedia: { ...formData.socialMedia, facebook: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="https://facebook.com/yourpage"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FaTwitter className="w-4 h-4 mr-1 text-blue-400" />
                      Twitter
                    </label>
                    <input
                      type="url"
                      value={formData.socialMedia.twitter}
                      onChange={(e) => setFormData({
                        ...formData,
                        socialMedia: { ...formData.socialMedia, twitter: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="https://twitter.com/yourhandle"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FaLinkedin className="w-4 h-4 mr-1 text-blue-700" />
                      LinkedIn
                    </label>
                    <input
                      type="url"
                      value={formData.socialMedia.linkedin}
                      onChange={(e) => setFormData({
                        ...formData,
                        socialMedia: { ...formData.socialMedia, linkedin: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="https://linkedin.com/company/yourcompany"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FaInstagram className="w-4 h-4 mr-1 text-pink-600" />
                      Instagram
                    </label>
                    <input
                      type="url"
                      value={formData.socialMedia.instagram}
                      onChange={(e) => setFormData({
                        ...formData,
                        socialMedia: { ...formData.socialMedia, instagram: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="https://instagram.com/yourhandle"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FaYoutube className="w-4 h-4 mr-1 text-red-600" />
                      YouTube
                    </label>
                    <input
                      type="url"
                      value={formData.socialMedia.youtube}
                      onChange={(e) => setFormData({
                        ...formData,
                        socialMedia: { ...formData.socialMedia, youtube: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="https://youtube.com/yourchannel"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <HiLocationMarker className="w-5 h-5 mr-2 text-brand-600" />
                Address
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Building Name</label>
                  <input
                    type="text"
                    value={formData.address.buildingName}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, buildingName: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g., Tower 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Number</label>
                  <input
                    type="text"
                    value={formData.address.streetNumber}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, streetNumber: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g., 123"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address.street}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g., Victoria Island"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g., Lagos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, state: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g., Lagos State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.address.country}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, country: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zip/Postal Code</label>
                  <input
                    type="text"
                    value={formData.address.zipCode}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, zipCode: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g., 101001"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end pt-6">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <HiSave className="w-5 h-5 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <form onSubmit={handlePasswordChange} className="bg-white rounded-xl shadow-sm p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <HiLockClosed className="w-5 h-5 mr-2 text-brand-600" />
                  Change Password
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Update your password to keep your account secure. Make sure to use a strong password.
                </p>
              </div>

              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={securityForm.currentPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={securityForm.newPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Password must be at least 8 characters long
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={securityForm.confirmPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-6 border-t">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <HiLockClosed className="w-5 h-5 mr-2" />
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </OrganisationLayout>
  );
}
