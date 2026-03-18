import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  HiShare,
  HiUsers,
  HiExternalLink,
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
  const addressObj = profile.address && typeof profile.address === 'object' ? profile.address : {};
  const locationsList = Array.isArray(profile.locations) ? profile.locations : [];
  const familyInfo = profile.familyInfo && typeof profile.familyInfo === 'object' ? profile.familyInfo : null;

  const VerificationCenterLink = ({ tab, children }: { tab?: string; children: React.ReactNode }) => (
    <Link
      to={tab ? `/professional/verification?tab=${tab}` : '/professional/verification'}
      className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
    >
      {children}
      <HiExternalLink className="w-4 h-4" />
    </Link>
  );

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

          {/* Personal Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <HiUser className="w-5 h-5 mr-2 text-brand-600" />
                Personal Information
              </h3>
              <VerificationCenterLink tab="personal">Manage in Verification Center</VerificationCenterLink>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-0.5">First name</span>
                <p className="text-gray-900">{profile.user?.firstName || '—'}</p>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-0.5">Last name</span>
                <p className="text-gray-900">{profile.user?.lastName || '—'}</p>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-0.5">Middle name</span>
                <p className="text-gray-900">{profile.middleName || '—'}</p>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-0.5">Email</span>
                <p className="text-gray-900">{profile.user?.email || '—'}</p>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-0.5">Phone</span>
                <p className="text-gray-900">{profile.user?.phoneNumber || '—'}</p>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-0.5">Date of birth</span>
                <p className="text-gray-900">
                  {profile.dateOfBirth
                    ? new Date(profile.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    : '—'}
                </p>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-0.5">Gender</span>
                <p className="text-gray-900">{profile.gender || '—'}</p>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-0.5">Nationality</span>
                <p className="text-gray-900">{profile.nationality || '—'}</p>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-0.5">Country</span>
                <p className="text-gray-900">{profile.country || '—'}</p>
              </div>
              <div className="md:col-span-2">
                <span className="block text-sm font-medium text-gray-500 mb-0.5">Address</span>
                <p className="text-gray-900">
                  {[addressObj.address, addressObj.city, addressObj.state].filter(Boolean).join(', ') || profile.address || '—'}
                </p>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-0.5">ID type</span>
                <p className="text-gray-900">{profile.idType ? profile.idType.replace(/_/g, ' ') : '—'}</p>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-0.5">ID number</span>
                <p className="text-gray-900">{profile.idNumber ? '••••••••' : '—'}</p>
              </div>
            </div>
          </div>

          {/* Location(s) */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <HiLocationMarker className="w-5 h-5 mr-2 text-brand-600" />
                Location
              </h3>
              <VerificationCenterLink tab="location">Manage in Verification Center</VerificationCenterLink>
            </div>
            {locationsList.length > 0 ? (
              <div className="space-y-3">
                {locationsList.map((loc: any, i: number) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-3 text-sm">
                    {[loc.country, loc.address, loc.city, loc.state].filter(Boolean).join(' · ') || '—'}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No location added. Manage in Verification Center.</p>
            )}
          </div>

          {/* Educational Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <HiAcademicCap className="w-5 h-5 mr-2 text-brand-600" />
                Educational Information
              </h3>
              <VerificationCenterLink tab="education">Manage in Verification Center</VerificationCenterLink>
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
              <p className="text-gray-500 text-sm">No educational information. Manage in Verification Center.</p>
            )}
          </div>

          {/* Social links */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <HiShare className="w-5 h-5 mr-2 text-brand-600" />
                Social links
              </h3>
              <VerificationCenterLink tab="social">Manage in Verification Center</VerificationCenterLink>
            </div>
            {profile.socialMedia && Object.values(profile.socialMedia).some((v) => v && String(v).trim()) ? (
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {Object.entries(profile.socialMedia).map(([key, value]) => {
                  const url = typeof value === 'string' ? value.trim() : '';
                  if (!url) return null;
                  const label = key.charAt(0).toUpperCase() + key.slice(1);
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
            ) : (
              <p className="text-gray-500 text-sm">No social links. Manage in Verification Center.</p>
            )}
          </div>

          {/* Work Experience */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <HiBriefcase className="w-5 h-5 mr-2 text-brand-600" />
                Work Experience
              </h3>
              <VerificationCenterLink tab="work">Manage in Verification Center</VerificationCenterLink>
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
              <p className="text-gray-500 text-sm">No work experience. Manage in Verification Center.</p>
            )}
          </div>

          {/* Certifications */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <HiBadgeCheck className="w-5 h-5 mr-2 text-brand-600" />
                Certifications
              </h3>
              <VerificationCenterLink tab="certification">Manage in Verification Center</VerificationCenterLink>
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
              <p className="text-gray-500 text-sm">No certifications. Manage in Verification Center.</p>
            )}
          </div>

          {/* Family & Relationship */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <HiUsers className="w-5 h-5 mr-2 text-brand-600" />
                Family & Relationship
              </h3>
              <VerificationCenterLink tab="family">Manage in Verification Center</VerificationCenterLink>
            </div>
            {familyInfo && (familyInfo.maritalStatus || familyInfo.spouseName || (familyInfo.relations && familyInfo.relations.length > 0)) ? (
              <div className="space-y-3">
                {familyInfo.maritalStatus && (
                  <div>
                    <span className="block text-sm font-medium text-gray-500 mb-0.5">Marital status</span>
                    <p className="text-gray-900">{familyInfo.maritalStatus}</p>
                  </div>
                )}
                {familyInfo.spouseName && (
                  <div>
                    <span className="block text-sm font-medium text-gray-500 mb-0.5">Spouse name</span>
                    <p className="text-gray-900">{familyInfo.spouseName}</p>
                  </div>
                )}
                {familyInfo.relations && familyInfo.relations.length > 0 && (
                  <div>
                    <span className="block text-sm font-medium text-gray-500 mb-1">Relations</span>
                    <ul className="space-y-1">
                      {familyInfo.relations.map((r: any, i: number) => (
                        <li key={i} className="text-gray-900">
                          {r.relationType && <span className="font-medium">{r.relationType}: </span>}
                          {r.fullName || '—'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No family information. Manage in Verification Center.</p>
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

