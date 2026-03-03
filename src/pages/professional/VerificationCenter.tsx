import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import {
  HiUser,
  HiAcademicCap,
  HiShare,
  HiBriefcase,
  HiBadgeCheck,
  HiUsers,
  HiSave,
  HiPlus,
  HiX,
  HiShieldCheck,
  HiCheckCircle,
  HiLocationMarker,
  HiLockClosed,
  HiPencil,
} from 'react-icons/hi';
import { COUNTRIES } from '@/utils/countries';

type SectionKey = 'personal' | 'location' | 'education' | 'social' | 'work' | 'certification' | 'family';

const VALID_SECTION_KEYS: SectionKey[] = ['personal', 'location', 'education', 'social', 'work', 'certification', 'family'];

function isSectionKey(value: string | null): value is SectionKey {
  return value !== null && VALID_SECTION_KEYS.includes(value as SectionKey);
}

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const ID_TYPE_OPTIONS = [
  { value: 'national_id', label: 'National ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'voters_card', label: "Voter's Card" },
];
const LOCATION_DOCUMENT_TYPE_OPTIONS = [
  { value: 'utility_bill', label: 'Utility bill' },
  { value: 'bank_statement', label: 'Bank statement' },
  { value: 'lease_agreement', label: 'Lease agreement' },
  { value: 'government_letter', label: 'Government letter' },
  { value: 'other', label: 'Other' },
];

type LocationEntry = {
  country: string;
  address: string;
  city: string;
  state: string;
  documentType: string;
  documentUrl: string;
};

const emptyLocation = (): LocationEntry => ({
  country: '',
  address: '',
  city: '',
  state: '',
  documentType: '',
  documentUrl: '',
});

type EducationEntry = {
  id?: string;
  levelOfEducation: string;
  programLevel: string;
  degreeType: string;
  institutionName: string;
  duration: string;
  costOfEducation: string;
  currency: string;
  country: string;
};

const emptyEducation = (): EducationEntry => ({
  levelOfEducation: '',
  programLevel: '',
  degreeType: '',
  institutionName: '',
  duration: '',
  costOfEducation: '',
  currency: 'USD',
  country: '',
});

const EDUCATION_LEVELS = [
  { value: 'high_school', label: 'High School' },
  { value: 'associate', label: 'Associate' },
  { value: 'bachelor', label: 'Bachelor' },
  { value: 'master', label: 'Master' },
  { value: 'doctorate', label: 'Doctorate' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'diploma', label: 'Diploma' },
];
const EDUCATION_PROGRAM_LEVEL_OPTIONS = [
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'postgraduate', label: 'Postgraduate' },
];
const DURATION_OPTIONS = ['1 year', '2 years', '3 years', '4 years', '5+ years'];

type CertificateEntry = {
  name: string;
  issuedBy: string;
  issuedDate: string;
  expirationDate: string;
  credentialId: string;
  reportingUrl: string;
  supportingMediaUrl: string;
};

const emptyCertificate = (): CertificateEntry => ({
  name: '',
  issuedBy: '',
  issuedDate: '',
  expirationDate: '',
  credentialId: '',
  reportingUrl: '',
  supportingMediaUrl: '',
});

const MARITAL_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const RELATION_TYPE_OPTIONS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'parent', label: 'Parent' },
  { value: 'other', label: 'Other' },
];

type FamilyRelationEntry = { relationType: string; fullName: string };

const emptyFamilyRelation = (): FamilyRelationEntry => ({
  relationType: '',
  fullName: '',
});

export default function VerificationCenter() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState<Record<SectionKey, { completed: boolean; verified: boolean }>>({
    personal: { completed: false, verified: false },
    location: { completed: false, verified: false },
    education: { completed: false, verified: false },
    social: { completed: false, verified: false },
    work: { completed: false, verified: false },
    certification: { completed: false, verified: false },
    family: { completed: false, verified: false },
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: SectionKey = isSectionKey(tabParam) ? tabParam : 'personal';
  const [saving, setSaving] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingSaveAction, setPendingSaveAction] = useState<'personal' | 'location' | 'social' | 'education' | 'work' | 'save_all' | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordVerifying, setPasswordVerifying] = useState(false);

  // Personal
  const [personal, setPersonal] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    nationality: '',
    country: '',
    address: '',
    city: '',
    state: '',
    idType: '',
    idNumber: '',
    idDocumentUrl: '',
  });
  const [idUploading, setIdUploading] = useState(false);
  const [sectionEditMode, setSectionEditMode] = useState<Partial<Record<SectionKey, boolean>>>({});

  const isSectionEditable = (id: SectionKey): boolean => {
    const status = verificationStatus[id];
    if (!status?.completed) return true;
    if (status?.verified) return true;
    return !!sectionEditMode[id];
  };
  const [locationsList, setLocationsList] = useState<LocationEntry[]>([emptyLocation()]);
  const [uploadingLocationIndex, setUploadingLocationIndex] = useState<number | null>(null);

  // Social (from profile.socialMedia)
  const [social, setSocial] = useState({
    linkedin: '',
    twitter: '',
    facebook: '',
    instagram: '',
    tiktok: '',
    snapchat: '',
  });
  const [linkedInOtp, setLinkedInOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);

  // Education (list of entries like Location)
  const [educationEntriesList, setEducationEntriesList] = useState<EducationEntry[]>([emptyEducation()]);
  const [educationSaving, setEducationSaving] = useState(false);

  // Work
  const [workList, setWorkList] = useState<any[]>([]);
  const [showWorkForm, setShowWorkForm] = useState(false);
  const [workForm, setWorkForm] = useState({
    organisationName: '',
    industry: '',
    role: '',
    employmentType: '',
    workMode: '',
    startDate: '',
    endDate: '',
    duration: '',
    currency: 'USD',
    salary: '',
    otherCompensation: [] as string[],
    otherCompensationInput: '',
    selfDeclared: false,
    verifyWebsite: '',
    verifyHrEmail: '',
  });
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [workSaving, setWorkSaving] = useState(false);

  // Certification (local only for now)
  const [certList, setCertList] = useState<CertificateEntry[]>([emptyCertificate()]);
  const [certUploadingIndex, setCertUploadingIndex] = useState<number | null>(null);

  // Family & Relationship
  const [maritalStatus, setMaritalStatus] = useState('');
  const [spouseName, setSpouseName] = useState('');
  const [relationsList, setRelationsList] = useState<FamilyRelationEntry[]>([emptyFamilyRelation()]);

  useEffect(() => {
    fetchProfile();
  }, []);

  // Sync URL with valid tab on load (e.g. invalid or missing param)
  useEffect(() => {
    if (!isSectionKey(tabParam)) {
      setSearchParams({ tab: 'personal' }, { replace: true });
    }
  }, [tabParam, setSearchParams]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const [profileRes, statusRes] = await Promise.all([
        api.get('/v1/professional/profile'),
        api.get('/v1/professional/verification-status').catch(() => ({ data: { data: null } })),
      ]);
      const data = profileRes.data?.data;
      setProfile(data);
      const status = statusRes.data?.data;
      if (status) {
        setVerificationStatus((prev) => ({
          ...prev,
          personal: status.personal || prev.personal,
          location: status.location || prev.location,
          education: status.education || prev.education,
          social: status.social || prev.social,
          work: status.work || prev.work,
          certification: status.certification || prev.certification,
          family: status.family || prev.family,
        }));
      }
      if (data?.user) {
        setPersonal((p) => ({
          ...p,
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          email: data.user.email || '',
        }));
      }
      if (data) {
        const addressData = data.address && typeof data.address === 'object' ? data.address : {};
        setPersonal((p) => ({
          ...p,
          nationality: data.nationality || '',
          country: data.country || '',
          dateOfBirth: data.dateOfBirth
            ? new Date(data.dateOfBirth).toISOString().split('T')[0]
            : '',
          address: addressData.address ?? data.address ?? p.address ?? '',
          city: addressData.city ?? data.city ?? p.city ?? '',
          state: addressData.state ?? data.state ?? p.state ?? '',
          idType: data.idType || '',
          idNumber: data.idNumber || '',
          idDocumentUrl: data.idDocumentUrl || '',
        }));
        if (Array.isArray(data.locations) && data.locations.length > 0) {
          setLocationsList(
            data.locations.map((loc: any) => ({
              country: loc.country || '',
              address: loc.address || '',
              city: loc.city || '',
              state: loc.state || '',
              documentType: loc.documentType || '',
              documentUrl: loc.documentUrl || '',
            })),
          );
        } else if (data.country || data.locationDocumentUrl || (data as any).locationDocumentType) {
          const addr = data.address && typeof data.address === 'object' ? (data.address as any) : {};
          setLocationsList([
            {
              country: data.country || '',
              address: addr.address ?? (typeof data.address === 'string' ? data.address : '') ?? '',
              city: addr.city ?? (data as any).city ?? '',
              state: addr.state ?? (data as any).state ?? '',
              documentType: (data as any).locationDocumentType || '',
              documentUrl: (data as any).locationDocumentUrl || '',
            },
          ]);
        }
        const sm = data.socialMedia || {};
        setSocial({
          linkedin: sm.linkedin || '',
          twitter: sm.twitter || '',
          facebook: sm.facebook || '',
          instagram: sm.instagram || '',
          tiktok: sm.tiktok || '',
          snapchat: sm.snapchat || '',
        });
        const eduList = data.education || [];
        if (Array.isArray(eduList) && eduList.length > 0) {
          setEducationEntriesList(
            eduList.map((e: any) => ({
              id: e.id,
              levelOfEducation: e.levelOfEducation || '',
              programLevel: e.programLevel || '',
              degreeType: e.degreeType || '',
              institutionName: e.institutionName || '',
              duration: e.startDate || e.duration || '',
              costOfEducation: e.costOfEducation != null ? String(e.costOfEducation) : '',
              currency: e.currency || 'USD',
              country: e.country || '',
            })),
          );
        } else {
          setEducationEntriesList([emptyEducation()]);
        }
        setWorkList(data.workExperience || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };


  const personalRequiredFields = (): string[] => {
    const missing: string[] = [];
    if (!personal.firstName?.trim()) missing.push('First name');
    if (!personal.lastName?.trim()) missing.push('Last name');
    if (!personal.dateOfBirth) missing.push('Date of birth');
    if (!personal.gender) missing.push('Gender');
    if (!personal.nationality) missing.push('Nationality');
    if (!personal.idType) missing.push('ID type');
    if (!personal.idNumber?.trim()) missing.push('Passport / ID number');
    if (!personal.idDocumentUrl) missing.push('ID document upload');
    return missing;
  };

  const handleSavePersonal = async () => {
    setSaving(true);
    try {
      await api.put('/v1/professional/profile', {
        dateOfBirth: personal.dateOfBirth || undefined,
        nationality: personal.nationality || undefined,
        idType: personal.idType || undefined,
        idNumber: personal.idNumber || undefined,
        idDocumentUrl: personal.idDocumentUrl || undefined,
      });
      toast.success('Personal information saved');
      setSectionEditMode((prev) => ({ ...prev, personal: false }));
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleIdFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an image (JPEG, PNG, WebP) or PDF');
      return;
    }
    setIdUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ url: string } | { data: { url: string } }>(
        '/v1/professional/upload-id',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      const url = (res.data as any)?.data?.url ?? (res.data as any)?.url;
      if (url) {
        setPersonal((p) => ({ ...p, idDocumentUrl: url }));
        toast.success('ID document uploaded');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setIdUploading(false);
      e.target.value = '';
    }
  };

  const handleSaveLocation = async () => {
    setSaving(true);
    try {
      await api.put('/v1/professional/profile', {
        locations: locationsList.map((loc) => ({
          country: loc.country || undefined,
          address: loc.address || undefined,
          city: loc.city || undefined,
          state: loc.state || undefined,
          documentType: loc.documentType || undefined,
          documentUrl: loc.documentUrl || undefined,
        })),
      });
      toast.success('Location saved');
      setSectionEditMode((prev) => ({ ...prev, location: false }));
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateLocation = (index: number, updates: Partial<LocationEntry>) => {
    setLocationsList((prev) =>
      prev.map((loc, i) => (i === index ? { ...loc, ...updates } : loc)),
    );
  };

  const addLocation = () => {
    setLocationsList((prev) => [...prev, emptyLocation()]);
  };

  const updateEducationEntry = (index: number, updates: Partial<EducationEntry>) => {
    setEducationEntriesList((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, ...updates } : entry)),
    );
  };
  const addEducationEntry = () => {
    setEducationEntriesList((prev) => [...prev, emptyEducation()]);
  };
  const removeEducationEntry = (index: number) => {
    setEducationEntriesList((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const removeLocation = (index: number) => {
    setLocationsList((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleLocationDocumentUpload = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an image (JPEG, PNG, WebP) or PDF');
      return;
    }
    setUploadingLocationIndex(index);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ url: string } | { data: { url: string } }>(
        '/v1/professional/upload-id',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      const url = (res.data as any)?.data?.url ?? (res.data as any)?.url;
      if (url) {
        updateLocation(index, { documentUrl: url });
        toast.success('Document uploaded');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingLocationIndex(null);
      e.target.value = '';
    }
  };

  const handleSaveSocial = async () => {
    setSaving(true);
    try {
      await api.put('/v1/professional/profile', {
        socialMedia: social,
      });
      toast.success('Social profiles saved');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSendOtp = async () => {
    setSendingOtp(true);
    try {
      // Placeholder – no backend OTP for LinkedIn yet
      await new Promise((r) => setTimeout(r, 800));
      toast.success('OTP sent to your LinkedIn email (demo)');
    } catch {
      toast.error('Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSaveEducation = async () => {
    if (!profile?.id) return;
    setEducationSaving(true);
    try {
      for (const entry of educationEntriesList) {
        const payload = {
          levelOfEducation: entry.levelOfEducation,
          programLevel: entry.programLevel || undefined,
          institutionName: entry.institutionName,
          degreeType: entry.degreeType || undefined,
          fieldOfStudy: entry.degreeType || 'General',
          startDate: entry.duration || '2020',
          endDate: new Date().getFullYear().toString(),
          currentlyAttending: false,
          country: entry.country || 'Nigeria',
          costOfEducation: entry.costOfEducation ? parseFloat(entry.costOfEducation) : undefined,
          currency: entry.currency,
        };
        if (entry.id) {
          await api.put(`/v1/professional/education/${entry.id}`, payload);
        } else {
          await api.post(`/v1/professional/${profile.id}/education`, payload);
        }
      }
      toast.success('Education saved');
      setSectionEditMode((prev) => ({ ...prev, education: false }));
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save education');
    } finally {
      setEducationSaving(false);
    }
  };

  const handleWorkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    setWorkSaving(true);
    try {
      const payload = {
        organisationName: workForm.organisationName,
        industry: workForm.industry,
        role: workForm.role,
        employmentType: (workForm.employmentType || 'full_time') as any,
        workMode: (workForm.workMode || 'on_site') as any,
        startDate: workForm.startDate || new Date().toISOString().split('T')[0],
        endDate: workForm.endDate || undefined,
        currentlyWorking: !workForm.endDate,
        location: { city: '', state: '', country: '' },
        responsibilities: [],
        achievements: [],
        salaryRange: workForm.salary ? { min: parseFloat(workForm.salary) || 0, max: parseFloat(workForm.salary) || 0 } : undefined,
        currency: workForm.currency,
      };
      if (editingWorkId) {
        await api.put(`/v1/professional/experience/${editingWorkId}`, payload);
        toast.success('Work experience updated');
      } else {
        await api.post(`/v1/professional/${profile.id}/experience`, payload);
        toast.success('Work experience added');
      }
      setShowWorkForm(false);
      setEditingWorkId(null);
      setSectionEditMode((prev) => ({ ...prev, work: false }));
      setWorkForm({
        organisationName: '',
        industry: '',
        role: '',
        employmentType: '',
        workMode: '',
        startDate: '',
        endDate: '',
        duration: '',
        currency: 'USD',
        salary: '',
        otherCompensation: [] as string[],
        otherCompensationInput: '',
        selfDeclared: false,
        verifyWebsite: '',
        verifyHrEmail: '',
      });
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save work experience');
    } finally {
      setWorkSaving(false);
    }
  };

  const updateCert = (index: number, updates: Partial<CertificateEntry>) => {
    setCertList((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c)),
    );
  };

  const addCertificate = () => {
    setCertList((prev) => [...prev, emptyCertificate()]);
  };

  const removeCertificate = (index: number) => {
    setCertList((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleCertFileUpload = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an image (JPEG, PNG, WebP) or PDF');
      return;
    }
    setCertUploadingIndex(index);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ url: string } | { data: { url: string } }>(
        '/v1/professional/upload-id',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      const url = (res.data as any)?.data?.url ?? (res.data as any)?.url;
      if (url) {
        updateCert(index, { supportingMediaUrl: url });
        toast.success('File uploaded');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setCertUploadingIndex(null);
      e.target.value = '';
    }
  };

  const handleVerifyCertification = () => {
    toast.success('Certification verification will be available soon');
  };

  const updateFamilyRelation = (index: number, updates: Partial<FamilyRelationEntry>) => {
    setRelationsList((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...updates } : r)),
    );
  };

  const addFamilyRelation = () => {
    setRelationsList((prev) => [...prev, emptyFamilyRelation()]);
  };

  const removeFamilyRelation = (index: number) => {
    setRelationsList((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const openPasswordModal = (action: 'personal' | 'location' | 'social' | 'education' | 'work' | 'save_all') => {
    setPendingSaveAction(action);
    setPasswordInput('');
    setPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    setPendingSaveAction(null);
    setPasswordInput('');
  };

  const handlePasswordConfirm = async () => {
    if (!pendingSaveAction || !passwordInput.trim()) {
      toast.error('Please enter your password');
      return;
    }
    const action = pendingSaveAction;
    setPasswordVerifying(true);
    try {
      await api.post('/v1/professional/verify-password', { password: passwordInput });
      closePasswordModal();
      if (action === 'personal') handleSavePersonal();
      else if (action === 'location') handleSaveLocation();
      else if (action === 'social') handleSaveSocial();
      else if (action === 'education') handleSaveEducation();
      else if (action === 'work') handleWorkSubmit({ preventDefault: () => {} } as React.FormEvent);
      else if (action === 'save_all') {
        handleSavePersonal();
        handleSaveSocial();
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        toast.error('Incorrect password');
      } else {
        toast.error(err.response?.data?.message || 'Verification failed');
      }
    } finally {
      setPasswordVerifying(false);
    }
  };

  const verificationTabs: { id: SectionKey; icon: any; label: string }[] = [
    { id: 'personal', icon: HiUser, label: 'Personal' },
    { id: 'location', icon: HiLocationMarker, label: 'Location' },
    { id: 'education', icon: HiAcademicCap, label: 'Education' },
    { id: 'work', icon: HiBriefcase, label: 'Work' },
    { id: 'certification', icon: HiBadgeCheck, label: 'Certification' },
    { id: 'family', icon: HiUsers, label: 'Family' },
    { id: 'social', icon: HiShare, label: 'Social' },
  ];

  if (loading) {
    return (
      <ProfessionalLayout>
        <div className="p-6 flex items-center justify-center min-h-[40vh]">
          <p className="text-gray-500">Loading verification data...</p>
        </div>
      </ProfessionalLayout>
    );
  }

  return (
    <ProfessionalLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiShieldCheck className="w-7 h-7 text-brand-500" />
            Verifications
          </h1>
          <p className="text-gray-600 mt-1">
            Add and verify your information. Switch tabs to edit and save.
          </p>
        </div>

        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-1 overflow-x-auto" aria-label="Verification sections">
            {verificationTabs.map(({ id, icon: Icon, label }) => {
              const status = verificationStatus[id];
              const completed = status?.completed ?? false;
              const verified = status?.verified ?? false;
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSearchParams({ tab: id })}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'border-brand-500 text-brand-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                  {(completed || verified) && (
                    verified ? (
                      <HiCheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                    )
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {activeTab === 'personal' && (
              <div className="space-y-4">
                {verificationStatus.personal.verified ? (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                    <p className="font-medium text-green-800 flex items-center gap-2">
                      <HiCheckCircle className="w-5 h-5 flex-shrink-0" />
                      Status: Verified
                    </p>
                    <p className="text-sm text-green-700 mt-1">Your personal information has been verified.</p>
                  </div>
                ) : (
                  <>
                    {verificationStatus.personal.completed && !verificationStatus.personal.verified && (
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Pending verification
                        </span>
                        {!isSectionEditable('personal') && (
                          <button
                            type="button"
                            onClick={() => setSectionEditMode((prev) => ({ ...prev, personal: true }))}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                          >
                            <HiPencil className="w-4 h-4" />
                            Edit
                          </button>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <div className="flex items-center gap-2 py-2">
                          <span className="text-gray-900 text-medium">{personal.email || '—'}</span>
                          <span className="inline-flex items-center gap-1 text-green-600" title="Verified">
                            <HiCheckCircle className="w-5 h-5" />
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={personal.firstName}
                          onChange={(e) => setPersonal((p) => ({ ...p, firstName: e.target.value }))}
                          disabled={!isSectionEditable('personal')}
                          readOnly={!isSectionEditable('personal')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          placeholder="e.g. Jameson"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={personal.lastName}
                          onChange={(e) => setPersonal((p) => ({ ...p, lastName: e.target.value }))}
                          disabled={!isSectionEditable('personal')}
                          readOnly={!isSectionEditable('personal')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          placeholder="e.g. Chukwuma"
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Middle / Other names</label>
                        <input
                          type="text"
                          value={personal.middleName}
                          onChange={(e) => setPersonal((p) => ({ ...p, middleName: e.target.value }))}
                          disabled={!isSectionEditable('personal')}
                          readOnly={!isSectionEditable('personal')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth <span className="text-red-500">*</span></label>
                        <input
                          type="date"
                          value={personal.dateOfBirth}
                          onChange={(e) => setPersonal((p) => ({ ...p, dateOfBirth: e.target.value }))}
                          disabled={!isSectionEditable('personal')}
                          readOnly={!isSectionEditable('personal')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender <span className="text-red-500">*</span></label>
                        <select
                          value={personal.gender}
                          onChange={(e) => setPersonal((p) => ({ ...p, gender: e.target.value }))}
                          disabled={!isSectionEditable('personal')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          required
                        >
                          <option value="">Select</option>
                          {GENDERS.map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nationality <span className="text-red-500">*</span></label>
                        <select
                          value={personal.nationality}
                          onChange={(e) => setPersonal((p) => ({ ...p, nationality: e.target.value }))}
                          disabled={!isSectionEditable('personal')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          required
                        >
                          <option value="">Select country</option>
                          {COUNTRIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ID Type <span className="text-red-500">*</span></label>
                        <select
                          value={personal.idType}
                          onChange={(e) => setPersonal((p) => ({ ...p, idType: e.target.value }))}
                          disabled={!isSectionEditable('personal')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          required
                        >
                          <option value="">Select</option>
                          {ID_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Passport / ID No <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={personal.idNumber}
                          onChange={(e) => setPersonal((p) => ({ ...p, idNumber: e.target.value }))}
                          disabled={!isSectionEditable('personal')}
                          readOnly={!isSectionEditable('personal')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          placeholder="e.g. A12345678"
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Upload ID <span className="text-red-500">*</span></label>
                        <input
                          type="file"
                          accept=".pdf,image/jpeg,image/png,image/webp"
                          onChange={handleIdFileChange}
                          disabled={idUploading || !isSectionEditable('personal')}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                        {personal.idDocumentUrl && (
                          <p className="mt-1 text-sm text-gray-600">
                            Uploaded: <a href={personal.idDocumentUrl.startsWith('http') ? personal.idDocumentUrl : `${api.defaults.baseURL || ''}${personal.idDocumentUrl}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">View document</a>
                          </p>
                        )}
                        {idUploading && <p className="mt-1 text-sm text-gray-500">Uploading...</p>}
                      </div>
                    </div>
                    {isSectionEditable('personal') && (
                      <button
                        type="button"
                        onClick={() => {
                          const missing = personalRequiredFields();
                          if (missing.length) {
                            toast.error(`Please fill required fields: ${missing.join(', ')}`);
                            return;
                          }
                          openPasswordModal('personal');
                        }}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium"
                      >
                        <HiSave className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

          {activeTab === 'location' && (
              <div className="space-y-4">
                {verificationStatus.location?.completed && !verificationStatus.location?.verified && (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Pending verification
                    </span>
                    {!isSectionEditable('location') && (
                      <button
                        type="button"
                        onClick={() => setSectionEditMode((prev) => ({ ...prev, location: true }))}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                      >
                        <HiPencil className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                  </div>
                )}
                <div className="space-y-6">
                  {locationsList.map((loc, index) => (
                    <div key={index} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Location {index + 1}</span>
                        {locationsList.length > 1 && isSectionEditable('location') && (
                          <button
                            type="button"
                            onClick={() => removeLocation(index)}
                            className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                          >
                            <HiX className="w-4 h-4" />
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Country of residence</label>
                          <select
                            value={loc.country}
                            onChange={(e) => updateLocation(index, { country: e.target.value })}
                            disabled={!isSectionEditable('location')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          >
                            <option value="">Select country</option>
                            {COUNTRIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                          <input
                            type="text"
                            value={loc.address}
                            onChange={(e) => updateLocation(index, { address: e.target.value })}
                            disabled={!isSectionEditable('location')}
                            readOnly={!isSectionEditable('location')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                            placeholder="e.g. Plot 12, Gordon estate"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                          <input
                            type="text"
                            value={loc.city}
                            onChange={(e) => updateLocation(index, { city: e.target.value })}
                            disabled={!isSectionEditable('location')}
                            readOnly={!isSectionEditable('location')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                            placeholder="e.g. Lekki"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                          <input
                            type="text"
                            value={loc.state}
                            onChange={(e) => updateLocation(index, { state: e.target.value })}
                            disabled={!isSectionEditable('location')}
                            readOnly={!isSectionEditable('location')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                            placeholder="e.g. Lagos State"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                          <select
                            value={loc.documentType}
                            onChange={(e) => updateLocation(index, { documentType: e.target.value })}
                            disabled={!isSectionEditable('location')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          >
                            <option value="">Select</option>
                            {LOCATION_DOCUMENT_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Upload document</label>
                          <input
                            type="file"
                            accept=".pdf,image/jpeg,image/png,image/webp"
                            onChange={(e) => handleLocationDocumentUpload(index, e)}
                            disabled={uploadingLocationIndex !== null || !isSectionEditable('location')}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                          {loc.documentUrl && (
                            <p className="mt-1 text-sm text-gray-600">
                              Uploaded: <a href={loc.documentUrl.startsWith('http') ? loc.documentUrl : `${api.defaults.baseURL || ''}${loc.documentUrl}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">View document</a>
                            </p>
                          )}
                          {uploadingLocationIndex === index && <p className="mt-1 text-sm text-gray-500">Uploading...</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addLocation}
                    disabled={!isSectionEditable('location')}
                    className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <HiPlus className="w-4 h-4" />
                    Add location
                  </button>
                </div>
                {isSectionEditable('location') && (
                  <button
                    type="button"
                    onClick={() => openPasswordModal('location')}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium"
                  >
                    <HiSave className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>
            )}

          {activeTab === 'education' && (
              <div className="space-y-4">
                {verificationStatus.education?.completed && !verificationStatus.education?.verified && (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Pending verification
                    </span>
                    {!isSectionEditable('education') && (
                      <button
                        type="button"
                        onClick={() => setSectionEditMode((prev) => ({ ...prev, education: true }))}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                      >
                        <HiPencil className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                  </div>
                )}
                <div className="space-y-6">
                  {educationEntriesList.map((entry, index) => (
                    <div key={entry.id ?? index} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Education {index + 1}</span>
                        {educationEntriesList.length > 1 && isSectionEditable('education') && (
                          <button
                            type="button"
                            onClick={() => removeEducationEntry(index)}
                            className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                          >
                            <HiX className="w-4 h-4" />
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Level of education</label>
                          <select
                            value={entry.levelOfEducation}
                            onChange={(e) => updateEducationEntry(index, { levelOfEducation: e.target.value })}
                            disabled={!isSectionEditable('education')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          >
                            <option value="">Select</option>
                            {EDUCATION_LEVELS.map((l) => (
                              <option key={l.value} value={l.value}>{l.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Undergraduate / Postgraduate</label>
                          <select
                            value={entry.programLevel}
                            onChange={(e) => updateEducationEntry(index, { programLevel: e.target.value })}
                            disabled={!isSectionEditable('education')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          >
                            <option value="">Select</option>
                            {EDUCATION_PROGRAM_LEVEL_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Degree type</label>
                          <input
                            type="text"
                            value={entry.degreeType}
                            onChange={(e) => updateEducationEntry(index, { degreeType: e.target.value })}
                            disabled={!isSectionEditable('education')}
                            readOnly={!isSectionEditable('education')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                            placeholder="e.g. Bachelor of Science"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                          <input
                            type="text"
                            value={entry.institutionName}
                            onChange={(e) => updateEducationEntry(index, { institutionName: e.target.value })}
                            disabled={!isSectionEditable('education')}
                            readOnly={!isSectionEditable('education')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                            placeholder="e.g. University of Lagos"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                          <select
                            value={entry.duration}
                            onChange={(e) => updateEducationEntry(index, { duration: e.target.value })}
                            disabled={!isSectionEditable('education')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          >
                            <option value="">Select</option>
                            {DURATION_OPTIONS.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                          <select
                            value={entry.country}
                            onChange={(e) => updateEducationEntry(index, { country: e.target.value })}
                            disabled={!isSectionEditable('education')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          >
                            <option value="">Select</option>
                            {COUNTRIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Cost of education</label>
                          <div className="flex gap-2">
                            <select
                              value={entry.currency}
                              onChange={(e) => updateEducationEntry(index, { currency: e.target.value })}
                              disabled={!isSectionEditable('education')}
                              className="w-24 px-2 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50 disabled:cursor-not-allowed"
                            >
                              <option value="USD">USD</option>
                              <option value="NGN">NGN</option>
                              <option value="EUR">EUR</option>
                              <option value="GBP">GBP</option>
                            </select>
                            <input
                              type="text"
                              value={entry.costOfEducation}
                              onChange={(e) => updateEducationEntry(index, { costOfEducation: e.target.value })}
                              disabled={!isSectionEditable('education')}
                              readOnly={!isSectionEditable('education')}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                              placeholder="Enter cost"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addEducationEntry}
                    disabled={!isSectionEditable('education')}
                    className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <HiPlus className="w-4 h-4" />
                    Add more
                  </button>
                </div>
                {isSectionEditable('education') && (
                  <button
                    type="button"
                    onClick={() => openPasswordModal('education')}
                    disabled={educationSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium"
                  >
                    <HiSave className="w-4 h-4" />
                    {educationSaving ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>
            )}

          {activeTab === 'work' && (
              <div className="space-y-4">
                {verificationStatus.work?.completed && !verificationStatus.work?.verified && (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Pending verification
                    </span>
                    {!isSectionEditable('work') && (
                      <button
                        type="button"
                        onClick={() => setSectionEditMode((prev) => ({ ...prev, work: true }))}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                      >
                        <HiPencil className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                  </div>
                )}
                {showWorkForm ? (
                  <form onSubmit={(e) => { e.preventDefault(); openPasswordModal('work'); }} className="p-4 bg-gray-50 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">{editingWorkId ? 'Edit' : 'Add'} work experience</h4>
                      {isSectionEditable('work') && (
                        <button type="button" onClick={() => { setShowWorkForm(false); setEditingWorkId(null); }}>
                          <HiX className="w-5 h-5 text-gray-500" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name of organisation</label>
                        <input
                          type="text"
                          value={workForm.organisationName}
                          onChange={(e) => setWorkForm((f) => ({ ...f, organisationName: e.target.value }))}
                          disabled={!isSectionEditable('work')}
                          readOnly={!isSectionEditable('work')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          placeholder="e.g. Youverify Ltd"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Industry / Sector</label>
                        <input
                          type="text"
                          value={workForm.industry}
                          onChange={(e) => setWorkForm((f) => ({ ...f, industry: e.target.value }))}
                          disabled={!isSectionEditable('work')}
                          readOnly={!isSectionEditable('work')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          placeholder="e.g. Information Technology"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role / Position</label>
                        <input
                          type="text"
                          value={workForm.role}
                          onChange={(e) => setWorkForm((f) => ({ ...f, role: e.target.value }))}
                          disabled={!isSectionEditable('work')}
                          readOnly={!isSectionEditable('work')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          placeholder="e.g. Senior Product Manager"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employment type</label>
                        <select
                          value={workForm.employmentType}
                          onChange={(e) => setWorkForm((f) => ({ ...f, employmentType: e.target.value }))}
                          disabled={!isSectionEditable('work')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Select</option>
                          <option value="full_time">Full-time</option>
                          <option value="part_time">Part-time</option>
                          <option value="contract">Contract</option>
                          <option value="internship">Internship</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Work mode</label>
                        <select
                          value={workForm.workMode}
                          onChange={(e) => setWorkForm((f) => ({ ...f, workMode: e.target.value }))}
                          disabled={!isSectionEditable('work')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Select</option>
                          <option value="on_site">On-site</option>
                          <option value="remote">Remote</option>
                          <option value="hybrid">Hybrid</option>
                          <option value="global_remote">Global Remote</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                        <input
                          type="date"
                          value={workForm.startDate}
                          onChange={(e) => setWorkForm((f) => ({ ...f, startDate: e.target.value }))}
                          disabled={!isSectionEditable('work')}
                          readOnly={!isSectionEditable('work')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                        <input
                          type="date"
                          value={workForm.endDate}
                          onChange={(e) => setWorkForm((f) => ({ ...f, endDate: e.target.value }))}
                          disabled={!isSectionEditable('work')}
                          readOnly={!isSectionEditable('work')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                        <div className="flex gap-2">
                          <select
                            value={workForm.currency}
                            onChange={(e) => setWorkForm((f) => ({ ...f, currency: e.target.value }))}
                            disabled={!isSectionEditable('work')}
                            className="w-20 px-2 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50 disabled:cursor-not-allowed"
                          >
                            <option value="USD">USD</option>
                            <option value="NGN">NGN</option>
                          </select>
                          <input
                            type="text"
                            value={workForm.salary}
                            onChange={(e) => setWorkForm((f) => ({ ...f, salary: e.target.value }))}
                            disabled={!isSectionEditable('work')}
                            readOnly={!isSectionEditable('work')}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                            placeholder="Salary (Yr/Mo)"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Other compensation</label>
                        <input
                          type="text"
                          value={workForm.otherCompensationInput}
                          onChange={(e) => setWorkForm((f) => ({ ...f, otherCompensationInput: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const value = workForm.otherCompensationInput.trim();
                              if (value) {
                                setWorkForm((f) => ({
                                  ...f,
                                  otherCompensation: [...f.otherCompensation, value],
                                  otherCompensationInput: '',
                                }));
                              }
                            }
                          }}
                          disabled={!isSectionEditable('work')}
                          readOnly={!isSectionEditable('work')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          placeholder="Type and press Enter to add (e.g. Stock, HMD)"
                        />
                        {workForm.otherCompensation.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {workForm.otherCompensation.map((chip, i) => (
                              <span
                                key={`${chip}-${i}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-brand-100 text-brand-800"
                              >
                                {chip}
                                {isSectionEditable('work') && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setWorkForm((f) => ({
                                        ...f,
                                        otherCompensation: f.otherCompensation.filter((_, j) => j !== i),
                                      }))
                                    }
                                    className="hover:bg-brand-200 rounded-full p-0.5"
                                    aria-label="Remove"
                                  >
                                    <HiX className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={workForm.selfDeclared}
                            onChange={(e) => setWorkForm((f) => ({ ...f, selfDeclared: e.target.checked }))}
                            disabled={!isSectionEditable('work')}
                            className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Self declared</span>
                        </label>
                      </div>
                      {!workForm.selfDeclared && (
                        <>
                          <div className="md:col-span-2">
                            <p className="text-sm font-medium text-gray-700 mb-2">Verify information</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                            <input
                              type="url"
                              value={workForm.verifyWebsite}
                              onChange={(e) => setWorkForm((f) => ({ ...f, verifyWebsite: e.target.value }))}
                              disabled={!isSectionEditable('work')}
                              readOnly={!isSectionEditable('work')}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                              placeholder="e.g. https://company.com"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">HR email</label>
                            <input
                              type="email"
                              value={workForm.verifyHrEmail}
                              onChange={(e) => setWorkForm((f) => ({ ...f, verifyHrEmail: e.target.value }))}
                              disabled={!isSectionEditable('work')}
                              readOnly={!isSectionEditable('work')}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                              placeholder="e.g. hr@company.com"
                            />
                          </div>
                        </>
                      )}
                    </div>
                    {isSectionEditable('work') && (
                      <button
                        type="button"
                        onClick={() => openPasswordModal('work')}
                        disabled={workSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium"
                      >
                        <HiSave className="w-4 h-4" />
                        {workSaving ? 'Saving...' : 'Save'}
                      </button>
                    )}
                  </form>
                ) : (
                  <>
                    {workList.length > 0 && (
                      <ul className="space-y-2">
                        {workList.map((w: any) => (
                          <li key={w.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-900">{w.organisationName} – {w.role}</span>
                            <span className="text-xs text-gray-500">{w.verificationStatus === 'verified' ? 'Verified' : 'Pending'}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowWorkForm(true)}
                      disabled={!isSectionEditable('work')}
                      className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <HiPlus className="w-4 h-4" />
                      Add work experience
                    </button>
                  </>
                )}
              </div>
            )}

          {activeTab === 'certification' && (
              <div className="space-y-4">
                <div className="space-y-6">
                  {certList.map((cert, index) => (
                    <div key={index} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Certificate {index + 1}</span>
                        {certList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCertificate(index)}
                            className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                          >
                            <HiX className="w-4 h-4" />
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name of certificate</label>
                          <input
                            type="text"
                            value={cert.name}
                            onChange={(e) => updateCert(index, { name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                            placeholder="e.g. Advanced Product Management"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Issued by</label>
                          <input
                            type="text"
                            value={cert.issuedBy}
                            onChange={(e) => updateCert(index, { issuedBy: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                            placeholder="e.g. Coursera"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Issued date</label>
                          <input
                            type="date"
                            value={cert.issuedDate}
                            onChange={(e) => updateCert(index, { issuedDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Expiration date</label>
                          <input
                            type="date"
                            value={cert.expirationDate}
                            onChange={(e) => updateCert(index, { expirationDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Credential ID</label>
                          <input
                            type="text"
                            value={cert.credentialId}
                            onChange={(e) => updateCert(index, { credentialId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                            placeholder="e.g. DORYY53743"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Reporting URL</label>
                          <input
                            type="url"
                            value={cert.reportingUrl}
                            onChange={(e) => updateCert(index, { reportingUrl: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                            placeholder="https://..."
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Supporting media</label>
                          <input
                            type="file"
                            accept=".pdf,image/jpeg,image/png,image/webp"
                            onChange={(e) => handleCertFileUpload(index, e)}
                            disabled={certUploadingIndex !== null}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                          />
                          {cert.supportingMediaUrl && (
                            <p className="mt-1 text-sm text-gray-600">
                              Uploaded: <a href={cert.supportingMediaUrl.startsWith('http') ? cert.supportingMediaUrl : `${api.defaults.baseURL || ''}${cert.supportingMediaUrl}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">View file</a>
                            </p>
                          )}
                          {certUploadingIndex === index && <p className="mt-1 text-sm text-gray-500">Uploading...</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addCertificate}
                    className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium"
                  >
                    <HiPlus className="w-4 h-4" />
                    Add certificate
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleVerifyCertification}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium"
                >
                  <HiShieldCheck className="w-4 h-4" />
                  Verify
                </button>
              </div>
            )}

          {activeTab === 'family' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marital status</label>
                    <select
                      value={maritalStatus}
                      onChange={(e) => setMaritalStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    >
                      <option value="">Select</option>
                      {MARITAL_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  {maritalStatus === 'married' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Spouse name</label>
                      <input
                        type="text"
                        value={spouseName}
                        onChange={(e) => setSpouseName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="e.g. Full name"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <p className="text-sm font-medium text-gray-700">Relations</p>
                  {relationsList.map((rel, index) => (
                    <div key={index} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-wrap items-end gap-4">
                      <div className="flex-1 min-w-[120px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
                        <select
                          value={rel.relationType}
                          onChange={(e) => updateFamilyRelation(index, { relationType: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="">Select</option>
                          {RELATION_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[160px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                        <input
                          type="text"
                          value={rel.fullName}
                          onChange={(e) => updateFamilyRelation(index, { fullName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                          placeholder="e.g. Full name"
                        />
                      </div>
                      {relationsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFamilyRelation(index)}
                          className="text-red-600 hover:text-red-700 flex items-center gap-1 text-sm"
                        >
                          <HiX className="w-4 h-4" />
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addFamilyRelation}
                    className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium"
                  >
                    <HiPlus className="w-4 h-4" />
                    Add more
                  </button>
                </div>
              </div>
            )}

          {activeTab === 'social' && (
              <div className="space-y-4">
                {[
                  { key: 'linkedin' as const, label: 'LinkedIn', hasOtp: true },
                  { key: 'twitter' as const, label: 'X (Twitter)' },
                  { key: 'facebook' as const, label: 'Facebook' },
                  { key: 'instagram' as const, label: 'Instagram' },
                  { key: 'tiktok' as const, label: 'TikTok' },
                  { key: 'snapchat' as const, label: 'Snapchat' },
                ].map(({ key, label, hasOtp }) => (
                  <div key={key} className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="w-28 font-medium text-gray-700">{label}</span>
                    <input
                      type="url"
                      value={social[key]}
                      onChange={(e) => setSocial((s) => ({ ...s, [key]: e.target.value }))}
                      placeholder={`${label} URL`}
                      className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                    />
                    {hasOtp && (
                      <>
                        <input
                          type="text"
                          value={linkedInOtp}
                          onChange={(e) => setLinkedInOtp(e.target.value)}
                          placeholder="OTP code"
                          className="w-28 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={sendingOtp}
                          className="px-3 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm disabled:opacity-50"
                        >
                          {sendingOtp ? 'Sending...' : 'Send OTP'}
                        </button>
                      </>
                    )}
                    <span className="text-sm text-gray-500">
                      {social[key] ? 'Linked' : 'Not linked'}
                    </span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => openPasswordModal('social')}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium"
                >
                  <HiSave className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => openPasswordModal('save_all')}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 font-medium shadow-sm"
          >
            <HiSave className="w-5 h-5" />
            Save all
          </button>
        </div>
      </div>

      {/* Password verification modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closePasswordModal}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                <HiLockClosed className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Verify your password</h3>
                <p className="text-sm text-gray-500">Enter your password to save changes</p>
              </div>
            </div>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordConfirm()}
              placeholder="Current password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closePasswordModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
                Cancel
              </button>
              <button type="button" onClick={handlePasswordConfirm} disabled={passwordVerifying} className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium">
                {passwordVerifying ? 'Verifying...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProfessionalLayout>
  );
}
