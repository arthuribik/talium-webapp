import { useState, useEffect, useRef } from 'react';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import {
  HiDocumentText,
  HiEye,
  HiX,
  HiDownload,
  HiBriefcase,
  HiDotsVertical,
  HiAcademicCap,
  HiUser,
} from 'react-icons/hi';

type SharedDataItem = {
  id: string;
  type?: string;
  organisationName?: string;
  companyName?: string;
  status?: string;
  accessType?: string;
  dataType?: string;
  date?: string;
  createdAt?: string;
  sharedAt?: string;
  dateShared?: string;
  retentionPeriod?: string;
  retention?: string;
  personalInfo?: Record<string, unknown>;
  education?: any;
  workExperience?: any;
  [key: string]: any;
};

export default function SharedDataHistory() {
  const [loading, setLoading] = useState(true);
  const [sharedData, setSharedData] = useState<SharedDataItem[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [drawerItem, setDrawerItem] = useState<SharedDataItem | null>(null);
  const [revokeModalItem, setRevokeModalItem] = useState<{ id: string; organisationName: string } | null>(null);
  const [revoking, setRevoking] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId]);

  useEffect(() => {
    fetchSharedData();
  }, []);

  const fetchSharedData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v1/professional/shared-data');
      const raw = response.data.data?.sharedData || [];
      const normalized: SharedDataItem[] = raw.map((item: any) => ({
        ...item,
        createdAt: item.date ?? item.createdAt ?? item.sharedAt ?? item.dateShared,
      }));
      setSharedData(normalized);
    } catch (err) {
      console.error('Failed to fetch shared data:', err);
      setSharedData([]);
    } finally {
      setLoading(false);
    }
  };

  const getRevokeId = (id: string) => (id.startsWith('hired-') ? id.replace(/^hired-/, '') : id);

  const handleRevokeAccess = async (id: string, organisationName: string) => {
    setRevoking(true);
    try {
      await api.post(`/v1/professional/shared-data/${getRevokeId(id)}/revoke`);
      toast.success(`Access revoked from ${organisationName}`);
      setRevokeModalItem(null);
      fetchSharedData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to revoke access');
    } finally {
      setRevoking(false);
    }
  };

  const handleDownloadReport = async (id: string) => {
    try {
      const response = await api.get(`/v1/professional/shared-data/${getRevokeId(id)}/report`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `shared-data-report-${getRevokeId(id)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to download report');
    }
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: string | undefined) => {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const accessTypeLabel = (item: SharedDataItem) =>
    item.accessType || item.dataType || (item.type === 'hired' ? 'Employment' : 'Job application');

  const activeCount = sharedData.filter(
    (i) => i.status === 'active' || i.status === 'Active' || i.type === 'hired'
  ).length;
  const applicationsCount = sharedData.filter((i) => i.type === 'application' || i.accessType === 'application').length;
  const employmentCount = sharedData.filter((i) => i.type === 'hired' || i.accessType === 'employment').length;

  const statusBadgeClass = (item: SharedDataItem) => {
    if (item.status === 'active' || item.status === 'Active' || item.type === 'hired')
      return 'bg-green-100 text-green-800';
    if (item.status === 'pending' || item.status === 'Pending') return 'bg-amber-100 text-amber-800';
    return 'bg-gray-100 text-gray-600';
  };

  const statusLabel = (item: SharedDataItem) => {
    if (item.status === 'active' || item.status === 'Active' || item.type === 'hired') return 'Active';
    if (item.status === 'pending' || item.status === 'Pending') return 'Pending';
    return item.status || '—';
  };

  return (
    <ProfessionalLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <HiDocumentText className="w-6 h-6 mr-2 text-brand-600" />
            Shared Data History
          </h1>
          <p className="text-gray-600">
            Organisations that have access to your profile and when you shared data (e.g. by applying or being hired).
          </p>
        </div>

        {loading ? (
          <div className="text-center text-gray-600 py-16">Loading...</div>
        ) : sharedData.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <HiDocumentText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No shared data yet</h3>
              <p className="text-sm text-gray-500 text-center max-w-md">
                When you apply to jobs or are hired, those organisations will appear here and you can see what was shared and revoke access if needed.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Analytics – compact row, not stretched */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 min-w-[120px]">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total shared</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{sharedData.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 min-w-[120px]">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{activeCount}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 min-w-[120px]">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Applications</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{applicationsCount}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 min-w-[120px]">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Employment</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{employmentCount}</p>
              </div>
            </div>

            {/* Shared list – card with header + list like reference image */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-900">Shared data</h3>
                <a
                  href="/professional/shared-data"
                  className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  View all →
                </a>
              </div>
              <div className="divide-y divide-gray-100">
                {sharedData.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">
                        {accessTypeLabel(item)}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {item.organisationName || item.companyName || 'Unknown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${statusBadgeClass(item)}`}>
                        {statusLabel(item)}
                      </span>
                      <span className="text-sm text-gray-400 tabular-nums">
                        {formatDate(item.createdAt || item.date)}
                      </span>
                      <div className="relative" ref={openMenuId === item.id ? menuRef : undefined}>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId((id) => (id === item.id ? null : item.id))}
                          className="p-1.5 rounded text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                          aria-label="Actions"
                        >
                          <HiDotsVertical className="w-5 h-5" />
                        </button>
                        {openMenuId === item.id && (
                          <div className="absolute right-0 top-full mt-1 py-1 w-44 bg-white rounded-lg border border-gray-200 shadow-lg z-10">
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                setDrawerItem(item);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <HiEye className="w-4 h-4" />
                              View details
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                handleDownloadReport(item.id);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <HiDownload className="w-4 h-4" />
                              Download report
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                setRevokeModalItem({
                                  id: item.id,
                                  organisationName: item.organisationName || item.companyName || 'this organisation',
                                });
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <HiX className="w-4 h-4" />
                              Revoke access
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail drawer */}
      {drawerItem && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setDrawerItem(null)} aria-hidden />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Sharing details</h2>
              <button
                type="button"
                onClick={() => setDrawerItem(null)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Organisation</span>
                  <span className="text-gray-900 font-medium text-right">
                    {drawerItem.organisationName || drawerItem.companyName || '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Type</span>
                  <span className="text-gray-900 text-right">{accessTypeLabel(drawerItem)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Date shared</span>
                  <span className="text-gray-900 text-right">
                    {formatDateTime(drawerItem.createdAt || drawerItem.date)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Retention</span>
                  <span className="text-gray-900 text-right">
                    {drawerItem.retentionPeriod || drawerItem.retention || '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-4 items-center">
                  <span className="text-gray-500">Status</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      drawerItem.status === 'active' || drawerItem.status === 'Active' || drawerItem.type === 'hired'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {drawerItem.status === 'active' || drawerItem.status === 'Active' || drawerItem.type === 'hired'
                      ? 'Active'
                      : drawerItem.status || '—'}
                  </span>
                </div>
              </div>

              {drawerItem.personalInfo && Object.keys(drawerItem.personalInfo).length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <HiUser className="w-4 h-4 mr-2 text-brand-600" />
                    Personal information shared
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(drawerItem.personalInfo).map(([key, val]) => (
                      <div key={key} className="flex justify-between gap-4 py-1.5 border-b border-gray-50 last:border-0 text-sm">
                        <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="text-gray-900 text-right">{String(val ?? '—')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {drawerItem.education && (Array.isArray(drawerItem.education) ? drawerItem.education : [drawerItem.education]).length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <HiAcademicCap className="w-4 h-4 mr-2 text-brand-600" />
                    Education shared
                  </h4>
                  <div className="space-y-3">
                    {(Array.isArray(drawerItem.education) ? drawerItem.education : [drawerItem.education]).map((edu: any, i: number) => (
                      <div key={i} className="text-sm p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-900">{edu.institutionName || edu.institution || '—'}</p>
                        <p className="text-gray-600">{edu.degree || edu.levelOfEducation || edu.name}</p>
                        {edu.year && <p className="text-gray-500 text-xs mt-1">{edu.year}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {drawerItem.workExperience && (Array.isArray(drawerItem.workExperience) ? drawerItem.workExperience : [drawerItem.workExperience]).length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <HiBriefcase className="w-4 h-4 mr-2 text-brand-600" />
                    Work experience shared
                  </h4>
                  <div className="space-y-3">
                    {(Array.isArray(drawerItem.workExperience) ? drawerItem.workExperience : [drawerItem.workExperience]).map((work: any, i: number) => (
                      <div key={i} className="text-sm p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-900">{work.role || work.title}</p>
                        <p className="text-gray-600">{work.organisationName || work.company}</p>
                        {(work.startDate || work.endDate) && (
                          <p className="text-gray-500 text-xs mt-1">
                            {work.startDate} – {work.endDate || 'Present'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Revoke modal */}
      {revokeModalItem && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[60]"
            aria-hidden
            onClick={() => !revoking && setRevokeModalItem(null)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-sm p-4">
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6">
              <p className="text-gray-900 text-center mb-6">
                Revoke access for <span className="font-semibold">{revokeModalItem.organisationName}</span>? They will no longer have access to your shared data.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => !revoking && setRevokeModalItem(null)}
                  disabled={revoking}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleRevokeAccess(revokeModalItem.id, revokeModalItem.organisationName)}
                  disabled={revoking}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
                >
                  {revoking ? 'Revoking...' : 'Revoke'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </ProfessionalLayout>
  );
}
