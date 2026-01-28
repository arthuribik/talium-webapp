import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { useAppSelector } from '@/store/hooks';

export default function CreateJob() {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const orgId = user?.organisation?.id || '';

  const [formData, setFormData] = useState({
    jobTitle: '',
    location: '',
    workMode: '',
    employmentType: '',
    experienceYears: '',
    jobLevel: '',
    pay: {
      amount: '',
      currency: 'USD',
      type: 'Gross',
      period: 'Per annum',
    },
    closingDate: '',
    description: '',
    requirements: [''],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('pay.')) {
      const payField = name.split('.')[1];
      setFormData({
        ...formData,
        pay: { ...formData.pay, [payField]: value },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleRequirementChange = (index: number, value: string) => {
    const newRequirements = [...formData.requirements];
    newRequirements[index] = value;
    setFormData({ ...formData, requirements: newRequirements });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!orgId) {
        toast.error('Organization ID not found. Please complete your organization setup.');
        return;
      }
      await api.post(`/v1/jobs/draft?organisationId=${orgId}`, {
        ...formData,
        experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : undefined,
        pay: {
          ...formData.pay,
          amount: parseInt(formData.pay.amount),
        },
        requirements: formData.requirements.filter((r) => r.trim() !== ''),
      });
      toast.success('Job created successfully!');
      // Navigate based on current path
      if (window.location.pathname.includes('/organization')) {
        navigate('/organization/jobs');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to create job';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Create Job Posting</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Job Title</label>
            <input
              type="text"
              name="jobTitle"
              required
              value={formData.jobTitle}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <input
              type="text"
              name="location"
              required
              value={formData.location}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Work Mode</label>
            <select
              name="workMode"
              required
              value={formData.workMode}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select Work Mode</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="on_site">On Site</option>
              <option value="global_remote">Global Remote</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Employment Type</label>
            <select
              name="employmentType"
              required
              value={formData.employmentType}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select Type</option>
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              required
              value={formData.description}
              onChange={handleChange}
              rows={6}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Requirements</label>
            {formData.requirements.map((req, index) => (
              <input
                key={index}
                type="text"
                value={req}
                onChange={(e) => handleRequirementChange(index, e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                placeholder={`Requirement ${index + 1}`}
              />
            ))}
            <button
              type="button"
              onClick={() => setFormData({ ...formData, requirements: [...formData.requirements, ''] })}
              className="text-indigo-600 text-sm"
            >
              + Add Requirement
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Salary Amount</label>
            <input
              type="number"
              name="pay.amount"
              value={formData.pay.amount}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Job'}
          </button>
        </form>
      </div>
    </div>
  );
}

