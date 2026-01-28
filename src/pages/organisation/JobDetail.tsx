import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import OrganisationLayout from '@/components/organisation/OrganisationLayout';
import { api } from '@/services/api';
import { HiArrowLeft } from 'react-icons/hi';

export default function OrganisationJobDetail() {
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

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.jobTitle}</h1>
              <p className="text-lg text-gray-600">{job.location}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              job.status === 'published' 
                ? 'bg-green-100 text-green-800' 
                : job.status === 'paused'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {job.status || 'draft'}
            </span>
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
              <p className="font-medium">{job.applicants || 0}</p>
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
      </div>
    </OrganisationLayout>
  );
}

