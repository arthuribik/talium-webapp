import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import {
  HiUser,
  HiPencil,
  HiSave,
  HiLocationMarker,
  HiCalendar,
  HiClock,
  HiExternalLink,
  HiEye,
  HiShieldCheck,
  HiCamera,
  HiChevronDown,
  HiBriefcase,
  HiAcademicCap,
  HiFolder,
} from 'react-icons/hi';
import { FaLinkedin, FaTwitter, FaGithub } from 'react-icons/fa';
import { HiGlobeAlt } from 'react-icons/hi2';
import {
  formatTimezoneRowDisplay,
  getSortedTimezoneOptions,
  type TimezoneOption,
} from '@/utils/timezones';
import {
  ProfileWorkSection,
  ProfileEducationSection,
  ProfileLocationsSection,
  ProfileCertificationsSection,
  ProfileProjectsSection,
  ProfileIdentitySection,
} from '@/pages/professional/profileVerificationDisplay';
import {
  VERIFICATION_TABS,
  mergeVerificationStatusFromSources,
  verificationProgressFromMerged,
  type VerificationSectionKey,
  type VerificationSectionStatus,
} from '@/utils/verificationProgress';

type ProfileTab =
  | 'identity'
  | 'experience'
  | 'education'
  | 'locations'
  | 'certifications'
  | 'projects';

const PROFILE_TAB_IDS = new Set<ProfileTab>([
  'identity',
  'experience',
  'education',
  'locations',
  'certifications',
  'projects',
]);

function profileTabFromSearchString(tab: string | null): ProfileTab {
  if (tab && PROFILE_TAB_IDS.has(tab as ProfileTab)) return tab as ProfileTab;
  return 'experience';
}

const EMPTY_VERIFICATION_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  work: HiBriefcase,
  education: HiAcademicCap,
  location: HiLocationMarker,
  certification: HiShieldCheck,
  projects: HiFolder,
};

function ProfileSectionVerificationBadge({
  status,
}: {
  status: VerificationSectionStatus | undefined;
}) {
  if (!status) return null;
  if (status.verified) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-800">
        Verified
      </span>
    );
  }
  if (status.completed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
        Pending verification
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
      Not completed
    </span>
  );
}

function browserDefaultIana(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export default function Profile() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [savingAbout, setSavingAbout] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [profileCompleteness, setProfileCompleteness] = useState(0);
  const [mergedVerification, setMergedVerification] = useState<Record<
    VerificationSectionKey,
    VerificationSectionStatus
  > | null>(null);
  const [editingAbout, setEditingAbout] = useState(false);
  const [editingProfession, setEditingProfession] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>(() =>
    typeof window !== 'undefined'
      ? profileTabFromSearchString(new URLSearchParams(window.location.search).get('tab'))
      : 'experience',
  );
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    profession: '',
    description: '',
  });
  const [timezoneIana, setTimezoneIana] = useState<string>(() => browserDefaultIana());
  /** When false and profile has a saved IANA timezone, show compact clock + IANA + edit icon. */
  const [timezoneEditorOpen, setTimezoneEditorOpen] = useState(false);
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [timezoneFilter, setTimezoneFilter] = useState('');
  const [savingTimezone, setSavingTimezone] = useState(false);
  const timezoneDropdownRef = useRef<HTMLDivElement>(null);

  const timezoneOptions = useMemo(() => getSortedTimezoneOptions(), []);
  const filteredTimezones = useMemo(() => {
    const q = timezoneFilter.trim().toLowerCase();
    if (!q) return timezoneOptions;
    return timezoneOptions.filter(
      (o) =>
        o.iana.toLowerCase().includes(q) ||
        o.regionLabel.toLowerCase().includes(q) ||
        o.offsetLabel.toLowerCase().includes(q),
    );
  }, [timezoneOptions, timezoneFilter]);

  const { completedVerificationSteps, progressPct } = useMemo(() => {
    if (!mergedVerification) {
      return { completedVerificationSteps: 0, progressPct: 0 };
    }
    return verificationProgressFromMerged(mergedVerification);
  }, [mergedVerification]);

  useEffect(() => {
    fetchAll();
  }, []);

  /** Keep `?tab=` in sync with the selected section (and with browser back/forward). */
  useEffect(() => {
    const raw = searchParams.get('tab');
    if (!raw || !PROFILE_TAB_IDS.has(raw as ProfileTab)) {
      setActiveTab('experience');
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'experience');
          return next;
        },
        { replace: true },
      );
      return;
    }
    setActiveTab(raw as ProfileTab);
  }, [searchParams, setSearchParams]);

  const setProfileTab = (tab: ProfileTab) => {
    setActiveTab(tab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    setPhotoError(false);
  }, [profile?.id, profile?.profileImageUrl, profile?.profileImage, profile?.livenessSelfieUrl]);

  useEffect(() => {
    if (!profile) return;
    const saved = typeof profile.timezone === 'string' ? profile.timezone.trim() : '';
    if (!saved) setTimezoneEditorOpen(true);
  }, [profile?.id, profile?.timezone]);

  const fetchAll = async () => {
    setLoading(true);
    setPhotoError(false);
    try {
      const [profRes, dashRes, statusRes] = await Promise.all([
        api.get('/v1/professional/profile'),
        api.get('/v1/professional/dashboard/stats').catch(() => ({ data: { data: null } })),
        api.get('/v1/professional/verification-status').catch(() => ({ data: { data: null } })),
      ]);
      const data = profRes.data.data;
      setProfile(data);
      setProfileCompleteness(dashRes.data?.data?.profileCompleteness ?? 0);
      const merged = mergeVerificationStatusFromSources(statusRes.data?.data, data);
      setMergedVerification(merged);
      setFormData({
        profession: data.profession || '',
        description: data.description || '',
      });
      const savedTz = typeof data.timezone === 'string' ? data.timezone.trim() : '';
      setTimezoneIana(savedTz || browserDefaultIana());
      setTimezoneOpen(false);
      setTimezoneFilter('');
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      toast.error('Failed to load profile');
      setMergedVerification(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAbout = async () => {
    setSavingAbout(true);
    try {
      await api.put('/v1/professional/profile', {
        profession: formData.profession,
        description: formData.description,
      });
      toast.success('Profile updated');
      setEditingAbout(false);
      setEditingProfession(false);
      await fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSavingAbout(false);
    }
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file (JPEG, PNG, WebP, etc.)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be at most 5 MB');
      return;
    }
    setUploadingPhoto(true);
    setPhotoError(false);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post('/v1/professional/upload-profile-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Profile photo updated');
      await fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const clearProfilePhoto = async () => {
    setUploadingPhoto(true);
    try {
      await api.put('/v1/professional/profile', { profileImageUrl: '' });
      toast.success('Profile photo removed');
      setPhotoError(false);
      await fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  useEffect(() => {
    if (!timezoneOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = timezoneDropdownRef.current;
      if (el && !el.contains(e.target as Node)) {
        setTimezoneOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [timezoneOpen]);

  const saveTimezone = async () => {
    setSavingTimezone(true);
    try {
      await api.put('/v1/professional/profile', { timezone: timezoneIana });
      toast.success('Timezone saved');
      setTimezoneOpen(false);
      setTimezoneEditorOpen(false);
      await fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save timezone');
    } finally {
      setSavingTimezone(false);
    }
  };

  const storedTimezoneIana = profile?.timezone?.trim() || null;
  const timezoneBaseline = storedTimezoneIana || browserDefaultIana();
  const timezoneDirty = timezoneIana !== timezoneBaseline;
  const showTimezoneEditor = !storedTimezoneIana || timezoneEditorOpen;

  const selectTimezone = (opt: TimezoneOption) => {
    setTimezoneIana(opt.iana);
    setTimezoneOpen(false);
    setTimezoneFilter('');
  };

  const saveProfessionOnly = async () => {
    setSavingAbout(true);
    try {
      await api.put('/v1/professional/profile', { profession: formData.profession });
      toast.success('Role updated');
      setEditingProfession(false);
      await fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSavingAbout(false);
    }
  };

  const getLocationDisplay = () => {
    if (profile?.workExperience?.length > 0) {
      const latest = profile.workExperience[profile.workExperience.length - 1];
      const loc = latest.location;
      if (loc && typeof loc === 'object') {
        const parts = [loc.city, loc.country].filter(Boolean);
        if (parts.length) return parts.join(', ');
      }
      if (typeof loc === 'string' && loc) return loc;
    }
    return profile?.country || null;
  };

  if (loading) {
    return (
      <ProfessionalLayout>
        <div className="min-h-[50vh] bg-gray-50 px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-4xl text-center text-gray-500">Loading profile…</div>
        </div>
      </ProfessionalLayout>
    );
  }

  if (!profile) {
    return (
      <ProfessionalLayout>
        <div className="min-h-[50vh] bg-gray-50 px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <HiUser className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Profile not found</h3>
            <p className="mt-2 text-sm text-gray-500">Try again later.</p>
          </div>
        </div>
      </ProfessionalLayout>
    );
  }

  const fullName =
    `${profile.user?.firstName || ''} ${profile.user?.lastName || ''}`.trim() || 'Professional';
  const location = getLocationDisplay();
  const locationsList = Array.isArray(profile.locations) ? profile.locations : [];
  const projectsList = Array.isArray(profile.projects)
    ? profile.projects
    : Array.isArray(profile.professionalProjects)
      ? profile.professionalProjects
      : [];
  const certificationsList = Array.isArray(profile.certifications)
    ? profile.certifications
    : profile.certifications && typeof profile.certifications === 'object'
      ? Object.values(profile.certifications)
      : [];
  const social = profile.socialMedia || {};
  const identityOk = profile.identityStatus === 'verified' || profile.identityVerified;
  const verifiedAt = profile.identityVerification?.verifiedAt
    ? new Date(profile.identityVerification.verifiedAt)
    : null;
  const updatedLabel = profile.updatedAt
    ? new Date(profile.updatedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const VerificationLink = ({
    tab,
    children,
    className,
  }: {
    tab?: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <Link
      to={tab ? `/professional/verification?tab=${tab}` : '/professional/verification'}
      className={className ?? 'font-medium text-brand-600 hover:text-brand-700'}
    >
      {children}
    </Link>
  );

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: 'identity', label: 'Identity & contact' },
    { id: 'experience', label: 'Experience' },
    { id: 'education', label: 'Education' },
    { id: 'locations', label: 'Locations' },
    { id: 'certifications', label: 'Certifications' },
    { id: 'projects', label: 'Projects' },
  ];

  const socialLinks: { key: string; href: string; Icon: React.ComponentType<{ className?: string }> }[] =
    [];
  const add = (key: string, url: string, Icon: React.ComponentType<{ className?: string }>) => {
    const u = typeof url === 'string' ? url.trim() : '';
    if (!u) return;
    socialLinks.push({
      key,
      href: u.startsWith('http') ? u : `https://${u}`,
      Icon,
    });
  };
  add('linkedin', social.linkedin, FaLinkedin);
  add('twitter', social.twitter, FaTwitter);
  add('github', social.github, FaGithub);
  add('portfolio', social.portfolio, HiGlobeAlt);

  const viewPublic = () => {
    window.open(`/professionals/${profile.id}`, '_blank', 'noopener,noreferrer');
  };

  const profilePhotoRaw = (profile.profileImageUrl || profile.profileImage) as string | undefined;
  const profilePhotoUrl =
    typeof profilePhotoRaw === 'string' && profilePhotoRaw.trim() ? profilePhotoRaw.trim() : undefined;
  const livenessSelfieRaw = profile.livenessSelfieUrl as string | undefined;
  const livenessSelfieUrl =
    typeof livenessSelfieRaw === 'string' && livenessSelfieRaw.trim()
      ? livenessSelfieRaw.trim()
      : undefined;
  /** Liveness check completed (personal verification flow); distinct from profileImageUrl. */
  const livenessComplete = Boolean(livenessSelfieUrl);
  /** Prefer uploaded profile photo; otherwise show liveness selfie without overwriting the stored profile field. */
  const avatarDisplayUrl = profilePhotoUrl || livenessSelfieUrl || undefined;

  return (
    <ProfessionalLayout>
      <div className="min-h-full bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Page header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            <button
              type="button"
              onClick={viewPublic}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:bg-gray-50"
            >
              <HiEye className="h-4 w-4 text-gray-500" />
              View as Public
            </button>
          </div>

          {/* Hero card */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            {/* Banner + avatar: avatar is layered on top (z-index) at banner bottom */}
            <div className="relative isolate">
              <div className="relative z-0 h-44 shrink-0 overflow-hidden rounded-t-2xl border-b border-gray-200/70 bg-[#d9e3ff]" />
              <div className="absolute bottom-0 left-5 z-20 translate-y-1/2 sm:left-8">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-label="Upload profile photo"
                  onChange={handleProfilePhotoChange}
                  disabled={uploadingPhoto || !livenessComplete}
                />
                <div className="relative flex flex-col items-start">
                  <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow-lg ring-4 ring-white sm:h-32 sm:w-32">
                    {avatarDisplayUrl && !photoError ? (
                      <img
                        src={avatarDisplayUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={() => setPhotoError(true)}
                      />
                    ) : (
                      <HiUser className="h-14 w-14 text-gray-400 sm:h-16 sm:w-16" />
                    )}
                    {livenessComplete ? (
                      <button
                        type="button"
                        disabled={uploadingPhoto}
                        onClick={() => photoInputRef.current?.click()}
                        className="absolute bottom-0.5 right-0.5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-brand-500 text-white shadow-md hover:bg-brand-600 disabled:opacity-50 sm:bottom-1 sm:right-1"
                        aria-label={profilePhotoUrl ? 'Change profile photo' : 'Add profile photo'}
                        title={profilePhotoUrl ? 'Change photo' : 'Add photo'}
                      >
                        <HiCamera className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    ) : null}
                    {uploadingPhoto ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs font-medium text-gray-700">
                        Uploading…
                      </div>
                    ) : null}
                  </div>
                  {profilePhotoUrl ? (
                    <button
                      type="button"
                      disabled={uploadingPhoto}
                      onClick={clearProfilePhoto}
                      className="mt-1.5 max-w-[7rem] text-left text-xs font-medium text-gray-500 hover:text-red-600 disabled:opacity-50 sm:max-w-none"
                    >
                      Remove photo
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 pt-[4.75rem] sm:px-8 sm:pb-8 sm:pt-8 sm:pl-[10.5rem]">
              <div className="min-w-0">
                  <h2 className="text-2xl font-bold tracking-tight text-gray-900">{fullName}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {editingProfession ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={formData.profession}
                          onChange={(e) => setFormData((f) => ({ ...f, profession: e.target.value }))}
                          placeholder="Role / title"
                          className="min-w-[12rem] rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                        />
                        <button
                          type="button"
                          onClick={saveProfessionOnly}
                          disabled={savingAbout}
                          className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((f) => ({ ...f, profession: profile.profession || '' }));
                            setEditingProfession(false);
                          }}
                          className="text-xs text-gray-500 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-base text-gray-600">
                          {profile.profession || profile.workExperience?.[0]?.role || 'Add your role'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingProfession(true)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-600"
                          aria-label="Edit role"
                        >
                          <HiPencil className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="mt-3 space-y-2">
                    {location ? (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <HiLocationMarker className="h-4 w-4 shrink-0 text-gray-400" />
                        {location}
                      </div>
                    ) : null}
                    <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2">
                      {!showTimezoneEditor && storedTimezoneIana ? (
                        <span className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          <HiClock className="h-4 w-4 shrink-0 text-gray-400" />
                          <span>{storedTimezoneIana.replace(/_/g, ' ')}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTimezoneIana(storedTimezoneIana);
                              setTimezoneEditorOpen(true);
                              setTimezoneOpen(false);
                              setTimezoneFilter('');
                            }}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-brand-600"
                            aria-label="Edit timezone"
                          >
                            <HiPencil className="h-4 w-4" />
                          </button>
                        </span>
                      ) : null}
                      {showTimezoneEditor ? (
                        <>
                          <div
                            className="relative min-w-[min(100%,12rem)] max-w-lg flex-1 basis-[min(100%,18rem)]"
                            ref={timezoneDropdownRef}
                          >
                          <button
                            type="button"
                            onClick={() => {
                              setTimezoneOpen((o) => !o);
                              setTimezoneFilter('');
                            }}
                            className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-700 shadow-sm transition-colors hover:border-gray-300"
                            aria-expanded={timezoneOpen}
                            aria-haspopup="listbox"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <HiClock className="h-4 w-4 shrink-0 text-gray-400" />
                              <span className="truncate text-gray-600">
                                {formatTimezoneRowDisplay(timezoneIana)}
                              </span>
                            </span>
                            <HiChevronDown
                              className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${timezoneOpen ? 'rotate-180' : ''}`}
                            />
                          </button>
                          {timezoneOpen ? (
                            <div
                              className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
                              role="listbox"
                            >
                              <input
                                type="search"
                                value={timezoneFilter}
                                onChange={(e) => setTimezoneFilter(e.target.value)}
                                placeholder="Search timezones…"
                                className="w-full border-b border-gray-100 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                autoFocus
                              />
                              <ul className="max-h-56 overflow-y-auto py-1">
                                {filteredTimezones.length === 0 ? (
                                  <li className="px-3 py-2 text-sm text-gray-500">No matches</li>
                                ) : (
                                  filteredTimezones.map((opt) => (
                                    <li key={opt.iana}>
                                      <button
                                        type="button"
                                        role="option"
                                        aria-selected={opt.iana === timezoneIana}
                                        onClick={() => selectTimezone(opt)}
                                        className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                                          opt.iana === timezoneIana
                                            ? 'bg-brand-50 text-brand-900'
                                            : 'text-gray-800'
                                        }`}
                                      >
                                        <span className="font-medium">{opt.regionLabel}</span>
                                        <span className="text-xs text-gray-500">
                                          {opt.offsetLabel} · {opt.iana.replace(/_/g, ' ')}
                                        </span>
                                      </button>
                                    </li>
                                  ))
                                )}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={saveTimezone}
                            disabled={!timezoneDirty || savingTimezone}
                            className="shrink-0 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingTimezone ? 'Saving…' : 'Save'}
                          </button>
                          {storedTimezoneIana ? (
                            <button
                              type="button"
                              onClick={() => {
                                setTimezoneEditorOpen(false);
                                setTimezoneIana(storedTimezoneIana);
                                setTimezoneOpen(false);
                                setTimezoneFilter('');
                              }}
                              className="text-xs font-medium text-gray-500 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                          ) : null}
                        </div>
                      </>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {socialLinks.length === 0 ? (
                      <span className="text-sm text-gray-400">No social links yet</span>
                    ) : (
                      socialLinks.map(({ key, href, Icon }) => (
                        <a
                          key={key}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-brand-600"
                          aria-label={key}
                        >
                          <Icon className="h-4 w-4" />
                        </a>
                      ))
                    )}
                  </div>
              </div>

              {!livenessComplete ? (
                <div className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  <HiShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <p>
                    Verify your Personal Identity in the{' '}
                    <VerificationLink tab="personal">Verification Center</VerificationLink> to upload a
                    profile picture and banner.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-sm font-medium text-gray-800">
                <span>Profile completion</span>
                <span>{progressPct}%</span>
              </div>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-gray-500">
                  {completedVerificationSteps}/{VERIFICATION_TABS.length} verification steps · ID score{' '}
                  {Math.min(100, profileCompleteness)}/100
                </p>
                <Link
                  to="/professional/verification"
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  Verification Center →
                </Link>
              </div>
              <p className="mt-1 text-xs text-gray-400">Updated {updatedLabel}</p>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-800">
                <HiCalendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {identityOk ? 'Profile valid' : 'Action required'}
                </p>
                <p className="text-sm text-gray-500">
                  {identityOk && verifiedAt
                    ? `Since ${verifiedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : identityOk
                      ? 'Identity verified'
                      : 'Complete verification to unlock full trust'}
                </p>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">About Me</h3>
              {!editingAbout ? (
                <button
                  type="button"
                  onClick={() => setEditingAbout(true)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-600"
                  aria-label="Edit about"
                >
                  <HiPencil className="h-5 w-5" />
                </button>
              ) : null}
            </div>
            {editingAbout ? (
              <div className="space-y-3">
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                  rows={5}
                  placeholder="Tell others about your experience and focus areas…"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((f) => ({ ...f, description: profile?.description ?? '' }));
                      setEditingAbout(false);
                    }}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAbout}
                    disabled={savingAbout}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    <HiSave className="h-4 w-4" />
                    {savingAbout ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-gray-700">
                {profile.description?.trim()
                  ? profile.description
                  : 'Add a short summary so organisations understand your background.'}
              </p>
            )}
          </div>

          {/* Tabs */}
          <div>
            <div className="inline-flex w-full flex-wrap rounded-xl bg-gray-100 p-1 sm:w-auto">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setProfileTab(t.id)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === t.id
                      ? 'border border-gray-200 bg-white text-gray-900 shadow-sm'
                      : 'border border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-3 min-h-[160px] rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="space-y-3">
                {activeTab === 'identity' && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                      <ProfileSectionVerificationBadge status={mergedVerification?.personal} />
                      <VerificationLink tab="personal" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                        Edit in Verification Center →
                      </VerificationLink>
                    </div>
                    <ProfileIdentitySection profile={profile} />
                  </>
                )}

                {activeTab === 'experience' &&
                  (profile.workExperience?.length > 0 ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                        <ProfileSectionVerificationBadge status={mergedVerification?.work} />
                      </div>
                      <ProfileWorkSection items={profile.workExperience} />
                    </>
                  ) : (
                    <EmptyTab
                      message="No work experience added yet. Add data in the Verification Center."
                      tab="work"
                    />
                  ))}

                {activeTab === 'education' &&
                  (profile.education?.length > 0 ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                        <ProfileSectionVerificationBadge status={mergedVerification?.education} />
                      </div>
                      <ProfileEducationSection items={profile.education} />
                    </>
                  ) : (
                    <EmptyTab
                      message="No education added yet. Add data in the Verification Center."
                      tab="education"
                    />
                  ))}

                {activeTab === 'locations' &&
                  (locationsList.length > 0 ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                        <ProfileSectionVerificationBadge status={mergedVerification?.location} />
                      </div>
                      <ProfileLocationsSection items={locationsList} />
                    </>
                  ) : (
                    <EmptyTab
                      message="No locations added yet. Add data in the Verification Center."
                      tab="location"
                    />
                  ))}

                {activeTab === 'certifications' &&
                  (certificationsList.length > 0 ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                        <ProfileSectionVerificationBadge status={mergedVerification?.certification} />
                      </div>
                      <ProfileCertificationsSection items={certificationsList} />
                    </>
                  ) : (
                    <EmptyTab
                      message="No certifications yet. Add data in the Verification Center."
                      tab="certification"
                    />
                  ))}

                {activeTab === 'projects' &&
                  (projectsList.length > 0 ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                        <ProfileSectionVerificationBadge status={mergedVerification?.projects} />
                      </div>
                      <ProfileProjectsSection items={projectsList} />
                    </>
                  ) : (
                    <EmptyTab
                      message="No projects added yet. Add data in the Verification Center."
                      tab="projects"
                    />
                  ))}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400">
            Personal details, ID, and family information are managed in the{' '}
            <VerificationLink>Verification Center</VerificationLink>.
          </p>
        </div>
      </div>
    </ProfessionalLayout>
  );
}

function EmptyTab({ message, tab }: { message: string; tab: string }) {
  const Icon = EMPTY_VERIFICATION_ICONS[tab] ?? HiShieldCheck;
  return (
    <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 px-5 py-10 text-center sm:px-6">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gray-100 bg-white shadow-sm sm:h-14 sm:w-14">
        <Icon className="h-6 w-6 text-brand-500 sm:h-7 sm:w-7" />
      </div>
      <p className="text-sm text-gray-600">{message}</p>
      <Link
        to={`/professional/verification?tab=${tab}`}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        Open Verification Center
        <HiExternalLink className="h-4 w-4" />
      </Link>
    </div>
  );
}
