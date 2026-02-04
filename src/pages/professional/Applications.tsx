import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import { HiClipboardList, HiBriefcase, HiLocationMarker, HiCalendar, HiCheckCircle, HiClock, HiXCircle, HiDocumentText, HiX, HiDownload } from 'react-icons/hi';

export default function Applications() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'applications';
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [sharedData, setSharedData] = useState<any[]>([]);
  const [sharedDataLoading, setSharedDataLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (activeTab === 'applications') {
      fetchApplications();
    } else if (activeTab === 'shared-data') {
      fetchSharedData();
    }
  }, [activeTab]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v1/professional/applications');
      setApplications(response.data.data?.applications || []);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedData = async () => {
    setSharedDataLoading(true);
    try {
      const response = await api.get('/v1/professional/shared-data');
      setSharedData(response.data.data?.sharedData || []);
    } catch (err) {
      console.error('Failed to fetch shared data:', err);
      setSharedData([]);
    } finally {
      setSharedDataLoading(false);
    }
  };

  const handleRevokeAccess = async (id: string, organisationName: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${organisationName}?`)) return;
    
    try {
      await api.post(`/v1/professional/shared-data/${id}/revoke`);
      toast.success('Access revoked successfully');
      fetchSharedData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to revoke access');
    }
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

  const filteredApplications = filter === 'all' 
    ? applications 
    : applications.filter((app: any) => app.status?.toLowerCase() === filter.toLowerCase());

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <HiCheckCircle className="w-4 h-4 mr-1" />
            Accepted
          </span>
        );
      case 'rejected':
      case 'declined':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <HiXCircle className="w-4 h-4 mr-1" />
            Rejected
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <HiClock className="w-4 h-4 mr-1" />
            Pending
          </span>
        );
    }
  };

  return (
    <ProfessionalLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <HiClipboardList className="w-6 h-6 mr-2 text-brand-600" />
            Applications
          </h1>
          <p className="text-gray-600">Track your job applications and shared data history</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex space-x-4">
            <button
              onClick={() => {
                setSearchParams({ tab: 'applications' });
                setFilter('all');
              }}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'applications'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Applications
            </button>
            <button
              onClick={() => setSearchParams({ tab: 'shared-data' })}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'shared-data'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Shared Data
            </button>
          </div>
        </div>

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <>
            {/* Filter */}
            {applications.length > 0 && (
              <div className="mb-4 flex items-center gap-2">
                <label className="text-sm text-gray-600">Filter:</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            )}

            {loading ? (
              <div className="text-center text-gray-600 py-16">Loading applications...</div>
            ) : filteredApplications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-xl shadow-sm">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <HiClipboardList className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Yet</h3>
                <p className="text-sm text-gray-500 text-center max-w-md mb-4">
                  {filter !== 'all' 
                    ? `No ${filter} applications found.`
                    : "You haven't applied to any jobs yet. Start browsing jobs and apply to opportunities that match your skills."}
                </p>
                {filter === 'all' && (
                  <button
                    onClick={() => navigate('/jobs')}
                    className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
                  >
                    Browse Jobs
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredApplications.map((application) => (
                  <div
                    key={application.id}
                    onClick={() => navigate(`/jobs/${application.jobId}`)}
                    className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <HiBriefcase className="w-5 h-5 text-brand-600 mr-2" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            {application.job?.jobTitle || 'Job Title'}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {application.job?.organisation?.companyName || 'Company Name'}
                        </p>
                        <div className="flex items-center text-sm text-gray-500">
                          <HiLocationMarker className="w-4 h-4 mr-1" />
                          {application.job?.location || 'Location not specified'}
                        </div>
                      </div>
                      <div>{getStatusBadge(application.status)}</div>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <HiCalendar className="w-4 h-4 mr-1" />
                      Applied on {new Date(application.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Shared Data Tab */}
        {activeTab === 'shared-data' && (
          <>
            {sharedDataLoading ? (
              <div className="text-center text-gray-600 py-16">Loading shared data...</div>
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
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <HiDocumentText className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold text-gray-900">
                              {item.organisationName || item.companyName || 'Unknown Company'}
                            </h3>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-4">
                              <HiCheckCircle className="w-4 h-4 mr-1" />
                              {item.status === 'active' || item.status === 'Active' ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center flex-wrap gap-4">
                              <div className="flex items-center">
                                <HiDocumentText className="w-4 h-4 mr-2 text-gray-400" />
                                <span>{item.accessType || item.dataType || 'Job Application'}</span>
                              </div>
                              <div className="flex items-center">
                                <HiCalendar className="w-4 h-4 mr-2 text-gray-400" />
                                <span>{formatDate(item.sharedAt || item.createdAt || item.date)}</span>
                              </div>
                              <div className="flex items-center">
                                <HiClock className="w-4 h-4 mr-2 text-gray-400" />
                                <span>Retention: {item.retentionPeriod || item.retention || '90 days'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-4">
                            <button
                              onClick={() => handleDownloadReport(item.id)}
                              className="flex items-center px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                              <HiDownload className="w-4 h-4 mr-2" />
                              Download Report
                            </button>
                            <button
                              onClick={() => handleRevokeAccess(item.id, item.organisationName || item.companyName)}
                              className="flex items-center px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                            >
                              <HiX className="w-4 h-4 mr-2" />
                              Revoke Access
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ProfessionalLayout>
  );
}

