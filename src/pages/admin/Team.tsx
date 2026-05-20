import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import { useAppSelector } from '@/store/hooks';
import {
  HiSearch,
  HiDotsVertical,
  HiPlus,
  HiChevronLeft,
  HiChevronRight,
  HiX,
  HiShieldCheck,
  HiViewGrid,
  HiOfficeBuilding,
  HiCube,
  HiCurrencyDollar,
  HiCog,
  HiMail,
  HiUser,
  HiPencil,
  HiLockClosed,
  HiBan,
  HiTrash,
} from 'react-icons/hi';

type TeamTab = 'users' | 'roles';

type DisplayStatus = {
  key: 'active' | 'deactivated' | 'suspended';
  label: string;
};

interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  adminRole: string | null;
  roleLabel: string;
  status: string;
  displayStatus: DisplayStatus;
  dateJoined: string;
  lastActive: string;
}

interface RoleSummary {
  key: string;
  label: string;
  memberCount: number;
  permissions: string[];
}

interface CustomRoleBrief {
  id: string;
  name: string;
  description: string;
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
  icon: string;
  items: PermissionCatalogItem[];
}

const STATIC_VERIFIER_ROLE: RoleSummary = {
  key: 'verifier',
  label: 'Verifier',
  memberCount: 0,
  permissions: [
    'View Verification Requests',
    'Approve/Reject Verifications',
    'View Professional Profiles',
  ],
};

const BUILTIN_ROLE_KEYS = [
  'super_admin',
  'admin',
  'support',
  'auditor',
  'verifier',
] as const;

const BUILTIN_ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Operations',
  support: 'Support Agent',
  auditor: 'Finance',
  verifier: 'Verifier',
};

const INVITE_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'admin', label: 'Operations' },
  { value: 'support', label: 'Support Agent' },
  { value: 'auditor', label: 'Finance' },
];

type AdminInviteAccessExpiry = 'none' | '7d' | '14d' | '30d';

function memberLine(n: number) {
  return `${n} member${n === 1 ? '' : 's'}`;
}

const AVATAR_PALETTES = [
  'bg-[#1e3a5f] text-white',
  'bg-brand-500 text-white',
  'bg-sky-600 text-white',
  'bg-indigo-600 text-white',
  'bg-teal-600 text-white',
];

function initials(first: string, last: string) {
  const a = (first || '').trim().charAt(0);
  const b = (last || '').trim().charAt(0);
  return `${a}${b}`.toUpperCase() || '?';
}

function formatTableDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
}

function statusBadgeClasses(key: DisplayStatus['key']) {
  if (key === 'active') return 'bg-emerald-50 text-emerald-800 ring-emerald-600/20';
  if (key === 'suspended') return 'bg-rose-50 text-rose-800 ring-rose-600/15';
  return 'bg-gray-100 text-gray-700 ring-gray-500/10';
}

function statusDotClass(key: DisplayStatus['key']) {
  if (key === 'active') return 'bg-emerald-500';
  if (key === 'suspended') return 'bg-rose-500';
  return 'bg-gray-400';
}

function CatalogSectionIcon({ kind }: { kind: string }) {
  const cls = 'h-5 w-5 shrink-0 text-gray-500';
  if (kind === 'target') return <HiViewGrid className={cls} aria-hidden />;
  if (kind === 'diamond') return <HiCube className={cls} aria-hidden />;
  if (kind === 'arrows') return <HiCurrencyDollar className={cls} aria-hidden />;
  if (kind === 'half') return <HiCog className={cls} aria-hidden />;
  return <HiOfficeBuilding className={cls} aria-hidden />;
}

export default function AdminTeam() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const authUser = useAppSelector((s) => s.auth.user);
  const isSuperAdmin = authUser?.adminRole === 'super_admin';

  const tabParam = searchParams.get('tab');
  const activeTab: TeamTab = tabParam === 'roles' ? 'roles' : 'users';
  const roleFormParam = searchParams.get('roleForm');
  const builtinRoleParam = searchParams.get('builtinRole');
  const customRoleIdParam = searchParams.get('customRoleId');
  const inviteDrawerOpen = searchParams.get('invite') === '1';

  const drawerOpen =
    roleFormParam === 'create' || roleFormParam === 'edit';

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roleSummaries, setRoleSummaries] = useState<RoleSummary[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRoleBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const [rowMenuPosition, setRowMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);

  const [permissionCatalog, setPermissionCatalog] = useState<PermissionCatalogSection[]>(
    [],
  );
  const [builtinPresets, setBuiltinPresets] = useState<Record<string, string[]>>({});
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [roleDetailLoading, setRoleDetailLoading] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [draftPerms, setDraftPerms] = useState<string[]>([]);
  const [savingRole, setSavingRole] = useState(false);

  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteAccessExpiry, setInviteAccessExpiry] =
    useState<AdminInviteAccessExpiry>('none');
  const [inviting, setInviting] = useState(false);

  const limit = 20;

  const patchSearchParams = useCallback(
    (mutate: (n: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams);
      mutate(next);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const setTeamTab = useCallback(
    (tab: TeamTab) => {
      patchSearchParams((n) => {
        if (tab === 'users') {
          n.delete('tab');
          n.delete('roleForm');
          n.delete('builtinRole');
          n.delete('customRoleId');
          n.delete('invite');
        } else {
          n.set('tab', 'roles');
        }
      });
    },
    [patchSearchParams],
  );

  const openCreateRoleDrawer = useCallback(() => {
    patchSearchParams((n) => {
      n.set('tab', 'roles');
      n.set('roleForm', 'create');
      n.delete('builtinRole');
      n.delete('customRoleId');
      n.delete('invite');
    });
  }, [patchSearchParams]);

  const openInviteDrawer = useCallback(() => {
    patchSearchParams((n) => {
      n.delete('tab');
      n.delete('roleForm');
      n.delete('builtinRole');
      n.delete('customRoleId');
      n.set('invite', '1');
    });
  }, [patchSearchParams]);

  const closeInviteDrawer = useCallback(() => {
    patchSearchParams((n) => {
      n.delete('invite');
    });
  }, [patchSearchParams]);

  const openEditBuiltinDrawer = useCallback(
    (builtinKey: string) => {
      patchSearchParams((n) => {
        n.set('tab', 'roles');
        n.set('roleForm', 'edit');
        n.set('builtinRole', builtinKey);
        n.delete('customRoleId');
        n.delete('invite');
      });
    },
    [patchSearchParams],
  );

  const openEditCustomDrawer = useCallback(
    (id: string) => {
      patchSearchParams((n) => {
        n.set('tab', 'roles');
        n.set('roleForm', 'edit');
        n.delete('builtinRole');
        n.set('customRoleId', id);
        n.delete('invite');
      });
    },
    [patchSearchParams],
  );

  const closeRoleDrawer = useCallback(() => {
    patchSearchParams((n) => {
      n.delete('roleForm');
      n.delete('builtinRole');
      n.delete('customRoleId');
    });
  }, [patchSearchParams]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const rf = searchParams.get('roleForm');
    if (!rf) return;
    if (searchParams.get('tab') !== 'roles') {
      patchSearchParams((n) => {
        n.set('tab', 'roles');
      });
    }
  }, [searchParams, patchSearchParams]);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t !== null && t !== '' && t !== 'users' && t !== 'roles') {
      const next = new URLSearchParams(searchParams);
      next.delete('tab');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const inv = searchParams.get('invite');
    if (inv !== null && inv !== '' && inv !== '1') {
      const next = new URLSearchParams(searchParams);
      next.delete('invite');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (searchParams.get('invite') === '1' && searchParams.get('tab') === 'roles') {
      patchSearchParams((n) => {
        n.delete('tab');
      });
    }
  }, [searchParams, patchSearchParams]);

  useEffect(() => {
    const rf = searchParams.get('roleForm');
    const br = searchParams.get('builtinRole');
    const cr = searchParams.get('customRoleId');
    if (rf === 'create' && (br || cr)) {
      patchSearchParams((n) => {
        n.delete('builtinRole');
        n.delete('customRoleId');
      });
      return;
    }
    if (rf === 'edit') {
      if (!br && !cr) {
        patchSearchParams((n) => {
          n.delete('roleForm');
          n.delete('builtinRole');
          n.delete('customRoleId');
        });
        return;
      }
      if (br && !BUILTIN_ROLE_KEYS.includes(br as (typeof BUILTIN_ROLE_KEYS)[number])) {
        patchSearchParams((n) => {
          n.delete('roleForm');
          n.delete('builtinRole');
          n.delete('customRoleId');
        });
      }
    }
  }, [searchParams, patchSearchParams]);

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      const res = await api.get(`/v1/admin/team?${params.toString()}`);
      const d = res.data?.data;
      setMembers(d?.members ?? []);
      setRoleSummaries(d?.roleSummaries ?? []);
      setCustomRoles(Array.isArray(d?.customRoles) ? d.customRoles : []);
      setTotalPages(d?.pagination?.totalPages ?? 1);
      setTotal(d?.pagination?.total ?? 0);
    } catch {
      toast.error('Could not load team');
      setMembers([]);
      setRoleSummaries([]);
      setCustomRoles([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, roleFilter]);

  useEffect(() => {
    void fetchTeam();
  }, [fetchTeam]);

  const closeRowMenu = useCallback(() => {
    setRowMenuId(null);
    setRowMenuPosition(null);
  }, []);

  useEffect(() => {
    document.addEventListener('click', closeRowMenu);
    return () => document.removeEventListener('click', closeRowMenu);
  }, [closeRowMenu]);

  useEffect(() => {
    if (!rowMenuId) return;
    const onScrollOrResize = () => closeRowMenu();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [rowMenuId, closeRowMenu]);

  useEffect(() => {
    if (!rowMenuId) return;
    if (!members.some((m) => m.id === rowMenuId)) closeRowMenu();
  }, [members, rowMenuId, closeRowMenu]);

  useEffect(() => {
    if (!drawerOpen && !inviteDrawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (inviteDrawerOpen) closeInviteDrawer();
      else closeRoleDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen, inviteDrawerOpen, closeRoleDrawer, closeInviteDrawer]);

  useEffect(() => {
    if (!inviteDrawerOpen) return;
    setInviteFullName('');
    setInviteEmail('');
    setInviteRole('');
    setInviteMessage('');
    setInviteAccessExpiry('none');
  }, [inviteDrawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      try {
        const res = await api.get('/v1/admin/team/permission-catalog');
        const d = res.data?.data;
        if (cancelled) return;
        setPermissionCatalog(Array.isArray(d?.sections) ? d.sections : []);
        const p = d?.builtinRolePresets;
        setBuiltinPresets(
          p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, string[]>) : {},
        );
      } catch {
        if (!cancelled) {
          toast.error('Could not load permissions');
          setPermissionCatalog([]);
          setBuiltinPresets({});
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    if (catalogLoading) return;

    if (roleFormParam === 'create') {
      setDraftName('');
      setDraftDesc('');
      setDraftPerms([]);
      return;
    }

    if (roleFormParam === 'edit' && builtinRoleParam) {
      const preset = builtinPresets[builtinRoleParam];
      setDraftName(BUILTIN_ROLE_LABELS[builtinRoleParam] ?? builtinRoleParam);
      setDraftDesc('');
      setDraftPerms(Array.isArray(preset) ? [...preset] : []);
      setRoleDetailLoading(false);
      return;
    }

    if (roleFormParam === 'edit' && customRoleIdParam) {
      let cancelled = false;
      setRoleDetailLoading(true);
      (async () => {
        try {
          const res = await api.get(
            `/v1/admin/team/custom-roles/${encodeURIComponent(customRoleIdParam)}`,
          );
          const row = res.data?.data;
          if (cancelled || !row) return;
          setDraftName(row.name ?? '');
          setDraftDesc(row.description ?? '');
          setDraftPerms(Array.isArray(row.permissions) ? row.permissions : []);
        } catch {
          if (!cancelled) toast.error('Could not load role');
        } finally {
          if (!cancelled) setRoleDetailLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [
    drawerOpen,
    catalogLoading,
    roleFormParam,
    builtinRoleParam,
    customRoleIdParam,
    builtinPresets,
  ]);

  const avatarClass = useMemo(() => {
    return (id: string) => {
      let h = 0;
      for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % 997;
      return AVATAR_PALETTES[h % AVATAR_PALETTES.length];
    };
  }, []);

  const roleCards = useMemo(() => {
    const fromApi = roleSummaries.map((r) => ({
      kind: 'builtin' as const,
      cardKey: r.key,
      label: r.label,
      memberCount: r.memberCount,
      permissions: Array.isArray(r.permissions) ? r.permissions : [],
      builtinKey: r.key,
    }));
    const withVerifier = fromApi.some((r) => r.cardKey === 'verifier')
      ? fromApi
      : [
          ...fromApi,
          {
            kind: 'verifier' as const,
            cardKey: 'verifier',
            label: STATIC_VERIFIER_ROLE.label,
            memberCount: STATIC_VERIFIER_ROLE.memberCount,
            permissions: STATIC_VERIFIER_ROLE.permissions,
            builtinKey: 'verifier',
          },
        ];
    const customCards = customRoles.map((c) => ({
      kind: 'custom' as const,
      cardKey: `custom:${c.id}`,
      label: c.name,
      memberCount: 0,
      permissions: Array.isArray(c.permissions) ? c.permissions : [],
      customId: c.id,
    }));
    return [...withVerifier, ...customCards];
  }, [roleSummaries, customRoles]);

  const invitePermissionPreview = useMemo(() => {
    if (!inviteRole) return [];
    const row = roleSummaries.find((r) => r.key === inviteRole);
    return Array.isArray(row?.permissions) ? row.permissions : [];
  }, [inviteRole, roleSummaries]);

  const rowMenuMember = useMemo(
    () => (rowMenuId ? (members.find((x) => x.id === rowMenuId) ?? null) : null),
    [rowMenuId, members],
  );

  const submitInvite = async () => {
    if (!isSuperAdmin) return;
    const name = inviteFullName.trim();
    const email = inviteEmail.trim();
    if (!name) {
      toast.error('Full name is required');
      return;
    }
    if (!email) {
      toast.error('Email is required');
      return;
    }
    if (!inviteRole) {
      toast.error('Select a role');
      return;
    }
    setInviting(true);
    try {
      await api.post('/v1/admin/users/invite', {
        fullName: name,
        email,
        role: inviteRole,
        ...(inviteMessage.trim() ? { personalMessage: inviteMessage.trim() } : {}),
        accessExpiry: inviteAccessExpiry,
      });
      toast.success('Invitation sent');
      closeInviteDrawer();
      await fetchTeam();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not send invitation';
      toast.error(typeof msg === 'string' ? msg : 'Could not send invitation');
    } finally {
      setInviting(false);
    }
  };

  const isBuiltinOrVerifierEdit =
    roleFormParam === 'edit' && !!builtinRoleParam && !customRoleIdParam;
  const isCustomEdit = roleFormParam === 'edit' && !!customRoleIdParam;
  const formReadOnly = isBuiltinOrVerifierEdit || (!isSuperAdmin && (roleFormParam === 'create' || isCustomEdit));
  const canSubmitCustom =
    isSuperAdmin && (roleFormParam === 'create' || isCustomEdit) && !formReadOnly;

  const toggleDraftPerm = (key: string) => {
    if (formReadOnly) return;
    setDraftPerms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const submitRoleForm = async () => {
    if (!canSubmitCustom) return;
    const name = draftName.trim();
    const description = draftDesc.trim();
    if (!name) {
      toast.error('Role name is required');
      return;
    }
    if (draftPerms.length === 0) {
      toast.error('Select at least one permission');
      return;
    }
    setSavingRole(true);
    try {
      if (roleFormParam === 'create') {
        await api.post('/v1/admin/team/custom-roles', {
          name,
          description,
          permissions: draftPerms,
        });
        toast.success('Role created');
      } else if (customRoleIdParam) {
        await api.put(
          `/v1/admin/team/custom-roles/${encodeURIComponent(customRoleIdParam)}`,
          {
            name,
            description,
            permissions: draftPerms,
          },
        );
        toast.success('Role updated');
      }
      closeRoleDrawer();
      await fetchTeam();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not save role';
      toast.error(typeof msg === 'string' ? msg : 'Could not save role');
    } finally {
      setSavingRole(false);
    }
  };

  const drawerTitle =
    roleFormParam === 'create'
      ? 'Create Role'
      : roleFormParam === 'edit'
        ? 'Edit Role'
        : 'Role';

  const primaryLabel =
    roleFormParam === 'create' ? 'Create Role' : isCustomEdit ? 'Save changes' : 'Done';

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500 mt-1">
            Directory of platform administrators. Search, filter, and invite team members.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 px-6 pt-4 pb-0 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <nav className="flex gap-8" aria-label="Team sections">
              <button
                type="button"
                onClick={() => setTeamTab('users')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'users'
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Users
              </button>
              <button
                type="button"
                onClick={() => setTeamTab('roles')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'roles'
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Role Management
              </button>
            </nav>
            {activeTab === 'roles' && isSuperAdmin && (
              <button
                type="button"
                onClick={() => openCreateRoleDrawer()}
                className="mb-3 inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 sm:mb-0 sm:ml-auto sm:self-auto"
              >
                <HiPlus className="w-5 h-5" />
                Create Role
              </button>
            )}
          </div>

          {activeTab === 'users' && (
            <div className="p-6 space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1 min-w-0 max-w-xl">
                  <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search team members..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="deactivated">Deactivated</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value);
                      setPage(1);
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="all">All Roles</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Operations</option>
                    <option value="support">Support Agent</option>
                    <option value="auditor">Finance</option>
                  </select>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => openInviteDrawer()}
                      className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
                    >
                      <HiPlus className="w-5 h-5" />
                      Invite User
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        Name
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        Email
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        Role
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        Date joined
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        Last active
                      </th>
                      <th
                        scope="col"
                        className="relative px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                          Loading team…
                        </td>
                      </tr>
                    ) : members.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                          No team members match your filters.
                        </td>
                      </tr>
                    ) : (
                      members.map((m) => (
                        <tr
                          key={m.id}
                          className="cursor-pointer hover:bg-gray-50/80"
                          onClick={() => navigate(`/admin/team/${m.id}`)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarClass(
                                  m.id,
                                )}`}
                              >
                                {initials(m.firstName, m.lastName)}
                              </div>
                              <span className="font-semibold text-gray-900">
                                {m.firstName} {m.lastName}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {m.email}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                            {m.roleLabel}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusBadgeClasses(
                                m.displayStatus.key,
                              )}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${statusDotClass(
                                  m.displayStatus.key,
                                )}`}
                              />
                              {m.displayStatus.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {formatTableDate(m.dateJoined)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {formatTableDate(m.lastActive)}
                          </td>
                          <td
                            className="px-4 py-3 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              aria-label="Row actions"
                              aria-expanded={rowMenuId === m.id}
                              aria-haspopup="menu"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setRowMenuId((id) => {
                                  if (id === m.id) {
                                    setRowMenuPosition(null);
                                    return null;
                                  }
                                  setRowMenuPosition({
                                    top: rect.bottom + 6,
                                    right: window.innerWidth - rect.right,
                                  });
                                  return m.id;
                                });
                              }}
                              className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-2 text-gray-600 shadow-sm hover:bg-gray-100 hover:text-gray-900"
                            >
                              <HiDotsVertical className="h-5 w-5" aria-hidden />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!loading && total > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                  <p className="text-sm text-gray-600">
                    Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <HiChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {page} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <HiChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="p-6 space-y-4 bg-gray-50/40">
              {loading ? (
                <p className="text-sm text-gray-500 py-8 text-center">Loading roles…</p>
              ) : (
                roleCards.map((r) => (
                  <div
                    key={r.cardKey}
                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <h3 className="text-lg font-bold text-gray-900">{r.label}</h3>
                          <span className="text-sm text-gray-500">{memberLine(r.memberCount)}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {r.permissions.map((perm) => (
                            <span
                              key={`${r.cardKey}-${perm}`}
                              className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                            >
                              {perm}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="shrink-0 lg:pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (r.kind === 'custom') {
                              openEditCustomDrawer(r.customId);
                            } else {
                              openEditBuiltinDrawer(r.builtinKey);
                            }
                          }}
                          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {drawerOpen && (
          <div className="fixed inset-0 z-50" role="presentation">
            <button
              type="button"
              aria-label="Close drawer"
              className="absolute inset-0 bg-black/40"
              onClick={() => closeRoleDrawer()}
            />
            <aside
              className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-[#f5f6f8] shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-role-drawer-title"
            >
              <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
                <div className="flex min-w-0 items-center gap-2">
                  <HiShieldCheck className="h-6 w-6 shrink-0 text-brand-600" aria-hidden />
                  <h2
                    id="admin-role-drawer-title"
                    className="truncate text-lg font-bold text-gray-900"
                  >
                    {drawerTitle}
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => closeRoleDrawer()}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                >
                  <HiX className="h-5 w-5" aria-hidden />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                {isBuiltinOrVerifierEdit && (
                  <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Built-in roles cannot be changed. This view shows the permissions currently
                    associated with the role.
                  </p>
                )}
                {!isBuiltinOrVerifierEdit && !isSuperAdmin && (
                  <p className="mb-4 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                    Only super admins can create or edit custom platform roles.
                  </p>
                )}
                {(catalogLoading || roleDetailLoading) && (
                  <p className="text-sm text-gray-500 py-6">Loading…</p>
                )}
                {!catalogLoading && !roleDetailLoading && (
                  <div className="space-y-5">
                    <div>
                      <label
                        htmlFor="admin-role-name"
                        className="block text-xs font-semibold uppercase tracking-wider text-gray-500"
                      >
                        Role name
                      </label>
                      <input
                        id="admin-role-name"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        disabled={formReadOnly}
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-600"
                        placeholder="e.g. Compliance Officer"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="admin-role-desc"
                        className="block text-xs font-semibold uppercase tracking-wider text-gray-500"
                      >
                        Description
                      </label>
                      <textarea
                        id="admin-role-desc"
                        value={draftDesc}
                        onChange={(e) => setDraftDesc(e.target.value)}
                        disabled={formReadOnly}
                        rows={3}
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-600"
                        placeholder="Briefly describe responsibilities of this role"
                      />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Permissions
                      </p>
                      <div className="mt-4 space-y-6">
                        {permissionCatalog.map((section) => (
                          <div
                            key={section.id}
                            className="rounded-xl border border-gray-200 bg-white/80 p-4 shadow-sm"
                          >
                            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                              <CatalogSectionIcon kind={section.icon} />
                              <p className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                                {section.title}
                              </p>
                            </div>
                            <div className="mt-3 flex flex-col gap-3">
                              {section.items.map((item) => (
                                <label
                                  key={item.key}
                                  className={`flex cursor-pointer items-start gap-3 rounded-lg bg-gray-50 px-3 py-2 ${formReadOnly ? 'cursor-default opacity-90' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                    checked={draftPerms.includes(item.key)}
                                    onChange={() => toggleDraftPerm(item.key)}
                                    disabled={formReadOnly}
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
                )}
              </div>

              <footer className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
                <button
                  type="button"
                  onClick={() => closeRoleDrawer()}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                {isBuiltinOrVerifierEdit ? (
                  <button
                    type="button"
                    onClick={() => closeRoleDrawer()}
                    className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
                  >
                    Close
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={savingRole || !canSubmitCustom || catalogLoading || roleDetailLoading}
                    onClick={() => void submitRoleForm()}
                    className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
                  >
                    {savingRole ? 'Saving…' : primaryLabel}
                  </button>
                )}
              </footer>
            </aside>
          </div>
        )}

        {inviteDrawerOpen && (
          <div className="fixed inset-0 z-50" role="presentation">
            <button
              type="button"
              aria-label="Close drawer"
              className="absolute inset-0 bg-black/40"
              onClick={() => closeInviteDrawer()}
            />
            <aside
              className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-[#f5f6f8] shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-invite-drawer-title"
            >
              <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
                <div className="flex min-w-0 items-center gap-2">
                  <HiMail className="h-6 w-6 shrink-0 text-brand-600" aria-hidden />
                  <h2
                    id="admin-invite-drawer-title"
                    className="truncate text-lg font-bold text-gray-900"
                  >
                    Invite Team Member
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => closeInviteDrawer()}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                >
                  <HiX className="h-5 w-5" aria-hidden />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <div
                  className="mb-5 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
                  role="note"
                >
                  An invitation email will be sent to the user. They will be prompted to set up
                  their password and complete onboarding before gaining access.
                </div>

                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="invite-full-name"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      Full name
                    </label>
                    <input
                      id="invite-full-name"
                      value={inviteFullName}
                      onChange={(e) => setInviteFullName(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      placeholder="e.g. Chioma Nwosu"
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="invite-email"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      Email address
                    </label>
                    <input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      placeholder="name@taldium.io"
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="invite-role"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      Role
                    </label>
                    <select
                      id="invite-role"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="">Select a role…</option>
                      {INVITE_ROLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Access permissions preview
                    </p>
                    {!inviteRole ? (
                      <p className="mt-2 text-sm italic text-slate-500">
                        Select a role above to preview permissions
                      </p>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-200 pt-3">
                        {invitePermissionPreview.map((perm) => (
                          <span
                            key={perm}
                            className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="invite-message"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      Personal message (optional)
                    </label>
                    <textarea
                      id="invite-message"
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      placeholder="Add a personal welcome note to the invitation email…"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="invite-expiry"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      Access expiry
                    </label>
                    <select
                      id="invite-expiry"
                      value={inviteAccessExpiry}
                      onChange={(e) =>
                        setInviteAccessExpiry(e.target.value as AdminInviteAccessExpiry)
                      }
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="none">No expiry</option>
                      <option value="7d">7 days</option>
                      <option value="14d">14 days</option>
                      <option value="30d">30 days</option>
                    </select>
                  </div>
                </div>
              </div>

              <footer className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
                <button
                  type="button"
                  onClick={() => closeInviteDrawer()}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={inviting}
                  onClick={() => void submitInvite()}
                  className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
                >
                  {inviting ? 'Sending…' : 'Send invitation'}
                </button>
              </footer>
            </aside>
          </div>
        )}
      </div>

      {rowMenuId &&
        rowMenuPosition &&
        rowMenuMember &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="menu"
            aria-label="Member actions"
            className="fixed z-[200] w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-xl"
            style={{
              top: rowMenuPosition.top,
              right: rowMenuPosition.right,
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-800 hover:bg-gray-50"
              onClick={() => {
                const id = rowMenuMember.id;
                closeRowMenu();
                navigate(`/admin/team/${id}`);
              }}
            >
              <HiUser className="h-5 w-5 shrink-0 text-slate-700" aria-hidden />
              View profile
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-800 hover:bg-gray-50"
              onClick={() => {
                closeRowMenu();
                toast('Member editing is not available yet.', { icon: 'ℹ️' });
              }}
            >
              <HiPencil className="h-5 w-5 shrink-0 text-slate-700" aria-hidden />
              Edit member
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-800 hover:bg-gray-50"
              onClick={() => {
                closeRowMenu();
                toast('Password reset is not available yet.', { icon: 'ℹ️' });
              }}
            >
              <HiLockClosed className="h-5 w-5 shrink-0 text-amber-500" aria-hidden />
              Reset password
            </button>
            <div className="my-2 border-t border-gray-100" role="separator" />
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-orange-600 hover:bg-orange-50/80"
              onClick={() => {
                closeRowMenu();
                toast('Suspend member is not available yet.', { icon: 'ℹ️' });
              }}
            >
              <HiBan className="h-5 w-5 shrink-0 text-orange-600" aria-hidden />
              Suspend
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50/80"
              onClick={() => {
                closeRowMenu();
                toast('Deactivate member is not available yet.', { icon: 'ℹ️' });
              }}
            >
              <HiTrash className="h-5 w-5 shrink-0 text-red-600" aria-hidden />
              Deactivate
            </button>
          </div>,
          document.body,
        )}
    </AdminLayout>
  );
}
