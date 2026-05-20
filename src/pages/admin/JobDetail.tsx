import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';
import { HiArrowLeft, HiBriefcase, HiCheckCircle, HiPause, HiXCircle, HiStar, HiClock } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { formatMoney } from '@/utils/formatMoney';

function jobStatusLabel(status: string): string {
  const map: Record<string, string> = {
    published: 'Active',
    draft: 'Under Review',
    paused: 'Paused',
    closed: 'Closed',
  };
  return map[status] || status;
}

function jobStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    published: 'bg-[#ECFDF5] text-[#10B981]',
    draft: 'bg-[#EFF6FF] text-[#3B82F6]',
    paused: 'bg-[#FFFBEB] text-[#D97706]',
    closed: 'bg-gray-100 text-gray-700',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      fetchJobDetail();
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchApplications();
  }, [id, statusFilter]);

  const fetchJobDetail = async () => {
    try {
      const response = await api.get('/v1/admin/jobs?limit=1000');
      const foundJob = response.data.data.jobs.find((j: any) => j.id === id);
      if (foundJob) {
        setJob(foundJob);
      }
    } catch (err) {
      console.error('Failed to fetch job:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    if (!id) return;
    setApplicationsLoading(true);
    try {
      const params: any = { jobId: id };
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await api.get('/v1/organisation/applications', { params });
      setApplications(response.data.data?.applications || []);
    } catch {
      setApplications([]);
    } finally {
      setApplicationsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    setUpdating(true);
    try {
      // Update job status to published (approved)
      await api.put(`/v1/admin/jobs/${id}/status`, {
        status: 'published',
      });
      toast.success('Job approved successfully!');
      await fetchJobDetail();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to approve job';
      toast.error(errorMsg);
    } finally {
      setUpdating(false);
    }
  };

  const handleUnapprove = async () => {
    if (!id) return;
    setUpdating(true);
    try {
      await api.put(`/v1/admin/jobs/${id}/status`, { status: 'draft' });
      toast.success('Job unapproved successfully!');
      await fetchJobDetail();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to unapprove job';
      toast.error(errorMsg);
    } finally {
      setUpdating(false);
    }
  };

  const getApplicationStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'shortlisted') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><HiStar className="w-4 h-4 mr-1" />Shortlisted</span>;
    if (s === 'accepted' || s === 'hired') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><HiCheckCircle className="w-4 h-4 mr-1" />{s === 'hired' ? 'Hired' : 'Accepted'}</span>;
    if (s === 'rejected') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><HiXCircle className="w-4 h-4 mr-1" />Rejected</span>;
    if (s === 'under_review') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><HiClock className="w-4 h-4 mr-1" />Under Review</span>;
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><HiClock className="w-4 h-4 mr-1" />Pending</span>;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center text-gray-600">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!job) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center text-gray-600">Job not found</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
      <button
        onClick={() => navigate('/admin/jobs')}
        className="mb-6 flex items-center text-brand-600 hover:text-brand-700"
      >
        <HiArrowLeft className="w-5 h-5 mr-2" />
        Back to Jobs
      </button>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mr-4">
              <HiBriefcase className="w-8 h-8 text-brand-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{job.jobTitle}</h1>
              <p className="text-gray-600">{job.organisation.companyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${jobStatusBadgeClass(job.status)}`}>
              {job.status === 'published' && <HiCheckCircle className="w-4 h-4 mr-1" />}
              {job.status === 'paused' && <HiPause className="w-4 h-4 mr-1" />}
              {jobStatusLabel(job.status)}
            </span>
            
            {/* Approve/Unapprove Buttons */}
            <div className="flex items-center gap-2">
              {job.status !== 'published' && job.status !== 'closed' && (
                <button
                  onClick={handleApprove}
                  disabled={updating}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                >
                  <HiCheckCircle className="w-4 h-4 mr-1" />
                  {updating ? 'Approving...' : 'Approve'}
                </button>
              )}
              {job.status === 'published' && (
                <button
                  onClick={handleUnapprove}
                  disabled={updating}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                >
                  <HiXCircle className="w-4 h-4 mr-1" />
                  {updating ? 'Unapproving...' : 'Unapprove'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Job Title</label>
                <p className="text-gray-900">{job.jobTitle}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Location</label>
                <p className="text-gray-900">{job.location}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Work Mode</label>
                <p className="text-gray-900 capitalize">{job.workMode?.replace('_', ' ')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Employment Type</label>
                <p className="text-gray-900 capitalize">{job.employmentType?.replace('_', ' ')}</p>
              </div>
              {job.experienceYears != null && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Experience</label>
                  <p className="text-gray-900">{job.experienceYears} years</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <p className="text-gray-900">{jobStatusLabel(job.status)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Applicants</label>
                <p className="text-gray-900">{job.applicants ?? applications.length}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Views</label>
                <p className="text-gray-900">{job.views || 0}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Posted Date</label>
                <p className="text-gray-900">{new Date(job.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {job.pay && ((job.pay.min != null && job.pay.max != null) || job.pay.amount != null) && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-500 mb-1">Salary / Pay</p>
            <p className="text-lg font-semibold text-gray-900">
              {job.pay.min != null && job.pay.max != null
                ? `${formatMoney(job.pay.currency, job.pay.min)} – ${formatMoney(job.pay.currency, job.pay.max)}`
                : job.pay.amount != null
                  ? formatMoney(job.pay.currency, job.pay.amount)
                  : ''}{' '}
              {job.pay.period || 'Per annum'}
            </p>
          </div>
        )}

        {job.description && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
          </div>
        )}

        {job.requirements && job.requirements.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Requirements</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              {job.requirements.map((req: string, idx: number) => (
                <li key={idx}>{req}</li>
              ))}
            </ul>
          </div>
        )}

        {job.closingDate && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Application deadline:</strong> {new Date(job.closingDate).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Applications */}
        <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Applications ({applications.length})</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {['all', 'pending', 'shortlisted', 'rejected', 'under_review', 'accepted', 'hired'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${statusFilter === s ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
          {applicationsLoading ? (
            <p className="text-gray-600 text-center py-8">Loading applications...</p>
          ) : applications.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              {statusFilter === 'all' ? 'No applications yet' : `No ${statusFilter} applications`}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Applicant</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date Applied</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {app.applicantName || (app.professional?.user && `${app.professional.user.firstName || ''} ${app.professional.user.lastName || ''}`.trim()) || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{app.email || app.professional?.user?.email || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{app.dateApplied || app.createdAt ? new Date(app.dateApplied || app.createdAt).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3">{getApplicationStatusBadge(app.hiringStatus || app.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}

