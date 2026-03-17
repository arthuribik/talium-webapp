import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import OrganisationLayout from '@/components/organisation/OrganisationLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import { HiArrowLeft, HiUser, HiLocationMarker, HiCheckCircle, HiXCircle, HiX, HiClock, HiStar, HiPause, HiPlay, HiDotsVertical, HiAcademicCap, HiBriefcase } from 'react-icons/hi';

// Simple flag helper for profile drawer
const getFlag = (name: string | null | undefined): string => {
  if (!name) return '🌐';
  const n = (name || '').trim();
  if (n.toLowerCase().includes('nigeria') || n.toLowerCase().includes('nigerian')) return '🇳🇬';
  if (n.toLowerCase().includes('united states') || n.toLowerCase().includes('usa') || n.toLowerCase().includes('american')) return '🇺🇸';
  if (n.toLowerCase().includes('united kingdom') || n.toLowerCase().includes('uk') || n.toLowerCase().includes('british')) return '🇬🇧';
  if (n.toLowerCase().includes('germany') || n.toLowerCase().includes('german')) return '🇩🇪';
  if (n.toLowerCase().includes('india') || n.toLowerCase().includes('indian')) return '🇮🇳';
  if (n.toLowerCase().includes('canada') || n.toLowerCase().includes('canadian')) return '🇨🇦';
  if (n.toLowerCase().includes('australia') || n.toLowerCase().includes('australian')) return '🇦🇺';
  if (n.toLowerCase().includes('france') || n.toLowerCase().includes('french')) return '🇫🇷';
  return '🌐';
};

export default function OrganisationJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingJobStatus, setUpdatingJobStatus] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [profileDetail, setProfileDetail] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [drawerMenuOpen, setDrawerMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const drawerMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (statusMenuRef.current && !statusMenuRef.current.contains(target)) {
        setStatusMenuOpen(false);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(target)) {
        setActionMenuOpenId(null);
      }
      if (drawerMenuRef.current && !drawerMenuRef.current.contains(target)) {
        setDrawerMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      toast.success(`Application ${newStatus === 'shortlisted' ? 'shortlisted' : newStatus === 'rejected' ? 'declined' : 'status updated'} successfully`);
      fetchApplications();
      if (selectedApplication?.id === applicationId) {
        setSelectedApplication((prev: any) => (prev ? { ...prev, status: newStatus, hiringStatus: newStatus } : null));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update application status');
    }
  };

  const handleApplicantClick = async (application: any) => {
    const professionalId = application.professionalId;
    if (!professionalId) return;
    setActionMenuOpenId(null);
    setSelectedApplication(application);
    setProfileDetail(null);
    setProfileLoading(true);
    try {
      const res = await api.get(`/v1/organisation/professionals/${professionalId}`);
      setProfileDetail(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load profile:', err);
      toast.error('Failed to load profile');
      setSelectedApplication(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const closeApplicantDrawer = () => {
    setSelectedApplication(null);
    setProfileDetail(null);
    setDrawerMenuOpen(false);
  };

  const handleDrawerAction = async (newStatus: string) => {
    if (!selectedApplication?.id) return;
    setUpdatingStatus(true);
    try {
      await api.put(`/v1/organisation/applications/${selectedApplication.id}/status`, { status: newStatus });
      toast.success(newStatus === 'shortlisted' ? 'Shortlisted' : newStatus === 'rejected' ? 'Declined' : 'Status updated');
      fetchApplications();
      closeApplicantDrawer();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setUpdatingStatus(false);
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
              <div className="relative" ref={statusMenuRef}>
                <button
                  type="button"
                  onClick={() => setStatusMenuOpen((v) => !v)}
                  disabled={updatingJobStatus}
                  className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  aria-expanded={statusMenuOpen}
                  aria-haspopup="true"
                >
                  <HiDotsVertical className="w-5 h-5" />
                </button>
                {statusMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    {job.status !== 'published' && (
                      <button
                        type="button"
                        onClick={() => { handleUpdateJobStatus('published'); setStatusMenuOpen(false); }}
                        disabled={updatingJobStatus}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                      >
                        <HiPlay className="w-4 h-4" />
                        {updatingJobStatus ? 'Publishing...' : 'Publish'}
                      </button>
                    )}
                    {job.status === 'published' && (
                      <>
                        <button
                          type="button"
                          onClick={() => { handleUpdateJobStatus('paused'); setStatusMenuOpen(false); }}
                          disabled={updatingJobStatus}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                        >
                          <HiPause className="w-4 h-4" />
                          {updatingJobStatus ? 'Pausing...' : 'Pause'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { handleUpdateJobStatus('draft'); setStatusMenuOpen(false); }}
                          disabled={updatingJobStatus}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                        >
                          <HiXCircle className="w-4 h-4" />
                          {updatingJobStatus ? 'Unpublishing...' : 'Unpublish'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
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
                    <tr
                      key={application.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => application.professionalId && handleApplicantClick(application)}
                      onKeyDown={(e) => e.key === 'Enter' && application.professionalId && handleApplicantClick(application)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center mr-3">
                            <HiUser className="w-5 h-5 text-brand-600" />
                          </div>
                          <div className="text-sm font-medium text-gray-900 hover:text-brand-600 hover:underline cursor-pointer">
                            {application.applicantName || application.professional?.user?.firstName + ' ' + application.professional?.user?.lastName}
                          </div>
                        </div>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                        <div className="relative flex justify-end" ref={actionMenuOpenId === application.id ? actionMenuRef : undefined}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuOpenId((prev) => (prev === application.id ? null : application.id));
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          >
                            <HiDotsVertical className="w-5 h-5" />
                          </button>
                          {actionMenuOpenId === application.id && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                              {application.status !== 'shortlisted' && application.status !== 'accepted' && application.status !== 'hired' && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleUpdateStatus(application.id, 'shortlisted'); setActionMenuOpenId(null); }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  Shortlist
                                </button>
                              )}
                              {application.status !== 'hired' && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleUpdateStatus(application.id, 'hired'); setActionMenuOpenId(null); }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  Hire
                                </button>
                              )}
                              {application.status !== 'rejected' && application.status !== 'hired' && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleUpdateStatus(application.id, 'rejected'); setActionMenuOpenId(null); }}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                >
                                  Decline
                                </button>
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
          )}
        </div>

        {/* Applicant profile drawer */}
        {selectedApplication && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/50" onClick={closeApplicantDrawer} aria-hidden />
            <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
              {profileLoading ? (
                <div className="p-8 flex items-center justify-center min-h-[200px]">
                  <div className="text-gray-500">Loading profile...</div>
                </div>
              ) : profileDetail ? (
                <div className="p-6 pb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">{profileDetail.name}</h2>
                    <div className="flex items-center gap-1">
                      <div className="relative" ref={drawerMenuRef}>
                        <button
                          type="button"
                          onClick={() => setDrawerMenuOpen((v) => !v)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                        >
                          <HiDotsVertical className="w-6 h-6" />
                        </button>
                        {drawerMenuOpen && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                            {selectedApplication?.status !== 'shortlisted' && selectedApplication?.status !== 'accepted' && selectedApplication?.status !== 'hired' && (
                              <button
                                type="button"
                                onClick={() => { handleDrawerAction('shortlisted'); setDrawerMenuOpen(false); }}
                                disabled={updatingStatus}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Shortlist
                              </button>
                            )}
                            {selectedApplication?.status !== 'hired' && (
                              <button
                                type="button"
                                onClick={() => { handleDrawerAction('hired'); setDrawerMenuOpen(false); }}
                                disabled={updatingStatus}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Hire
                              </button>
                            )}
                            {selectedApplication?.status !== 'rejected' && (
                              <button
                                type="button"
                                onClick={() => { handleDrawerAction('rejected'); setDrawerMenuOpen(false); }}
                                disabled={updatingStatus}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                Decline
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={closeApplicantDrawer} className="p-2 hover:bg-gray-100 rounded-lg">
                        <HiX className="w-6 h-6 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 text-brand-700 text-xl font-bold">
                      {profileDetail.name
                        ?.split(' ')
                        .map((s: string) => s[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <ul className="space-y-1.5 text-sm text-gray-600">
                        {profileDetail.nationality && (
                          <li className="flex items-center gap-2">
                            <span className="text-lg">{getFlag(profileDetail.nationality)}</span>
                            {profileDetail.nationality}
                          </li>
                        )}
                        {(profileDetail.location?.city || profileDetail.location?.country) && (
                          <li className="flex items-center gap-2">
                            <HiLocationMarker className="w-4 h-4 text-gray-400 shrink-0" />
                            {[profileDetail.location.city, profileDetail.location.country].filter(Boolean).join(', ')}
                          </li>
                        )}
                        {profileDetail.profession && (
                          <li className="flex items-center gap-2">
                            <HiBriefcase className="w-4 h-4 text-gray-400 shrink-0" />
                            {profileDetail.profession}
                          </li>
                        )}
                        <li className="flex items-center gap-2">
                          <span className="text-gray-400">🕐</span>
                          {profileDetail.yearsOfExperience ?? 0} years of experience
                        </li>
                      </ul>
                      {profileDetail.verificationStatus && (
                        <span className="inline-flex mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-600 text-white">
                          {profileDetail.verificationStatus.percentage}% — {profileDetail.verificationStatus.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <section className="mb-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {profileDetail.skills?.length > 0 ? (
                        profileDetail.skills.map((s: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-sm">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">—</span>
                      )}
                    </div>
                  </section>

                  <section className="mb-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <HiBriefcase className="w-4 h-4" />
                      Work Experience
                    </h3>
                    {profileDetail.workExperience?.length > 0 ? (
                      <ul className="space-y-3">
                        {profileDetail.workExperience.map((exp: any) => (
                          <li key={exp.id}>
                            <p className="font-medium text-gray-900">{exp.role || exp.jobTitle}</p>
                            <p className="text-sm text-gray-600">{exp.organisationName || exp.companyName}</p>
                            <p className="text-xs text-gray-500">
                              {exp.startDate} — {exp.currentlyWorking ? 'Present' : exp.endDate || '—'}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">—</p>
                    )}
                  </section>

                  <section className="mb-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <HiAcademicCap className="w-4 h-4" />
                      Academic Qualifications
                    </h3>
                    {profileDetail.education?.length > 0 ? (
                      <ul className="space-y-3">
                        {profileDetail.education.map((edu: any) => (
                          <li key={edu.id}>
                            <p className="font-medium text-gray-900">
                              {[edu.degreeType, edu.fieldOfStudy].filter(Boolean).join(' ') || edu.levelOfEducation || '—'}
                            </p>
                            <p className="text-sm text-gray-600">{edu.institutionName}</p>
                            <p className="text-xs text-gray-500">{edu.endDate || edu.startDate || '—'}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">—</p>
                    )}
                  </section>

                  {/* Application status */}
                  <div className="border-t border-gray-200 pt-4 mt-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Hiring status:</span>
                      {getStatusBadge(selectedApplication?.hiringStatus || selectedApplication?.status)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <p>Could not load profile.</p>
                  <button type="button" onClick={closeApplicantDrawer} className="mt-4 text-brand-600 hover:underline">
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </OrganisationLayout>
  );
}
