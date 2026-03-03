import { useState, useEffect } from 'react';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import { 
  HiUser, 
  HiPencil, 
  HiSave, 
  HiLocationMarker, 
  HiAcademicCap, 
  HiBriefcase,
  HiBadgeCheck,
  HiCalendar,
} from 'react-icons/hi';
export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);
  const [formData, setFormData] = useState({
    profession: '',
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

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      // Fetch profile data (80% comes from verification module)
      const response = await api.get('/v1/professional/profile');
      const data = response.data.data;
      setProfile(data);
      
      // Populate form with data from verification module
      setFormData({
        profession: data.profession || '',
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

  const handleSaveAbout = async () => {
    setSavingAbout(true);
    try {
      await api.put('/v1/professional/profile', {
        profession: formData.profession,
        description: formData.description,
      });
      toast.success('About updated');
      setEditingAbout(false);
      await fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update summary');
    } finally {
      setSavingAbout(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Update profile - this should NOT cause logout
      await api.put('/v1/professional/profile', formData);
      toast.success('Profile updated successfully!');
      setEditing(false);
      await fetchProfile(); // Refresh to get updated data
    } catch (err: any) {
      console.error('Profile update error:', err);
      // Check if it's a 401 (unauthorized) - this might cause logout
      if (err.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to update profile');
      }
    } finally {
      setSaving(false);
    }
  };

  const getLocationDisplay = () => {
    if (profile?.workExperience && profile.workExperience.length > 0) {
      const latestExp = profile.workExperience[profile.workExperience.length - 1];
      const location = latestExp.location;
      if (location) {
        if (typeof location === 'object') {
          const parts = [];
          if (location.city) parts.push(location.city);
          if (location.country) parts.push(location.country);
          return parts.length > 0 ? parts.join(', ') : null;
        }
        return location;
      }
    }
    return profile?.country || null;
  };

  if (loading) {
    return (
      <ProfessionalLayout>
        <div className="p-6">
          <div className="text-center text-gray-600 py-16">Loading profile...</div>
        </div>
      </ProfessionalLayout>
    );
  }

  if (!profile) {
    return (
      <ProfessionalLayout>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-xl shadow-sm">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <HiUser className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Not Found</h3>
            <p className="text-sm text-gray-500 text-center max-w-md">
              Unable to load your profile. Please try again later.
            </p>
          </div>
        </div>
      </ProfessionalLayout>
    );
  }

  const fullName = `${profile.user?.firstName || ''} ${profile.user?.lastName || ''}`.trim();
  const location = getLocationDisplay();

  return (
    <ProfessionalLayout>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
              <HiUser className="w-6 h-6 mr-2 text-brand-600" />
              My Profile
            </h1>
            <p className="text-gray-600">
              Your profile information (80% from Verification Center)
            </p>
          </div>
          {/* {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
            >
              <HiPencil className="w-4 h-4" />
              Edit Profile
            </button>
          )} */}
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Profile Header Card */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 bg-brand-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-3xl">
                  {fullName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{fullName}</h2>
                <p className="text-gray-600 mb-4">
                  {profile.workExperience?.[0]?.role || 'Professional'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* {profile.user?.id && (
                    <div className="flex items-center text-gray-600">
                      <HiUser className="w-5 h-5 mr-2 text-gray-400" />
                      <span className="text-sm">
                        <span className="font-medium">User ID:</span> {profile.user.id}
                      </span>
                    </div>
                  )} */}
                  {profile.user?.createdAt && (
                    <div className="flex items-center text-gray-600">
                      <HiCalendar className="w-5 h-5 mr-2 text-gray-400" />
                      <span className="text-sm">
                        <span className="font-medium">Date Joined:</span>{' '}
                        {new Date(profile.user.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {location && (
                    <div className="flex items-center text-gray-600">
                      <HiLocationMarker className="w-5 h-5 mr-2 text-gray-400" />
                      <span>{location}</span>
                    </div>
                  )}
                  {/* {profile.nationality && (
                    <div className="flex items-center text-gray-600">
                      <HiGlobe className="w-5 h-5 mr-2 text-gray-400" />
                      <span>Nationality: {profile.nationality}</span>
                    </div>
                  )} */}
                </div>
                {(profile.socialMedia && Object.keys(profile.socialMedia).length > 0) && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-gray-100">
                    {Object.entries(profile.socialMedia).map(([key, value]) => {
                      const url = typeof value === 'string' ? value.trim() : '';
                      if (!url) return null;
                      const label = key === 'github' ? 'GitHub' : key.charAt(0).toUpperCase() + key.slice(1);
                      return (
                        <a
                          key={key}
                          href={url.startsWith('http') ? url : `https://${url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-brand-600 hover:text-brand-700 hover:underline"
                        >
                          {label}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* About Section - Professional summary (bio) */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">About</h3>
              {!editingAbout ? (
                <button
                  type="button"
                  onClick={() => setEditingAbout(true)}
                  className="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                  aria-label="Edit professional summary"
                >
                  <HiPencil className="w-5 h-5" />
                </button>
              ) : null}
            </div>
            {editingAbout ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profession</label>
                  <input
                    type="text"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    placeholder="e.g. Senior Software Engineer"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Professional summary</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={6}
                    placeholder="Tell us about yourself..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((f) => ({
                      ...f,
                      profession: profile?.profession ?? '',
                      description: profile?.description ?? '',
                    }));
                      setEditingAbout(false);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAbout}
                    disabled={savingAbout}
                    className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    <HiSave className="w-4 h-4" />
                    {savingAbout ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {profile.profession && (
                  <p className="text-gray-600 font-medium">{profile.profession}</p>
                )}
                <p className="text-gray-700 whitespace-pre-line">
                  {profile.description || 'No description provided.'}
                </p>
              </div>
            )}
          </div>

          {/* Personal Information Section */}
          {/* <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name (from Verification)
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                  {fullName || 'Not set'}
                </div>
                <p className="text-xs text-gray-500 mt-1">Update in Verification Center</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                  {profile.user?.email || 'Not set'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nationality (from Verification)
                </label>
                {editing ? (
                  <SearchableList
                    value={formData.nationality}
                    onChange={(nationality) => setFormData({ ...formData, nationality })}
                    options={[{ value: '', label: 'Select Nationality' }, ...COUNTRIES.map((c) => ({ value: c, label: c }))]}
                    placeholder="Select Nationality"
                    className="focus:ring-2 focus:ring-brand-500"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                    {profile.nationality || 'Not set'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Location - Country (from Verification)
                </label>
                {editing ? (
                  <SearchableList
                    value={formData.country}
                    onChange={(country) => setFormData({ ...formData, country })}
                    options={[{ value: '', label: 'Select Country' }, ...COUNTRIES.map((c) => ({ value: c, label: c }))]}
                    placeholder="Select Country"
                    className="focus:ring-2 focus:ring-brand-500"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                    {profile.country || 'Not set'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth (from Verification)
                </label>
                {editing ? (
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                    {profile.dateOfBirth 
                      ? new Date(profile.dateOfBirth).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })
                      : 'Not set'}
                  </div>
                )}
              </div>
            </div>
          </div> */}

          {/* Educational Information (from Verification) */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <HiAcademicCap className="w-5 h-5 mr-2 text-brand-600" />
                Educational Information (from Verification)
              </h3>
              <button
                type="button"
                onClick={() => window.location.href = '/professional/verification'}
                className="text-sm text-brand-600 hover:text-brand-700"
              >
                Manage in Verification Center
              </button>
            </div>
            {profile.education && profile.education.length > 0 ? (
              <div className="space-y-4">
                {profile.education.map((edu: any) => (
                  <div key={edu.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{edu.institutionName}</h4>
                        <p className="text-sm text-gray-600">
                          {edu.levelOfEducation && `${edu.levelOfEducation} in `}
                          {edu.fieldOfStudy}
                          {edu.degreeType && ` - ${edu.degreeType}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(edu.startDate).getFullYear()} - {edu.endDate ? new Date(edu.endDate).getFullYear() : 'Present'}
                          {edu.country && ` • ${edu.country}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No educational information. Add in Verification Center.</p>
            )}
          </div>

          {/* Work Experience (from Verification) */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <HiBriefcase className="w-5 h-5 mr-2 text-brand-600" />
                Work Experience (from Verification)
              </h3>
              <button
                type="button"
                onClick={() => window.location.href = '/professional/verification'}
                className="text-sm text-brand-600 hover:text-brand-700"
              >
                Manage in Verification Center
              </button>
            </div>
            {profile.workExperience && profile.workExperience.length > 0 ? (
              <div className="space-y-4">
                {profile.workExperience.map((exp: any) => (
                  <div key={exp.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{exp.role}</h4>
                        <p className="text-sm text-gray-600">{exp.organisationName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - {exp.endDate ? new Date(exp.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Present'}
                          {exp.location && typeof exp.location === 'object' && (
                            <span> • {exp.location.city || ''} {exp.location.country || ''}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No work experience. Add in Verification Center.</p>
            )}
          </div>

          {/* Certifications (from Verification) */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <HiBadgeCheck className="w-5 h-5 mr-2 text-brand-600" />
                Certifications (from Verification)
              </h3>
              <button
                type="button"
                onClick={() => window.location.href = '/professional/verification?tab=certification'}
                className="text-sm text-brand-600 hover:text-brand-700"
              >
                Manage in Verification Center
              </button>
            </div>
            {profile.certifications && profile.certifications.length > 0 ? (
              <div className="space-y-4">
                {profile.certifications.map((cert: any) => (
                  <div key={cert.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{cert.name}</h4>
                        {cert.issuedBy && (
                          <p className="text-sm text-gray-600">{cert.issuedBy}</p>
                        )}
                        {(cert.issuedDate || cert.credentialId) && (
                          <p className="text-xs text-gray-500 mt-1">
                            {cert.issuedDate && new Date(cert.issuedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            {cert.credentialId && (cert.issuedDate ? ` • ${cert.credentialId}` : cert.credentialId)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No certifications. Add in Verification Center.</p>
            )}
          </div>

          {/* Action Buttons */}
          {editing && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  fetchProfile(); // Reset form
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <HiSave className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>
    </ProfessionalLayout>
  );
}

