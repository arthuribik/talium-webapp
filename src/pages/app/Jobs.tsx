import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { useAppSelector } from '@/store/hooks';
import { APP_NAME } from '@/constants/app';

interface Job {
  id: string;
  jobTitle: string;
  location: string;
  workMode: string;
  employmentType: string;
  description: string;
  organisation: {
    companyName: string;
  };
  views: number;
  createdAt: string;
}

export default function Jobs() {
  const { user } = useAppSelector((state) => state.auth);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/v1/jobs');
      setJobs(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (jobId: string) => {
    try {
      await api.post(`/v1/jobs/${jobId}/apply`, {});
      toast.success('Application submitted successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to apply');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold">
                {APP_NAME}
              </Link>
            </div>
            {user && (
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">{user.email}</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6">
          <h1 className="text-3xl font-bold mb-6">Available Jobs</h1>

          {jobs.length === 0 ? (
            <p className="text-gray-600">No jobs available at the moment.</p>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="bg-white p-6 rounded shadow">
                  <h2 className="text-xl font-bold mb-2">{job.jobTitle}</h2>
                  <p className="text-gray-600 mb-2">{job.organisation.companyName}</p>
                  <p className="text-gray-600 mb-2">
                    {job.location} • {job.workMode} • {job.employmentType}
                  </p>
                  <p className="text-gray-700 mb-4">{job.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{job.views} views</span>
                    {user?.userType === 'PROFESSIONAL' && (
                      <button
                        onClick={() => handleApply(job.id)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

