import { useState, useEffect } from 'react';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import { useAppSelector } from '@/store/hooks';
import { HiUser, HiMail, HiPhone, HiLocationMarker, HiCalendar, HiGlobe } from 'react-icons/hi';

export default function MyProfile() {
  const { user } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      // Fetch professional profile
      const response = await api.get('/v1/professional/profile');
      setProfile(response.data.data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
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

  return (
    <ProfessionalLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <HiUser className="w-6 h-6 mr-2 text-brand-600" />
            My Profile
          </h1>
          <p className="text-gray-600">View and manage your professional profile</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start space-x-6 mb-6">
              <div className="w-24 h-24 bg-brand-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {(profile.firstName || user?.firstName || 'P').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {profile.firstName || user?.firstName} {profile.lastName || user?.lastName}
                </h2>
                <p className="text-gray-600 mb-2">{profile.jobTitle || 'Professional'}</p>
                <div className="flex items-center text-sm text-gray-500">
                  <HiLocationMarker className="w-4 h-4 mr-1" />
                  {profile.country || 'Not specified'}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <div className="flex items-center mt-1 text-gray-900">
                  <HiMail className="w-4 h-4 mr-2 text-gray-400" />
                  {profile.email || user?.email}
                </div>
              </div>

              {profile.phoneNumber && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <div className="flex items-center mt-1 text-gray-900">
                    <HiPhone className="w-4 h-4 mr-2 text-gray-400" />
                    {profile.phoneNumber}
                  </div>
                </div>
              )}

              {profile.dateOfBirth && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                  <div className="flex items-center mt-1 text-gray-900">
                    <HiCalendar className="w-4 h-4 mr-2 text-gray-400" />
                    {new Date(profile.dateOfBirth).toLocaleDateString()}
                  </div>
                </div>
              )}

              {profile.nationality && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Nationality</label>
                  <div className="flex items-center mt-1 text-gray-900">
                    <HiGlobe className="w-4 h-4 mr-2 text-gray-400" />
                    {profile.nationality}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Stats</h3>
            <div className="space-y-4">
              <div>
                <div className="text-2xl font-bold text-brand-600">{profile.profileCompleteness || 0}%</div>
                <div className="text-sm text-gray-500">Profile Completeness</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {profile.identityVerified ? 'Verified' : 'Not Verified'}
                </div>
                <div className="text-sm text-gray-500">Identity Status</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProfessionalLayout>
  );
}

