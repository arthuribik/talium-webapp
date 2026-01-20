import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';
import { HiArrowLeft, HiBriefcase, HiCheckCircle, HiPause } from 'react-icons/hi';

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
        className="mb-6 flex items-center text-teal-600 hover:text-teal-700"
      >
        <HiArrowLeft className="w-5 h-5 mr-2" />
        Back to Jobs
      </button>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mr-4">
              <HiBriefcase className="w-8 h-8 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{job.jobTitle}</h1>
              <p className="text-gray-600">{job.organisation.companyName}</p>
            </div>
          </div>
          <div>
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

