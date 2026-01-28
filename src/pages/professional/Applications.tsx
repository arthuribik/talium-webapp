import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import { HiClipboardList, HiBriefcase, HiLocationMarker, HiCalendar, HiCheckCircle, HiClock, HiXCircle } from 'react-icons/hi';

export default function Applications() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      // Fetch applications
      const response = await api.get('/v1/professional/applications');
      setApplications(response.data.data?.applications || []);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-gray-600">Track your job applications and their status</p>
        </div>

        {loading ? (
          <div className="text-center text-gray-600 py-16">Loading applications...</div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-xl shadow-sm">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <HiClipboardList className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Yet</h3>
            <p className="text-sm text-gray-500 text-center max-w-md mb-4">
              You haven't applied to any jobs yet. Start browsing jobs and apply to opportunities that match your skills.
            </p>
            <button
              onClick={() => navigate('/jobs')}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
            >
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {applications.map((application) => (
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
      </div>
    </ProfessionalLayout>
  );
}

