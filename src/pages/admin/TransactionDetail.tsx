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
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [validationForm, setValidationForm] = useState({
    reason: '',
    proofOfPayment: '',
  });
  const [declineReason, setDeclineReason] = useState('');

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

  const handleDeclinePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!declineReason.trim()) {
      toast.error('Please provide a reason for declining this payment');
      return;
    }

    setValidating(true);
    try {
      await api.put(`/v1/admin/transactions/${id}/decline`, {
        reason: declineReason,
      });
      toast.success('Payment declined successfully.');
      setShowDeclineModal(false);
      setDeclineReason('');
      await fetchTransaction();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to decline payment');
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
    } else if (transaction.status === 'declined') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
          <HiXCircle className="w-4 h-4 mr-1" />
          Declined
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

  const isApproved = transaction.status === 'success' || transaction.status === 'completed';
  const isPending = transaction.status === 'pending';
  const isDeclined = transaction.status === 'declined' || transaction.validation?.outcome === 'declined';
  const hasApprovalDetails = isApproved && transaction.validation && transaction.validation.outcome !== 'declined';
  const hasDeclineDetails = isDeclined && transaction.validation;
  const amountCurrency = transaction.currency === 'USD' && transaction.amountNgn ? 'NGN' : transaction.currency;
  const amountValue =
    transaction.currency === 'USD' && transaction.amountNgn ? transaction.amountNgn : transaction.amount;

  const formatDate = (value?: string) => (value ? new Date(value).toLocaleString() : 'N/A');
  const formatType = (value?: string) => (value ? value.replace(/_/g, ' ') : 'N/A');

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <button
            onClick={() => navigate('/admin/transactions')}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-brand-200 hover:text-brand-700"
          >
            <HiArrowLeft className="mr-2 h-4 w-4" />
            Back to Transactions
          </button>

          <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-brand-50 via-white to-slate-50 p-6 sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm">
                    <HiCurrencyDollar className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="mb-3">{getStatusBadge()}</div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                      Payment Review
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-600">{transaction.description}</p>
                    <p className="mt-3 break-all font-mono text-xs text-slate-500">{transaction.id}</p>
                  </div>
                </div>

                {isPending && (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => setShowDeclineModal(true)}
                      className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                    >
                      <HiXCircle className="mr-2 h-4 w-4" />
                      Decline
                    </button>
                    <button
                      onClick={() => setShowValidationModal(true)}
                      className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                    >
                      <HiCheckCircle className="mr-2 h-4 w-4" />
                      Mark Successful
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount Paid</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {formatMoney(amountCurrency, amountValue)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type</p>
                  <p className="mt-2 text-lg font-semibold capitalize text-slate-950">
                    {formatType(transaction.type)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{formatDate(transaction.createdAt)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Organisation</p>
                  <p className="mt-2 truncate text-sm font-semibold text-slate-950">
                    {transaction.entityName || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Transaction Information</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Transaction ID</p>
                  <p className="mt-2 break-all font-mono text-sm text-slate-900">{transaction.id}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
                  <div className="mt-2">{getStatusBadge()}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Plan</p>
                  <p className="mt-2 text-sm font-semibold capitalize text-slate-900">
                    {transaction.plan || 'N/A'}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Billing Cycle</p>
                  <p className="mt-2 text-sm font-semibold capitalize text-slate-900">
                    {transaction.billingCycle || 'N/A'}
                  </p>
                </div>
                {transaction.paymentLink && (
                  <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Payment Link</p>
                    <a
                      href={transaction.paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block break-all text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      {transaction.paymentLink}
                    </a>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Customer Details</h2>
              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                  <HiUser className="mt-0.5 h-5 w-5 text-brand-500" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Account</p>
                    <p className="mt-1 font-semibold text-slate-950">{transaction.entityName || 'N/A'}</p>
                    <p className="text-sm capitalize text-slate-500">{transaction.entityType || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                  <HiDocumentText className="mt-0.5 h-5 w-5 text-brand-500" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</p>
                    <p className="mt-1 break-all font-medium text-slate-900">
                      {transaction.user?.email || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                  <HiCalendar className="mt-0.5 h-5 w-5 text-brand-500" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Created At</p>
                    <p className="mt-1 font-medium text-slate-900">{formatDate(transaction.createdAt)}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {hasApprovalDetails && (
            <section className="rounded-3xl border border-green-200 bg-green-50 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white">
                  <HiCheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-green-950">Validation Details</h2>
                  <p className="text-sm text-green-700">This payment has been approved by an admin.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-green-700">Validated By</p>
                  <p className="mt-2 font-semibold text-slate-950">
                    {transaction.validation.adminName || 'Admin'}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-green-700">Validated At</p>
                  <p className="mt-2 font-semibold text-slate-950">
                    {formatDate(transaction.validation.validatedAt)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4 md:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-green-700">Reason</p>
                  <p className="mt-2 text-slate-900">{transaction.validation.reason || 'N/A'}</p>
                </div>
                {transaction.validation.proofOfPayment && (
                  <div className="rounded-2xl bg-white p-4 md:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-green-700">Proof of Payment</p>
                    <a
                      href={transaction.validation.proofOfPayment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block break-all text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      {transaction.validation.proofOfPayment}
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {hasDeclineDetails && (
            <section className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white">
                  <HiXCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-red-950">Decline Details</h2>
                  <p className="text-sm text-red-700">This payment was declined by an admin.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-red-700">Declined By</p>
                  <p className="mt-2 font-semibold text-slate-950">
                    {transaction.validation.adminName || 'Admin'}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-red-700">Declined At</p>
                  <p className="mt-2 font-semibold text-slate-950">
                    {formatDate(transaction.validation.validatedAt)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4 md:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-red-700">Reason</p>
                  <p className="mt-2 text-slate-900">{transaction.validation.reason || 'N/A'}</p>
                </div>
              </div>
            </section>
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

        {showDeclineModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Decline Payment</h2>
              <form onSubmit={handleDeclinePayment}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Enter the reason for declining this payment..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeclineModal(false);
                      setDeclineReason('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={validating}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <HiXCircle className="w-4 h-4 mr-2" />
                    {validating ? 'Declining...' : 'Decline Payment'}
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
