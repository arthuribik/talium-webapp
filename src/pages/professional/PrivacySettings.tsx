import { useState, useEffect } from 'react';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import { HiLockClosed, HiSave } from 'react-icons/hi';
import { SearchableList } from '@/components/common/SearchableList';

export default function PrivacySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    profileVisibility: 'public',
    showEmail: true,
    showPhone: false,
    allowDataSharing: true,
    allowJobRecommendations: true,
    allowOrganisationAccess: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v1/professional/privacy-settings');
      if (response.data.data) {
        setSettings(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch privacy settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/v1/professional/privacy-settings', settings);
      toast.success('Privacy settings updated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update privacy settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setSettings({ ...settings, [field]: value });
  };

  if (loading) {
    return (
      <ProfessionalLayout>
        <div className="p-6">
          <div className="text-center text-gray-600 py-16">Loading privacy settings...</div>
        </div>
      </ProfessionalLayout>
    );
  }

  return (
    <ProfessionalLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <HiLockClosed className="w-6 h-6 mr-2 text-brand-600" />
            Privacy Settings
          </h1>
          <p className="text-gray-600">Manage your privacy preferences and data sharing settings</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6">
          <div className="space-y-6">
            {/* Profile Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Visibility
              </label>
              <SearchableList
                value={settings.profileVisibility}
                onChange={(v) => handleChange('profileVisibility', v)}
                options={[
                  { value: 'public', label: 'Public - Visible to everyone' },
                  { value: 'private', label: 'Private - Only visible to you' },
                  { value: 'organisations', label: 'Organisations Only - Visible to organizations' },
                ]}
                placeholder="Select visibility"
                className="focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Toggle Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Show Email Address</label>
                  <p className="text-xs text-gray-500">Allow others to see your email address</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showEmail}
                    onChange={(e) => handleChange('showEmail', e.target.checked)}
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
                    checked={settings.showPhone}
                    onChange={(e) => handleChange('showPhone', e.target.checked)}
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
                    checked={settings.allowDataSharing}
                    onChange={(e) => handleChange('allowDataSharing', e.target.checked)}
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
                    checked={settings.allowJobRecommendations}
                    onChange={(e) => handleChange('allowJobRecommendations', e.target.checked)}
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
                    checked={settings.allowOrganisationAccess}
                    onChange={(e) => handleChange('allowOrganisationAccess', e.target.checked)}
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
      </div>
    </ProfessionalLayout>
  );
}

