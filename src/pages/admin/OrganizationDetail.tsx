import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';
import { HiArrowLeft, HiOfficeBuilding, HiCheckCircle, HiClock } from 'react-icons/hi';

export default function OrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchOrganizationDetail();
    }
  }, [id]);

  const fetchOrganizationDetail = async () => {
    try {
      const response = await api.get('/v1/admin/organisations?limit=1000');
      const org = response.data.data.organisations.find((o: any) => o.id === id);
      if (org) {
        setOrganization(org);
      }
    } catch (err) {
      console.error('Failed to fetch organization:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center text-gray-600">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!organization) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center text-gray-600">Organization not found</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
      <button
        onClick={() => navigate('/admin/organizations')}
        className="mb-6 flex items-center text-teal-600 hover:text-teal-700"
      >
        <HiArrowLeft className="w-5 h-5 mr-2" />
        Back to Organizations
      </button>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mr-4">
              <HiOfficeBuilding className="w-8 h-8 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{organization.companyName}</h1>
              <p className="text-gray-600">{organization.user.email}</p>
            </div>
          </div>
          <div>
            {organization.verificationStatus === 'verified' ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <HiCheckCircle className="w-4 h-4 mr-1" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                <HiClock className="w-4 h-4 mr-1" />
                Pending Verification
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Company Name</label>
                <p className="text-gray-900">{organization.companyName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Country</label>
                <p className="text-gray-900">{organization.country}</p>
              </div>
              {organization.industry && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Industry</label>
                  <p className="text-gray-900">{organization.industry}</p>
                </div>
              )}
              {organization.companySize && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Company Size</label>
                  <p className="text-gray-900">{organization.companySize}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Contact Email</label>
                <p className="text-gray-900">{organization.user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Contact Name</label>
                <p className="text-gray-900">
                  {organization.user.firstName} {organization.user.lastName}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Verification Status</label>
                <p className="text-gray-900 capitalize">{organization.verificationStatus}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Member Since</label>
                <p className="text-gray-900">{new Date(organization.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}

