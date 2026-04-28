import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { api } from '@/services/api';
import { formatMoney } from '@/utils/formatMoney';
import toast from 'react-hot-toast';
import { HiArrowLeft, HiCurrencyDollar, HiCheckCircle, HiXCircle, HiClock, HiUser, HiDocumentText, HiCalendar } from 'react-icons/hi';

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationForm, setValidationForm] = useState({
    reason: '',
    proofOfPayment: '',
  });

  useEffect(() => {
    if (id) {
      fetchTransaction();
    }
  }, [id]);

  const fetchTransaction = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/v1/admin/transactions/${id}`);
      setTransaction(response.data.data);
    } catch (err: any) {
      console.error('Failed to fetch transaction:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch transaction');
      setTransaction(null);
    } finally {
      setLoading(false);
    }
  };

  const handleValidatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validationForm.reason.trim()) {
      toast.error('Please provide a reason for validation');
      return;
    }

    setValidating(true);
    try {
      await api.put(`/v1/admin/transactions/${id}/validate`, {
        reason: validationForm.reason,
        proofOfPayment: validationForm.proofOfPayment || undefined,
      });
      toast.success('Payment validated successfully!');
      setShowValidationModal(false);
      setValidationForm({ reason: '', proofOfPayment: '' });
      await fetchTransaction();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to validate payment');
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center text-gray-600 py-16">Loading transaction details...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!transaction) {
    return (
      <AdminLayout>
        <div className="p-6">
          <button
            onClick={() => navigate('/admin/transactions')}
            className="mb-6 flex items-center text-brand-600 hover:text-brand-700"
          >
            <HiArrowLeft className="w-5 h-5 mr-2" />
            Back to Transactions
          </button>
          <div className="text-center text-gray-600 py-16">Transaction not found</div>
        </div>
      </AdminLayout>
    );
  }

  const getStatusBadge = () => {
    if (transaction.status === 'success' || transaction.status === 'completed') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          <HiCheckCircle className="w-4 h-4 mr-1" />
          Success
        </span>
      );
    } else if (transaction.status === 'pending') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
          <HiClock className="w-4 h-4 mr-1" />
          Pending
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
          <HiXCircle className="w-4 h-4 mr-1" />
          Failed
        </span>
      );
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <button
          onClick={() => navigate('/admin/transactions')}
          className="mb-6 flex items-center text-brand-600 hover:text-brand-700"
        >
          <HiArrowLeft className="w-5 h-5 mr-2" />
          Back to Transactions
        </button>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mr-4">
                <HiCurrencyDollar className="w-8 h-8 text-brand-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Transaction {transaction.id}</h1>
                <p className="text-gray-600">{transaction.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge()}
              {transaction.status === 'pending' && (
                <button
                  onClick={() => setShowValidationModal(true)}
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors flex items-center"
                >
                  <HiCheckCircle className="w-4 h-4 mr-2" />
                  Validate Payment
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Transaction Details</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Transaction ID</label>
                  <p className="text-gray-900 font-mono text-sm">{transaction.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Amount</label>
                  <p className="text-gray-900 text-lg font-semibold">
                    {formatMoney(transaction.currency, transaction.amount)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <p className="text-gray-900 capitalize">{transaction.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Plan</label>
                  <p className="text-gray-900 capitalize">{transaction.plan || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Billing Cycle</label>
                  <p className="text-gray-900 capitalize">{transaction.billingCycle || 'N/A'}</p>
                </div>
                {transaction.paymentLink && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Link</label>
                    <a
                      href={transaction.paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:text-brand-700 text-sm break-all"
                    >
                      {transaction.paymentLink}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Information</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">{getStatusBadge()}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Entity</label>
                  <p className="text-gray-900">{transaction.entityName || 'N/A'}</p>
                  <p className="text-xs text-gray-500 capitalize">{transaction.entityType || 'N/A'}</p>
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

          {/* Validation Details */}
          {transaction.validation && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <HiCheckCircle className="w-5 h-5 mr-2 text-green-600" />
                Validation Details
              </h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Validated By</label>
                    <p className="text-gray-900 flex items-center mt-1">
                      <HiUser className="w-4 h-4 mr-1 text-gray-400" />
                      {transaction.validation.adminName || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Validated At</label>
                    <p className="text-gray-900 flex items-center mt-1">
                      <HiCalendar className="w-4 h-4 mr-1 text-gray-400" />
                      {new Date(transaction.validation.validatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Reason</label>
                    <p className="text-gray-900 mt-1">{transaction.validation.reason || 'N/A'}</p>
                  </div>
                  {transaction.validation.proofOfPayment && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-700">Proof of Payment</label>
                      <div className="mt-1 flex items-center">
                        <HiDocumentText className="w-4 h-4 mr-1 text-gray-400" />
                        <a
                          href={transaction.validation.proofOfPayment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:text-brand-700 text-sm break-all"
                        >
                          {transaction.validation.proofOfPayment}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Validation Modal */}
        {showValidationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Validate Payment</h2>
              <form onSubmit={handleValidatePayment}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={validationForm.reason}
                      onChange={(e) => setValidationForm({ ...validationForm, reason: e.target.value })}
                      placeholder="Enter the reason for validating this payment..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Proof of Payment (URL)
                    </label>
                    <input
                      type="url"
                      value={validationForm.proofOfPayment}
                      onChange={(e) => setValidationForm({ ...validationForm, proofOfPayment: e.target.value })}
                      placeholder="https://example.com/proof.pdf"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Optional: Link to proof of payment document</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowValidationModal(false);
                      setValidationForm({ reason: '', proofOfPayment: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={validating}
                    className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <HiCheckCircle className="w-4 h-4 mr-2" />
                    {validating ? 'Validating...' : 'Validate Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
