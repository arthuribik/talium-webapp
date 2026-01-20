import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { HiArrowLeft, HiCurrencyDollar, HiCheckCircle, HiXCircle } from 'react-icons/hi';

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      // Mock data for now - replace with actual API call when endpoint is available
      setTimeout(() => {
        setTransaction({
          id,
          amount: 5000,
          currency: 'USD',
          status: 'completed',
          type: 'payment',
          description: 'Subscription payment',
          createdAt: new Date().toISOString(),
          user: {
            email: 'user@example.com',
          },
        });
        setLoading(false);
      }, 500);
    }
  }, [id]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center text-gray-600">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!transaction) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center text-gray-600">Transaction not found</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
      <button
        onClick={() => navigate('/admin/transactions')}
        className="mb-6 flex items-center text-teal-600 hover:text-teal-700"
      >
        <HiArrowLeft className="w-5 h-5 mr-2" />
        Back to Transactions
      </button>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mr-4">
              <HiCurrencyDollar className="w-8 h-8 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Transaction {transaction.id}</h1>
              <p className="text-gray-600">{transaction.description}</p>
            </div>
          </div>
          <div>
            {transaction.status === 'completed' ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <HiCheckCircle className="w-4 h-4 mr-1" />
                Completed
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                <HiXCircle className="w-4 h-4 mr-1" />
                {transaction.status}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Transaction Details</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Transaction ID</label>
                <p className="text-gray-900">{transaction.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Amount</label>
                <p className="text-gray-900 text-lg font-semibold">
                  {transaction.currency} {transaction.amount.toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Type</label>
                <p className="text-gray-900 capitalize">{transaction.type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-gray-900">{transaction.description}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Information</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <p className="text-gray-900 capitalize">{transaction.status}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">User Email</label>
                <p className="text-gray-900">{transaction.user?.email || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Date</label>
                <p className="text-gray-900">{new Date(transaction.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}

