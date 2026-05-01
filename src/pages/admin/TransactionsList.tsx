import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';
import { formatMoney } from '@/utils/formatMoney';
import {
  HiSearch,
  HiFilter,
  HiChevronLeft,
  HiChevronRight,
  HiCurrencyDollar,
  HiCheckCircle,
  HiXCircle,
} from 'react-icons/hi';

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  description: string;
  createdAt: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  plan?: string;
  billingCycle?: string;
  user?: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All Status' },
  { value: 'success', label: 'Success' },
  { value: 'pending', label: 'Pending' },
  { value: 'declined', label: 'Declined' },
  { value: 'failed', label: 'Failed' },
];

const TYPE_FILTERS = [
  { value: 'all', label: 'All Types' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'wallet_topup', label: 'Wallet Top-up' },
  { value: 'credit', label: 'Credit' },
  { value: 'debit', label: 'Debit' },
  { value: 'addon', label: 'Add-on' },
];

function formatTransactionType(type: string): string {
  const match = TYPE_FILTERS.find((option) => option.value === type);
  return match ? match.label : type.replace(/_/g, ' ');
}

export default function TransactionsList() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchTransactions();
  }, [page, statusFilter, typeFilter]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }
      const response = await api.get('/v1/admin/transactions', { params });
      setTransactions(response.data.data.transactions || []);
      setTotalPages(response.data.data.pagination?.totalPages || 1);
      setTotal(response.data.data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setTransactions([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering for search only (status is handled by API)
  const filteredTransactions = transactions.filter((trans) => {
    const matchesSearch =
      (trans.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      trans.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (trans.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (trans.entityName?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

    return matchesSearch;
  });

  const handleRowClick = (transactionId: string) => {
    navigate(`/admin/transactions/${transactionId}`);
  };

  return (
    <AdminLayout>
      <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Transactions</h1>
        <p className="text-gray-600">View all attempted billing and subscription transactions</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by transaction ID, description, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
            <HiFilter className="text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1); // Reset to first page when filter changes
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            </div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {TYPE_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table or Empty State */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <HiCurrencyDollar className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Transactions Yet</h3>
            <p className="text-sm text-gray-500 text-center max-w-md mb-6">
              There are no billing or subscription transactions recorded on the platform. Transactions will appear here once users initiate payments or subscriptions.
            </p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <HiSearch className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Found</h3>
            <p className="text-sm text-gray-500 text-center max-w-md mb-6">
              No transactions match your search criteria. Try adjusting your filters or search terms.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTypeFilter('all');
              }}
              className="text-brand-600 hover:text-brand-700 text-sm font-medium"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((trans) => (
                      <tr
                        key={trans.id}
                        onClick={() => handleRowClick(trans.id)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center mr-3">
                              <HiCurrencyDollar className="w-5 h-5 text-brand-600" />
                            </div>
                            <div className="text-sm font-medium text-gray-900">{trans.id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatMoney(
                              trans.currency === 'USD' && (trans as any).amountNgn ? 'NGN' : trans.currency,
                              trans.currency === 'USD' && (trans as any).amountNgn
                                ? (trans as any).amountNgn
                                : trans.amount,
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 capitalize">{formatTransactionType(trans.type)}</div>
                          {trans.plan && (
                            <div className="text-xs text-gray-400 mt-1">
                              {trans.plan} plan {trans.billingCycle ? `(${trans.billingCycle})` : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{trans.entityName || 'N/A'}</div>
                          <div className="text-xs text-gray-500 capitalize">{trans.entityType || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {trans.status === 'success' || trans.status === 'completed' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <HiCheckCircle className="w-4 h-4 mr-1" />
                              Success
                            </span>
                          ) : trans.status === 'pending' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          ) : trans.status === 'declined' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <HiXCircle className="w-4 h-4 mr-1" />
                              Declined
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <HiXCircle className="w-4 h-4 mr-1" />
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{trans.user?.email || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(trans.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredTransactions.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                <span className="font-medium">{Math.min(page * limit, total)}</span> of{' '}
                <span className="font-medium">{total}</span> results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <HiChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <HiChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
            )}
          </>
        )}
      </div>
      </div>
    </AdminLayout>
  );
}

