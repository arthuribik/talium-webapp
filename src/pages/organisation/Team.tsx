import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import OrganisationLayout from '@/components/organisation/OrganisationLayout';
import { api } from '@/services/api';
import { HiUserAdd, HiX, HiDotsVertical } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { SearchableList } from '@/components/common/SearchableList';

interface TeamStats {
  totalMembers: number;
  admins: number;
  editors: number;
  viewers: number;
}

interface TeamMember {
  id: string;
  memberId: string | null;
  userId: string;
  name: string;
  email: string;
  role: string;
  joined: string;
  lastActive: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  status: 'pending';
  invitedAt: string;
  expiresAt: string;
}

function formatRole(role: string): string {
  const map: Record<string, string> = {
    org_owner: 'Owner',
    org_admin: 'Admin',
    org_recruiter: 'Editor',
    org_member: 'Viewer',
  };
  return map[role] || role;
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

function formatDate(d: string): string {
  const date = new Date(d);
  const m = date.getMonth() + 1;
  const day = date.getDate();
  const y = date.getFullYear();
  return `${m}/${day}/${y}`;
}

function getInitial(name: string, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.trim().slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return '?';
}

export default function Team() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('org_member');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [newRole, setNewRole] = useState('');
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const [statsRes, membersRes] = await Promise.all([
        api.get('/v1/organisation/team/stats'),
        api.get('/v1/organisation/team/members'),
      ]);
      const statsData = statsRes.data?.data;
      const membersData = membersRes.data?.data?.members || [];
      const invitationsData = membersRes.data?.data?.invitations || [];
      setStats({
        totalMembers: statsData?.totalMembers ?? 0,
        admins: statsData?.admins ?? 0,
        editors: statsData?.editors ?? 0,
        viewers: statsData?.viewers ?? 0,
      });
      setMembers(membersData.map((m: TeamMember) => ({
        ...m,
        joined: m.joined ? new Date(m.joined).toISOString() : '',
        lastActive: m.lastActive ? new Date(m.lastActive).toISOString() : '',
      })));
      setInvitations(
        invitationsData.map((inv: PendingInvitation) => ({
          ...inv,
          invitedAt: inv.invitedAt ? new Date(inv.invitedAt).toISOString() : '',
          expiresAt: inv.expiresAt ? new Date(inv.expiresAt).toISOString() : '',
        })),
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to load team');
      setStats(null);
      setMembers([]);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInvite = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error('Enter an email address');
      return;
    }
    setInviteSubmitting(true);
    try {
      const res = await api.post('/v1/organisation/team/invitations', {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      const emailSent = res.data?.data?.emailSent !== false;
      if (emailSent) {
        toast.success(`Invitation sent to ${inviteEmail.trim()}`);
      } else {
        toast.success(
          `Invitation saved for ${inviteEmail.trim()}. Email could not be sent — use Resend on the pending list.`,
          { duration: 6000 },
        );
      }
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('org_member');
      await fetchTeam();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingMember?.memberId || !newRole) return;
    try {
      await api.put(`/v1/organisation/team/members/${editingMember.memberId}/role`, { role: newRole });
      toast.success('Role updated');
      setShowRoleModal(false);
      setEditingMember(null);
      setNewRole('');
      fetchTeam();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    }
  };

  const handleResendInvite = async (invitationId: string, email: string) => {
    try {
      await api.post(`/v1/organisation/team/invitations/${invitationId}/resend`);
      toast.success(`Invitation resent to ${email}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend invitation');
    }
  };

  const handleCancelInvite = async (invitationId: string, email: string) => {
    if (!window.confirm(`Cancel invitation for ${email}?`)) return;
    try {
      await api.delete(`/v1/organisation/team/invitations/${invitationId}`);
      toast.success('Invitation cancelled');
      await fetchTeam();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel invitation');
    }
  };

  const handleRemove = async (member: TeamMember) => {
    if (!member.memberId) return;
    if (!window.confirm(`Remove ${member.name} from the team?`)) return;
    try {
      await api.delete(`/v1/organisation/team/members/${member.memberId}`);
      toast.success('Member removed');
      setActionMenuId(null);
      fetchTeam();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const openRoleModal = (member: TeamMember) => {
    setEditingMember(member);
    setNewRole(member.role === 'org_owner' ? 'org_owner' : member.role);
    setShowRoleModal(true);
    setActionMenuId(null);
  };

  return (
    <OrganisationLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Team</h1>
            <p className="text-gray-500 text-sm md:text-base mt-0.5">
              Manage your organisation&apos;s team members and permissions
            </p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shrink-0"
          >
            <HiUserAdd className="w-5 h-5" />
            Invite Member
          </button>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl" />
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded-xl" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <p className="text-2xl font-bold text-gray-900">{stats?.totalMembers ?? 0}</p>
                <p className="text-sm text-gray-500 mt-0.5">Total Members</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <p className="text-2xl font-bold text-gray-900">{stats?.admins ?? 0}</p>
                <p className="text-sm text-gray-500 mt-0.5">Admins</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <p className="text-2xl font-bold text-gray-900">{stats?.editors ?? 0}</p>
                <p className="text-sm text-gray-500 mt-0.5">Editors</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <p className="text-2xl font-bold text-gray-900">{stats?.viewers ?? 0}</p>
                <p className="text-sm text-gray-500 mt-0.5">Viewers</p>
              </div>
            </div>

            {invitations.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
                <h2 className="text-lg font-bold text-gray-900 px-6 py-4 border-b border-gray-200">
                  Pending Invitations
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left text-sm font-medium text-gray-700 px-6 py-3">Email</th>
                        <th className="text-left text-sm font-medium text-gray-700 px-6 py-3">Role</th>
                        <th className="text-left text-sm font-medium text-gray-700 px-6 py-3">Invited</th>
                        <th className="text-left text-sm font-medium text-gray-700 px-6 py-3">Expires</th>
                        <th className="text-right text-sm font-medium text-gray-700 px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invitations.map((inv) => (
                        <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <td className="px-6 py-4 text-sm text-gray-900">{inv.email}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${roleTagClass(inv.role)}`}
                            >
                              {formatRole(inv.role)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {inv.invitedAt ? formatDate(inv.invitedAt) : '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {inv.expiresAt ? formatDate(inv.expiresAt) : '—'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleResendInvite(inv.id, inv.email)}
                                className="px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 rounded-lg"
                              >
                                Resend
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelInvite(inv.id, inv.email)}
                                className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <h2 className="text-lg font-bold text-gray-900 px-6 py-4 border-b border-gray-200">
                Team Members
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left text-sm font-medium text-gray-700 px-6 py-3">Member</th>
                      <th className="text-left text-sm font-medium text-gray-700 px-6 py-3">Role</th>
                      <th className="text-left text-sm font-medium text-gray-700 px-6 py-3">Joined</th>
                      <th className="text-left text-sm font-medium text-gray-700 px-6 py-3">Last Active</th>
                      <th className="text-right text-sm font-medium text-gray-700 px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr
                        key={member.id}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          navigate(`/organization/team/${encodeURIComponent(member.userId)}`)
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/organization/team/${encodeURIComponent(member.userId)}`);
                          }
                        }}
                        className="border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm shrink-0">
                              {getInitial(member.name, member.email)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{member.name}</p>
                              <p className="text-sm text-gray-500">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${roleTagClass(member.role)}`}
                          >
                            {formatRole(member.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {member.joined ? formatDate(member.joined) : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {member.lastActive ? formatDate(member.lastActive) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block" ref={actionMenuId === member.id ? actionMenuRef : undefined}>
                            <button
                              type="button"
                              onClick={() => setActionMenuId(actionMenuId === member.id ? null : member.id)}
                              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                            >
                              <HiDotsVertical className="w-5 h-5" />
                            </button>
                            {actionMenuId === member.id && (
                              <div className="absolute right-0 top-full mt-1 py-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                {member.role !== 'org_owner' && (
                                  <>
                                    <button
                                      onClick={() => openRoleModal(member)}
                                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      Edit Role
                                    </button>
                                    <button
                                      onClick={() => handleRemove(member)}
                                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                    >
                                      Remove Member
                                    </button>
                                  </>
                                )}
                                {member.role === 'org_owner' && (
                                  <p className="px-4 py-2 text-sm text-gray-500">Owner</p>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {members.length === 0 && (
                <div className="px-6 py-12 text-center text-gray-500">
                  No team members yet. Invite members to get started.
                </div>
              )}
            </div>
          </>
        )}

        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Invite Member</h2>
                <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <HiX className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. colleague@company.com"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <SearchableList
                    value={inviteRole}
                    onChange={setInviteRole}
                    options={[
                      { value: 'org_admin', label: 'Admin' },
                      { value: 'org_recruiter', label: 'Editor' },
                      { value: 'org_member', label: 'Viewer' },
                    ]}
                    placeholder="Select role"
                    className="w-full focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteSubmitting}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                  >
                    {inviteSubmitting ? 'Sending…' : 'Send Invite'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showRoleModal && editingMember && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Edit Role</h2>
                <button
                  onClick={() => { setShowRoleModal(false); setEditingMember(null); }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <HiX className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">{editingMember.name} – {editingMember.email}</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <SearchableList
                  value={newRole}
                  onChange={setNewRole}
                  options={[
                    { value: 'org_admin', label: 'Admin' },
                    { value: 'org_recruiter', label: 'Editor' },
                    { value: 'org_member', label: 'Viewer' },
                  ]}
                  placeholder="Select role"
                  className="w-full focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowRoleModal(false); setEditingMember(null); }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRole}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </OrganisationLayout>
  );
}
