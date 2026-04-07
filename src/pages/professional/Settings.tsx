import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import { HiCog, HiUser, HiLockClosed, HiShare, HiBookOpen, HiChevronDown, HiLink } from 'react-icons/hi';
import { APP_NAME } from '@/constants/app';

const SETTINGS_TABS = ['profile', 'security', 'your-links', 'feed-preferences'] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];
const DEFAULT_TAB: SettingsTab = 'profile';

const ACCOUNT_PREFS_KEY = 'taldium-professional-account-prefs-v1';

const labelClass = 'mb-1.5 block text-sm font-medium text-gray-800';
const inputClass =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25';
const cardClass = 'rounded-xl border border-gray-200 bg-white p-6';
const saveBtnClass =
  'rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50';

function isSettingsTab(t: string | null): t is SettingsTab {
  return t !== null && SETTINGS_TABS.includes(t as SettingsTab);
}

function loadAccountPrefs(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ACCOUNT_PREFS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} appearance-none pr-10`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <HiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
    </div>
  );
}

export default function ProfessionalSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const activeTab: SettingsTab = (() => {
    if (tabParam === 'privacy') return 'feed-preferences';
    if (isSettingsTab(tabParam)) return tabParam;
    return DEFAULT_TAB;
  })();

  useEffect(() => {
    if (tabParam === 'privacy') {
      setSearchParams({ tab: 'feed-preferences' }, { replace: true });
      return;
    }
    if (!isSettingsTab(tabParam)) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [tabParam, activeTab, setSearchParams]);

  const [saving, setSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    showEmail: true,
    showPhone: false,
    allowDataSharing: true,
    allowJobRecommendations: true,
    allowOrganisationAccess: true,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [accountForm, setAccountForm] = useState({
    displayNameMode: 'first_last',
    titlePrefix: 'none',
    nameSuffix: 'none',
    profession: '',
    profilePhotoVisibility: 'members',
  });
  const [contactEmail, setContactEmail] = useState('');

  const [linksForm, setLinksForm] = useState({
    linkedin: '',
    twitter: '',
    facebook: '',
    instagram: '',
    github: '',
    portfolio: '',
  });

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const response = await api.get('/v1/professional/profile');
      const data = response.data.data;
      setProfile(data);
      const prefs = loadAccountPrefs();
      setAccountForm({
        displayNameMode: prefs.displayNameMode ?? 'first_last',
        titlePrefix: prefs.titlePrefix ?? 'none',
        nameSuffix: prefs.nameSuffix ?? 'none',
        profession: data.profession || '',
        profilePhotoVisibility: prefs.profilePhotoVisibility ?? 'members',
      });
      setContactEmail(data.user?.email || '');
      setLinksForm({
        linkedin: data.socialMedia?.linkedin || '',
        twitter: data.socialMedia?.twitter || '',
        facebook: data.socialMedia?.facebook || '',
        instagram: data.socialMedia?.instagram || '',
        github: data.socialMedia?.github || '',
        portfolio: data.socialMedia?.portfolio || '',
      });
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      toast.error('Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const fetchPrivacySettings = useCallback(async () => {
    try {
      const response = await api.get('/v1/professional/privacy-settings');
      if (response.data.data) {
        setPrivacySettings(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch privacy settings:', err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'profile' || activeTab === 'your-links') {
      fetchProfile();
    }
  }, [activeTab, fetchProfile]);

  useEffect(() => {
    if (activeTab === 'feed-preferences') {
      fetchPrivacySettings();
    }
  }, [activeTab, fetchPrivacySettings]);

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/v1/professional/profile', { profession: accountForm.profession });
      localStorage.setItem(
        ACCOUNT_PREFS_KEY,
        JSON.stringify({
          displayNameMode: accountForm.displayNameMode,
          titlePrefix: accountForm.titlePrefix,
          nameSuffix: accountForm.nameSuffix,
          profilePhotoVisibility: accountForm.profilePhotoVisibility,
        }),
      );
      toast.success('Changes saved');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleLinksSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/v1/professional/profile', { socialMedia: linksForm });
      toast.success('Links updated');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save links');
    } finally {
      setSaving(false);
    }
  };

  const handlePrivacySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/v1/professional/privacy-settings', privacySettings);
      toast.success('Feed preferences saved');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await api.put('/v1/professional/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password updated');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const handlePrivacyChange = (field: string, value: unknown) => {
    setPrivacySettings((prev) => ({ ...prev, [field]: value }));
  };

  const setTab = (tab: SettingsTab) => setSearchParams({ tab });

  const profileVerified =
    !!profile &&
    (profile.identityStatus === 'verified' || profile.identityVerified === true);

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Security' },
    { id: 'your-links', label: 'Your Links' },
    { id: 'feed-preferences', label: 'Feed Preferences' },
  ];

  return (
    <ProfessionalLayout>
      <div className="p-6">
        <div className="mb-6 flex items-center gap-2">
          <HiCog className="h-7 w-7 shrink-0 text-brand-500" aria-hidden />
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>

        <div className="mb-6 inline-flex w-full max-w-full flex-wrap rounded-full bg-gray-100 p-1 sm:w-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Profile — Account preferences */}
        {activeTab === 'profile' && (
          <form onSubmit={handleAccountSubmit} className={cardClass}>
            <div className="mb-6 flex flex-col gap-1 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="flex items-center gap-2">
                <HiUser className="h-5 w-5 text-gray-500" aria-hidden />
                <h2 className="text-lg font-semibold text-gray-900">Account Preferences</h2>
              </div>
              <Link
                to="/professional/profile"
                className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline sm:shrink-0"
              >
                View full profile
              </Link>
            </div>

            {profileLoading && !profile ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <div className="space-y-5">
                <SelectField
                  id="displayNameMode"
                  label="Display Name"
                  value={accountForm.displayNameMode}
                  onChange={(v) => setAccountForm((f) => ({ ...f, displayNameMode: v }))}
                  options={[
                    { value: 'first_last', label: 'First and last name only' },
                    { value: 'full', label: 'Full name (including middle)' },
                    { value: 'first_only', label: 'First name only' },
                    { value: 'initial_last', label: 'Initial and last name' },
                  ]}
                />
                <SelectField
                  id="titlePrefix"
                  label="Title/Prefix"
                  value={accountForm.titlePrefix}
                  onChange={(v) => setAccountForm((f) => ({ ...f, titlePrefix: v }))}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'dr', label: 'Dr.' },
                    { value: 'prof', label: 'Prof.' },
                    { value: 'mr', label: 'Mr.' },
                    { value: 'mrs', label: 'Mrs.' },
                    { value: 'ms', label: 'Ms.' },
                    { value: 'mx', label: 'Mx.' },
                  ]}
                />
                <SelectField
                  id="nameSuffix"
                  label="Name Suffix"
                  value={accountForm.nameSuffix}
                  onChange={(v) => setAccountForm((f) => ({ ...f, nameSuffix: v }))}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'jr', label: 'Jr.' },
                    { value: 'sr', label: 'Sr.' },
                    { value: 'ii', label: 'II' },
                    { value: 'iii', label: 'III' },
                  ]}
                />
                <div>
                  <label htmlFor="profession" className={labelClass}>
                    Professional Service
                  </label>
                  <input
                    id="profession"
                    type="text"
                    value={accountForm.profession}
                    onChange={(e) => setAccountForm((f) => ({ ...f, profession: e.target.value }))}
                    className={inputClass}
                    placeholder="e.g., Data Engineer, Product Engineer, Lawyer"
                  />
                </div>
                <div>
                  <label htmlFor="contactEmail" className={labelClass}>
                    Contact Email
                  </label>
                  <input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    readOnly
                    className={`${inputClass} cursor-default`}
                    title="From your account"
                  />
                </div>
                <SelectField
                  id="profilePhotoVisibility"
                  label="Display Profile Picture to"
                  value={accountForm.profilePhotoVisibility}
                  onChange={(v) => setAccountForm((f) => ({ ...f, profilePhotoVisibility: v }))}
                  options={[
                    { value: 'members', label: 'Taldium Members' },
                    { value: 'public', label: 'Everyone' },
                    { value: 'private', label: 'Only me' },
                    { value: 'orgs', label: 'Organizations only' },
                  ]}
                />
                <div className="pt-2">
                  <button type="submit" disabled={saving} className={saveBtnClass}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}

        {/* Security */}
        {activeTab === 'security' && (
          <form onSubmit={handlePasswordSubmit} className={cardClass}>
            <div className="mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
              <HiLockClosed className="h-5 w-5 text-gray-500" aria-hidden />
              <h2 className="text-lg font-semibold text-gray-900">Security</h2>
            </div>
            <p className="mb-5 text-sm text-gray-600">Change the password you use to sign in.</p>
            <div className="max-w-md space-y-5">
              <div>
                <label htmlFor="currentPassword" className={labelClass}>
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className={inputClass}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label htmlFor="newPassword" className={labelClass}>
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className={inputClass}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className={labelClass}>
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className={inputClass}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="pt-2">
                <button type="submit" disabled={saving} className={saveBtnClass}>
                  {saving ? 'Updating…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Your Links */}
        {activeTab === 'your-links' && (
          <div className="space-y-6">
            <div className={cardClass}>
              <div className="mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                <HiLink className="h-5 w-5 text-emerald-600" aria-hidden />
                <h2 className="text-lg font-semibold text-gray-900">Your Profile Links</h2>
              </div>
              {profileLoading && !profile ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : profile ? (
                <>
                  <p className="mb-5 text-sm text-gray-600">
                    Share these links so others can view your public profile or your verified contact card.
                  </p>
                  <div className="space-y-5">
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-gray-500">{APP_NAME} Profile Link</p>
                      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                        <p className="break-all text-sm font-semibold text-gray-900">
                          {typeof window !== 'undefined' ? window.location.host : ''}
                          /professionals/{profile.id}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-gray-500">Contact Me Link</p>
                      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                        <p className="break-all text-sm font-semibold text-gray-900">
                          {typeof window !== 'undefined' ? window.location.host : ''}
                          /contact/{profile.id}
                        </p>
                      </div>
                      {profileVerified ? (
                        <p className="mt-2 text-xs text-gray-500">This information is verified by {APP_NAME}</p>
                      ) : (
                        <p className="mt-2 text-xs text-amber-700">
                          Complete identity verification so visitors see a &quot;verified by {APP_NAME}&quot; badge on
                          your contact page.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-6">
                    <button
                      type="button"
                      disabled={profileLoading}
                      onClick={() =>
                        copyText(
                          `${window.location.origin}/professionals/${profile.id}`,
                          'Profile link copied',
                        )
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                      Copy Profile Link
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">Could not load your profile links.</p>
              )}
            </div>

            <form onSubmit={handleLinksSubmit} className={cardClass}>
              <div className="mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                <HiShare className="h-5 w-5 text-gray-500" aria-hidden />
                <h2 className="text-lg font-semibold text-gray-900">Social &amp; portfolio</h2>
              </div>
              <p className="mb-5 text-sm text-gray-600">URLs shown on your public profile.</p>
              {profileLoading && !profile ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  {(
                    [
                      ['linkedin', 'LinkedIn'],
                      ['twitter', 'Twitter / X'],
                      ['facebook', 'Facebook'],
                      ['instagram', 'Instagram'],
                      ['github', 'GitHub'],
                      ['portfolio', 'Portfolio'],
                    ] as const
                  ).map(([key, lab]) => (
                    <div key={key} className="sm:col-span-1">
                      <label htmlFor={key} className={labelClass}>
                        {lab}
                      </label>
                      <input
                        id={key}
                        type="url"
                        value={linksForm[key]}
                        onChange={(e) => setLinksForm((f) => ({ ...f, [key]: e.target.value }))}
                        className={inputClass}
                        placeholder="https://"
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6 pt-2">
                <button type="submit" disabled={saving || profileLoading} className={saveBtnClass}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Feed Preferences */}
        {activeTab === 'feed-preferences' && (
          <form onSubmit={handlePrivacySubmit} className={cardClass}>
            <div className="mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
              <HiBookOpen className="h-5 w-5 text-gray-500" aria-hidden />
              <h2 className="text-lg font-semibold text-gray-900">Feed Preferences</h2>
            </div>
            <p className="mb-5 text-sm text-gray-600">
              Control visibility, recommendations, and how organizations interact with your profile.
            </p>
            <div className="space-y-6">
              <div>
                <label className={labelClass}>Profile Visibility</label>
                <div className="relative">
                  <select
                    value={privacySettings.profileVisibility}
                    onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                    className={`${inputClass} appearance-none pr-10`}
                  >
                    <option value="public">Public — visible to everyone</option>
                    <option value="private">Private — only visible to you</option>
                    <option value="organisations">Organizations only</option>
                  </select>
                  <HiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div className="space-y-4">
                {(
                  [
                    ['showEmail', 'Show email address', 'Allow others to see your email'],
                    ['showPhone', 'Show phone number', 'Allow others to see your phone number'],
                    ['allowDataSharing', 'Allow data sharing', 'Let organizations access shared data you approve'],
                    ['allowJobRecommendations', 'Job recommendations', 'Personalized jobs in your feed'],
                    ['allowOrganisationAccess', 'Organization access', 'Let organizations view your profile'],
                  ] as const
                ).map(([field, title, hint]) => (
                  <div key={field} className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{title}</p>
                      <p className="text-xs text-gray-500">{hint}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={privacySettings[field as keyof typeof privacySettings] as boolean}
                        onChange={(e) => handlePrivacyChange(field, e.target.checked)}
                        className="peer sr-only"
                      />
                      <span className="relative h-6 w-11 shrink-0 rounded-full bg-gray-200 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500/30" />
                    </label>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button type="submit" disabled={saving} className={saveBtnClass}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </ProfessionalLayout>
  );
}
