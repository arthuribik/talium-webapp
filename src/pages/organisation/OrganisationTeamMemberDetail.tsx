import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import OrganisationLayout from '@/components/organisation/OrganisationLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import {
  HiChevronLeft,
  HiCheck,
  HiShieldCheck,
  HiViewGrid,
  HiOfficeBuilding,
  HiCube,
  HiCurrencyDollar,
  HiCog,
  HiUserGroup,
} from 'react-icons/hi';

type ProfileTab = 'profile' | 'activity';

interface DisplayStatus {
  key: string;
  label: string;
}

interface PermissionItem {
  key: string;
  label: string;
  enabled: boolean;
}

interface PermissionSection {
  id: string;
  title: string;
  items: PermissionItem[];
}

type ActivityLevel = 'success' | 'info' | 'warning' | 'error';

interface ActivityLogEntry {
  id: string;
  title: string;
  details?: string;
  at: string;
  level?: ActivityLevel;
}

interface MemberDetail {
  id: string;
  memberId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleLabel: string;
  status: string;
  displayStatus: DisplayStatus;
  dateJoined: string;
  lastActive: string;
  isOwner: boolean;
  roleSummary: { key: string; label: string; description: string };
  permissionSections: PermissionSection[];
  activityLog: {
    items: ActivityLogEntry[];
    total: number;
  };
  activitySummary?: {
    totalActions: number;
    jobsRelated: number;
    profileUpdates: number;
    teamActions: number;
    otherActions: number;
  };
}

function isProfileTab(s: string | null): s is ProfileTab {
  return s === 'profile' || s === 'activity';
}

function formatDate(iso: string) {
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

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
}

function statusBadgeClasses(key: string) {
  if (key === 'active') return 'bg-emerald-50 text-emerald-800 ring-emerald-600/20';
  if (key === 'suspended') return 'bg-rose-50 text-rose-800 ring-rose-600/15';
  return 'bg-gray-100 text-gray-700 ring-gray-500/10';
}

function statusDotClass(key: string) {
  if (key === 'active') return 'bg-emerald-500';
  if (key === 'suspended') return 'bg-rose-500';
  return 'bg-gray-400';
}

function initials(first: string, last: string) {
  const a = (first || '').trim().charAt(0);
  const b = (last || '').trim().charAt(0);
  return `${a}${b}`.toUpperCase() || '?';
}

function formatActivityTimestamp(iso: string) {
  try {
    const d = new Date(iso);
    const date = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
    const time = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(d);
    return `${date} · ${time}`;
  } catch {
    return '—';
  }
}

function activityDotClass(level: ActivityLevel) {
  if (level === 'success') return 'bg-emerald-500';
  if (level === 'warning') return 'bg-amber-500';
  if (level === 'error') return 'bg-red-500';
  return 'bg-sky-500';
}

function roleTagClass(role: string): string {
  const map: Record<string, string> = {
    org_owner: 'bg-purple-500 text-white',
    org_admin: 'bg-blue-600 text-white',
    org_recruiter: 'bg-green-600 text-white',
    org_member: 'bg-gray-200 text-gray-800',
  };
  return map[role] || 'bg-gray-200 text-gray-800';
}

function SectionIcon({ sectionId }: { sectionId: string }) {
  const cls = 'h-4 w-4 shrink-0 text-gray-500';
  if (sectionId === 'jobs') return <HiViewGrid className={cls} aria-hidden />;
  if (sectionId === 'applicants') return <HiCube className={cls} aria-hidden />;
  if (sectionId === 'scouting') return <HiCurrencyDollar className={cls} aria-hidden />;
  if (sectionId === 'team') return <HiUserGroup className={cls} aria-hidden />;
  if (sectionId === 'settings') return <HiCog className={cls} aria-hidden />;
  return <HiOfficeBuilding className={cls} aria-hidden />;
}

function ProfileTabBody({ member, fullName }: { member: MemberDetail; fullName: string }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Account information
          </h2>
          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Full name
              </dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900">{fullName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Email address
              </dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900 break-all">{member.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Role</dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${roleTagClass(member.role)}`}
                >
                  {member.roleLabel}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Status</dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusBadgeClasses(
                    member.displayStatus.key,
                  )}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${statusDotClass(member.displayStatus.key)}`}
                  />
                  {member.displayStatus.label}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Date joined
              </dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900">
                {formatDate(member.dateJoined)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Last active
              </dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900">
                {formatDateTime(member.lastActive)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Permissions
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Permissions granted by this member&apos;s role within your organisation.
          </p>
          <div className="mt-6 space-y-8">
            {member.permissionSections.map((section) => (
              <div key={section.id}>
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <SectionIcon sectionId={section.id} />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                    {section.title}
                  </h3>
                </div>
                <ul className="mt-3 divide-y divide-gray-100">
                  {section.items.map((item) => (
                    <li
                      key={item.key}
                      className="flex items-center justify-between gap-4 py-3 first:pt-0"
                    >
                      <span className="text-sm text-gray-800">{item.label}</span>
                      {item.enabled ? (
                        <span className="inline-flex items-center justify-center rounded-lg bg-blue-50 px-2.5 py-1 text-blue-700">
                          <HiCheck className="h-4 w-4" aria-hidden />
                        </span>
                      ) : (
                        <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-lg bg-gray-100 px-2.5 py-1 text-sm text-gray-400">
                          —
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Role summary</h2>
          <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50/80 p-4">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <HiShieldCheck className="h-6 w-6" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900">{member.roleSummary.label}</p>
                <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                  {member.roleSummary.description}
                </p>
              </div>
            </div>
          </div>
          {member.isOwner && (
            <p className="mt-4 text-xs text-gray-500">
              Organisation owners have full access and cannot be removed from the team.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function ActivityTabBody({ member }: { member: MemberDetail }) {
  const s = member.activitySummary ?? {
    totalActions: 0,
    jobsRelated: 0,
    profileUpdates: 0,
    teamActions: 0,
    otherActions: 0,
  };

  const hasActivity =
    (member.activityLog.total ?? 0) > 0 || member.activityLog.items.length > 0;

  if (!hasActivity) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-8 py-16 text-center shadow-sm">
        <p className="text-base font-semibold text-gray-900">No activity yet</p>
        <p className="mt-3 mx-auto max-w-md text-sm text-gray-500 leading-relaxed">
          Actions this member takes in your organisation (jobs, profile updates, team changes) will
          appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Activity log
        </h2>
        {member.activityLog.total > member.activityLog.items.length && (
          <p className="mt-2 text-sm text-gray-500">
            Showing the {member.activityLog.items.length} most recent of {member.activityLog.total}{' '}
            actions.
          </p>
        )}
        <ul className="mt-6 space-y-0 divide-y divide-gray-100">
          {member.activityLog.items.map((entry) => {
            const level = (entry.level ?? 'info') as ActivityLevel;
            return (
              <li key={entry.id} className="flex gap-3 py-4 first:pt-0">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${activityDotClass(level)}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 leading-snug">{entry.title}</p>
                  {entry.details ? (
                    <p className="mt-1 text-sm text-gray-600">{entry.details}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-gray-500">{formatActivityTimestamp(entry.at)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Activity summary
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">Total actions</dt>
              <dd className="font-bold text-gray-900 tabular-nums">{s.totalActions}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">Jobs & listings</dt>
              <dd className="font-bold text-gray-900 tabular-nums">{s.jobsRelated}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">Profile updates</dt>
              <dd className="font-bold text-gray-900 tabular-nums">{s.profileUpdates}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">Team & invites</dt>
              <dd className="font-bold text-gray-900 tabular-nums">{s.teamActions}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">Other</dt>
              <dd className="font-bold text-gray-900 tabular-nums">{s.otherActions}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}

export default function OrganisationTeamMemberDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: ProfileTab = useMemo(
    () => (isProfileTab(tabParam) ? tabParam : 'profile'),
    [tabParam],
  );

  const setTab = (tab: ProfileTab) => {
    setSearchParams(tab === 'profile' ? {} : { tab }, { replace: true });
  };

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMember = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await api.get(
        `/v1/organisation/team/members/${encodeURIComponent(userId)}`,
      );
      setMember(res.data?.data ?? null);
    } catch {
      toast.error('Could not load team member');
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchMember();
  }, [fetchMember]);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t !== null && t !== '' && !isProfileTab(t)) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const fullName = member ? `${member.firstName} ${member.lastName}`.trim() : '';

  return (
    <OrganisationLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <Link
          to="/organization/team"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 mb-4"
        >
          <HiChevronLeft className="h-5 w-5" aria-hidden />
          Team
        </Link>

        {loading && (
          <p className="text-sm text-gray-500 py-12 text-center">Loading profile…</p>
        )}

        {!loading && !member && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600">
            <p>This team member could not be found.</p>
            <button
              type="button"
              onClick={() => navigate('/organization/team')}
              className="mt-4 text-blue-600 font-medium hover:text-blue-700"
            >
              Back to team
            </button>
          </div>
        )}

        {!loading && member && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1e3a5f] to-[#152942] px-6 py-8 text-white">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.12]"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)',
                  backgroundSize: '28px 28px',
                }}
                aria-hidden
              />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-bold ring-2 ring-white/25">
                    {initials(member.firstName, member.lastName)}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">{fullName || member.email}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-blue-100/95">
                      <span>
                        {member.roleLabel} · {member.email}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          member.displayStatus.key === 'active'
                            ? 'bg-emerald-500/20 text-emerald-100 ring-emerald-400/40'
                            : member.displayStatus.key === 'suspended'
                              ? 'bg-rose-500/20 text-rose-100 ring-rose-400/40'
                              : 'bg-white/10 text-white/90 ring-white/25'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            member.displayStatus.key === 'active'
                              ? 'bg-emerald-300'
                              : member.displayStatus.key === 'suspended'
                                ? 'bg-rose-300'
                                : 'bg-white/60'
                          }`}
                        />
                        {member.displayStatus.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-200 bg-white px-6">
              <nav className="flex gap-8" aria-label="Member sections">
                <button
                  type="button"
                  onClick={() => setTab('profile')}
                  className={`pb-3 pt-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'profile'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Profile & permissions
                </button>
                <button
                  type="button"
                  onClick={() => setTab('activity')}
                  className={`pb-3 pt-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'activity'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Activity log
                </button>
              </nav>
            </div>

            <div className="bg-gray-50/80 p-6">
              {activeTab === 'profile' ? (
                <ProfileTabBody member={member} fullName={fullName || member.email} />
              ) : (
                <ActivityTabBody member={member} />
              )}
            </div>
          </div>
        )}
      </div>
    </OrganisationLayout>
  );
}
