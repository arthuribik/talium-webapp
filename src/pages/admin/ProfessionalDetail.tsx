import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';
import { HiArrowLeft, HiUser, HiCheckCircle, HiXCircle } from 'react-icons/hi';

export default function ProfessionalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [professional, setProfessional] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProfessionalDetail();
    }
  }, [id]);

  const fetchProfessionalDetail = async () => {
    try {
      // Since we don't have a detail endpoint, we'll fetch from the list and filter
      const response = await api.get('/v1/admin/professionals?limit=1000');
      const prof = response.data.data.professionals.find((p: any) => p.id === id);
      if (prof) {
        setProfessional(prof);
      }
    } catch (err) {
      console.error('Failed to fetch professional:', err);
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

  if (!professional) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center text-gray-600">Professional not found</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
      <button
        onClick={() => navigate('/admin/professionals')}
        className="mb-6 flex items-center text-teal-600 hover:text-teal-700"
      >
        <HiArrowLeft className="w-5 h-5 mr-2" />
        Back to Professionals
      </button>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mr-4">
              <HiUser className="w-8 h-8 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {professional.user.firstName} {professional.user.lastName}
              </h1>
              <p className="text-gray-600">{professional.user.email}</p>
            </div>
          </div>
          <div>
            {professional.identityStatus === 'verified' ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <HiCheckCircle className="w-4 h-4 mr-1" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                <HiXCircle className="w-4 h-4 mr-1" />
                Pending Verification
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">First Name</label>
                <p className="text-gray-900">{professional.user.firstName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Name</label>
                <p className="text-gray-900">{professional.user.lastName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{professional.user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Profile Completeness</label>
                <div className="flex items-center mt-1">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-teal-500 h-2 rounded-full"
                      style={{ width: `${professional.profileCompleteness || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">{professional.profileCompleteness || 0}%</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Verification Status</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Identity Status</label>
                <p className="text-gray-900 capitalize">{professional.identityStatus || 'Not verified'}</p>
              </div>
              {professional.identityVerification && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Verification Type</label>
                    <p className="text-gray-900">Identity Verification</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Verification Status</label>
                    <p className="text-gray-900 capitalize">{professional.identityVerification.status}</p>
                  </div>
                </>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Member Since</label>
                <p className="text-gray-900">{new Date(professional.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}

