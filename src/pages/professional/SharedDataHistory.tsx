import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import {
  HiDocumentText,
  HiX,
  HiDownload,
  HiBriefcase,
  HiDotsVertical,
  HiClock,
  HiCalendar,
  HiCheckCircle,
  HiSearch,
  HiBookmark,
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sharedData, setSharedData] = useState<SharedDataItem[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [revokeModalItem, setRevokeModalItem] = useState<{ id: string; organisationName: string } | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('any');
  const [activeTab, setActiveTab] = useState<'browse' | 'active' | 'revoked' | 'expired'>('browse');
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

  // Status: Active, Expired, or Revoked
  const statusLabel = (item: SharedDataItem) => {
    const s = String(item?.status ?? item?.type ?? '').toLowerCase();
    if (s === 'revoked' || s === 'withdrawn') return 'Revoked';
    if (s === 'expired') return 'Expired';
    if (s === 'active' || s === 'hired' || s === 'accepted' || s === 'pending' || s === 'shortlisted') return 'Active';
    return 'Active';
  };
  const statusBadgeClass = (item: SharedDataItem) => {
    const s = String(item?.status ?? item?.type ?? '').toLowerCase();
    if (s === 'revoked' || s === 'withdrawn') return 'bg-red-100 text-red-700';
    if (s === 'expired') return 'bg-amber-100 text-amber-700';
    return 'bg-green-100 text-green-700';
  };

  const activeCount = sharedData.filter((i) => statusLabel(i) === 'Active').length;
  const revokedCount = sharedData.filter((i) => statusLabel(i) === 'Revoked').length;
  const expiredCount = sharedData.filter((i) => statusLabel(i) === 'Expired').length;
  const industryOptions = Array.from(new Set(sharedData.map((i) => accessTypeLabel(i)).filter(Boolean)));

  const withinDateWindow = (itemDate: string | undefined) => {
    if (!itemDate || dateFilter === 'any') return true;
    const d = new Date(itemDate);
    if (Number.isNaN(d.getTime())) return true;
    const now = Date.now();
    const diffDays = (now - d.getTime()) / (1000 * 60 * 60 * 24);
    if (dateFilter === '7d') return diffDays <= 7;
    if (dateFilter === '30d') return diffDays <= 30;
    if (dateFilter === '90d') return diffDays <= 90;
    return true;
  };

  const filteredData = sharedData.filter((item) => {
    const org = `${item.organisationName || item.companyName || ''}`.toLowerCase();
    const access = accessTypeLabel(item).toLowerCase();
    const query = searchQuery.trim().toLowerCase();
    const queryMatch = !query || org.includes(query) || access.includes(query);
    const industryMatch = industryFilter === 'all' || accessTypeLabel(item) === industryFilter;
    const dateMatch = withinDateWindow(item.createdAt || item.date);
    return queryMatch && industryMatch && dateMatch;
  });

  const tabbedData = filteredData.filter((item) => {
    const s = statusLabel(item);
    if (activeTab === 'active') return s === 'Active';
    if (activeTab === 'revoked') return s === 'Revoked';
    if (activeTab === 'expired') return s === 'Expired';
    return true;
  });

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
            {/* Analytics – Total shared, Active, Revoked, Expired (image-style cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 relative min-h-[100px]">
                <div className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <HiDocumentText className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total shared</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{sharedData.length}</p>
                <p className="text-sm text-gray-500 mt-0.5">All time</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 relative min-h-[100px]">
                <div className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <HiCheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{activeCount}</p>
                <p className="text-sm text-gray-500 mt-0.5">Current sharing</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 relative min-h-[100px]">
                <div className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <HiX className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Revoked</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{revokedCount}</p>
                <p className="text-sm text-gray-500 mt-0.5">Access removed</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 relative min-h-[100px]">
                <div className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <HiClock className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Expired</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{expiredCount}</p>
                <p className="text-sm text-gray-500 mt-0.5">Time-limited access</p>
              </div>
            </div>

            <div className="mb-6 space-y-3">
              <div className="relative">
                <HiSearch className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by organisation or access type..."
                  className="w-full h-11 rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700"
                >
                  <option value="all">All Industries</option>
                  {industryOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700"
                >
                  <option value="any">Any Date</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
                <div className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 flex items-center text-sm text-gray-500">
                  Any Pay
                </div>
              </div>
              <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
                {[
                  { id: 'browse', label: `Browse (${filteredData.length})` },
                  { id: 'active', label: `Active (${filteredData.filter((i) => statusLabel(i) === 'Active').length})` },
                  { id: 'revoked', label: `Revoked (${filteredData.filter((i) => statusLabel(i) === 'Revoked').length})` },
                  { id: 'expired', label: `Expired (${filteredData.filter((i) => statusLabel(i) === 'Expired').length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-gray-100 text-gray-900 font-medium'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shared data – list cards (image-style) */}
            <div className="space-y-4">
              {tabbedData.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 transition-colors"
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => navigate(`/professional/shared-data/${encodeURIComponent(item.id)}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/professional/shared-data/${encodeURIComponent(item.id)}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-2xl font-semibold text-gray-900 truncate">
                              {item.organisationName || item.companyName || 'Unknown'}
                            </h3>
                            <p className="text-sm text-gray-500 mt-0.5">{accessTypeLabel(item)}</p>
                          </div>
                          <div className="relative shrink-0" ref={openMenuId === item.id ? menuRef : undefined}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId((id) => (id === item.id ? null : item.id));
                              }}
                              className="p-1 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                              aria-label="More actions"
                            >
                              <HiDotsVertical className="w-5 h-5" />
                            </button>
                            {openMenuId === item.id && (
                              <div className="absolute right-0 top-full mt-1 py-1 w-44 bg-white rounded-lg border border-gray-200 shadow-lg z-20">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    handleDownloadReport(item.id);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <HiDownload className="w-4 h-4" />
                                  Download report
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
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
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${statusBadgeClass(item)}`}>
                            {statusLabel(item)}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
                            <HiBriefcase className="w-3.5 h-3.5" />
                            {accessTypeLabel(item)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm text-gray-500">
                          <p className="flex items-center gap-2">
                            <HiCalendar className="w-4 h-4 shrink-0 text-gray-400" />
                            {formatDateTime(item.createdAt || item.date)}
                          </p>
                          <p className="flex items-center gap-2">
                            <HiClock className="w-4 h-4 shrink-0 text-gray-400" />
                            Retention: {item.retentionPeriod || item.retention || '—'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/professional/shared-data/${encodeURIComponent(item.id)}`);
                        }}
                        className="ml-2 mt-1 p-2 rounded-lg border border-gray-200 text-brand-600 hover:bg-gray-50"
                        aria-label={`View ${item.organisationName || item.companyName || 'entry'}`}
                      >
                        <HiBookmark className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {tabbedData.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-500">
                  No matching shared data found for the selected filters.
                </div>
              )}
            </div>
          </>
        )}
      </div>

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
