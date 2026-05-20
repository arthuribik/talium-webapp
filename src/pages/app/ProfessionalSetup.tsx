import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { SearchableList } from '@/components/common/SearchableList';

export default function ProfessionalSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [profId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Identity verification form
  const [identityData, setIdentityData] = useState({
    nationality: '',
    idType: '',
    idNumber: '',
    dateOfBirth: '',
    livenessCheckData: {
      sessionId: 'liveness_session_' + Math.random().toString(36).substring(7),
      provider: 'youverify',
      status: 'completed',
    },
  });

  // Education form
  const [educationData, setEducationData] = useState({
    levelOfEducation: '',
    institutionName: '',
    degreeType: '',
    fieldOfStudy: '',
    startDate: '',
    endDate: '',
    currentlyAttending: false,
    grade: '',
    costOfEducation: '',
    currency: '',
    country: '',
  });

  // Experience form
  const [experienceData, setExperienceData] = useState({
    organisationName: '',
    industry: '',
    location: { city: '', state: '', country: '' },
    role: '',
    employmentType: '',
    workMode: '',
    startDate: '',
    endDate: '',
    currentlyWorking: false,
    responsibilities: [''],
    achievements: [''],
    paymentMode: '',
    currency: '',
    salaryRange: { min: '', max: '' },
  });

  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // First, get professional ID from user
      // In a real app, this would come from the user profile
      await api.post(`/v1/professionals/${profId || 'temp'}/identity/verify`, identityData);
      toast.success('Identity verified successfully!');
      setStep(2);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Verification failed';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEducationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post(`/v1/professionals/${profId || 'temp'}/education`, educationData);
      toast.success('Education added successfully!');
      setStep(3);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to add education';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleExperienceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post(`/v1/professionals/${profId || 'temp'}/experience`, experienceData);
      toast.success('Work experience added successfully!');
      navigate('/professional');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to add experience';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Professional Profile Setup</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleIdentitySubmit} className="bg-white p-6 rounded shadow">
            <h2 className="text-2xl font-bold mb-4">Step 1: Verify Identity</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nationality</label>
                <input
                  type="text"
                  required
                  value={identityData.nationality}
                  onChange={(e) => setIdentityData({ ...identityData, nationality: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">ID Type</label>
                <SearchableList
                  value={identityData.idType}
                  onChange={(idType) => setIdentityData({ ...identityData, idType })}
                  options={[
                    { value: '', label: 'Select ID Type' },
                    { value: 'national_id', label: 'National ID' },
                    { value: 'passport', label: 'Passport' },
                    { value: 'drivers_license', label: "Driver's License" },
                    { value: 'voters_card', label: "Voter's Card" },
                  ]}
                  placeholder="Select ID Type"
                  className="mt-1 block w-full focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">ID Number</label>
                <input
                  type="text"
                  required
                  value={identityData.idNumber}
                  onChange={(e) => setIdentityData({ ...identityData, idNumber: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <input
                  type="date"
                  required
                  value={identityData.dateOfBirth}
                  onChange={(e) => setIdentityData({ ...identityData, dateOfBirth: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify Identity'}
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleEducationSubmit} className="bg-white p-6 rounded shadow">
            <h2 className="text-2xl font-bold mb-4">Step 2: Add Education</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Level of Education</label>
                <SearchableList
                  value={educationData.levelOfEducation}
                  onChange={(levelOfEducation) => setEducationData({ ...educationData, levelOfEducation })}
                  options={[
                    { value: '', label: 'Select Level' },
                    { value: 'degree', label: 'Degree' },
                    { value: 'college', label: 'College' },
                    { value: 'primary_school', label: 'Primary School' },
                    { value: 'secondary_school', label: 'Secondary School' },
                    { value: 'training_institute', label: 'Training Institute' },
                  ]}
                  placeholder="Select Level"
                  className="mt-1 block w-full focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Institution Name</label>
                <input
                  type="text"
                  required
                  value={educationData.institutionName}
                  onChange={(e) => setEducationData({ ...educationData, institutionName: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Field of Study</label>
                <input
                  type="text"
                  required
                  value={educationData.fieldOfStudy}
                  onChange={(e) => setEducationData({ ...educationData, fieldOfStudy: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="month"
                  required
                  value={educationData.startDate}
                  onChange={(e) => setEducationData({ ...educationData, startDate: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="month"
                  value={educationData.endDate}
                  onChange={(e) => setEducationData({ ...educationData, endDate: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Education'}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleExperienceSubmit} className="bg-white p-6 rounded shadow">
            <h2 className="text-2xl font-bold mb-4">Step 3: Add Work Experience</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Organisation Name</label>
                <input
                  type="text"
                  required
                  value={experienceData.organisationName}
                  onChange={(e) => setExperienceData({ ...experienceData, organisationName: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <input
                  type="text"
                  required
                  value={experienceData.role}
                  onChange={(e) => setExperienceData({ ...experienceData, role: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="month"
                  required
                  value={experienceData.startDate}
                  onChange={(e) => setExperienceData({ ...experienceData, startDate: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Experience'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

