import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import OrganisationLayout from '@/components/organisation/OrganisationLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import { HiArrowLeft, HiUser, HiLocationMarker, HiCheckCircle, HiXCircle, HiClock, HiStar, HiPause, HiPlay } from 'react-icons/hi';

export default function OrganisationJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingJobStatus, setUpdatingJobStatus] = useState(false);

  useEffect(() => {
    if (id) {
      fetchJobDetail();
      fetchApplications();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchApplications();
    }
  }, [statusFilter]);

  const fetchJobDetail = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v1/organisation/jobs');
      const foundJob = response.data.data?.jobs?.find((j: any) => j.id === id);
      if (foundJob) {
        setJob(foundJob);
      } else {
        setJob(null);
      }
    } catch (err) {
      console.error('Failed to fetch job:', err);
      setJob(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    setApplicationsLoading(true);
    try {
      const params: any = { jobId: id };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const response = await api.get('/v1/organisation/applications', { params });
      setApplications(response.data.data?.applications || []);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
      setApplications([]);
    } finally {
      setApplicationsLoading(false);
    }
  };

  const handleUpdateStatus = async (applicationId: string, newStatus: string) => {
    try {
      await api.put(`/v1/organisation/applications/${applicationId}/status`, { status: newStatus });
      toast.success(`Application ${newStatus === 'shortlisted' ? 'shortlisted' : 'status updated'} successfully`);
      fetchApplications();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update application status');
    }
  };

  const handleUpdateJobStatus = async (newStatus: string) => {
    if (!id) return;
    setUpdatingJobStatus(true);
    try {
      await api.put(`/v1/organisation/jobs/${id}/status`, { status: newStatus });
      toast.success(`Job ${newStatus === 'published' ? 'published' : newStatus === 'draft' ? 'unpublished' : 'status updated'} successfully`);
      fetchJobDetail();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update job status');
    } finally {
      setUpdatingJobStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'shortlisted':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <HiStar className="w-4 h-4 mr-1" />
            Shortlisted
          </span>
        );
      case 'accepted':
      case 'hired':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <HiCheckCircle className="w-4 h-4 mr-1" />
            {status === 'hired' ? 'Hired' : 'Accepted'}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <HiXCircle className="w-4 h-4 mr-1" />
            Rejected
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <HiClock className="w-4 h-4 mr-1" />
            Under Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <HiClock className="w-4 h-4 mr-1" />
            Pending
          </span>
        );
    }
  };

  if (loading) {
    return (
      <OrganisationLayout>
        <div className="p-6">
          <div className="text-center text-gray-600 py-16">Loading job details...</div>
        </div>
      </OrganisationLayout>
    );
  }

  if (!job) {
    return (
      <OrganisationLayout>
        <div className="p-6">
          <button
            onClick={() => navigate('/organization/jobs')}
            className="mb-6 text-brand-600 hover:text-brand-700 flex items-center"
          >
            <HiArrowLeft className="w-5 h-5 mr-2" />
            Back to Jobs
          </button>
          <div className="text-center text-gray-600 py-16">Job not found</div>
        </div>
      </OrganisationLayout>
    );
  }

  const filteredApplications = statusFilter === 'all' 
    ? applications 
    : applications.filter(app => app.status === statusFilter);

  return (
    <OrganisationLayout>
      <div className="p-6">
        <button
          onClick={() => navigate('/organization/jobs')}
          className="mb-6 text-brand-600 hover:text-brand-700 flex items-center"
        >
          <HiArrowLeft className="w-5 h-5 mr-2" />
          Back to Jobs
        </button>

        {/* Job Details */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.jobTitle}</h1>
              <p className="text-lg text-gray-600">{job.location}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                job.status === 'published' 
                  ? 'bg-green-100 text-green-800' 
                  : job.status === 'paused'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {job.status === 'published' ? (
                  <span className="flex items-center">
                    <HiCheckCircle className="w-4 h-4 mr-1" />
                    Published
                  </span>
                ) : job.status === 'paused' ? (
                  <span className="flex items-center">
                    <HiPause className="w-4 h-4 mr-1" />
                    Paused
                  </span>
                ) : (
                  'Draft'
                )}
              </span>
              {job.status === 'published' ? (
                <button
                  onClick={() => handleUpdateJobStatus('draft')}
                  disabled={updatingJobStatus}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                >
                  <HiPause className="w-4 h-4 mr-1" />
                  {updatingJobStatus ? 'Unpublishing...' : 'Unpublish'}
                </button>
              ) : (
                <button
                  onClick={() => handleUpdateJobStatus('published')}
                  disabled={updatingJobStatus}
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                >
                  <HiPlay className="w-4 h-4 mr-1" />
                  {updatingJobStatus ? 'Publishing...' : 'Publish'}
                </button>
              )}
              {job.status === 'published' && (
                <button
                  onClick={() => handleUpdateJobStatus('paused')}
                  disabled={updatingJobStatus}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                >
                  <HiPause className="w-4 h-4 mr-1" />
                  {updatingJobStatus ? 'Pausing...' : 'Pause'}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Work Mode</p>
              <p className="font-medium capitalize">{job.workMode?.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Employment Type</p>
              <p className="font-medium capitalize">{job.employmentType?.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Experience</p>
              <p className="font-medium">{job.experienceYears ? `${job.experienceYears} years` : 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Applicants</p>
              <p className="font-medium">{applications.length}</p>
            </div>
          </div>

          {job.pay && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Salary</p>
              <p className="text-lg font-semibold">
                {job.pay.currency} {job.pay.amount?.toLocaleString()} {job.pay.period}
              </p>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Job Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
          </div>

          {job.requirements && job.requirements.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Requirements</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                {job.requirements.map((req: string, idx: number) => (
                  <li key={idx}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          {job.closingDate && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Application Deadline:</strong> {new Date(job.closingDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Applications Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Applications ({applications.length})</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  statusFilter === 'all'
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  statusFilter === 'pending'
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('shortlisted')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  statusFilter === 'shortlisted'
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Shortlisted
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  statusFilter === 'rejected'
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Rejected
              </button>
            </div>
          </div>

          {applicationsLoading ? (
            <div className="text-center text-gray-600 py-12">Loading applications...</div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center text-gray-600 py-12">
              {statusFilter === 'all' ? 'No applications yet' : `No ${statusFilter} applications`}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applicant Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role Applied
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Applied
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role Match Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hiring Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredApplications.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center mr-3">
                            <HiUser className="w-5 h-5 text-brand-600" />
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {application.applicantName || application.professional?.user?.firstName + ' ' + application.professional?.user?.lastName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{application.email || application.professional?.user?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{application.roleApplied || application.job?.jobTitle || job.jobTitle}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(application.dateApplied || application.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${
                                (application.roleMatchScore || 0) >= 80
                                  ? 'bg-green-500'
                                  : (application.roleMatchScore || 0) >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${application.roleMatchScore || 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {application.roleMatchScore || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <HiLocationMarker className="w-4 h-4 mr-1 text-gray-400" />
                          {application.location || 'Not specified'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(application.hiringStatus || application.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          {application.status !== 'shortlisted' && application.status !== 'accepted' && application.status !== 'hired' && (
                            <button
                              onClick={() => handleUpdateStatus(application.id, 'shortlisted')}
                              className="px-3 py-1 bg-brand-500 text-white rounded text-xs font-medium hover:bg-brand-600 transition-colors"
                            >
                              Shortlist
                            </button>
                          )}
                          {application.status !== 'rejected' && application.status !== 'hired' && (
                            <button
                              onClick={() => handleUpdateStatus(application.id, 'rejected')}
                              className="px-3 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors"
                            >
                              Reject
                            </button>
                          )}
                          {application.status === 'shortlisted' && (
                            <button
                              onClick={() => handleUpdateStatus(application.id, 'accepted')}
                              className="px-3 py-1 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 transition-colors"
                            >
                              Accept
                            </button>
                          )}
                          {application.status === 'accepted' && (
                            <button
                              onClick={() => handleUpdateStatus(application.id, 'hired')}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                            >
                              Hire
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </OrganisationLayout>
  );
}
