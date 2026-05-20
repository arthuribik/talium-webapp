import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';
import { formatMoney } from '@/utils/formatMoney';
import {
  HiSearch,
  HiChevronLeft,
  HiChevronRight,
  HiCurrencyDollar,
} from 'react-icons/hi';

type EntityTab = 'organisation' | 'professional';

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
  reference?: string;
  user?: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All status' },
  { value: 'success', label: 'Successful' },
  { value: 'pending', label: 'Pending' },
  { value: 'declined', label: 'Declined' },
  { value: 'failed', label: 'Failed' },
] as const;

const TYPE_FILTERS = [
  { value: 'all', label: 'All types' },
  { value: 'subscription', label: 'Plan subscription' },
  { value: 'wallet_topup', label: 'Wallet funding' },
  { value: 'credit', label: 'Credit' },
  { value: 'debit', label: 'Debit' },
  { value: 'addon', label: 'Add-on' },
] as const;

function formatTransactionType(type: string): string {
  const match = TYPE_FILTERS.find((option) => option.value === type);
  return match ? match.label : type.replace(/_/g, ' ');
}

function activityLabel(trans: Transaction): string {
  if (trans.type === 'wallet_topup') return 'Wallet funding';
  if (trans.type === 'addon') return 'Add-on';
  if (trans.type === 'subscription') return 'Plan subscription';
  if (trans.type === 'credit') return 'Credit';
  if (trans.type === 'debit') return 'Debit';
  return formatTransactionType(trans.type);
}

function ledgerDirection(type: string): 'credit' | 'debit' {
  if (type === 'wallet_topup' || type === 'credit') return 'credit';
  return 'debit';
}

function formatTxnDisplayId(id: string): string {
  const alnum = id.replace(/[^a-zA-Z0-9]/g, '');
  const tail = (alnum.slice(-6) || id.slice(-6) || '000000').toUpperCase();
  return `TXN-${tail}`;
}

function formatListDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function statusPresentation(status: string): { label: string; tone: 'ok' | 'bad' | 'pending' } {
  const s = status.toLowerCase();
  if (s === 'success' || s === 'completed') return { label: 'Successful', tone: 'ok' };
  if (s === 'pending') return { label: 'Pending', tone: 'pending' };
  if (s === 'declined') return { label: 'Declined', tone: 'bad' };
  return { label: 'Failed', tone: 'bad' };
}

function TableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="animate-pulse border-b border-gray-50">
          <td className="px-5 py-4">
            <div className="h-4 w-24 rounded bg-gray-200" />
          </td>
          <td className="px-5 py-4">
            <div className="h-4 w-36 rounded bg-gray-100" />
          </td>
          <td className="px-5 py-4">
            <div className="h-4 w-32 rounded bg-gray-100" />
          </td>
          <td className="px-5 py-4">
            <div className="h-4 w-20 rounded bg-gray-100" />
          </td>
          <td className="px-5 py-4">
            <div className="h-6 w-24 rounded-full bg-gray-100" />
          </td>
          <td className="px-5 py-4">
            <div className="h-6 w-16 rounded-full bg-gray-100" />
          </td>
          <td className="px-5 py-4">
            <div className="h-4 w-24 rounded bg-gray-100" />
          </td>
          <td className="px-5 py-4">
            <div className="h-8 w-14 rounded-lg bg-gray-100" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function TransactionsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabFromUrl = (searchParams.get('tab') || 'organisation') as EntityTab;
  const entityTab: EntityTab =
    tabFromUrl === 'professional' ? 'professional' : 'organisation';

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        limit,
        entityType: entityTab,
      };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;
      if (debouncedSearch) params.search = debouncedSearch;

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
  }, [page, statusFilter, typeFilter, entityTab, debouncedSearch]);

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  const setEntityTab = (tab: EntityTab) => {
    setPage(1);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { replace: true },
    );
  };

  const handleRowNavigate = (transactionId: string) => {
    navigate(`/admin/transactions/${transactionId}`);
  };

  const clearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setPage(1);
  };

  const counterpartyLabel = entityTab === 'organisation' ? 'Organisation' : 'Professional';

  return (
    <AdminLayout>
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-brand-50/40 via-gray-50/80 to-gray-100/90 pb-10">
        <div className="mx-auto max-w-[1600px] px-4 pt-8 sm:px-6 lg:px-8">
          <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                Finance
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">Transactions</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600">
                Monitor organisation and professional payments, wallet movements, and subscription
                activity in one place.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-gray-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
              <HiCurrencyDollar className="h-8 w-8 text-brand-500" aria-hidden />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total records</p>
                <p className="text-lg font-semibold tabular-nums text-gray-900">{loading ? '—' : total}</p>
              </div>
            </div>
          </header>

          <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm ring-1 ring-black/[0.02]">
            <div className="border-b border-gray-100 bg-white px-4 pt-4 sm:px-6">
              <nav className="flex gap-8" aria-label="Transaction categories">
                <button
                  type="button"
                  onClick={() => setEntityTab('organisation')}
                  className={`relative pb-3 text-sm font-semibold transition-colors ${
                    entityTab === 'organisation'
                      ? 'text-brand-600'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Organisation transactions
                  {entityTab === 'organisation' && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-500" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEntityTab('professional')}
                  className={`relative pb-3 text-sm font-semibold transition-colors ${
                    entityTab === 'professional'
                      ? 'text-brand-600'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Professional transactions
                  {entityTab === 'professional' && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-500" />
                  )}
                </button>
              </nav>
            </div>

            <div className="border-b border-gray-100 bg-gray-50/50 px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative min-w-0 flex-1">
                  <HiSearch
                    className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                    aria-hidden
                  />
                  <input
                    type="search"
                    placeholder="Search transactions…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <select
                      value={typeFilter}
                      onChange={(e) => {
                        setTypeFilter(e.target.value);
                        setPage(1);
                      }}
                      className="appearance-none cursor-pointer rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-gray-800 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    >
                      {TYPE_FILTERS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                      ▾
                    </span>
                  </div>
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                      }}
                      className="appearance-none cursor-pointer rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-gray-800 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    >
                      {STATUS_FILTERS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                      ▾
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {!loading && transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                  <HiCurrencyDollar className="h-9 w-9" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No transactions yet</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-500">
                  {entityTab === 'professional'
                    ? 'Professional billing activity will appear here when payments are recorded for individuals on the platform.'
                    : 'No organisation billing records match your filters. Adjust search or filters, or check back after customers complete payments.'}
                </p>
                {(searchInput || statusFilter !== 'all' || typeFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-6 text-sm font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-brand-100/80 bg-brand-50/90">
                        <th className="whitespace-nowrap px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-brand-900/80">
                          Transaction ID
                        </th>
                        <th className="whitespace-nowrap px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-brand-900/80">
                          Activity type
                        </th>
                        <th className="whitespace-nowrap px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-brand-900/80">
                          {counterpartyLabel}
                        </th>
                        <th className="whitespace-nowrap px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-brand-900/80">
                          Amount
                        </th>
                        <th className="whitespace-nowrap px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-brand-900/80">
                          Status
                        </th>
                        <th className="whitespace-nowrap px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-brand-900/80">
                          Type
                        </th>
                        <th className="whitespace-nowrap px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-brand-900/80">
                          Date
                        </th>
                        <th className="whitespace-nowrap px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-brand-900/80">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loading ? (
                        <TableSkeletonRows />
                      ) : (
                        transactions.map((trans) => {
                          const dir = ledgerDirection(trans.type);
                          const status = statusPresentation(trans.status);
                          const amountDisplay =
                            formatMoney(
                              trans.currency === 'USD' && (trans as { amountNgn?: number }).amountNgn
                                ? 'NGN'
                                : trans.currency,
                              trans.currency === 'USD' && (trans as { amountNgn?: number }).amountNgn
                                ? (trans as { amountNgn?: number }).amountNgn!
                                : trans.amount,
                            ) ?? '—';
                          return (
                            <tr
                              key={trans.id}
                              onClick={() => handleRowNavigate(trans.id)}
                              className="group cursor-pointer bg-white transition-colors hover:bg-brand-50/30"
                            >
                              <td className="whitespace-nowrap px-5 py-4">
                                <span
                                  className="font-mono text-sm font-medium text-gray-900"
                                  title={trans.id}
                                >
                                  {formatTxnDisplayId(trans.id)}
                                </span>
                              </td>
                              <td className="max-w-[220px] px-5 py-4">
                                <span className="text-sm font-medium text-gray-900">
                                  {activityLabel(trans)}
                                </span>
                                {trans.plan && (
                                  <p className="mt-0.5 truncate text-xs text-gray-500">
                                    {trans.plan}
                                    {trans.billingCycle ? ` · ${trans.billingCycle}` : ''}
                                  </p>
                                )}
                              </td>
                              <td className="min-w-[140px] px-5 py-4">
                                <span className="text-sm font-semibold text-gray-900">
                                  {trans.entityName || '—'}
                                </span>
                                {trans.user?.email && (
                                  <p className="mt-0.5 truncate text-xs text-gray-500">{trans.user.email}</p>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-5 py-4">
                                <span className="text-sm font-bold tabular-nums text-gray-900">
                                  {amountDisplay}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-5 py-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    status.tone === 'ok'
                                      ? 'bg-emerald-50 text-emerald-800'
                                      : status.tone === 'pending'
                                        ? 'bg-amber-50 text-amber-800'
                                        : 'bg-rose-50 text-rose-800'
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                      status.tone === 'ok'
                                        ? 'bg-emerald-500'
                                        : status.tone === 'pending'
                                          ? 'bg-amber-500'
                                          : 'bg-rose-500'
                                    }`}
                                    aria-hidden
                                  />
                                  {status.label}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-5 py-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    dir === 'credit'
                                      ? 'bg-emerald-50 text-emerald-800'
                                      : 'bg-rose-50 text-rose-800'
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                      dir === 'credit' ? 'bg-emerald-500' : 'bg-rose-500'
                                    }`}
                                    aria-hidden
                                  />
                                  {dir === 'credit' ? 'Credit' : 'Debit'}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                                {formatListDate(trans.createdAt)}
                              </td>
                              <td className="whitespace-nowrap px-5 py-4" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handleRowNavigate(trans.id)}
                                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm transition hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-800"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {!loading && transactions.length > 0 && (
                  <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-600">
                      Showing{' '}
                      <span className="font-semibold text-gray-900">
                        {total === 0 ? 0 : (page - 1) * limit + 1}
                      </span>
                      –
                      <span className="font-semibold text-gray-900">{Math.min(page * limit, total)}</span>
                      <span className="text-gray-500"> of </span>
                      <span className="font-semibold text-gray-900">{total}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2 text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Previous page"
                      >
                        <HiChevronLeft className="h-5 w-5" />
                      </button>
                      <span className="min-w-[7rem] text-center text-sm font-medium text-gray-700">
                        Page {page} / {Math.max(1, totalPages)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2 text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Next page"
                      >
                        <HiChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
