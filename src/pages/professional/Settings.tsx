import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import { HiUser, HiLockClosed, HiSave, HiPlus, HiPencil, HiTrash, HiX } from 'react-icons/hi';

export default function ProfessionalSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    showEmail: true,
    showPhone: false,
    allowDataSharing: true,
    allowJobRecommendations: true,
    allowOrganisationAccess: true,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    description: '',
    country: '',
    nationality: '',
    dateOfBirth: '',
    socialMedia: {
      linkedin: '',
      twitter: '',
      facebook: '',
      instagram: '',
      github: '',
      portfolio: '',
    },
  });

  // Education/Experience editing state
  const [editingEducation, setEditingEducation] = useState<string | null>(null);
  const [editingExperience, setEditingExperience] = useState<string | null>(null);
  const [showEducationForm, setShowEducationForm] = useState(false);
  const [showExperienceForm, setShowExperienceForm] = useState(false);
  const [educationForm, setEducationForm] = useState({
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
  const [experienceForm, setExperienceForm] = useState({
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

  useEffect(() => {
    if (activeTab === 'profile') {
      fetchProfile();
    } else if (activeTab === 'privacy') {
      fetchPrivacySettings();
    }
  }, [activeTab]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v1/professional/profile');
      const data = response.data.data;
      setProfile(data);
      setProfileForm({
        description: data.description || '',
        country: data.country || '',
        nationality: data.nationality || '',
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : '',
        socialMedia: data.socialMedia || {
          linkedin: '',
          twitter: '',
          facebook: '',
          instagram: '',
          github: '',
          portfolio: '',
        },
      });
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrivacySettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v1/professional/privacy-settings');
      if (response.data.data) {
        setPrivacySettings(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch privacy settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/v1/professional/profile', profileForm);
      toast.success('Profile updated successfully!');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePrivacySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/v1/professional/privacy-settings', privacySettings);
      toast.success('Privacy settings updated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update privacy settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await api.put('/v1/professional/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password updated successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const handlePrivacyChange = (field: string, value: any) => {
    setPrivacySettings({ ...privacySettings, [field]: value });
  };

  const handleEducationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const profId = profile?.id;
      if (!profId) {
        toast.error('Professional ID not found');
        return;
      }

      if (editingEducation) {
        await api.put(`/v1/professional/education/${editingEducation}`, educationForm);
        toast.success('Education updated successfully!');
      } else {
        await api.post(`/v1/professional/${profId}/education`, educationForm);
        toast.success('Education added successfully!');
      }
      setShowEducationForm(false);
      setEditingEducation(null);
      setEducationForm({
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
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save education');
    } finally {
      setSaving(false);
    }
  };

  const handleExperienceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const profId = profile?.id;
      if (!profId) {
        toast.error('Professional ID not found');
        return;
      }

      if (editingExperience) {
        await api.put(`/v1/professional/experience/${editingExperience}`, experienceForm);
        toast.success('Experience updated successfully!');
      } else {
        await api.post(`/v1/professional/${profId}/experience`, experienceForm);
        toast.success('Experience added successfully!');
      }
      setShowExperienceForm(false);
      setEditingExperience(null);
      setExperienceForm({
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
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save experience');
    } finally {
      setSaving(false);
    }
  };

  const handleEditEducation = (edu: any) => {
    setEditingEducation(edu.id);
    setEducationForm({
      levelOfEducation: edu.levelOfEducation || '',
      institutionName: edu.institutionName || '',
      degreeType: edu.degreeType || '',
      fieldOfStudy: edu.fieldOfStudy || '',
      startDate: edu.startDate || '',
      endDate: edu.endDate || '',
      currentlyAttending: edu.currentlyAttending || false,
      grade: edu.grade || '',
      costOfEducation: edu.costOfEducation?.toString() || '',
      currency: edu.currency || '',
      country: edu.country || '',
    });
    setShowEducationForm(true);
  };

  const handleEditExperience = (exp: any) => {
    setEditingExperience(exp.id);
    setExperienceForm({
      organisationName: exp.organisationName || '',
      industry: exp.industry || '',
      location: (exp.location as any) || { city: '', state: '', country: '' },
      role: exp.role || '',
      employmentType: exp.employmentType || '',
      workMode: exp.workMode || '',
      startDate: exp.startDate || '',
      endDate: exp.endDate || '',
      currentlyWorking: exp.currentlyWorking || false,
      responsibilities: exp.responsibilities || [''],
      achievements: exp.achievements || [''],
      paymentMode: exp.paymentMode || '',
      currency: exp.currency || '',
      salaryRange: (exp.salaryRange as any) || { min: '', max: '' },
    });
    setShowExperienceForm(true);
  };

  const handleDeleteEducation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this education record?')) return;
    try {
      await api.delete(`/v1/professional/education/${id}`);
      toast.success('Education deleted successfully!');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete education');
    }
  };

  const handleDeleteExperience = async (id: string) => {
    if (!confirm('Are you sure you want to delete this experience record?')) return;
    try {
      await api.delete(`/v1/professional/experience/${id}`);
      toast.success('Experience deleted successfully!');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete experience');
    }
  };

  if (loading && activeTab === 'profile') {
    return (
      <ProfessionalLayout>
        <div className="p-6">
          <div className="text-center text-gray-600 py-16">Loading profile...</div>
        </div>
      </ProfessionalLayout>
    );
  }

  return (
    <ProfessionalLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your profile and privacy settings</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex space-x-4">
            <button
              onClick={() => setSearchParams({ tab: 'profile' })}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'profile'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <HiUser className="w-4 h-4 inline mr-2" />
              Profile
            </button>
            <button
              onClick={() => setSearchParams({ tab: 'privacy' })}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'privacy'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <HiLockClosed className="w-4 h-4 inline mr-2" />
              Privacy
            </button>
            <button
              onClick={() => setSearchParams({ tab: 'security' })}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'security'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <HiLockClosed className="w-4 h-4 inline mr-2" />
              Security
            </button>
          </div>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && profile && (
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            {/* About Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">About</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={profileForm.description}
                    onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Tell us about yourself..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={profileForm.country}
                      onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                    <input
                      type="text"
                      value={profileForm.nationality}
                      onChange={(e) => setProfileForm({ ...profileForm, nationality: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={profileForm.dateOfBirth}
                      onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Social Media Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Social Media & Links</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                  <input
                    type="url"
                    value={profileForm.socialMedia.linkedin}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      socialMedia: { ...profileForm.socialMedia, linkedin: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Twitter</label>
                  <input
                    type="url"
                    value={profileForm.socialMedia.twitter}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      socialMedia: { ...profileForm.socialMedia, twitter: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="https://twitter.com/yourhandle"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
                  <input
                    type="url"
                    value={profileForm.socialMedia.facebook}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      socialMedia: { ...profileForm.socialMedia, facebook: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="https://facebook.com/yourprofile"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                  <input
                    type="url"
                    value={profileForm.socialMedia.instagram}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      socialMedia: { ...profileForm.socialMedia, instagram: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="https://instagram.com/yourhandle"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GitHub</label>
                  <input
                    type="url"
                    value={profileForm.socialMedia.github}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      socialMedia: { ...profileForm.socialMedia, github: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="https://github.com/yourusername"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio</label>
                  <input
                    type="url"
                    value={profileForm.socialMedia.portfolio}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      socialMedia: { ...profileForm.socialMedia, portfolio: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="https://yourportfolio.com"
                  />
                </div>
              </div>
            </div>

            {/* Education Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Education</h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditingEducation(null);
                    setEducationForm({
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
                    setShowEducationForm(true);
                  }}
                  className="flex items-center px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors text-sm"
                >
                  <HiPlus className="w-4 h-4 mr-2" />
                  Add Education
                </button>
              </div>

              {showEducationForm && (
                <form onSubmit={handleEducationSubmit} className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{editingEducation ? 'Edit Education' : 'Add Education'}</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEducationForm(false);
                        setEditingEducation(null);
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <HiX className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Level of Education</label>
                      <select
                        value={educationForm.levelOfEducation}
                        onChange={(e) => setEducationForm({ ...educationForm, levelOfEducation: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      >
                        <option value="">Select Level</option>
                        <option value="high_school">High School</option>
                        <option value="associate">Associate</option>
                        <option value="bachelor">Bachelor</option>
                        <option value="master">Master</option>
                        <option value="doctorate">Doctorate</option>
                        <option value="certificate">Certificate</option>
                        <option value="diploma">Diploma</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Institution Name</label>
                      <input
                        type="text"
                        value={educationForm.institutionName}
                        onChange={(e) => setEducationForm({ ...educationForm, institutionName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Degree Type</label>
                      <input
                        type="text"
                        value={educationForm.degreeType}
                        onChange={(e) => setEducationForm({ ...educationForm, degreeType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Field of Study</label>
                      <input
                        type="text"
                        value={educationForm.fieldOfStudy}
                        onChange={(e) => setEducationForm({ ...educationForm, fieldOfStudy: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={educationForm.startDate}
                        onChange={(e) => setEducationForm({ ...educationForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="date"
                        value={educationForm.endDate}
                        onChange={(e) => setEducationForm({ ...educationForm, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        disabled={educationForm.currentlyAttending}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <input
                        type="text"
                        value={educationForm.country}
                        onChange={(e) => setEducationForm({ ...educationForm, country: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={educationForm.currentlyAttending}
                        onChange={(e) => setEducationForm({ ...educationForm, currentlyAttending: e.target.checked })}
                        className="mr-2"
                      />
                      <label className="text-sm font-medium text-gray-700">Currently Attending</label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEducationForm(false);
                        setEditingEducation(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-4">
                {profile.education && profile.education.length > 0 ? (
                  profile.education.map((edu: any) => (
                    <div key={edu.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{edu.institutionName}</h3>
                          <p className="text-sm text-gray-600">{edu.degreeType || edu.levelOfEducation} - {edu.fieldOfStudy}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {edu.startDate} - {edu.currentlyAttending ? 'Present' : edu.endDate || 'N/A'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditEducation(edu)}
                            className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg"
                          >
                            <HiPencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEducation(edu.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <HiTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No education records yet</p>
                )}
              </div>
            </div>

            {/* Experience Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Work Experience</h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditingExperience(null);
                    setExperienceForm({
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
                    setShowExperienceForm(true);
                  }}
                  className="flex items-center px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors text-sm"
                >
                  <HiPlus className="w-4 h-4 mr-2" />
                  Add Experience
                </button>
              </div>

              {showExperienceForm && (
                <form onSubmit={handleExperienceSubmit} className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{editingExperience ? 'Edit Experience' : 'Add Experience'}</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowExperienceForm(false);
                        setEditingExperience(null);
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <HiX className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Organisation Name</label>
                      <input
                        type="text"
                        value={experienceForm.organisationName}
                        onChange={(e) => setExperienceForm({ ...experienceForm, organisationName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <input
                        type="text"
                        value={experienceForm.role}
                        onChange={(e) => setExperienceForm({ ...experienceForm, role: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                      <input
                        type="text"
                        value={experienceForm.industry}
                        onChange={(e) => setExperienceForm({ ...experienceForm, industry: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                      <select
                        value={experienceForm.employmentType}
                        onChange={(e) => setExperienceForm({ ...experienceForm, employmentType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      >
                        <option value="">Select Type</option>
                        <option value="full_time">Full-time</option>
                        <option value="part_time">Part-time</option>
                        <option value="contract">Contract</option>
                        <option value="internship">Internship</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Work Mode</label>
                      <select
                        value={experienceForm.workMode}
                        onChange={(e) => setExperienceForm({ ...experienceForm, workMode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      >
                        <option value="">Select Mode</option>
                        <option value="remote">Remote</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="on_site">On-site</option>
                        <option value="global_remote">Global Remote</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={experienceForm.startDate}
                        onChange={(e) => setExperienceForm({ ...experienceForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="date"
                        value={experienceForm.endDate}
                        onChange={(e) => setExperienceForm({ ...experienceForm, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        disabled={experienceForm.currentlyWorking}
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={experienceForm.currentlyWorking}
                        onChange={(e) => setExperienceForm({ ...experienceForm, currentlyWorking: e.target.checked })}
                        className="mr-2"
                      />
                      <label className="text-sm font-medium text-gray-700">Currently Working</label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={experienceForm.location.city}
                        onChange={(e) => setExperienceForm({
                          ...experienceForm,
                          location: { ...experienceForm.location, city: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        value={experienceForm.location.state}
                        onChange={(e) => setExperienceForm({
                          ...experienceForm,
                          location: { ...experienceForm.location, state: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <input
                        type="text"
                        value={experienceForm.location.country}
                        onChange={(e) => setExperienceForm({
                          ...experienceForm,
                          location: { ...experienceForm.location, country: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Responsibilities (one per line)</label>
                      <textarea
                        value={experienceForm.responsibilities.join('\n')}
                        onChange={(e) => setExperienceForm({
                          ...experienceForm,
                          responsibilities: e.target.value.split('\n').filter(r => r.trim())
                        })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Achievements (one per line)</label>
                      <textarea
                        value={experienceForm.achievements.join('\n')}
                        onChange={(e) => setExperienceForm({
                          ...experienceForm,
                          achievements: e.target.value.split('\n').filter(a => a.trim())
                        })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowExperienceForm(false);
                        setEditingExperience(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-4">
                {profile.workExperience && profile.workExperience.length > 0 ? (
                  profile.workExperience.map((exp: any) => (
                    <div key={exp.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{exp.role}</h3>
                          <p className="text-sm text-gray-600">{exp.organisationName}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {exp.startDate} - {exp.currentlyWorking ? 'Present' : exp.endDate || 'N/A'}
                          </p>
                          {exp.location && (
                            <p className="text-xs text-gray-500">
                              {(exp.location as any).city}, {(exp.location as any).country}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditExperience(exp)}
                            className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg"
                          >
                            <HiPencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExperience(exp.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <HiTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No work experience records yet</p>
                )}
              </div>
            </div>

            {/* Save Profile Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <HiSave className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <form onSubmit={handlePrivacySubmit} className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Privacy Settings</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Visibility
                </label>
                <select
                  value={privacySettings.profileVisibility}
                  onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="public">Public - Visible to everyone</option>
                  <option value="private">Private - Only visible to you</option>
                  <option value="organisations">Organisations Only - Visible to organizations</option>
                </select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Show Email Address</label>
                    <p className="text-xs text-gray-500">Allow others to see your email address</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacySettings.showEmail}
                      onChange={(e) => handlePrivacyChange('showEmail', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Show Phone Number</label>
                    <p className="text-xs text-gray-500">Allow others to see your phone number</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacySettings.showPhone}
                      onChange={(e) => handlePrivacyChange('showPhone', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Allow Data Sharing</label>
                    <p className="text-xs text-gray-500">Allow organizations to access your shared data</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacySettings.allowDataSharing}
                      onChange={(e) => handlePrivacyChange('allowDataSharing', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Job Recommendations</label>
                    <p className="text-xs text-gray-500">Receive personalized job recommendations</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacySettings.allowJobRecommendations}
                      onChange={(e) => handlePrivacyChange('allowJobRecommendations', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Organisation Access</label>
                    <p className="text-xs text-gray-500">Allow organizations to view your profile</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacySettings.allowOrganisationAccess}
                      onChange={(e) => handlePrivacyChange('allowOrganisationAccess', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 border-t">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <HiSave className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <form onSubmit={handlePasswordSubmit} className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>
              <div className="flex items-center justify-end pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <HiSave className="w-4 h-4 mr-2" />
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </ProfessionalLayout>
  );
}
