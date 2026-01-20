import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/authSlice';

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Taldium</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Welcome, {user?.firstName}!</h2>
            <p className="text-gray-600 mb-6">User Type: {user?.userType}</p>

            <div className="space-y-4">
              {user?.userType === 'PROFESSIONAL' && (
                <div>
                  <button
                    onClick={() => navigate('/professional/setup')}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 mr-4"
                  >
                    Complete Profile Setup
                  </button>
                  <button
                    onClick={() => navigate('/jobs')}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Browse Jobs
                  </button>
                </div>
              )}

              {user?.userType === 'ORGANISATION' && (
                <div>
                  <button
                    onClick={() => navigate('/organisation/setup')}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 mr-4"
                  >
                    Complete Organisation Setup
                  </button>
                  <button
                    onClick={() => navigate('/jobs/create')}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mr-4"
                  >
                    Post a Job
                  </button>
                  <button
                    onClick={() => navigate('/jobs')}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    View Jobs
                  </button>
                </div>
              )}

              {user?.userType === 'ADMIN' && (
                <div>
                  <button
                    onClick={() => navigate('/admin/dashboard')}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                  >
                    Go to Admin Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

