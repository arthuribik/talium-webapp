import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import OrganisationLayout from '@/components/organisation/OrganisationLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import {
  HiBell,
  HiGlobe,
  HiLockClosed,
  HiTrash,
  HiDotsVertical,
  HiPlus,
  HiCalendar,
  HiVideoCamera,
  HiLink,
  HiCog,
  HiX,
} from 'react-icons/hi';
import {
  HiAdjustmentsHorizontal,
  HiShieldCheck,
  HiPresentationChartLine,
  HiPuzzlePiece,
} from 'react-icons/hi2';

type SettingsTab = 'general' | 'roles' | 'activity' | 'integrations';

const TAB_IDS: SettingsTab[] = ['general', 'roles', 'activity', 'integrations'];

function isSettingsTab(t: string | null): t is SettingsTab {
  return t !== null && TAB_IDS.includes(t as SettingsTab);
}

type ActivityLogType = 'success' | 'info' | 'warning' | 'error';

type IntegrationItemIcon = 'calendar' | 'video' | 'link' | 'cog';
type IntegrationSectionIcon = 'calendar' | 'video' | 'puzzle';

interface IntegrationItemRow {
  provider: string;
  title: string;
  description: string;
  icon: IntegrationItemIcon;
  connected: boolean;
}

interface IntegrationSectionRow {
  id: string;
  title: string;
  subtitle: string;
  sectionIcon: IntegrationSectionIcon;
  items: IntegrationItemRow[];
}

interface ActivityLogEntry {
  id: string;
  action: string;
  user: string;
  details: string;
  type: ActivityLogType;
  timestamp: string;
}

interface SettingsRoleRow {
  id: string;
  kind: 'system' | 'custom';
  roleKey: string | null;
  name: string;
  isSystem: boolean;
  description: string;
  memberCount: number;
  permissionCount: number;
  permissions: string[];
}

interface PermissionCatalogItem {
  key: string;
  label: string;
}

interface PermissionCatalogSection {
  id: string;
  title: string;
  columns: 1 | 2;
  items: PermissionCatalogItem[];
}

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f] focus-visible:ring-offset-2 ${
        enabled ? 'bg-[#1e3a5f]' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function memberWord(n: number) {
  return `${n} member${n === 1 ? '' : 's'}`;
}

function formatActivityTimestamp(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function activityTypeBadgeClasses(type: string) {
  switch (type) {
    case 'success':
      return 'bg-emerald-100 text-emerald-800';
    case 'info':
      return 'bg-sky-100 text-sky-800';
    case 'warning':
      return 'bg-amber-100 text-amber-800';
    case 'error':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function activityTypeLabel(type: string) {
  if (!type) return '—';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function IntegrationItemIconEl({ icon }: { icon: IntegrationItemIcon }) {
  const cls = 'h-5 w-5 shrink-0 text-[#1e3a5f]';
  switch (icon) {
    case 'calendar':
      return <HiCalendar className={cls} aria-hidden />;
    case 'video':
      return <HiVideoCamera className={cls} aria-hidden />;
    case 'link':
      return <HiLink className={cls} aria-hidden />;
    case 'cog':
      return <HiCog className={cls} aria-hidden />;
    default:
      return <HiCog className={cls} aria-hidden />;
  }
}

function SectionHeaderIcon({ kind }: { kind: IntegrationSectionIcon }) {
  const cls = 'h-5 w-5 shrink-0 text-[#1e3a5f]';
  if (kind === 'calendar') return <HiCalendar className={cls} aria-hidden />;
  if (kind === 'video') return <HiVideoCamera className={cls} aria-hidden />;
  return <HiPuzzlePiece className={cls} aria-hidden />;
}

export default function OrganisationSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: SettingsTab = useMemo(
    () => (isSettingsTab(tabParam) ? tabParam : 'general'),
    [tabParam],
  );

  const setTab = (tab: SettingsTab) => {
    setSearchParams(tab === 'general' ? {} : { tab });
  };

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t !== null && t !== '' && !isSettingsTab(t)) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [applicationAlerts, setApplicationAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  });

  const [roles, setRoles] = useState<SettingsRoleRow[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesMenuId, setRolesMenuId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createPerms, setCreatePerms] = useState<string[]>([]);
  const [createSaving, setCreateSaving] = useState(false);
  const [permissionCatalog, setPermissionCatalog] = useState<
    PermissionCatalogSection[]
  >([]);

  const [activityEntries, setActivityEntries] = useState<ActivityLogEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityTotal, setActivityTotal] = useState(0);

  const [integrationSections, setIntegrationSections] = useState<
    IntegrationSectionRow[]
  >([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [integrationBusyProvider, setIntegrationBusyProvider] = useState<string | null>(
    null,
  );

  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const res = await api.get('/v1/organisation/settings/roles');
      const data = res.data?.data;
      setRoles(data?.roles ?? []);
      setPermissionCatalog(
        Array.isArray(data?.permissionCatalog) ? data.permissionCatalog : [],
      );
    } catch {
      toast.error('Could not load roles');
      setRoles([]);
      setPermissionCatalog([]);
    } finally {
      setRolesLoading(false);
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const res = await api.get('/v1/organisation/settings/activity', {
        params: { page: 1, limit: 50 },
      });
      const d = res.data?.data;
      setActivityEntries(d?.entries ?? []);
      setActivityTotal(typeof d?.total === 'number' ? d.total : 0);
    } catch {
      toast.error('Could not load activity log');
      setActivityEntries([]);
      setActivityTotal(0);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const fetchIntegrations = useCallback(async () => {
    setIntegrationsLoading(true);
    try {
      const res = await api.get('/v1/organisation/settings/integrations');
      setIntegrationSections(res.data?.data?.sections ?? []);
    } catch {
      toast.error('Could not load integrations');
      setIntegrationSections([]);
    } finally {
      setIntegrationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'roles') {
      void fetchRoles();
    }
  }, [activeTab, fetchRoles]);

  useEffect(() => {
    if (activeTab === 'activity') {
      void fetchActivity();
    }
  }, [activeTab, fetchActivity]);

  useEffect(() => {
    if (activeTab === 'integrations') {
      void fetchIntegrations();
    }
  }, [activeTab, fetchIntegrations]);

  useEffect(() => {
    if (!rolesMenuId) return;
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-role-menu-root]')) setRolesMenuId(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [rolesMenuId]);

  const tabs: { id: SettingsTab; label: string; icon: typeof HiAdjustmentsHorizontal }[] = [
    { id: 'general', label: 'General', icon: HiAdjustmentsHorizontal },
    { id: 'roles', label: 'Roles & Permissions', icon: HiShieldCheck },
    { id: 'activity', label: 'Activity Log', icon: HiPresentationChartLine },
    { id: 'integrations', label: 'Integrations', icon: HiPuzzlePiece },
  ];

  const handleSaveChanges = () => {
    toast.success('Changes saved');
  };

  const handleUpdatePassword = () => {
    toast.success('Password updated');
    setPasswordForm({ current: '', next: '', confirm: '' });
  };

  const handleDeleteOrganisation = () => {
    if (window.confirm('Permanently delete your organisation and all data?')) {
      toast.error('Organisation deletion is not available in this environment.');
    }
  };

  const openCreateRole = () => {
    setCreateName('');
    setCreateDescription('');
    setCreatePerms([]);
    setCreateOpen(true);
  };

  useEffect(() => {
    if (!createOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCreateOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [createOpen]);

  const toggleCreatePerm = (key: string) => {
    setCreatePerms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const submitCreateRole = async () => {
    const name = createName.trim();
    const description = createDescription.trim();
    if (!name) {
      toast.error('Role name is required');
      return;
    }
    if (createPerms.length === 0) {
      toast.error('Select at least one permission');
      return;
    }
    setCreateSaving(true);
    try {
      await api.post('/v1/organisation/settings/roles', {
        name,
        ...(description ? { description } : {}),
        permissions: createPerms,
      });
      toast.success('Role created');
      setCreateOpen(false);
      await fetchRoles();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Could not create role';
      toast.error(typeof msg === 'string' ? msg : 'Could not create role');
    } finally {
      setCreateSaving(false);
    }
  };

  const deleteCustomRole = async (id: string) => {
    if (!window.confirm('Delete this role?')) return;
    try {
      await api.delete(`/v1/organisation/settings/roles/${id}`);
      toast.success('Role deleted');
      setRolesMenuId(null);
      await fetchRoles();
    } catch {
      toast.error('Could not delete role');
    }
  };

  const connectIntegration = async (provider: string) => {
    setIntegrationBusyProvider(provider);
    try {
      const res = await api.post(
        `/v1/organisation/settings/integrations/${encodeURIComponent(provider)}/connect`,
      );
      setIntegrationSections(res.data?.data?.sections ?? []);
      toast.success('Integration connected');
    } catch {
      toast.error('Could not connect integration');
    } finally {
      setIntegrationBusyProvider(null);
    }
  };

  const disconnectIntegration = async (provider: string) => {
    setIntegrationBusyProvider(provider);
    try {
      const res = await api.delete(
        `/v1/organisation/settings/integrations/${encodeURIComponent(provider)}`,
      );
      setIntegrationSections(res.data?.data?.sections ?? []);
      toast.success('Integration disconnected');
    } catch {
      toast.error('Could not disconnect integration');
    } finally {
      setIntegrationBusyProvider(null);
    }
  };

  const maxWidthClass =
    activeTab === 'roles' ||
    activeTab === 'activity' ||
    activeTab === 'integrations'
      ? 'max-w-5xl'
      : 'max-w-3xl';

  return (
    <OrganisationLayout>
      <div className="min-h-screen bg-[#f3f4f6] p-6 pb-10">
        <div className={`mx-auto ${maxWidthClass}`}>
          <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-[#1e3a5f]">Settings</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage preferences, integrations, and view activity
            </p>
          </header>

          <div className="mb-6 flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-2 border-[#1e3a5f] bg-white text-[#1e3a5f] shadow-sm'
                      : 'border-2 border-transparent bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'general' && (
            <div className="space-y-6">
              <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-6 py-5">
                  <div className="flex items-center gap-2">
                    <HiBell className="h-5 w-5 text-[#1e3a5f]" aria-hidden />
                    <h2 className="text-base font-bold text-gray-900">Notifications</h2>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">Configure how you receive updates</p>
                </div>
                <div className="divide-y divide-gray-100">
                  <div className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">Email Notifications</p>
                      <p className="text-sm text-gray-500">Receive updates via email</p>
                    </div>
                    <Toggle enabled={emailNotifications} onChange={setEmailNotifications} />
                  </div>
                  <div className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">Application Alerts</p>
                      <p className="text-sm text-gray-500">
                        Get notified when someone applies to a job
                      </p>
                    </div>
                    <Toggle enabled={applicationAlerts} onChange={setApplicationAlerts} />
                  </div>
                  <div className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">Weekly Digest</p>
                      <p className="text-sm text-gray-500">Receive a weekly summary of activity</p>
                    </div>
                    <Toggle enabled={weeklyDigest} onChange={setWeeklyDigest} />
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-6 py-5">
                  <div className="flex items-center gap-2">
                    <HiGlobe className="h-5 w-5 text-[#1e3a5f]" aria-hidden />
                    <h2 className="text-base font-bold text-gray-900">Privacy</h2>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">Public Profile</p>
                    <p className="text-sm text-gray-500">
                      Allow your organisation to appear in search results
                    </p>
                  </div>
                  <Toggle enabled={publicProfile} onChange={setPublicProfile} />
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-6 py-5">
                  <div className="flex items-center gap-2">
                    <HiLockClosed className="h-5 w-5 text-[#1e3a5f]" aria-hidden />
                    <h2 className="text-base font-bold text-gray-900">Security</h2>
                  </div>
                </div>
                <div className="space-y-0 divide-y divide-gray-100">
                  <div className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-500">Add an extra layer of security</p>
                    </div>
                    <Toggle enabled={twoFactor} onChange={setTwoFactor} />
                  </div>
                  <div className="px-6 py-5">
                    <p className="mb-3 text-sm font-bold text-gray-900">Change Password</p>
                    <div className="space-y-3">
                      <input
                        type="password"
                        autoComplete="current-password"
                        placeholder="Current password"
                        value={passwordForm.current}
                        onChange={(e) =>
                          setPasswordForm((s) => ({ ...s, current: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                      />
                      <input
                        type="password"
                        autoComplete="new-password"
                        placeholder="New password"
                        value={passwordForm.next}
                        onChange={(e) =>
                          setPasswordForm((s) => ({ ...s, next: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                      />
                      <input
                        type="password"
                        autoComplete="new-password"
                        placeholder="Confirm new password"
                        value={passwordForm.confirm}
                        onChange={(e) =>
                          setPasswordForm((s) => ({ ...s, confirm: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                      />
                      <button
                        type="button"
                        onClick={handleUpdatePassword}
                        className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-200"
                      >
                        Update Password
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
                <div className="border-b border-red-100 px-6 py-5">
                  <div className="flex items-center gap-2">
                    <HiTrash className="h-5 w-5 text-red-600" aria-hidden />
                    <h2 className="text-base font-bold text-red-600">Danger Zone</h2>
                  </div>
                </div>
                <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">Delete Organisation</p>
                    <p className="text-sm text-gray-500">
                      Permanently delete your organisation and all data
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteOrganisation}
                    className="shrink-0 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
                  >
                    Delete Organisation
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'roles' && (
            <div>
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Roles &amp; Permissions</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Define what each role can access and manage
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreateRole}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#152942]"
                >
                  <HiPlus className="h-5 w-5" aria-hidden />
                  Create Role
                </button>
              </div>

              {rolesLoading ? (
                <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
                  Loading roles…
                </div>
              ) : (
                <ul className="space-y-4">
                  {roles.map((role) => (
                    <li
                      key={role.id}
                      className="relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#1e3a5f]">
                          <HiShieldCheck className="h-6 w-6" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1 pr-10">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-gray-900">{role.name}</h3>
                            {role.isSystem ? (
                              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-[#1e3a5f]">
                                System
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm leading-relaxed text-gray-600">
                            {role.description}
                          </p>
                          <p className="mt-2 text-xs text-gray-500">
                            {memberWord(role.memberCount)} • {role.permissionCount} permissions
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {role.permissions.map((tag) => (
                              <span
                                key={`${role.id}-${tag}`}
                                className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div
                        className="absolute right-4 top-4"
                        {...(rolesMenuId === role.id ? { 'data-role-menu-root': '' } : {})}
                      >
                        <button
                          type="button"
                          aria-label="Role options"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRolesMenuId((id) => (id === role.id ? null : role.id));
                          }}
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        >
                          <HiDotsVertical className="h-5 w-5" />
                        </button>
                        {rolesMenuId === role.id && (
                          <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                            {role.kind === 'custom' ? (
                              <button
                                type="button"
                                className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                onClick={() => void deleteCustomRole(role.id)}
                              >
                                Delete role
                              </button>
                            ) : (
                              <div className="px-4 py-2 text-xs text-gray-500">Built-in role</div>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-5">
                <h2 className="text-xl font-bold text-gray-900">Activity Log</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Recent actions and changes in your organisation
                </p>
              </div>
              {activityLoading ? (
                <div className="p-12 text-center text-sm text-gray-500">Loading activity…</div>
              ) : activityEntries.length === 0 ? (
                <div className="p-12 text-center text-sm text-gray-500">No activity yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/80">
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Action
                        </th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          User
                        </th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Details
                        </th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Type
                        </th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Timestamp
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityEntries.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-gray-100 last:border-b-0"
                        >
                          <td className="px-5 py-3.5 text-sm font-medium text-gray-900">
                            {row.action}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-gray-700">{row.user}</td>
                          <td className="max-w-[220px] px-5 py-3.5 text-sm text-gray-600">
                            <span className="block truncate" title={row.details}>
                              {row.details}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${activityTypeBadgeClasses(row.type)}`}
                            >
                              {activityTypeLabel(row.type)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-600">
                            {formatActivityTimestamp(row.timestamp)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {activityTotal > activityEntries.length ? (
                    <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
                      Showing {activityEntries.length} of {activityTotal} entries
                    </p>
                  ) : null}
                </div>
              )}
            </section>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
              {integrationsLoading ? (
                <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500 shadow-sm">
                  Loading integrations…
                </div>
              ) : (
                integrationSections.map((section) => (
                  <section
                    key={section.id}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                  >
                    <div className="border-b border-gray-100 px-6 py-5">
                      <div className="flex items-center gap-2">
                        <SectionHeaderIcon kind={section.sectionIcon} />
                        <h2 className="text-lg font-bold text-gray-900">{section.title}</h2>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{section.subtitle}</p>
                    </div>
                    <div className="space-y-3 p-5">
                      {section.items.map((item) => (
                        <div
                          key={item.provider}
                          className="flex flex-col gap-4 rounded-lg bg-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 flex-1 gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
                              <IntegrationItemIconEl icon={item.icon} />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
                              <p className="mt-0.5 text-sm text-gray-600">{item.description}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                            {item.connected ? (
                              <>
                                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                                  Connected
                                </span>
                                <button
                                  type="button"
                                  disabled={integrationBusyProvider === item.provider}
                                  onClick={() => void disconnectIntegration(item.provider)}
                                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                                >
                                  {integrationBusyProvider === item.provider
                                    ? 'Please wait…'
                                    : 'Disconnect'}
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={integrationBusyProvider === item.provider}
                                onClick={() => void connectIntegration(item.provider)}
                                className="rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#152942] disabled:opacity-50"
                              >
                                {integrationBusyProvider === item.provider
                                  ? 'Connecting…'
                                  : 'Connect'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          )}

          {activeTab === 'general' && (
            <div className="mt-10 flex justify-end">
              <button
                type="button"
                onClick={handleSaveChanges}
                className="rounded-lg bg-[#1e3a5f] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#152942]"
              >
                Save Changes
              </button>
            </div>
          )}
        </div>

        {createOpen && (
          <div className="fixed inset-0 z-50" role="presentation">
            <button
              type="button"
              aria-label="Close drawer"
              className="absolute inset-0 bg-black/40"
              onClick={() => setCreateOpen(false)}
            />
            <aside
              className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-[#f5f6f8] shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-role-title"
            >
              <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
                <h2 id="create-role-title" className="text-lg font-bold text-gray-900">
                  Create New Role
                </h2>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                >
                  <HiX className="h-5 w-5" aria-hidden />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="create-role-name"
                      className="block text-sm font-semibold text-gray-800"
                    >
                      Role Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="create-role-name"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                      placeholder="e.g. Hiring Manager"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="create-role-desc"
                      className="block text-sm font-semibold text-gray-800"
                    >
                      Description
                    </label>
                    <textarea
                      id="create-role-desc"
                      value={createDescription}
                      onChange={(e) => setCreateDescription(e.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                      placeholder="What can this role do?"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-800">Permissions</p>
                    <div className="mt-4 space-y-6">
                      {permissionCatalog.map((section) => (
                        <div key={section.id}>
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            {section.title}
                          </p>
                          <div
                            className={
                              section.columns === 2
                                ? 'mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-3'
                                : 'mt-3 flex flex-col gap-3'
                            }
                          >
                            {section.items.map((item) => (
                              <label
                                key={item.key}
                                className="flex cursor-pointer items-start gap-3 rounded-lg bg-white/60 py-0.5"
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-gray-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
                                  checked={createPerms.includes(item.key)}
                                  onChange={() => toggleCreatePerm(item.key)}
                                />
                                <span className="text-sm text-gray-800">{item.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <footer className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={createSaving}
                  onClick={() => void submitCreateRole()}
                  className="rounded-lg bg-[#1e3a5f] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#152942] disabled:opacity-50"
                >
                  {createSaving ? 'Creating…' : 'Create Role'}
                </button>
              </footer>
            </aside>
          </div>
        )}
      </div>
    </OrganisationLayout>
  );
}
