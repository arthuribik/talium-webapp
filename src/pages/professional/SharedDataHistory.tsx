import { useState, useEffect } from 'react';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import { HiDocumentText, HiClock, HiCheckCircle, HiEye, HiX, HiDownload, HiChevronRight, HiDocument, HiGlobe, HiDeviceMobile } from 'react-icons/hi';

export default function SharedDataHistory() {
  const [loading, setLoading] = useState(true);
  const [sharedData, setSharedData] = useState<any[]>([]);

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
    if (!confirm(`Are you sure you want to revoke access for ${organisationName}?`)) return;
    
    try {
      await api.post(`/v1/professional/shared-data/${id}/revoke`);
      toast.success('Access revoked successfully');
      fetchSharedData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to revoke access');
    }
  };

  const handleViewDetails = (item: any) => {
    // Navigate to details or open modal
    console.log('View details for:', item);
    // TODO: Implement details view
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
                          <HiCheckCircle className="w-4 h-4 mr-1" />
                          {item.status === 'active' || item.status === 'Active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center flex-wrap gap-4">
                          <div className="flex items-center">
                            <HiDocument className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{item.accessType || item.dataType || 'Job Application'}</span>
                          </div>
                          <div className="flex items-center">
                            <HiClock className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{formatDate(item.sharedAt || item.createdAt || item.dateShared)}</span>
                          </div>
                          <div className="flex items-center">
                            <HiClock className="w-4 h-4 mr-2 text-gray-400" />
                            <span>Retention: {item.retentionPeriod || item.retention || '90 days'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 mt-4">
                        <button
                          onClick={() => handleViewDetails(item)}
                          className="flex items-center px-4 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
                        >
                          <HiEye className="w-4 h-4 mr-2" />
                          View Details
                        </button>
                        <button
                          onClick={() => handleRevokeAccess(item.id, item.organisationName || item.companyName)}
                          className="flex items-center px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                        >
                          <HiX className="w-4 h-4 mr-2" />
                          Revoke Access
                        </button>
                        <button
                          onClick={() => handleDownloadReport(item.id)}
                          className="flex items-center px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                          <HiDownload className="w-4 h-4 mr-2" />
                          Download Report
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Arrow */}
                  <button
                    onClick={() => handleViewDetails(item)}
                    className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <HiChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProfessionalLayout>
  );
}

