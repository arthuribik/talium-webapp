import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrganisationLayout from '@/components/organisation/OrganisationLayout';
import { api } from '@/services/api';
import { useAppSelector } from '@/store/hooks';
import toast from 'react-hot-toast';
import { HiBriefcase, HiPlus, HiSearch, HiX } from 'react-icons/hi';

export default function PostJobs() {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, [user]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v1/organisation/jobs');
      setJobs(response.data.data?.jobs || []);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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
    benefits: [''],
    applyCTA: {
      label: 'Apply Now',
      requireVerification: [] as string[],
    },
  });
  const [formLoading, setFormLoading] = useState(false);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

  const handleBenefitChange = (index: number, value: string) => {
    const newBenefits = [...formData.benefits];
    newBenefits[index] = value;
    setFormData({ ...formData, benefits: newBenefits });
  };

  const handleApplyCTAChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      applyCTA: {
        ...formData.applyCTA,
        [field]: value,
      },
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const payload = {
        jobTitle: formData.jobTitle,
        location: formData.location,
        workMode: formData.workMode,
        employmentType: formData.employmentType,
        experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : undefined,
        jobLevel: formData.jobLevel || undefined,
        pay: {
          amount: formData.pay.amount ? parseInt(formData.pay.amount) : 0,
          currency: formData.pay.currency,
          type: formData.pay.type,
          period: formData.pay.period,
        },
        closingDate: formData.closingDate || undefined,
        description: formData.description,
        requirements: formData.requirements.filter((r) => r.trim() !== ''),
        applyCTA: formData.applyCTA.requireVerification.length > 0 ? {
          label: formData.applyCTA.label,
          requireVerification: formData.applyCTA.requireVerification,
        } : undefined,
      };

      // Submit to the API endpoint - backend will get organisationId from authenticated user
      await api.post('/v1/organisation/jobs', payload);
      
      // Reset form and close sidebar
      setFormData({
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
        benefits: [''],
        applyCTA: {
          label: 'Apply Now',
          requireVerification: [],
        },
      });
      setSidebarOpen(false);
      toast.success('Job created successfully!');
      fetchJobs(); // Refresh the jobs list
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to create job';
      toast.error(errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <OrganisationLayout>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Post Jobs</h1>
            <p className="text-gray-600">Create and manage job postings</p>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            <HiPlus className="w-5 h-5 mr-2" />
            Create Job
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search jobs by title or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-600 py-16">Loading jobs...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-xl shadow-sm">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <HiBriefcase className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Jobs Found</h3>
            <p className="text-sm text-gray-500 text-center max-w-md mb-4">
              {searchTerm ? 'No jobs match your search criteria.' : 'You haven\'t posted any jobs yet. Create your first job posting to get started.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
              >
                Create First Job
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => navigate(`/organization/jobs/${job.id}`)}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{job.jobTitle}</h3>
                    <p className="text-sm text-gray-600">{job.organisation?.companyName || 'Organization'}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="text-gray-600">{job.location}</div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      job.status === 'published' 
                        ? 'bg-green-100 text-green-800' 
                        : job.status === 'paused'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status || 'draft'}
                    </span>
                  </div>
                  {job.applicants !== undefined && (
                    <div className="text-gray-600">{job.applicants || 0} applicants</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b">
                <h2 className="text-2xl font-bold text-gray-900">Create Job</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <HiX className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                  <input
                    type="text"
                    name="jobTitle"
                    required
                    value={formData.jobTitle}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                  <input
                    type="text"
                    name="location"
                    required
                    value={formData.location}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Work Mode *</label>
                    <select
                      name="workMode"
                      required
                      value={formData.workMode}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Select Work Mode</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="on_site">On Site</option>
                      <option value="global_remote">Global Remote</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type *</label>
                    <select
                      name="employmentType"
                      required
                      value={formData.employmentType}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Select Type</option>
                      <option value="full_time">Full-time</option>
                      <option value="part_time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience Years</label>
                    <input
                      type="number"
                      name="experienceYears"
                      value={formData.experienceYears}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Level</label>
                    <input
                      type="text"
                      name="jobLevel"
                      value={formData.jobLevel}
                      onChange={handleFormChange}
                      placeholder="e.g., Senior, Junior"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    name="description"
                    required
                    value={formData.description}
                    onChange={handleFormChange}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
                  {formData.requirements.map((req, index) => (
                    <input
                      key={index}
                      type="text"
                      value={req}
                      onChange={(e) => handleRequirementChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder={`Requirement ${index + 1}`}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, requirements: [...formData.requirements, ''] })}
                    className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                  >
                    + Add Requirement
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Benefits</label>
                  {formData.benefits.map((benefit, index) => (
                    <input
                      key={index}
                      type="text"
                      value={benefit}
                      onChange={(e) => handleBenefitChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder={`Benefit ${index + 1}`}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, benefits: [...formData.benefits, ''] })}
                    className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                  >
                    + Add Benefit
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pay Information</label>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Amount</label>
                      <input
                        type="number"
                        name="pay.amount"
                        value={formData.pay.amount}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Currency</label>
                      <select
                        name="pay.currency"
                        value={formData.pay.currency}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Type</label>
                      <select
                        name="pay.type"
                        value={formData.pay.type}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="Gross">Gross</option>
                        <option value="Net">Net</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Period</label>
                      <select
                        name="pay.period"
                        value={formData.pay.period}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="Per annum">Per annum</option>
                        <option value="Per month">Per month</option>
                        <option value="Per week">Per week</option>
                        <option value="Per hour">Per hour</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apply CTA Label</label>
                  <input
                    type="text"
                    value={formData.applyCTA.label}
                    onChange={(e) => handleApplyCTAChange('label', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Apply Now"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Required Verifications</label>
                  <div className="space-y-2">
                    {['Identity', 'Education', 'Experience'].map((verification) => (
                      <label key={verification} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.applyCTA.requireVerification.includes(verification)}
                          onChange={(e) => {
                            const current = formData.applyCTA.requireVerification;
                            const updated = e.target.checked
                              ? [...current, verification]
                              : current.filter((v) => v !== verification);
                            handleApplyCTAChange('requireVerification', updated);
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{verification}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Closing Date</label>
                  <input
                    type="date"
                    name="closingDate"
                    value={formData.closingDate}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {formLoading ? 'Creating...' : 'Create Job'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </OrganisationLayout>
  );
}

