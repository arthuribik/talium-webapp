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
import { SearchableList } from '@/components/common/SearchableList';

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

const INDUSTRY_OPTIONS = [
  'Information Technology',
  'Financial Services',
  'Healthcare',
  'Education',
  'Manufacturing',
  'Retail',
  'Consulting',
  'Government',
  'Non-profit',
  'Media & Entertainment',
  'Telecommunications',
  'Energy & Utilities',
  'Real Estate',
  'Legal',
  'Agriculture',
  'Transportation & Logistics',
  'Hospitality',
  'Construction',
  'Pharmaceuticals',
  'Insurance',
  'E-commerce',
  'Marketing & Advertising',
  'Other',
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

type WorkEntry = {
  id?: string;
  organisationName: string;
  industry: string;
  role: string;
  employmentType: string;
  workMode: string;
  startDate: string;
  endDate: string;
  currency: string;
  salary: string;
  otherCompensation: string[];
  otherCompensationInput: string;
  selfDeclared: boolean;
  verifyWebsite: string;
  verifyHrEmail: string;
};

const emptyWork = (): WorkEntry => ({
  organisationName: '',
  industry: '',
  role: '',
  employmentType: '',
  workMode: '',
  startDate: '',
  endDate: '',
  currency: 'USD',
  salary: '',
  otherCompensation: [],
  otherCompensationInput: '',
  selfDeclared: false,
  verifyWebsite: '',
  verifyHrEmail: '',
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
  const [pendingSaveAction, setPendingSaveAction] = useState<'personal' | 'location' | 'social' | 'education' | 'work' | 'certification' | 'family' | 'save_all' | null>(null);
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
  // Education (list of entries like Location)
  const [educationEntriesList, setEducationEntriesList] = useState<EducationEntry[]>([emptyEducation()]);
  const [educationSaving, setEducationSaving] = useState(false);

  // Work (list of entries like Location)
  const [workEntriesList, setWorkEntriesList] = useState<WorkEntry[]>([emptyWork()]);
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
          middleName: data.middleName ?? p.middleName ?? '',
          gender: data.gender ?? p.gender ?? '',
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
        const workList = data.workExperience || [];
        if (Array.isArray(workList) && workList.length > 0) {
          setWorkEntriesList(
            workList.map((w: any) => {
              const vc = w.verificationContact && typeof w.verificationContact === 'object' ? w.verificationContact : {};
              const sr = w.salaryRange && typeof w.salaryRange === 'object' ? w.salaryRange : null;
              return {
                id: w.id,
                organisationName: w.organisationName || '',
                industry: w.industry || '',
                role: w.role || '',
                employmentType: w.employmentType || '',
                workMode: w.workMode || '',
                startDate: w.startDate ? (typeof w.startDate === 'string' ? w.startDate.slice(0, 10) : '') : '',
                endDate: w.endDate ? (typeof w.endDate === 'string' ? w.endDate.slice(0, 10) : '') : '',
                currency: w.currency || 'USD',
                salary: sr != null && (sr.min != null || sr.max != null) ? String(sr.min ?? sr.max ?? '') : '',
                otherCompensation: Array.isArray(w.achievements) ? w.achievements : [],
                otherCompensationInput: '',
                selfDeclared: !vc.email && !vc.website,
                verifyWebsite: vc.website || '',
                verifyHrEmail: vc.email || '',
              };
            }),
          );
        } else {
          setWorkEntriesList([emptyWork()]);
        }
        if (Array.isArray(data.certifications)) {
          if (data.certifications.length > 0) {
            setCertList(
              data.certifications.map((c: any) => ({
                name: c.name || '',
                issuedBy: c.issuedBy || '',
                issuedDate: c.issuedDate || '',
                expirationDate: c.expirationDate || '',
                credentialId: c.credentialId || '',
                reportingUrl: c.reportingUrl || '',
                supportingMediaUrl: c.supportingMediaUrl || '',
              })),
            );
          } else {
            setCertList([emptyCertificate()]);
          }
        }
        if (data.familyInfo && typeof data.familyInfo === 'object') {
          const fi = data.familyInfo as any;
          setMaritalStatus(fi.maritalStatus || '');
          setSpouseName(fi.spouseName || '');
          if (Array.isArray(fi.relations) && fi.relations.length > 0) {
            setRelationsList(
              fi.relations.map((r: any) => ({
                relationType: r.relationType || '',
                fullName: r.fullName || '',
              })),
            );
          }
        }
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
        firstName: personal.firstName?.trim() || undefined,
        lastName: personal.lastName?.trim() || undefined,
        middleName: personal.middleName?.trim() || undefined,
        gender: personal.gender || undefined,
        dateOfBirth: personal.dateOfBirth || undefined,
        nationality: personal.nationality || undefined,
        idType: personal.idType || undefined,
        idNumber: personal.idNumber?.trim() || undefined,
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

  const updateWorkEntry = (index: number, updates: Partial<WorkEntry>) => {
    setWorkEntriesList((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, ...updates } : entry)),
    );
  };
  const addWorkEntry = () => {
    setWorkEntriesList((prev) => [...prev, emptyWork()]);
  };
  const removeWorkEntry = (index: number) => {
    setWorkEntriesList((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
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

  const buildWorkPayload = (entry: WorkEntry) => ({
    organisationName: entry.organisationName,
    industry: entry.industry,
    role: entry.role,
    employmentType: (entry.employmentType || 'full_time') as any,
    workMode: (entry.workMode || 'on_site') as any,
    startDate: entry.startDate || new Date().toISOString().split('T')[0],
    endDate: entry.endDate || undefined,
    currentlyWorking: !entry.endDate,
    location: { city: '', state: '', country: '' },
    responsibilities: [],
    achievements: entry.otherCompensation?.length ? [...entry.otherCompensation] : [],
    salaryRange: entry.salary ? { min: parseFloat(entry.salary) || 0, max: parseFloat(entry.salary) || 0 } : undefined,
    currency: entry.currency,
    ...(entry.selfDeclared
      ? {}
      : {
          verificationContact: {
            email: entry.verifyHrEmail?.trim() || undefined,
            website: entry.verifyWebsite?.trim() || undefined,
          },
        }),
  });

  const handleSaveWork = async () => {
    if (!profile?.id) return;
    setWorkSaving(true);
    try {
      for (const entry of workEntriesList) {
        const payload = buildWorkPayload(entry);
        if (entry.id) {
          await api.put(`/v1/professional/experience/${entry.id}`, payload);
        } else {
          await api.post(`/v1/professional/${profile.id}/experience`, payload);
        }
      }
      toast.success('Work experience saved');
      setSectionEditMode((prev) => ({ ...prev, work: false }));
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

  const handleSaveCertification = async () => {
    setSaving(true);
    try {
      await api.put('/v1/professional/profile', {
        certifications: certList.map((c) => ({
          name: c.name,
          issuedBy: c.issuedBy,
          issuedDate: c.issuedDate || undefined,
          expirationDate: c.expirationDate || undefined,
          credentialId: c.credentialId,
          reportingUrl: c.reportingUrl || undefined,
          supportingMediaUrl: c.supportingMediaUrl || undefined,
        })),
      });
      toast.success('Certifications saved');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save certifications');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFamily = async () => {
    setSaving(true);
    try {
      await api.put('/v1/professional/profile', {
        familyInfo: {
          maritalStatus: maritalStatus || undefined,
          spouseName: maritalStatus === 'married' ? spouseName || undefined : undefined,
          relations: relationsList
            .filter((r) => r.relationType?.trim() || r.fullName?.trim())
            .map((r) => ({ relationType: r.relationType, fullName: r.fullName })),
        },
      });
      toast.success('Family information saved');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save family information');
    } finally {
      setSaving(false);
    }
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

  const openPasswordModal = (action: 'personal' | 'location' | 'social' | 'education' | 'work' | 'certification' | 'family' | 'save_all') => {
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
      else if (action === 'work') handleSaveWork();
      else if (action === 'certification') handleSaveCertification();
      else if (action === 'family') handleSaveFamily();
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
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {verificationStatus.personal.verified ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Verified
                    </span>
                  ) : verificationStatus.personal.completed ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Pending verification
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Not completed
                    </span>
                  )}
                  {verificationStatus.personal.completed && !verificationStatus.personal.verified && !isSectionEditable('personal') && (
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
                        <SearchableList
                          value={personal.gender}
                          onChange={(gender) => setPersonal((p) => ({ ...p, gender }))}
                          options={[{ value: '', label: 'Select' }, ...GENDERS.map((g) => ({ value: g, label: g }))]}
                          placeholder="Select"
                          disabled={!isSectionEditable('personal')}
                          className="disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nationality <span className="text-red-500">*</span></label>
                        <SearchableList
                          value={personal.nationality}
                          onChange={(nationality) => setPersonal((p) => ({ ...p, nationality }))}
                          options={[{ value: '', label: 'Select country' }, ...COUNTRIES.map((c) => ({ value: c, label: c }))]}
                          placeholder="Select country"
                          disabled={!isSectionEditable('personal')}
                          className="disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ID Type <span className="text-red-500">*</span></label>
                        <SearchableList
                          value={personal.idType}
                          onChange={(idType) => setPersonal((p) => ({ ...p, idType }))}
                          options={[{ value: '', label: 'Select' }, ...ID_TYPE_OPTIONS]}
                          placeholder="Select"
                          disabled={!isSectionEditable('personal')}
                          className="disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
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
              </div>
            )}

          {activeTab === 'location' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {verificationStatus.location?.verified ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Verified
                    </span>
                  ) : verificationStatus.location?.completed ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Pending verification
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Not completed
                    </span>
                  )}
                  {verificationStatus.location?.completed && !verificationStatus.location?.verified && !isSectionEditable('location') && (
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
                          <SearchableList
                            value={loc.country}
                            onChange={(country) => updateLocation(index, { country })}
                            options={[{ value: '', label: 'Select country' }, ...COUNTRIES.map((c) => ({ value: c, label: c }))]}
                            placeholder="Select country"
                            disabled={!isSectionEditable('location')}
                            className="disabled:bg-gray-50 disabled:cursor-not-allowed"
                          />
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
                          <SearchableList
                            value={loc.documentType}
                            onChange={(documentType) => updateLocation(index, { documentType })}
                            options={[{ value: '', label: 'Select' }, ...LOCATION_DOCUMENT_TYPE_OPTIONS]}
                            placeholder="Select"
                            disabled={!isSectionEditable('location')}
                            className="disabled:bg-gray-50 disabled:cursor-not-allowed"
                          />
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
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {verificationStatus.education?.verified ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Verified
                    </span>
                  ) : verificationStatus.education?.completed ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Pending verification
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Not completed
                    </span>
                  )}
                  {verificationStatus.education?.completed && !verificationStatus.education?.verified && !isSectionEditable('education') && (
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
                          <SearchableList
                            value={entry.levelOfEducation}
                            onChange={(levelOfEducation) => updateEducationEntry(index, { levelOfEducation })}
                            options={[{ value: '', label: 'Select' }, ...EDUCATION_LEVELS]}
                            placeholder="Select"
                            disabled={!isSectionEditable('education')}
                            className="disabled:bg-gray-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Undergraduate / Postgraduate</label>
                          <SearchableList
                            value={entry.programLevel}
                            onChange={(programLevel) => updateEducationEntry(index, { programLevel })}
                            options={[{ value: '', label: 'Select' }, ...EDUCATION_PROGRAM_LEVEL_OPTIONS]}
                            placeholder="Select"
                            disabled={!isSectionEditable('education')}
                            className="disabled:bg-gray-50 disabled:cursor-not-allowed"
                          />
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
                          <SearchableList
                            value={entry.duration}
                            onChange={(duration) => updateEducationEntry(index, { duration })}
                            options={[{ value: '', label: 'Select' }, ...DURATION_OPTIONS.map((d) => ({ value: d, label: d }))]}
                            placeholder="Select"
                            disabled={!isSectionEditable('education')}
                            className="disabled:bg-gray-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                          <SearchableList
                            value={entry.country}
                            onChange={(country) => updateEducationEntry(index, { country })}
                            options={[{ value: '', label: 'Select' }, ...COUNTRIES.map((c) => ({ value: c, label: c }))]}
                            placeholder="Select"
                            disabled={!isSectionEditable('education')}
                            className="disabled:bg-gray-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Cost of education</label>
                          <div className="flex gap-2">
                            <SearchableList
                              value={entry.currency}
                              onChange={(currency) => updateEducationEntry(index, { currency })}
                              options={[
                                { value: 'USD', label: 'USD' },
                                { value: 'NGN', label: 'NGN' },
                                { value: 'EUR', label: 'EUR' },
                                { value: 'GBP', label: 'GBP' },
                              ]}
                              placeholder="Currency"
                              disabled={!isSectionEditable('education')}
                              className="w-24 disabled:bg-gray-50 disabled:cursor-not-allowed"
                            />
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
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {verificationStatus.work?.verified ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Verified
                    </span>
                  ) : verificationStatus.work?.completed ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Pending verification
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Not completed
                    </span>
                  )}
                  {verificationStatus.work?.completed && !verificationStatus.work?.verified && !isSectionEditable('work') && (
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
                <div className="space-y-6">
                  {workEntriesList.map((entry, index) => (
                    <div key={entry.id ?? index} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Work experience {index + 1}</span>
                        {workEntriesList.length > 1 && isSectionEditable('work') && (
                          <button
                            type="button"
                            onClick={() => removeWorkEntry(index)}
                            className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                          >
                            <HiX className="w-4 h-4" />
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name of organisation</label>
                          <input
                            type="text"
                            value={entry.organisationName}
                            onChange={(e) => updateWorkEntry(index, { organisationName: e.target.value })}
                            disabled={!isSectionEditable('work')}
                            readOnly={!isSectionEditable('work')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                            placeholder="e.g. Youverify Ltd"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Industry / Sector</label>
                          <SearchableList
                            value={entry.industry}
                            onChange={(industry) => updateWorkEntry(index, { industry })}
                            options={INDUSTRY_OPTIONS}
                            placeholder="Search or select industry"
                            disabled={!isSectionEditable('work')}
                            readOnly={!isSectionEditable('work')}
                            className="disabled:bg-gray-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Role / Position</label>
                          <input
                            type="text"
                            value={entry.role}
                            onChange={(e) => updateWorkEntry(index, { role: e.target.value })}
                            disabled={!isSectionEditable('work')}
                            readOnly={!isSectionEditable('work')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                            placeholder="e.g. Senior Product Manager"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Employment type</label>
                          <SearchableList
                            value={entry.employmentType}
                            onChange={(employmentType) => updateWorkEntry(index, { employmentType })}
                            options={[
                              { value: '', label: 'Select' },
                              { value: 'full_time', label: 'Full-time' },
                              { value: 'part_time', label: 'Part-time' },
                              { value: 'contract', label: 'Contract' },
                              { value: 'internship', label: 'Internship' },
                            ]}
                            placeholder="Select"
                            disabled={!isSectionEditable('work')}
                            className="disabled:bg-gray-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Work mode</label>
                          <SearchableList
                            value={entry.workMode}
                            onChange={(workMode) => updateWorkEntry(index, { workMode })}
                            options={[
                              { value: '', label: 'Select' },
                              { value: 'on_site', label: 'On-site' },
                              { value: 'remote', label: 'Remote' },
                              { value: 'hybrid', label: 'Hybrid' },
                              { value: 'global_remote', label: 'Global Remote' },
                            ]}
                            placeholder="Select"
                            disabled={!isSectionEditable('work')}
                            className="disabled:bg-gray-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                          <input
                            type="date"
                            value={entry.startDate}
                            onChange={(e) => updateWorkEntry(index, { startDate: e.target.value })}
                            disabled={!isSectionEditable('work')}
                            readOnly={!isSectionEditable('work')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                          <input
                            type="date"
                            value={entry.endDate}
                            onChange={(e) => updateWorkEntry(index, { endDate: e.target.value })}
                            disabled={!isSectionEditable('work')}
                            readOnly={!isSectionEditable('work')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                          <div className="flex gap-2">
                            <SearchableList
                              value={entry.currency}
                              onChange={(currency) => updateWorkEntry(index, { currency })}
                              options={[{ value: 'USD', label: 'USD' }, { value: 'NGN', label: 'NGN' }]}
                              placeholder="Currency"
                              disabled={!isSectionEditable('work')}
                              className="w-20 disabled:bg-gray-50 disabled:cursor-not-allowed"
                            />
                            <input
                              type="text"
                              value={entry.salary}
                              onChange={(e) => updateWorkEntry(index, { salary: e.target.value })}
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
                            value={entry.otherCompensationInput}
                            onChange={(e) => updateWorkEntry(index, { otherCompensationInput: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const value = entry.otherCompensationInput.trim();
                                if (value) {
                                  updateWorkEntry(index, {
                                    otherCompensation: [...entry.otherCompensation, value],
                                    otherCompensationInput: '',
                                  });
                                }
                              }
                            }}
                            disabled={!isSectionEditable('work')}
                            readOnly={!isSectionEditable('work')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                            placeholder="Type and press Enter to add (e.g. Stock, HMD)"
                          />
                          {entry.otherCompensation.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {entry.otherCompensation.map((chip, i) => (
                                <span
                                  key={`${chip}-${i}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-brand-100 text-brand-800"
                                >
                                  {chip}
                                  {isSectionEditable('work') && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateWorkEntry(index, {
                                          otherCompensation: entry.otherCompensation.filter((_, j) => j !== i),
                                        })
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
                              checked={entry.selfDeclared}
                              onChange={(e) => updateWorkEntry(index, { selfDeclared: e.target.checked })}
                              disabled={!isSectionEditable('work')}
                              className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Self declared</span>
                          </label>
                        </div>
                        {!entry.selfDeclared && (
                          <>
                            <div className="md:col-span-2">
                              <p className="text-sm font-medium text-gray-700 mb-2">Verify information</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                              <input
                                type="url"
                                value={entry.verifyWebsite}
                                onChange={(e) => updateWorkEntry(index, { verifyWebsite: e.target.value })}
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
                                value={entry.verifyHrEmail}
                                onChange={(e) => updateWorkEntry(index, { verifyHrEmail: e.target.value })}
                                disabled={!isSectionEditable('work')}
                                readOnly={!isSectionEditable('work')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                placeholder="e.g. hr@company.com"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addWorkEntry}
                    disabled={!isSectionEditable('work')}
                    className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <HiPlus className="w-4 h-4" />
                    Add more
                  </button>
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
              </div>
            )}

          {activeTab === 'certification' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {verificationStatus.certification?.verified ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Verified
                    </span>
                  ) : verificationStatus.certification?.completed ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Pending verification
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Not completed
                    </span>
                  )}
                  {verificationStatus.certification?.completed && !verificationStatus.certification?.verified && !isSectionEditable('certification') && (
                    <button
                      type="button"
                      onClick={() => setSectionEditMode((prev) => ({ ...prev, certification: true }))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                    >
                      <HiPencil className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>
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
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openPasswordModal('certification')}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium"
                  >
                    <HiSave className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyCertification}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    <HiShieldCheck className="w-4 h-4" />
                    Verify
                  </button>
                </div>
              </div>
            )}

          {activeTab === 'family' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {verificationStatus.family?.verified ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Verified
                    </span>
                  ) : verificationStatus.family?.completed ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Pending verification
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Not completed
                    </span>
                  )}
                  {verificationStatus.family?.completed && !verificationStatus.family?.verified && !isSectionEditable('family') && (
                    <button
                      type="button"
                      onClick={() => setSectionEditMode((prev) => ({ ...prev, family: true }))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                    >
                      <HiPencil className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marital status</label>
                    <SearchableList
                      value={maritalStatus}
                      onChange={setMaritalStatus}
                      options={[{ value: '', label: 'Select' }, ...MARITAL_STATUS_OPTIONS]}
                      placeholder="Select"
                      className=""
                    />
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
                        <SearchableList
                          value={rel.relationType}
                          onChange={(relationType) => updateFamilyRelation(index, { relationType })}
                          options={[{ value: '', label: 'Select' }, ...RELATION_TYPE_OPTIONS]}
                          placeholder="Select"
                          className=""
                        />
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
                <button
                  type="button"
                  onClick={() => openPasswordModal('family')}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium"
                >
                  <HiSave className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}

          {activeTab === 'social' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {verificationStatus.social?.verified ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Verified
                    </span>
                  ) : verificationStatus.social?.completed ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Pending verification
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Not completed
                    </span>
                  )}
                  {verificationStatus.social?.completed && !verificationStatus.social?.verified && !isSectionEditable('social') && (
                    <button
                      type="button"
                      onClick={() => setSectionEditMode((prev) => ({ ...prev, social: true }))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                    >
                      <HiPencil className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'linkedin' as const, label: 'LinkedIn' },
                    { key: 'twitter' as const, label: 'X (Twitter)' },
                    { key: 'facebook' as const, label: 'Facebook' },
                    { key: 'instagram' as const, label: 'Instagram' },
                    { key: 'tiktok' as const, label: 'TikTok' },
                    { key: 'snapchat' as const, label: 'Snapchat' },
                  ].map(({ key, label }) => (
                    <div key={key} className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-sm font-medium text-gray-700">{label}</label>
                        <span className="text-xs text-gray-500">{social[key] ? 'Linked' : 'Not linked'}</span>
                      </div>
                      <input
                        type="url"
                        value={social[key]}
                        onChange={(e) => setSocial((s) => ({ ...s, [key]: e.target.value }))}
                        disabled={!isSectionEditable('social')}
                        readOnly={!isSectionEditable('social')}
                        placeholder={`${label} URL`}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  ))}
                </div>

                {isSectionEditable('social') && (
                  <button
                    type="button"
                    onClick={() => openPasswordModal('social')}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium"
                  >
                    <HiSave className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>
            )}
        </div>

        {/* <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => openPasswordModal('save_all')}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 font-medium shadow-sm"
          >
            <HiSave className="w-5 h-5" />
            Save all
          </button>
        </div> */}
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
