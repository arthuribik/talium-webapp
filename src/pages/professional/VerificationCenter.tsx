import { useState, useEffect } from 'react';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import {
  HiChevronDown,
  HiChevronRight,
  HiUser,
  HiAcademicCap,
  HiShare,
  HiBriefcase,
  HiBadgeCheck,
  HiUsers,
  HiSave,
  HiPlus,
  HiX,
  HiExternalLink,
  HiShieldCheck,
  HiCheckCircle,
  HiPencil,
} from 'react-icons/hi';
import { COUNTRIES } from '@/utils/countries';

type SectionKey = 'personal' | 'education' | 'social' | 'work' | 'certification' | 'family';

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const EDUCATION_LEVELS = [
  { value: 'high_school', label: 'High School' },
  { value: 'associate', label: 'Associate' },
  { value: 'bachelor', label: 'Bachelor' },
  { value: 'master', label: 'Master' },
  { value: 'doctorate', label: 'Doctorate' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'diploma', label: 'Diploma' },
];
const DURATION_OPTIONS = ['1 year', '2 years', '3 years', '4 years', '5+ years'];

export default function VerificationCenter() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState<Record<SectionKey, { completed: boolean; verified: boolean }>>({
    personal: { completed: false, verified: false },
    education: { completed: false, verified: false },
    social: { completed: false, verified: false },
    work: { completed: false, verified: false },
    certification: { completed: false, verified: false },
    family: { completed: false, verified: false },
  });
  const [expanded, setExpanded] = useState<SectionKey | null>('personal');
  const [saving, setSaving] = useState(false);

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
  });

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

  // Education
  const [educationList, setEducationList] = useState<any[]>([]);
  const [showEducationForm, setShowEducationForm] = useState(false);
  const [educationForm, setEducationForm] = useState({
    levelOfEducation: '',
    degreeType: '',
    institutionName: '',
    duration: '',
    costOfEducation: '',
    currency: 'USD',
    country: '',
  });
  const [editingEducationId, setEditingEducationId] = useState<string | null>(null);
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
    otherCompensation: '',
  });
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [workSaving, setWorkSaving] = useState(false);

  // Certification (local only for now)
  const [certForm, setCertForm] = useState({
    name: '',
    issuedBy: '',
    issuedDate: '',
    expirationDate: '',
    credentialId: '',
    reportingUrl: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

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
        setPersonal((p) => ({
          ...p,
          nationality: data.nationality || '',
          country: data.country || '',
          dateOfBirth: data.dateOfBirth
            ? new Date(data.dateOfBirth).toISOString().split('T')[0]
            : '',
        }));
        const sm = data.socialMedia || {};
        setSocial({
          linkedin: sm.linkedin || '',
          twitter: sm.twitter || '',
          facebook: sm.facebook || '',
          instagram: sm.instagram || '',
          tiktok: sm.tiktok || '',
          snapchat: sm.snapchat || '',
        });
        setEducationList(data.education || []);
        setWorkList(data.workExperience || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (key: SectionKey) => {
    setExpanded((prev) => (prev === key ? null : key));
  };

  const handleSavePersonal = async () => {
    setSaving(true);
    try {
      await api.put('/v1/professional/profile', {
        country: personal.country || undefined,
        nationality: personal.nationality || undefined,
        dateOfBirth: personal.dateOfBirth || undefined,
      });
      toast.success('Personal information saved');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
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

  const handleEducationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    setEducationSaving(true);
    try {
      const payload = {
        levelOfEducation: educationForm.levelOfEducation,
        institutionName: educationForm.institutionName,
        degreeType: educationForm.degreeType || undefined,
        fieldOfStudy: educationForm.degreeType || 'General',
        startDate: educationForm.duration || '2020',
        endDate: new Date().getFullYear().toString(),
        currentlyAttending: false,
        country: educationForm.country || 'Nigeria',
        costOfEducation: educationForm.costOfEducation ? parseFloat(educationForm.costOfEducation) : undefined,
        currency: educationForm.currency,
      };
      if (editingEducationId) {
        await api.put(`/v1/professional/education/${editingEducationId}`, payload);
        toast.success('Education updated');
      } else {
        await api.post(`/v1/professional/${profile.id}/education`, payload);
        toast.success('Education added');
      }
      setShowEducationForm(false);
      setEditingEducationId(null);
      setEducationForm({
        levelOfEducation: '',
        degreeType: '',
        institutionName: '',
        duration: '',
        costOfEducation: '',
        currency: 'USD',
        country: '',
      });
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
        otherCompensation: '',
      });
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save work experience');
    } finally {
      setWorkSaving(false);
    }
  };

  const handleVerifyCertification = () => {
    toast.success('Certification verification will be available soon');
  };

  const AccordionHeader = ({
    id,
    icon: Icon,
    title,
    subtitle,
    isCompleted,
    isVerified,
  }: {
    id: SectionKey;
    icon: any;
    title: string;
    subtitle: string;
    isCompleted?: boolean;
    isVerified?: boolean;
  }) => {
    const status = verificationStatus[id];
    const completed = isCompleted ?? status?.completed ?? false;
    const verified = isVerified ?? status?.verified ?? false;
    return (
      <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors gap-3">
        <button
          type="button"
          onClick={() => toggleSection(id)}
          className="flex-1 flex items-center justify-between text-left min-w-0"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-brand-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">{subtitle}</p>
            </div>
          </div>
          {expanded === id ? (
            <HiChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
          ) : (
            <HiChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
          )}
        </button>
        {completed && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {verified && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <HiCheckCircle className="w-4 h-4" />
                Verified
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(id);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
            >
              <HiPencil className="w-4 h-4" />
              Edit
            </button>
          </div>
        )}
      </div>
    );
  };

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
            Add and verify your information. Expand each section to edit and save.
          </p>
        </div>

        <div className="space-y-3">
          {/* Personal Information */}
          <div>
            <AccordionHeader
              id="personal"
              icon={HiUser}
              title="Personal Information"
              subtitle="Basic details and contact"
            />
            {expanded === 'personal' && (
              <div className="mt-2 p-6 bg-white rounded-xl border border-gray-200 border-t-0 rounded-t-none space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={personal.firstName}
                      onChange={(e) => setPersonal((p) => ({ ...p, firstName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      placeholder="e.g. Jameson"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={personal.lastName}
                      onChange={(e) => setPersonal((p) => ({ ...p, lastName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      placeholder="e.g. Chukwuma"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Middle / Other names</label>
                    <input
                      type="text"
                      value={personal.middleName}
                      onChange={(e) => setPersonal((p) => ({ ...p, middleName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      placeholder="Optional"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                    <input
                      type="email"
                      value={personal.email}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth</label>
                    <input
                      type="date"
                      value={personal.dateOfBirth}
                      onChange={(e) => setPersonal((p) => ({ ...p, dateOfBirth: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      value={personal.gender}
                      onChange={(e) => setPersonal((p) => ({ ...p, gender: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    >
                      <option value="">Select</option>
                      {GENDERS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                    <select
                      value={personal.nationality}
                      onChange={(e) => setPersonal((p) => ({ ...p, nationality: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    >
                      <option value="">Select country</option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country of residence</label>
                    <select
                      value={personal.country}
                      onChange={(e) => setPersonal((p) => ({ ...p, country: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
                      value={personal.address}
                      onChange={(e) => setPersonal((p) => ({ ...p, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      placeholder="e.g. Plot 12, Gordon estate"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={personal.city}
                      onChange={(e) => setPersonal((p) => ({ ...p, city: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      placeholder="e.g. Lekki"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={personal.state}
                      onChange={(e) => setPersonal((p) => ({ ...p, state: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      placeholder="e.g. Lagos State"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSavePersonal}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium"
                >
                  <HiSave className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {/* Educational Information */}
          <div>
            <AccordionHeader
              id="education"
              icon={HiAcademicCap}
              title="Educational Information"
              subtitle={`${educationList.length} educational record(s)`}
            />
            {expanded === 'education' && (
              <div className="mt-2 p-6 bg-white rounded-xl border border-gray-200 border-t-0 rounded-t-none space-y-4">
                {showEducationForm ? (
                  <form onSubmit={handleEducationSubmit} className="p-4 bg-gray-50 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">{editingEducationId ? 'Edit' : 'Add'} institution</h4>
                      <button type="button" onClick={() => { setShowEducationForm(false); setEditingEducationId(null); }}>
                        <HiX className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Level of education</label>
                        <select
                          value={educationForm.levelOfEducation}
                          onChange={(e) => setEducationForm((f) => ({ ...f, levelOfEducation: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                          required
                        >
                          <option value="">Select</option>
                          {EDUCATION_LEVELS.map((l) => (
                            <option key={l.value} value={l.value}>{l.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Degree type</label>
                        <input
                          type="text"
                          value={educationForm.degreeType}
                          onChange={(e) => setEducationForm((f) => ({ ...f, degreeType: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                          placeholder="e.g. Bachelor of Science"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                        <input
                          type="text"
                          value={educationForm.institutionName}
                          onChange={(e) => setEducationForm((f) => ({ ...f, institutionName: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                          placeholder="e.g. University of Lagos"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                        <select
                          value={educationForm.duration}
                          onChange={(e) => setEducationForm((f) => ({ ...f, duration: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
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
                          value={educationForm.country}
                          onChange={(e) => setEducationForm((f) => ({ ...f, country: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
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
                            value={educationForm.currency}
                            onChange={(e) => setEducationForm((f) => ({ ...f, currency: e.target.value }))}
                            className="w-24 px-2 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="USD">USD</option>
                            <option value="NGN">NGN</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                          </select>
                          <input
                            type="text"
                            value={educationForm.costOfEducation}
                            onChange={(e) => setEducationForm((f) => ({ ...f, costOfEducation: e.target.value }))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                            placeholder="Enter cost"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setShowEducationForm(false); setEditingEducationId(null); }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={educationSaving}
                        className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
                      >
                        {educationSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {educationList.length > 0 && (
                      <ul className="space-y-2">
                        {educationList.map((edu: any) => (
                          <li
                            key={edu.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <span className="font-medium text-gray-900">
                              {edu.institutionName} – {edu.degreeType || edu.levelOfEducation}
                            </span>
                            <span className="text-xs text-gray-500">
                              {edu.verificationStatus === 'verified' ? 'Verified' : 'Pending'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowEducationForm(true)}
                      className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium"
                    >
                      <HiPlus className="w-4 h-4" />
                      Add institution
                    </button>
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); toast.success('Verify invitation link will be sent'); }}
                      className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700"
                    >
                      <HiExternalLink className="w-4 h-4" />
                      Verify invitation
                    </a>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Social Media */}
          <div>
            <AccordionHeader
              id="social"
              icon={HiShare}
              title="Social media profiles"
              subtitle={`${[social.linkedin, social.twitter, social.facebook, social.instagram, social.tiktok, social.snapchat].filter(Boolean).length} account(s) connected`}
            />
            {expanded === 'social' && (
              <div className="mt-2 p-6 bg-white rounded-xl border border-gray-200 border-t-0 rounded-t-none space-y-4">
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
                  onClick={handleSaveSocial}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium"
                >
                  <HiSave className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {/* Work Experience */}
          <div>
            <AccordionHeader
              id="work"
              icon={HiBriefcase}
              title="Work Experience"
              subtitle={`${workList.length} record(s)`}
            />
            {expanded === 'work' && (
              <div className="mt-2 p-6 bg-white rounded-xl border border-gray-200 border-t-0 rounded-t-none space-y-4">
                {showWorkForm ? (
                  <form onSubmit={handleWorkSubmit} className="p-4 bg-gray-50 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">{editingWorkId ? 'Edit' : 'Add'} work experience</h4>
                      <button type="button" onClick={() => { setShowWorkForm(false); setEditingWorkId(null); }}>
                        <HiX className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name of organisation</label>
                        <input
                          type="text"
                          value={workForm.organisationName}
                          onChange={(e) => setWorkForm((f) => ({ ...f, organisationName: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                          placeholder="e.g. Information Technology"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role / Position</label>
                        <input
                          type="text"
                          value={workForm.role}
                          onChange={(e) => setWorkForm((f) => ({ ...f, role: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                          placeholder="e.g. Senior Product Manager"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employment type</label>
                        <select
                          value={workForm.employmentType}
                          onChange={(e) => setWorkForm((f) => ({ ...f, employmentType: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                        <input
                          type="date"
                          value={workForm.endDate}
                          onChange={(e) => setWorkForm((f) => ({ ...f, endDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                        <div className="flex gap-2">
                          <select
                            value={workForm.currency}
                            onChange={(e) => setWorkForm((f) => ({ ...f, currency: e.target.value }))}
                            className="w-20 px-2 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="USD">USD</option>
                            <option value="NGN">NGN</option>
                          </select>
                          <input
                            type="text"
                            value={workForm.salary}
                            onChange={(e) => setWorkForm((f) => ({ ...f, salary: e.target.value }))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                            placeholder="Salary (Yr/Mo)"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Other compensation</label>
                        <input
                          type="text"
                          value={workForm.otherCompensation}
                          onChange={(e) => setWorkForm((f) => ({ ...f, otherCompensation: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                          placeholder="e.g. Stock, HMD"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setShowWorkForm(false); setEditingWorkId(null); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        Cancel
                      </button>
                      <button type="submit" disabled={workSaving} className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50">
                        {workSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button type="button" onClick={() => toast.success('Verification request sent')} className="px-4 py-2 border border-brand-500 text-brand-600 rounded-lg hover:bg-brand-50">
                        Verify
                      </button>
                    </div>
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
                      className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium"
                    >
                      <HiPlus className="w-4 h-4" />
                      Add work experience
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Certification */}
          <div>
            <AccordionHeader
              id="certification"
              icon={HiBadgeCheck}
              title="Certification"
              subtitle="Professional certificates"
            />
            {expanded === 'certification' && (
              <div className="mt-2 p-6 bg-white rounded-xl border border-gray-200 border-t-0 rounded-t-none space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name of certificate</label>
                    <input
                      type="text"
                      value={certForm.name}
                      onChange={(e) => setCertForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                      placeholder="e.g. Advanced Product Management"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Issued by</label>
                    <input
                      type="text"
                      value={certForm.issuedBy}
                      onChange={(e) => setCertForm((f) => ({ ...f, issuedBy: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                      placeholder="e.g. Coursera"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Issued date</label>
                    <input
                      type="date"
                      value={certForm.issuedDate}
                      onChange={(e) => setCertForm((f) => ({ ...f, issuedDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiration date</label>
                    <input
                      type="date"
                      value={certForm.expirationDate}
                      onChange={(e) => setCertForm((f) => ({ ...f, expirationDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Credential ID</label>
                    <input
                      type="text"
                      value={certForm.credentialId}
                      onChange={(e) => setCertForm((f) => ({ ...f, credentialId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                      placeholder="e.g. DORYY53743"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reporting URL</label>
                    <input
                      type="url"
                      value={certForm.reportingUrl}
                      onChange={(e) => setCertForm((f) => ({ ...f, reportingUrl: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supporting media</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500 text-sm">
                      Click to upload file (certificate image or PDF)
                    </div>
                  </div>
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
          </div>

          {/* Family & Relationship */}
          <div>
            <AccordionHeader
              id="family"
              icon={HiUsers}
              title="Family & Relationship"
              subtitle="Marital status and relations"
            />
            {expanded === 'family' && (
              <div className="mt-2 p-6 bg-white rounded-xl border border-gray-200 border-t-0 rounded-t-none">
                <p className="text-gray-500">Family and relationship verification will be available in a future update.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => { handleSavePersonal(); handleSaveSocial(); }}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 font-medium shadow-sm"
          >
            <HiSave className="w-5 h-5" />
            Save all
          </button>
        </div>
      </div>
    </ProfessionalLayout>
  );
}
