import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '@/services/api';

export default function InviteAdmin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'admin',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/v1/admin/users/invite', formData);
      toast.success('Admin invitation sent successfully!');
      setSuccess(true);
      setTimeout(() => {
        navigate('/admin');
      }, 2000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to invite admin';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 text-center">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            Admin invitation sent successfully! Redirecting to admin dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-4">
          <button
            onClick={() => navigate('/admin')}
            className="text-indigo-600 hover:text-indigo-500"
          >
            ← Back to Dashboard
          </button>
        </div>
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-2xl font-bold mb-6">Invite New Admin</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select
                name="role"
                required
                value={formData.role}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="admin">Operations</option>
                <option value="support">Support Agent</option>
                <option value="auditor">Finance</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Note: Only super admins can invite other admins. Super admin role cannot be assigned via invitation.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Sending Invitation...' : 'Send Invitation'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

