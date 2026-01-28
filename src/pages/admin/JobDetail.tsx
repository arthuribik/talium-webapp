import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';
import { HiArrowLeft, HiBriefcase, HiCheckCircle, HiPause, HiXCircle } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      fetchJobDetail();
    }
  }, [id]);

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
      // Update job status to draft (unapproved)
      await api.put(`/v1/admin/jobs/${id}/status`, {
        status: 'draft',
      });
      toast.success('Job unapproved successfully!');
      await fetchJobDetail();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to unapprove job';
      toast.error(errorMsg);
    } finally {
      setUpdating(false);
    }
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
            {job.status === 'published' ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <HiCheckCircle className="w-4 h-4 mr-1" />
                Published
              </span>
            ) : job.status === 'paused' ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                <HiPause className="w-4 h-4 mr-1" />
                Paused
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                Draft
              </span>
            )}
            
            {/* Approve/Unapprove Buttons */}
            <div className="flex items-center gap-2">
              {job.status !== 'published' ? (
                <button
                  onClick={handleApprove}
                  disabled={updating}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                >
                  <HiCheckCircle className="w-4 h-4 mr-1" />
                  {updating ? 'Approving...' : 'Approve'}
                </button>
              ) : (
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
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <p className="text-gray-900 capitalize">{job.status}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Applicants</label>
                <p className="text-gray-900">{job.applicants || 0}</p>
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

        {job.description && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
          </div>
        )}
      </div>
      </div>
    </AdminLayout>
  );
}

