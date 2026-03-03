import { useState, useEffect, useRef } from 'react';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import { HiDocumentText, HiClock, HiCheckCircle, HiEye, HiX, HiDownload, HiDocument, HiGlobe, HiDeviceMobile, HiDotsVertical, HiAcademicCap, HiUser } from 'react-icons/hi';

export default function SharedDataHistory() {
  const [loading, setLoading] = useState(true);
  const [sharedData, setSharedData] = useState<any[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [drawerItem, setDrawerItem] = useState<any | null>(null);
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
      // Fetch shared data history - includes companies with profile access, applications, and work history
      const response = await api.get('/v1/professional/shared-data');
      setSharedData(response.data.data?.sharedData || []);
    } catch (err) {
      console.error('Failed to fetch shared data:', err);
      setSharedData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (id: string, organisationName: string) => {
    setRevoking(true);
    try {
      await api.post(`/v1/professional/shared-data/${id}/revoke`);
      toast.success(`Access revoked from ${organisationName}`);
      setRevokeModalItem(null);
      fetchSharedData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to revoke access');
    } finally {
      setRevoking(false);
    }
  };

  const handleViewDetails = (item: any) => {
    setDrawerItem(item);
  };

  const handleDownloadReport = async (id: string) => {
    try {
      const response = await api.get(`/v1/professional/shared-data/${id}/report`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `shared-data-report-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report downloaded successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to download report');
    }
  };

  const getAccessTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'job application':
        return <HiDocument className="w-4 h-4" />;
      case 'service sign-up':
        return <HiGlobe className="w-4 h-4" />;
      case 'third-party integration':
        return <HiDeviceMobile className="w-4 h-4" />;
      default:
        return <HiDocument className="w-4 h-4" />;
    }
  };

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const DataRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 text-right flex items-center justify-end gap-2">
        {value ?? '—'}
        <HiCheckCircle className="w-4 h-4 text-green-500 shrink-0" aria-hidden />
      </span>
    </div>
  );

  const DataCard = ({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <Icon className="w-5 h-5 text-brand-600" />
        <h3 className="text-base font-semibold text-brand-600">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );

  return (
    <ProfessionalLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <HiDocumentText className="w-6 h-6 mr-2 text-brand-600" />
            Shared Data History
          </h1>
          <p className="text-gray-600">
            Manage which companies have access to your profile and track all companies you've applied to or worked for
          </p>
        </div>

        {loading ? (
          <div className="text-center text-gray-600 py-16">Loading shared data history...</div>
        ) : sharedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-xl shadow-sm">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <HiDocumentText className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Shared Data</h3>
            <p className="text-sm text-gray-500 text-center max-w-md">
              You haven't shared any data with organizations yet. Your data sharing history will appear here when you apply to jobs or grant access to companies.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sharedData.map((item: any) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Icon */}
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <div className="text-purple-600">
                        {getAccessTypeIcon(item.accessType || item.dataType)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {item.organisationName || item.companyName || 'Unknown Company'}
                        </h3>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-4">
                          {/* <HiCheckCircle className="w-4 h-4 mr-1" /> */}
                          {item.status === 'active' || item.status === 'Active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center flex-wrap gap-x-6 gap-y-1">
                          <div className="flex items-center">
                            <HiDocument className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                            <span>{item.accessType || item.dataType || 'Job Application'}</span>
                          </div>
                          <div className="flex items-center">
                            <HiClock className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                            <span>Date: {formatDate(item.createdAt || item.sharedAt || item.dateShared)}</span>
                          </div>
                          <div className="flex items-center">
                            <HiClock className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                            <span>Retention: {item.retentionPeriod || item.retention || '90 days'}</span>
                          </div>
                          <div className="flex items-center">
                            <HiClock className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                            <span>Date shared: {formatDate(item.createdAt || item.sharedAt || item.dateShared)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3-dots action menu */}
                  <div
                    className="relative flex-shrink-0 ml-4"
                    ref={openMenuId === item.id ? menuRef : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenMenuId((id) => (id === item.id ? null : item.id))}
                      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                      aria-label="Actions"
                    >
                      <HiDotsVertical className="w-5 h-5" />
                    </button>
                    {openMenuId === item.id && (
                      <div className="absolute right-0 top-full mt-1 py-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-10">
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            handleViewDetails(item);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                        >
                          <HiEye className="w-4 h-4 flex-shrink-0" />
                          View Details
                        </button>
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            setRevokeModalItem({
                              id: item.id,
                              organisationName: item.organisationName || item.companyName || 'this organisation',
                            });
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 flex items-center gap-2"
                        >
                          <HiX className="w-4 h-4 flex-shrink-0" />
                          Revoke Access
                        </button>
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            handleDownloadReport(item.id);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <HiDownload className="w-4 h-4 flex-shrink-0" />
                          Download Report
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right side drawer - Complete data breakdown */}
      {drawerItem && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 transition-opacity"
            aria-hidden
            onClick={() => setDrawerItem(null)}
          />
          <div
            className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-200"
            style={{ animation: 'slideInRight 0.2s ease-out' }}
          >
            <style>{`
              @keyframes slideInRight {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
            `}</style>
            <div className="flex-1 overflow-y-auto">
              {/* Summary header */}
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Data sharing details</h2>
                  <button
                    type="button"
                    onClick={() => setDrawerItem(null)}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                    aria-label="Close"
                  >
                    <HiX className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between gap-4 items-baseline">
                    <span className="text-sm text-gray-500 shrink-0">Name</span>
                    <span className="text-sm text-gray-900 font-medium text-right">
                      {drawerItem.organisationName || drawerItem.companyName || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 items-baseline">
                    <span className="text-sm text-gray-500 shrink-0">Type</span>
                    <span className="text-sm text-gray-900 text-right">
                      {drawerItem.accessType || drawerItem.dataType || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 items-baseline">
                    <span className="text-sm text-gray-500 shrink-0">Purpose</span>
                    <span className="text-sm text-gray-900 text-right">
                      {drawerItem.dataType || drawerItem.accessType || 'Data sharing'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 items-baseline">
                    <span className="text-sm text-gray-500 shrink-0">Date</span>
                    <span className="text-sm text-gray-900 text-right">
                      {formatDate(drawerItem.createdAt || drawerItem.sharedAt || drawerItem.dateShared)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 items-center">
                    <span className="text-sm text-gray-500 shrink-0">Status</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <HiCheckCircle className="w-4 h-4 mr-1" />
                      {drawerItem.status === 'active' || drawerItem.status === 'Active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-left">Complete data breakdown</h3>

                <div className="space-y-4">
                  <DataCard icon={HiUser} title="Personal Information">
                    <div className="space-y-0">
                      {drawerItem.personalInfo ? (
                        Object.entries(drawerItem.personalInfo).map(([key, val]) => (
                          <DataRow key={key} label={key.replace(/([A-Z])/g, ' $1').trim()} value={String(val)} />
                        ))
                      ) : (
                        <>
                          <DataRow label="Name" value={drawerItem.sharedByName || drawerItem.userName || '—'} />
                          <DataRow label="Email" value={drawerItem.sharedByEmail || drawerItem.userEmail || '—'} />
                          <DataRow label="Shared at" value={formatDate(drawerItem.sharedAt || drawerItem.createdAt)} />
                          <DataRow label="Retention" value={drawerItem.retentionPeriod || drawerItem.retention || '90 days'} />
                          <DataRow label="Passport ID" value={drawerItem.accessType || drawerItem.dataType || '—'} />
                          <DataRow label="NIN" value={drawerItem.accessType || drawerItem.dataType || '—'} />
                          <DataRow label="Address" value={drawerItem.accessType || drawerItem.dataType || '—'} />
                          <DataRow label="Date of birth" value={drawerItem.accessType || drawerItem.dataType || '—'} />
                          <DataRow label="Nationality" value={drawerItem.accessType || drawerItem.dataType || '—'} />
                          <DataRow label="Marital status" value={drawerItem.accessType || drawerItem.dataType || '—'} />
                        </>
                      )}
                    </div>
                  </DataCard>

                  <DataCard icon={HiAcademicCap} title="Education">
                    <div className="space-y-0">
                      {drawerItem.education && (Array.isArray(drawerItem.education) ? drawerItem.education : [drawerItem.education]).length > 0 ? (
                        (Array.isArray(drawerItem.education) ? drawerItem.education : [drawerItem.education]).map((edu: any, i: number) => (
                          <div key={i} className="py-2 border-b border-gray-100 last:border-0">
                            <DataRow label="Degree" value={edu.degree || edu.levelOfEducation || edu.name} />
                            <DataRow label="Institution" value={edu.institutionName || edu.institution} />
                            <DataRow label="Year" value={edu.year || edu.endDate || edu.startDate} />
                          </div>
                        ))
                      ) : (
                        <>
                          <DataRow label="Access type" value={drawerItem.accessType || drawerItem.dataType || '—'} />
                          <DataRow label="Date shared" value={formatDate(drawerItem.sharedAt || drawerItem.dateShared)} />
                        </>
                      )}
                    </div>
                  </DataCard>

                  {drawerItem.workExperience && (Array.isArray(drawerItem.workExperience) ? drawerItem.workExperience : [drawerItem.workExperience]).length > 0 && (
                    <DataCard icon={HiDocument} title="Work experience">
                      <div className="space-y-0">
                        {(Array.isArray(drawerItem.workExperience) ? drawerItem.workExperience : [drawerItem.workExperience]).map((work: any, i: number) => (
                          <div key={i} className="py-2 border-b border-gray-100 last:border-0">
                            <DataRow label="Role" value={work.role || work.title} />
                            <DataRow label="Organisation" value={work.organisationName || work.company} />
                            <DataRow label="Period" value={work.startDate && work.endDate ? `${work.startDate} – ${work.endDate}` : work.period} />
                          </div>
                        ))}
                      </div>
                    </DataCard>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Revoke confirmation modal */}
      {revokeModalItem && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[60]"
            aria-hidden
            onClick={() => !revoking && setRevokeModalItem(null)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md p-6">
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6">
              <p className="text-gray-900 text-center mb-6">
                Your data will be revoked from <span className="font-semibold">{revokeModalItem.organisationName}</span>. Are you sure?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => !revoking && setRevokeModalItem(null)}
                  disabled={revoking}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleRevokeAccess(revokeModalItem.id, revokeModalItem.organisationName)}
                  disabled={revoking}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {revoking ? 'Revoking...' : 'Yes, revoke'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </ProfessionalLayout>
  );
}

