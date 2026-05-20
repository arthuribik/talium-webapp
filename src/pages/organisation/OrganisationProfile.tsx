import { useState, useEffect, useRef } from 'react';
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
  HiDocumentText,
  HiPencil,
  HiExternalLink,
  HiDotsVertical,
  HiPlus,
  HiTrash,
  HiShieldCheck,
  HiInformationCircle,
  HiAtSymbol,
  HiPhone,
  HiX,
  HiCheckCircle,
  HiUserGroup,
  HiCamera,
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
  FaHandshake,
  FaEnvelope
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { COUNTRIES } from '@/utils/countries';
import PhoneNumberInput from '@/components/common/PhoneNumberInput';

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

/** Organisation profile (overview, employees, public) at `/organization/profile`. */
export default function OrganisationProfile() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'overview';
  const normalizedTab = tabParam === 'profile' ? 'overview' : tabParam;
  const activeTab = normalizedTab === 'security' ? 'overview' : normalizedTab;
  const [profileEditMode, setProfileEditMode] = useState(false);

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Array<{ id: string; firstName: string; lastName: string; name: string; title: string; bio?: string | null; email?: string | null; linkedInUrl?: string | null }>>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeDrawerOpen, setEmployeeDrawerOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeMenuOpen, setEmployeeMenuOpen] = useState<string | null>(null);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({ firstName: '', lastName: '', title: '', bio: '', email: '', linkedInUrl: '' });
  const employeeMenuRef = useRef<HTMLDivElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<any>(null);
  const [kybDrawerOpen, setKybDrawerOpen] = useState(false);
  const [kybSubmitting, setKybSubmitting] = useState(false);
  const [kybForm, setKybForm] = useState({
    legalName: '',
    incorporationNumber: '',
    countryOfIncorporation: '',
    yearOfIncorporation: '',
  });
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
    organisationName: '',
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
    organisationEmail: '',
    phoneNumber: '',
    supportEmail: '',
    officialEmailDomain: '',
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

  useEffect(() => {
    if (activeTab === 'employees' || activeTab === 'public') fetchEmployees();
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (employeeMenuRef.current && !employeeMenuRef.current.contains(e.target as Node)) {
        setEmployeeMenuOpen(null);
      }
    };
    if (employeeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [employeeMenuOpen]);

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
          organisationName: org.organisationName || org.companyName || '',
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
          organisationEmail: org.user?.email || '',
          phoneNumber: org.user?.phoneNumber || '',
          supportEmail: org.supportEmail || org.user?.email || '',
          officialEmailDomain:
            org.officialEmailDomain ||
            (org.user?.email?.includes('@')
              ? `@${org.user.email.split('@').pop()}`
              : ''),
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

  const fetchEmployees = async () => {
    setEmployeesLoading(true);
    try {
      const res = await api.get('/v1/organisation/employees');
      setEmployees(res.data?.data?.employees ?? []);
    } catch {
      setEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const openAddEmployee = () => {
    setEditingEmployeeId(null);
    setEmployeeForm({ firstName: '', lastName: '', title: '', bio: '', email: '', linkedInUrl: '' });
    setEmployeeDrawerOpen(true);
  };

  const openEditEmployee = (emp: typeof employees[0]) => {
    setEditingEmployeeId(emp.id);
    setEmployeeForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      title: emp.title,
      bio: emp.bio ?? '',
      email: emp.email ?? '',
      linkedInUrl: emp.linkedInUrl ?? '',
    });
    setEmployeeMenuOpen(null);
    setEmployeeDrawerOpen(true);
  };

  const saveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmployee(true);
    try {
      if (editingEmployeeId) {
        await api.put(`/v1/organisation/employees/${editingEmployeeId}`, employeeForm);
        toast.success('Employee updated');
      } else {
        await api.post('/v1/organisation/employees', employeeForm);
        toast.success('Employee added');
      }
      setEmployeeDrawerOpen(false);
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to save employee');
    } finally {
      setSavingEmployee(false);
    }
  };

  const deleteEmployee = async (id: string) => {
    if (!window.confirm('Remove this employee from the list?')) return;
    setEmployeeMenuOpen(null);
    try {
      await api.delete(`/v1/organisation/employees/${id}`);
      toast.success('Employee removed');
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to remove employee');
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post('/v1/organisation/upload-logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Logo updated');
      await fetchOrganization();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Could not upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const removeOrganisationLogo = async () => {
    if (!organization?.logoUrl) return;
    if (!window.confirm('Remove your organisation logo?')) return;
    setLogoUploading(true);
    try {
      await api.delete('/v1/organisation/logo');
      toast.success('Logo removed');
      await fetchOrganization();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Could not remove logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const copyPublicShareLink = async () => {
    if (!organization?.id) {
      toast.error('Organisation not loaded yet');
      return;
    }
    const url = `${window.location.origin}/organisations/${organization.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Shareable link copied to clipboard');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const openKybDrawer = () => {
    if (!organization) return;
    const legal =
      formData.legalName ||
      formData.companyName ||
      formData.organisationName ||
      organization.companyName ||
      '';
    const yearRaw =
      organization.yearOfCommencement ??
      (formData.foundedDate ? new Date(formData.foundedDate).getFullYear() : '');
    setKybForm({
      legalName: legal,
      incorporationNumber: formData.incorporationNumber || '',
      countryOfIncorporation: formData.countryOfIncorporation || '',
      yearOfIncorporation: yearRaw !== '' && yearRaw != null ? String(yearRaw) : '',
    });
    setKybDrawerOpen(true);
  };

  const submitKybIncorporation = async (e: React.FormEvent) => {
    e.preventDefault();
    const year = parseInt(kybForm.yearOfIncorporation, 10);
    if (
      !kybForm.legalName.trim() ||
      !kybForm.incorporationNumber.trim() ||
      !kybForm.countryOfIncorporation.trim()
    ) {
      toast.error('Please complete all fields');
      return;
    }
    if (!Number.isFinite(year)) {
      toast.error('Enter a valid year of incorporation');
      return;
    }
    const maxY = new Date().getFullYear() + 1;
    if (year < 1800 || year > maxY) {
      toast.error(`Year must be between 1800 and ${maxY}`);
      return;
    }
    setKybSubmitting(true);
    try {
      await api.post('/v1/organisation/verification/kyb-incorporation', {
        legalName: kybForm.legalName.trim(),
        incorporationNumber: kybForm.incorporationNumber.trim(),
        countryOfIncorporation: kybForm.countryOfIncorporation.trim(),
        yearOfIncorporation: year,
      });
      toast.success('KYB details submitted. Your organisation is under review.');
      setKybDrawerOpen(false);
      await fetchOrganization();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not submit KYB details');
    } finally {
      setKybSubmitting(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/v1/organisation/profile', formData);
      toast.success('Organization profile updated successfully!');
      await fetchOrganization();
      setProfileEditMode(false);
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

  const profileTabs = [
    { id: 'overview', label: 'Organisation Overview', icon: HiOfficeBuilding },
    { id: 'employees', label: 'Employees / Associates', icon: FaUsers },
    { id: 'public', label: 'Public Page', icon: HiGlobe },
  ];
  const tabs = profileTabs;

  const setTab = (id: string) => setSearchParams({ tab: id === 'overview' ? 'overview' : id });

  const displayName = formData.companyName || formData.legalName || formData.organisationName || organization?.companyName || '';
  const alsoKnownAs = formData.otherName || organization?.otherName || '';
  const categoryLabel = CATEGORIES.find((c) => c.id === formData.category)?.label || formData.category || 'Company';
  const onTrudiumSince = organization?.createdAt ? new Date(organization.createdAt).getFullYear() : new Date().getFullYear();
  const locationStr = [formData.headquartersCity || formData.address?.city, formData.headquartersCountry || formData.address?.country].filter(Boolean).join(', ') || '—';
  const physicalAddress = [
    formData.address?.buildingName,
    formData.address?.streetNumber,
    formData.address?.street,
    formData.address?.city,
    formData.address?.state,
    formData.address?.country,
  ].filter(Boolean).join(', ') || '—';
  const foundedYear = formData.foundedDate ? new Date(formData.foundedDate).getFullYear() : null;
  const yearOfIncorporation = foundedYear || (formData.countryOfIncorporation ? new Date().getFullYear() : null);

  const kybVerified = organization?.verificationStatus === 'verified' || organization?.verified;
  const kybFieldsLocked = kybVerified;
  const lockedFieldClass = kybFieldsLocked
    ? 'bg-gray-50 text-gray-700 cursor-not-allowed'
    : '';
  const kybReview =
    organization?.verificationStatus === 'under_review' ||
    String(organization?.verificationStatus || '').toLowerCase() === 'pending_review';
  const kybStatusHeader =
    kybVerified ? 'Verified' : kybReview ? 'Under review' : 'Unverified';
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
      <div className="min-h-screen bg-[#F7F7F7] p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Organisation Profile</h1>
              <p className="text-gray-600 text-sm">Manage your organisation&apos;s public profile and team</p>
            </div>
            {organization && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0 mt-0.5 ${
                  kybVerified
                    ? 'bg-emerald-100 text-emerald-800'
                    : kybReview
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                <HiInformationCircle className="w-4 h-4 shrink-0" />
                {kybStatusHeader}
              </span>
            )}
          </div>
          {activeTab === 'overview' && !profileEditMode && (
            <button
              type="button"
              onClick={() => setProfileEditMode(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#152942] transition-colors text-sm font-medium shrink-0"
            >
              <HiPencil className="w-4 h-4" />
              Edit Profile
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-t-xl border border-b-0 border-gray-200 px-4 pt-2">
          <nav className="flex gap-1">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setTab(tab.id); if (tab.id !== 'overview') setProfileEditMode(false); }}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors -mb-px ${
                    isActive
                      ? 'border-[#1e3a5f] text-[#1e3a5f] bg-gray-50/80'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Organisation Overview — view mode: five cards */}
        {activeTab === 'overview' && !profileEditMode && (
          <div className="space-y-6 pb-8">
            {/* Card 1: Organisation Overview */}
            <div className="bg-white rounded-b-xl rounded-t-none shadow-sm border border-t-0 border-gray-200 p-6">
              <div className="flex flex-wrap items-start gap-6">
                <div className="flex shrink-0 flex-col items-stretch gap-2">
                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleLogoFileChange}
                  />
                  <div className="group relative h-36 w-36 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                    {organization?.logoUrl ? (
                      <img
                        src={organization.logoUrl}
                        alt=""
                        className="h-full w-full object-contain object-center p-2"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <HiOfficeBuilding className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                    {logoUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/85 text-xs font-medium text-gray-600">
                        Uploading…
                      </div>
                    )}
                    {!logoUploading && (
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                        <button
                          type="button"
                          title={organization?.logoUrl ? 'Replace logo' : 'Upload logo'}
                          onClick={() => logoFileInputRef.current?.click()}
                          className="rounded-full bg-white p-2 text-[#1e3a5f] shadow-md hover:bg-gray-50"
                        >
                          <HiCamera className="h-5 w-5" />
                        </button>
                        {organization?.logoUrl ? (
                          <button
                            type="button"
                            title="Remove logo"
                            onClick={removeOrganisationLogo}
                            className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-red-600 shadow-md hover:bg-red-50"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    disabled={logoUploading}
                    className="text-center text-xs font-semibold text-[#1e3a5f] hover:underline disabled:opacity-50"
                  >
                    {organization?.logoUrl ? 'Replace logo' : 'Upload logo'}
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{displayName || '—'}</h2>
                  {alsoKnownAs && (
                    <p className="text-sm text-gray-500 mb-3">Also known as: {alsoKnownAs}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#1e3a5f] text-white">
                      {categoryLabel}
                    </span>
                    {formData.industry && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#1e3a5f] text-white">
                        {formData.industry}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        kybVerified
                          ? 'bg-emerald-100 text-emerald-800'
                          : kybReview
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <HiInformationCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                      KYB: {kybVerified ? 'Verified' : kybReview ? 'Under review' : 'Unverified'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <HiCalendar className="w-4 h-4 text-gray-400" />
                    On Trudium since {onTrudiumSince}
                  </p>
                </div>
              </div>
            </div>

            {/* KYB verification prompt */}
            {!kybVerified && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex gap-3 min-w-0">
                    <HiShieldCheck className="w-8 h-8 text-amber-700 shrink-0" />
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">KYB Verification</h3>
                      {kybReview ? (
                        <p className="text-sm text-amber-900/90 leading-relaxed">
                          Your verification is being reviewed. We&apos;ll notify you when it&apos;s complete.
                        </p>
                      ) : (
                        <p className="text-sm text-amber-900/90 leading-relaxed">
                          Your organisation is not yet verified. Complete KYB verification using your incorporation
                          number to unlock full platform features including trust badges, enhanced visibility, and
                          advanced scouting.
                        </p>
                      )}
                    </div>
                  </div>
                  {!kybReview && organization?.id && (
                    <button
                      type="button"
                      onClick={openKybDrawer}
                      className="shrink-0 px-4 py-2.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#152942] text-sm font-semibold"
                    >
                      Verify Now
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Card 2: Incorporation Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-bold text-gray-900 mb-4">Incorporation Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Incorporation Number</p>
                  <p className="text-gray-900 font-semibold">{formData.incorporationNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Country of Incorporation</p>
                  <p className="text-gray-900 font-semibold">{formData.countryOfIncorporation || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Year of Incorporation</p>
                  <p className="text-gray-900 font-semibold">{yearOfIncorporation ?? '—'}</p>
                </div>
              </div>
            </div>

            {/* Card 3: About */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-bold text-gray-900 mb-3">About</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{formData.description || '—'}</p>
            </div>

            {/* Card 4: Location & Contact */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-bold text-gray-900 mb-4">Location & Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <HiLocationMarker className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Location</p>
                      <p className="text-gray-900 font-medium">{locationStr}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FaEnvelope className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Email</p>
                      <p className="text-gray-900 font-medium">{formData.organisationEmail || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <HiPhone className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Phone</p>
                      <p className="text-gray-900 font-medium">{formData.phoneNumber || '—'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <HiCalendar className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Founded</p>
                      <p className="text-gray-900 font-medium">{foundedYear ? `Founded ${foundedYear}` : '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <HiOfficeBuilding className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Physical Address</p>
                      <p className="text-gray-900 font-medium">{physicalAddress}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5: Website & Social Media */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-bold text-gray-900 mb-4">Website & Social Media</h3>
              <div className="flex flex-wrap gap-3">
                {formData.website && (
                  <a
                    href={formData.website.startsWith('http') ? formData.website : `https://${formData.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100 transition-colors text-sm font-medium"
                  >
                    <HiGlobe className="w-4 h-4 text-gray-500" />
                    Website
                    <HiExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  </a>
                )}
                {formData.socialMedia?.linkedin && (
                  <a
                    href={formData.socialMedia.linkedin.startsWith('http') ? formData.socialMedia.linkedin : `https://${formData.socialMedia.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100 transition-colors text-sm font-medium"
                  >
                    <FaLinkedin className="w-4 h-4 text-[#0A66C2]" />
                    LinkedIn
                    <HiExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  </a>
                )}
                {formData.socialMedia?.twitter && (
                  <a
                    href={formData.socialMedia.twitter.startsWith('http') ? formData.socialMedia.twitter : `https://${formData.socialMedia.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100 transition-colors text-sm font-medium"
                  >
                    <FaTwitter className="w-4 h-4 text-gray-600" />
                    Twitter / X
                    <HiExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  </a>
                )}
                {(!formData.website && !formData.socialMedia?.linkedin && !formData.socialMedia?.twitter) && (
                  <p className="text-sm text-gray-500">No website or social links added yet.</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-start gap-3">
                  <FaEnvelope className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Support Email</p>
                    <p className="text-gray-900 font-medium">{formData.supportEmail || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <HiAtSymbol className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                      Official Email Domain
                    </p>
                    <p className="text-gray-900 font-medium">{formData.officialEmailDomain || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Organisation Overview — edit mode: form */}
        {activeTab === 'overview' && profileEditMode && (
          <form onSubmit={handleProfileSubmit} className="space-y-6 pb-8">
            {kybFieldsLocked && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Organisation name, incorporation details, year founded, phone number, and address are locked after KYB verification.
              </div>
            )}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
              <p className="text-gray-600 text-sm">Edit your organisation details below, then save.</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setProfileEditMode(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#152942] disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                >
                  <HiSave className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
            {/* Basic Information Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <HiOfficeBuilding className="w-5 h-5 mr-2 text-brand-600" />
                Basic Information
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.isRegistered ? 'Legal Name' : 'Organisation Name'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      readOnly={kybFieldsLocked}
                      value={formData.isRegistered ? formData.legalName : formData.organisationName}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        [formData.isRegistered ? 'legalName' : 'organisationName']: e.target.value 
                      })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 ${lockedFieldClass}`}
                      placeholder={formData.isRegistered ? "Enter legal name" : "Enter organisation name"}
                    />
                    {kybFieldsLocked && (
                      <p className="text-xs text-gray-500 mt-1">Locked after KYB verification</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      readOnly={kybFieldsLocked}
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 ${lockedFieldClass}`}
                      placeholder="Enter company name"
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

            {/* Contact Information Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FaEnvelope className="w-5 h-5 mr-2 text-brand-600" />
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.organisationEmail}
                    onChange={(e) => setFormData({ ...formData, organisationEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50"
                    placeholder="organisation@example.com"
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed here</p>
                </div>
                <div>
                  <PhoneNumberInput
                    value={formData.phoneNumber}
                    onChange={(value) => setFormData({ ...formData, phoneNumber: value })}
                    label="Phone Number"
                    placeholder="Enter phone number"
                    disabled={kybFieldsLocked}
                  />
                  {kybFieldsLocked && (
                    <p className="text-xs text-gray-500 mt-1">Locked after KYB verification</p>
                  )}
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
                  disabled={kybFieldsLocked}
                  onClick={() => !kybFieldsLocked && setFormData({ ...formData, isRegistered: true })}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    formData.isRegistered === true
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${kybFieldsLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="font-medium text-gray-900 mb-1">Registered</div>
                  <div className="text-sm text-gray-600">Organisation is legally registered</div>
                </button>
                <button
                  type="button"
                  disabled={kybFieldsLocked}
                  onClick={() => !kybFieldsLocked && setFormData({ ...formData, isRegistered: false })}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    formData.isRegistered === false
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${kybFieldsLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
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
                        disabled={kybFieldsLocked}
                        value={formData.countryOfIncorporation}
                        onChange={(e) => setFormData({ ...formData, countryOfIncorporation: e.target.value })}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 ${lockedFieldClass}`}
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
                        readOnly={kybFieldsLocked}
                        value={formData.incorporationNumber}
                        onChange={(e) => setFormData({ ...formData, incorporationNumber: e.target.value })}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 ${lockedFieldClass}`}
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
                      disabled={kybFieldsLocked}
                      value={formData.organisationCountry}
                      onChange={(e) => setFormData({ ...formData, organisationCountry: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 ${lockedFieldClass}`}
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
                    readOnly={kybFieldsLocked}
                    value={formData.foundedDate}
                    onChange={(e) => setFormData({ ...formData, foundedDate: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 ${lockedFieldClass}`}
                  />
                  {kybFieldsLocked && (
                    <p className="text-xs text-gray-500 mt-1">Locked after KYB verification</p>
                  )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FaEnvelope className="w-4 h-4 mr-1 text-gray-500" />
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={formData.supportEmail}
                      onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="support@example.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Public email for support and enquiries
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <HiAtSymbol className="w-4 h-4 mr-1 text-gray-500" />
                      Official Email Domain
                    </label>
                    <input
                      type="text"
                      value={formData.officialEmailDomain}
                      onChange={(e) =>
                        setFormData({ ...formData, officialEmailDomain: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="@example.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Your organisation&apos;s official email domain (e.g. @company.com)
                    </p>
                  </div>
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
              {kybFieldsLocked && (
                <p className="text-xs text-gray-500 mb-4">Address is locked after KYB verification.</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Building Name</label>
                  <input
                    type="text"
                    readOnly={kybFieldsLocked}
                    value={formData.address.buildingName}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, buildingName: e.target.value }
                    })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 ${lockedFieldClass}`}
                    placeholder="e.g., Tower 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Number</label>
                  <input
                    type="text"
                    readOnly={kybFieldsLocked}
                    value={formData.address.streetNumber}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, streetNumber: e.target.value }
                    })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 ${lockedFieldClass}`}
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
                    readOnly={kybFieldsLocked}
                    value={formData.address.street}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value }
                    })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 ${lockedFieldClass}`}
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
                    readOnly={kybFieldsLocked}
                    value={formData.address.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value }
                    })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 ${lockedFieldClass}`}
                    placeholder="e.g., Lagos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
                  <input
                    type="text"
                    readOnly={kybFieldsLocked}
                    value={formData.address.state}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, state: e.target.value }
                    })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 ${lockedFieldClass}`}
                    placeholder="e.g., Lagos State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    disabled={kybFieldsLocked}
                    value={formData.address.country}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, country: e.target.value }
                    })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 ${lockedFieldClass}`}
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
                    readOnly={kybFieldsLocked}
                    value={formData.address.zipCode}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, zipCode: e.target.value }
                    })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 ${lockedFieldClass}`}
                    placeholder="e.g., 101001"
                  />
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Employees / Associates Tab */}
        {activeTab === 'employees' && (
          <div className="pb-8 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mt-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Key Employees & Associates</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Add bios for founders, executives, and key team members
                </p>
              </div>
              <button
                type="button"
                onClick={openAddEmployee}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#152942]"
              >
                <HiPlus className="h-4 w-4" />
                Add Employee
              </button>
            </div>

            {employeesLoading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-xl border border-gray-200 bg-white p-5"
                  >
                    <div className="flex gap-4">
                      <div className="h-14 w-14 shrink-0 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-3 pt-1">
                        <div className="h-4 w-48 rounded bg-gray-200" />
                        <div className="h-3 w-full max-w-md rounded bg-gray-100" />
                        <div className="h-3 w-32 rounded bg-gray-100" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : employees.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                  <FaUsers className="h-7 w-7 text-gray-400" />
                </div>
                <p className="text-base font-medium text-gray-900">No team profiles yet</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
                  Showcase founders and leaders so candidates understand who they&apos;ll work with.
                </p>
                <button
                  type="button"
                  onClick={openAddEmployee}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#152942]"
                >
                  <HiPlus className="h-4 w-4" />
                  Add Employee
                </button>
              </div>
            ) : (
              <ul className="space-y-4">
                {employees.map((emp) => {
                  const displayName = emp.name || `${emp.firstName} ${emp.lastName}`.trim() || '—';
                  const initial = (emp.firstName?.trim()?.[0] || displayName[0] || '?').toUpperCase();
                  const linkedHref =
                    emp.linkedInUrl?.startsWith('http') ? emp.linkedInUrl : emp.linkedInUrl ? `https://${emp.linkedInUrl}` : '';
                  return (
                    <li
                      key={emp.id}
                      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex gap-4">
                        <div
                          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-600"
                          aria-hidden
                        >
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                              <h3 className="text-base font-bold text-gray-900">{displayName}</h3>
                              <span className="inline-flex rounded-full bg-[#EFF6FF] px-3 py-0.5 text-xs font-semibold text-[#1e3a5f]">
                                {emp.title}
                              </span>
                            </div>
                            <div
                              className="relative shrink-0"
                              ref={employeeMenuOpen === emp.id ? employeeMenuRef : undefined}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setEmployeeMenuOpen(employeeMenuOpen === emp.id ? null : emp.id)
                                }
                                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                                aria-label="Employee actions"
                              >
                                <HiDotsVertical className="h-5 w-5" />
                              </button>
                              {employeeMenuOpen === emp.id && (
                                <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                                  <button
                                    type="button"
                                    onClick={() => openEditEmployee(emp)}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <HiPencil className="h-4 w-4" />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteEmployee(emp.id)}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <HiTrash className="h-4 w-4" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          {emp.bio ? (
                            <p className="mt-3 text-sm leading-relaxed text-gray-700">{emp.bio}</p>
                          ) : null}
                          {(emp.email || linkedHref) && (
                            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                              {emp.email ? (
                                <a
                                  href={`mailto:${emp.email}`}
                                  className="inline-flex items-center gap-2 text-gray-600 hover:text-[#1e3a5f]"
                                >
                                  <FaEnvelope className="h-4 w-4 shrink-0 text-gray-400" />
                                  <span className="truncate">{emp.email}</span>
                                </a>
                              ) : null}
                              {linkedHref ? (
                                <a
                                  href={linkedHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-gray-600 hover:text-[#0A66C2]"
                                >
                                  <FaLinkedin className="h-4 w-4 shrink-0 text-[#0A66C2]" />
                                  LinkedIn
                                </a>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Add / Edit Employee — right drawer */}
        {employeeDrawerOpen && (
          <div className="fixed inset-0 z-[58]">
            <button
              type="button"
              aria-label="Close employee drawer"
              className="absolute inset-0 bg-black/40"
              onClick={() => !savingEmployee && setEmployeeDrawerOpen(false)}
            />
            <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl border-l border-gray-200">
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {editingEmployeeId ? 'Edit team member' : 'Add team member'}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Profiles appear on your organisation&apos;s public-facing materials.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={savingEmployee}
                  onClick={() => setEmployeeDrawerOpen(false)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <HiX className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={saveEmployee} className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">First name</label>
                      <input
                        type="text"
                        required
                        value={employeeForm.firstName}
                        onChange={(e) => setEmployeeForm((f) => ({ ...f, firstName: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Last name</label>
                      <input
                        type="text"
                        required
                        value={employeeForm.lastName}
                        onChange={(e) => setEmployeeForm((f) => ({ ...f, lastName: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                        placeholder="Adeyemi"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Title / Role</label>
                    <input
                      type="text"
                      required
                      value={employeeForm.title}
                      onChange={(e) => setEmployeeForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                      placeholder="Founder & CEO"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Bio</label>
                    <textarea
                      rows={5}
                      value={employeeForm.bio}
                      onChange={(e) => setEmployeeForm((f) => ({ ...f, bio: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                      placeholder="Professional background and expertise..."
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={employeeForm.email}
                      onChange={(e) => setEmployeeForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                      placeholder="john@company.com"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">LinkedIn</label>
                    <input
                      type="text"
                      value={employeeForm.linkedInUrl}
                      onChange={(e) => setEmployeeForm((f) => ({ ...f, linkedInUrl: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                      placeholder="linkedin.com/in/username or full URL"
                    />
                  </div>
                </div>
                <div className="flex gap-3 border-t border-gray-200 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setEmployeeDrawerOpen(false)}
                    disabled={savingEmployee}
                    className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEmployee}
                    className="flex-1 rounded-lg bg-[#1e3a5f] py-3 text-sm font-semibold text-white hover:bg-[#152942] disabled:opacity-50"
                  >
                    {savingEmployee ? 'Saving…' : editingEmployeeId ? 'Save changes' : 'Save'}
                  </button>
                </div>
              </form>
            </aside>
          </div>
        )}

        {/* Public Page Tab */}
        {activeTab === 'public' && (
          <div className="pb-8">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold text-gray-900">Public Page Preview</h2>
                <button
                  type="button"
                  onClick={copyPublicShareLink}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
                >
                  <HiLink className="h-4 w-4 text-gray-500" />
                  Copy Shareable Link
                </button>
              </div>

              <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5 md:p-8">
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start gap-5 border-b border-gray-100 pb-6">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-100">
                      {organization?.logoUrl ? (
                        <img
                          src={organization.logoUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <HiOfficeBuilding className="h-9 w-9 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl font-bold text-gray-900">{displayName || 'Organisation name'}</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {formData.industry || 'Industry not set — add it in your profile'}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-2">
                          <HiLocationMarker className="h-4 w-4 shrink-0 text-gray-400" />
                          {locationStr !== '—' ? locationStr : 'Location not set'}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <HiUserGroup className="h-4 w-4 shrink-0 text-gray-400" />
                          {employeesLoading
                            ? 'Loading…'
                            : `${employees.length} Associated Employee${employees.length === 1 ? '' : 's'}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-gray-100 py-6">
                    <h4 className="text-base font-bold text-gray-900">About</h4>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                      {formData.description?.trim()
                        ? formData.description
                        : 'Add a description in Organisation Overview so visitors understand what you do.'}
                    </p>
                  </div>

                  <div className="border-b border-gray-100 py-6">
                    <h4 className="text-base font-bold text-gray-900">Leadership</h4>
                    {employeesLoading ? (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        {[0, 1].map((i) => (
                          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
                        ))}
                      </div>
                    ) : employees.length === 0 ? (
                      <p className="mt-3 text-sm text-gray-500">
                        No leadership profiles yet. Add key employees under{' '}
                        <span className="font-medium text-gray-700">Employees / Associates</span>.
                      </p>
                    ) : (
                      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                        {employees.map((emp) => {
                          const displayNameEmp =
                            emp.name || `${emp.firstName} ${emp.lastName}`.trim() || '—';
                          const initial = (
                            emp.firstName?.trim()?.[0] ||
                            displayNameEmp[0] ||
                            '?'
                          ).toUpperCase();
                          return (
                            <li
                              key={emp.id}
                              className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4"
                            >
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-base font-semibold text-gray-600 shadow-sm ring-1 ring-gray-100">
                                {initial}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900">{displayNameEmp}</p>
                                <p className="mt-0.5 text-sm text-gray-600">{emp.title}</p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="pt-6">
                    <div className="flex flex-wrap gap-3">
                      {formData.website ? (
                        <a
                          href={
                            formData.website.startsWith('http')
                              ? formData.website
                              : `https://${formData.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100"
                        >
                          <HiGlobe className="h-4 w-4 text-gray-500" />
                          Website
                        </a>
                      ) : (
                        <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-dashed border-gray-200 px-4 py-2 text-sm text-gray-400">
                          <HiGlobe className="h-4 w-4" />
                          Website
                        </span>
                      )}
                      {formData.socialMedia?.linkedin ? (
                        <a
                          href={
                            formData.socialMedia.linkedin.startsWith('http')
                              ? formData.socialMedia.linkedin
                              : `https://${formData.socialMedia.linkedin}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100"
                        >
                          <FaLinkedin className="h-4 w-4 text-[#0A66C2]" />
                          LinkedIn
                        </a>
                      ) : (
                        <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-dashed border-gray-200 px-4 py-2 text-sm text-gray-400">
                          <FaLinkedin className="h-4 w-4" />
                          LinkedIn
                        </span>
                      )}
                      {formData.socialMedia?.twitter ? (
                        <a
                          href={
                            formData.socialMedia.twitter.startsWith('http')
                              ? formData.socialMedia.twitter
                              : `https://${formData.socialMedia.twitter}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100"
                        >
                          <FaTwitter className="h-4 w-4 text-gray-600" />
                          Twitter
                        </a>
                      ) : (
                        <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-dashed border-gray-200 px-4 py-2 text-sm text-gray-400">
                          <FaTwitter className="h-4 w-4" />
                          Twitter
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-center text-xs text-gray-500">
                  This is a preview of how your organisation appears to professionals on Trudium.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {kybDrawerOpen && (
          <div className="fixed inset-0 z-[60]">
            <button
              type="button"
              aria-label="Close KYB drawer"
              className="absolute inset-0 bg-black/40"
              onClick={() => !kybSubmitting && setKybDrawerOpen(false)}
            />
            <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl border-l border-gray-200">
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">KYB Verification</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Verify your organisation using incorporation details
                  </p>
                </div>
                <button
                  type="button"
                  disabled={kybSubmitting}
                  onClick={() => setKybDrawerOpen(false)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <HiX className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={submitKybIncorporation} className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                  <div className="rounded-xl border border-sky-100 bg-sky-50/80 p-4">
                    <p className="text-sm font-semibold text-gray-900 mb-3">Why verify?</p>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {[
                        'Earn a verified trust badge on your profile',
                        'Improve visibility in professional search results',
                        'Unlock advanced recruitment and scouting features',
                        'Build trust with candidates and partners',
                      ].map((line) => (
                        <li key={line} className="flex gap-2">
                          <HiCheckCircle className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <label htmlFor="kyb-legal-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Legal Name
                    </label>
                    <input
                      id="kyb-legal-name"
                      type="text"
                      required
                      value={kybForm.legalName}
                      onChange={(e) => setKybForm((f) => ({ ...f, legalName: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f]"
                      placeholder="Registered legal entity name"
                    />
                  </div>

                  <div>
                    <label htmlFor="kyb-inc-no" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Incorporation Number
                    </label>
                    <input
                      id="kyb-inc-no"
                      type="text"
                      required
                      value={kybForm.incorporationNumber}
                      onChange={(e) => setKybForm((f) => ({ ...f, incorporationNumber: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f]"
                      placeholder="e.g. RC123456789"
                    />
                  </div>

                  <div>
                    <label htmlFor="kyb-country" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Country of Incorporation
                    </label>
                    <select
                      id="kyb-country"
                      required
                      value={kybForm.countryOfIncorporation}
                      onChange={(e) => setKybForm((f) => ({ ...f, countryOfIncorporation: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f]"
                    >
                      <option value="">Select country</option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="kyb-year" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Year of Incorporation
                    </label>
                    <input
                      id="kyb-year"
                      type="text"
                      inputMode="numeric"
                      required
                      value={kybForm.yearOfIncorporation}
                      onChange={(e) => setKybForm((f) => ({ ...f, yearOfIncorporation: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f]"
                      placeholder="e.g. 2020"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-200 px-5 py-4">
                  <button
                    type="submit"
                    disabled={kybSubmitting}
                    className="w-full rounded-lg bg-[#1e3a5f] px-4 py-3 text-sm font-semibold text-white hover:bg-[#152942] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {kybSubmitting ? 'Submitting…' : 'Continue'}
                  </button>
                </div>
              </form>
            </aside>
          </div>
        )}

        {activeTab === 'security' && (
          <form onSubmit={handlePasswordChange} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 pb-8">
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
