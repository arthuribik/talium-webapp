import { useState, useEffect, useCallback, useMemo } from 'react';
import OrganisationLayout from '@/components/organisation/OrganisationLayout';
import {
  HiCreditCard,
  HiCheck,
  HiChevronDown,
  HiLightningBolt,
  HiPlus,
  HiSparkles,
  HiStar,
  HiSearch,
  HiFilter,
  HiArrowCircleDown,
  HiArrowCircleUp,
  HiX,
} from 'react-icons/hi';
import { HiBuildingOffice2 } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/services/api';
import { formatMoney } from '@/utils/formatMoney';

type BillingTab = 'topup' | 'pricing' | 'invoices' | 'history';
type UsageSubTab = 'plan' | 'token';
type PlanApiId = 'starter' | 'standard' | 'recruiter' | 'enterprise';
type BillingCyclePricing = 'monthly' | 'annual';
type TierIcon = 'bolt' | 'crown' | 'building';

function formatNgnCompact(amount: number): string {
  return formatMoney('NGN', Math.round(amount)) || '₦0';
}

const PRICING_CARDS: Array<{
  apiPlanId: PlanApiId;
  title: string;
  description: string;
  icon: TierIcon;
  iconTone: 'muted' | 'brand';
  fallbackBadge?: string;
  priceMode: 'free' | 'money' | 'custom';
  freeSubtitle?: string;
  annual?: { ngn: number; usd: number };
  monthly?: { ngn: number; usd: number };
  trial?: string;
  features: string[];
  moreFeatures: number;
}> = [
  {
    apiPlanId: 'starter',
    title: 'Taldium Basic',
    description:
      'Default plan when no active subscription. Limited access to get started.',
    icon: 'bolt',
    iconTone: 'muted',
    fallbackBadge: 'Fallback Plan',
    priceMode: 'free',
    freeSubtitle: 'Freemium',
    features: [
      'View up to 50 verified candidate profiles',
      'Create up to 10 job posts/month',
      'Job posts expire after 14 days',
      '20 applications per job post',
    ],
    moreFeatures: 6,
  },
  {
    apiPlanId: 'recruiter',
    title: 'Taldium Recruiter',
    description:
      'For Talent Managers, Recruiters, and Organisations with up to 300 hires monthly.',
    icon: 'crown',
    iconTone: 'brand',
    priceMode: 'money',
    annual: { ngn: 28000, usd: 20 },
    monthly: { ngn: 35000, usd: 25 },
    trial: '14-day free trial',
    features: [
      'View up to 10,000 verified profiles',
      'Create up to 300 job posts',
      'Job posts active for 6 months',
      '300 applications per job post',
    ],
    moreFeatures: 6,
  },
  {
    apiPlanId: 'standard',
    title: 'Taldium Corporate',
    description: 'For Organisations managing their recruitment process internally.',
    icon: 'building',
    iconTone: 'brand',
    priceMode: 'money',
    annual: { ngn: 20000, usd: 14 },
    monthly: { ngn: 25000, usd: 18 },
    trial: '14-day free trial',
    features: [
      'View up to 5,000 verified profiles',
      'Create up to 100 job posts',
      'Job posts active for 2 months',
      '100 applications per job post',
    ],
    moreFeatures: 6,
  },
  {
    apiPlanId: 'enterprise',
    title: 'Taldium Enterprise',
    description:
      'For large Organisations managing recruitment across different locations.',
    icon: 'building',
    iconTone: 'brand',
    priceMode: 'custom',
    features: [
      'View all verified profiles',
      'Up to 1,000 job posts',
      'Job posts active for 12 months',
      '1,000 applications per job post',
    ],
    moreFeatures: 6,
  },
];

const ADD_ONS: Array<{ title: string; description: string }> = [
  { title: 'Create Job Post', description: 'Additional job posts beyond plan limit.' },
  { title: 'Extend Applicant Limit', description: 'Allow more applicants on a job post.' },
  { title: 'Create Talent Scout Workflow', description: 'Additional scout workflows.' },
  { title: 'Run Talent Scout Workflow', description: 'Re-run active workflows.' },
  { title: 'Edit Talent Scout Workflow', description: 'Edit an existing scout workflow.' },
  { title: 'Profile Reverification', description: 'Re-verify applicant identity.' },
  { title: 'AML Checks', description: 'Adverse Media, PEP, and Sanctions checks.' },
  { title: 'Additional Email Messages', description: 'Send more emails beyond quota.' },
  { title: 'Additional Team Members', description: 'Add more team members.' },
];

const PLAN_ORDER: PlanApiId[] = ['starter', 'standard', 'recruiter', 'enterprise'];

function PricingTierIcon({ icon, tone }: { icon: TierIcon; tone: 'muted' | 'brand' }) {
  const box =
    tone === 'muted'
      ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600'
      : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700';
  if (icon === 'bolt') {
    return (
      <div className={box}>
        <HiLightningBolt className="h-5 w-5" />
      </div>
    );
  }
  if (icon === 'crown') {
    return (
      <div className={box}>
        <HiStar className="h-5 w-5" />
      </div>
    );
  }
  return (
    <div className={box}>
      <HiBuildingOffice2 className="h-5 w-5" />
    </div>
  );
}

function formatNgn(amount: number): string {
  return formatMoney('NGN', amount) || '₦0';
}

function formatDueDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** e.g. 1 Apr 2026 */
function formatInvoiceDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const s = String(status || '').toLowerCase();
  if (s === 'pending') {
    return (
      <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-900">
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
      Paid
    </span>
  );
}

function TransactionStatusBadge({ status }: { status: string }) {
  const s = String(status || '').toLowerCase();
  if (s === 'failed') {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
        Failed
      </span>
    );
  }
  if (s === 'pending') {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-800">
      Completed
    </span>
  );
}

function TransactionTypeCell({ type }: { type: string }) {
  const t = String(type || '').toLowerCase().replace('_', '-');
  if (t === 'subscription') {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-gray-600">
        <HiCreditCard className="h-4 w-4 shrink-0 text-gray-900" />
        Subscription
      </span>
    );
  }
  if (t === 'credit') {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-medium text-teal-600">
        <HiArrowCircleDown className="h-5 w-5 shrink-0" />
        Credit
      </span>
    );
  }
  if (t === 'debit') {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-medium text-red-600">
        <HiArrowCircleUp className="h-5 w-5 shrink-0" />
        Debit
      </span>
    );
  }
  if (t === 'addon' || t === 'add-on') {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-gray-600">
        <span className="flex gap-0.5 pt-0.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="h-2 w-2 rounded-full bg-amber-500" />
        </span>
        Add-on
      </span>
    );
  }
  if (t === 'wallet_topup' || t === 'wallet-topup') {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-medium text-teal-600">
        <HiArrowCircleDown className="h-5 w-5 shrink-0" />
        Wallet top-up
      </span>
    );
  }
  return <span className="text-sm capitalize text-gray-500">{type || '—'}</span>;
}

function mapLegacyBillingToTransactions(rows: any[]): any[] {
  const usdToNgn = (u: number) => Math.round(u * 1550);
  return rows.map((row, index) => {
    const usd = Number(row.amount) || 0;
    const amountNgn =
      String(row.currency || '').toUpperCase() === 'USD' ? usdToNgn(usd) : Math.round(usd);
    const ok = String(row.status || '').toLowerCase() === 'success';
    const pd = row.paymentDate;
    return {
      id: String(row.transactionId || row.id || `TXN-${index}`),
      status: ok ? 'completed' : 'failed',
      amountNgn,
      ttkDelta: null,
      ttkColor: null,
      type: 'subscription',
      description: `${String(row.plan || 'Plan')} — ${String(row.billingCycle || 'monthly')}`,
      date: typeof pd === 'string' ? pd : new Date(pd).toISOString(),
    };
  });
}

const MAIN_TABS: { id: BillingTab; label: string }[] = [
  { id: 'topup', label: 'Account Top-Up' },
  { id: 'pricing', label: 'Pricing & Subscriptions' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'history', label: 'Transaction History' },
];

const BILLING_TAB_QUERY = 'tab';

function billingTabFromSearch(raw: string | null): BillingTab {
  const allowed = MAIN_TABS.map((t) => t.id);
  if (raw && allowed.includes(raw as BillingTab)) return raw as BillingTab;
  return 'topup';
}

const BILLING_TAB_IDS = new Set<BillingTab>(MAIN_TABS.map((t) => t.id));

export default function BillingSubscription() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const mainTab = useMemo(
    () => billingTabFromSearch(searchParams.get(BILLING_TAB_QUERY)),
    [searchParams],
  );
  const setMainTab = useCallback(
    (tab: BillingTab) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (tab === 'topup') next.delete(BILLING_TAB_QUERY);
          else next.set(BILLING_TAB_QUERY, tab);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  const [usageSubTab, setUsageSubTab] = useState<UsageSubTab>('plan');
  const [usagePeriod, setUsagePeriod] = useState('this_month');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesLoaded, setInvoicesLoaded] = useState(false);
  const [billingCyclePricing, setBillingCyclePricing] = useState<BillingCyclePricing>('annual');
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [historyQuery, setHistoryQuery] = useState('');
  const [fundWalletOpen, setFundWalletOpen] = useState(false);
  const [fundTokenInput, setFundTokenInput] = useState('');

  const dashboard = subscription?.dashboard;

  const closeFundWallet = useCallback(() => {
    setFundWalletOpen(false);
  }, []);

  useEffect(() => {
    if (!fundWalletOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFundWallet();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [fundWalletOpen, closeFundWallet]);

  const filteredTransactions = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((tx: any) => {
      const blob = `${tx.id} ${tx.description || ''} ${tx.status || ''} ${tx.type || ''}`.toLowerCase();
      return blob.includes(q);
    });
  }, [transactions, historyQuery]);

  const filteredInvoices = useMemo(() => {
    const q = invoiceQuery.trim().toLowerCase();
    return invoices.filter((inv: any) => {
      const st = String(inv.status || '').toLowerCase();
      const matchStatus = invoiceStatusFilter === 'all' || st === invoiceStatusFilter;
      if (!matchStatus) return false;
      if (!q) return true;
      const blob = `${inv.id} ${inv.description || ''} ${inv.status || ''}`.toLowerCase();
      return blob.includes(q);
    });
  }, [invoices, invoiceQuery, invoiceStatusFilter]);

  const fetchPlans = useCallback(async () => {
    try {
      const response = await api.get('/v1/organisation/billing/plans');
      setPlans(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      toast.error('Failed to load subscription plans');
    }
  }, []);

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/v1/organisation/billing');
      setSubscription(response.data.data);
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      toast.error('Could not load billing. Try again later.');
      setSubscription({
        plan: 'starter',
        status: 'inactive',
        dashboard: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBillingHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await api.get('/v1/organisation/billing/history');
      const data = response.data.data || {};
      const tx = Array.isArray(data.transactions)
        ? data.transactions
        : mapLegacyBillingToTransactions(data.billingHistory || []);
      setTransactions(tx);
    } catch (err) {
      console.error('Failed to fetch billing history:', err);
      setTransactions([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    try {
      const response = await api.get('/v1/organisation/billing/invoices');
      setInvoices(response.data.data?.invoices || []);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
      setInvoices([]);
    } finally {
      setInvoicesLoading(false);
      setInvoicesLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
    fetchPlans();
    fetchBillingHistory();
  }, [fetchSubscription, fetchPlans, fetchBillingHistory]);

  useEffect(() => {
    const raw = searchParams.get(BILLING_TAB_QUERY);
    if (raw && !BILLING_TAB_IDS.has(raw as BillingTab)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete(BILLING_TAB_QUERY);
          return next;
        },
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (mainTab === 'invoices' && !invoicesLoaded) {
      fetchInvoices();
    }
  }, [mainTab, invoicesLoaded, fetchInvoices]);

  const handleUpgrade = async (planId: string) => {
    try {
      if (planId === 'starter') {
        await api.put('/v1/organisation/billing/subscription', { plan: planId });
        toast.success(`Downgraded to ${plans.find((p) => p.id === planId)?.name}!`);
        await fetchSubscription();
        return;
      }

      const response = await api.post('/v1/organisation/billing/subscription', {
        plan: planId,
        billingCycle: billingCyclePricing === 'annual' ? 'annual' : 'monthly',
      });

      const paymentData = response.data.data;

      if (paymentData.paymentLink) {
        window.open(paymentData.paymentLink, '_blank');
        toast.success('Payment initiated! Redirecting to payment page…');
      } else {
        toast.success(`Upgraded to ${plans.find((p) => p.id === planId)?.name}!`);
      }

      await fetchSubscription();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upgrade subscription');
    }
  };

  const handleCancel = async () => {
    if (
      !window.confirm(
        'Are you sure you want to cancel your subscription? You will be downgraded to Starter Plan.',
      )
    )
      return;
    try {
      await api.put('/v1/organisation/billing/subscription', { plan: 'starter' });
      toast.success('Subscription cancelled. You are on Starter Plan.');
      await fetchSubscription();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel subscription');
    }
  };

  const usageRows =
    usageSubTab === 'plan'
      ? dashboard?.planUsage || []
      : dashboard?.tokenUsage || [];

  if (loading) {
    return (
      <OrganisationLayout>
        <div className="p-6 lg:p-8">
          <div className="py-20 text-center text-gray-600">Loading billing…</div>
        </div>
      </OrganisationLayout>
    );
  }

  return (
    <OrganisationLayout>
      <div className="p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Billing</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600 sm:text-base">
            View invoices, update payment methods, and manage your subscription.
          </p>
        </header>

        <nav className="mb-8 border-b border-gray-200">
          <div className="-mb-px flex flex-wrap gap-6">
            {MAIN_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setMainTab(t.id)}
                className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                  mainTab === t.id
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        {mainTab === 'topup' && (
          <div className="space-y-8">
            {dashboard?.upcomingPayment ? (
              <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Upcoming payment</span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                      Due: {formatDueDate(dashboard.upcomingPayment.dueDate)}
                    </span>
                  </div>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                    {formatNgn(Number(dashboard.upcomingPayment.amountNgn) || 0)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('usage-history');
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="shrink-0 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50"
                >
                  View Details
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-6 text-center text-sm text-gray-600">
                No upcoming payment on the Starter plan. Upgrade to a paid plan to see billing dates
                here.
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-800 p-6 text-white shadow-md">
                <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-full bg-teal-400/15" />
                <div className="relative">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
                    <HiCreditCard className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-sm font-medium text-white/80">Available balance</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight">
                    {dashboard?.wallet?.tokenBalance ?? 0}{' '}
                    <span className="text-lg font-semibold text-white/90">
                      {dashboard?.wallet?.tokenSymbol || 'TTK'}
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-white/75">
                    ≈ {formatNgn(Number(dashboard?.wallet?.approximateNgn) || 0)} / $
                    {Number(dashboard?.wallet?.approximateUsd ?? 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-start gap-2">
                  <HiLightningBolt className="mt-0.5 h-5 w-5 text-brand-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Quick Actions</h3>
                    <p className="text-xs text-gray-500">Wallet & Payment</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFundTokenInput('');
                      setFundWalletOpen(true);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-teal-700 hover:to-teal-600"
                  >
                    <HiPlus className="h-5 w-5" />
                    Fund Wallet
                  </button>
                  <button
                    type="button"
                    onClick={() => toast('Card management will be available soon.')}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50"
                  >
                    <HiCreditCard className="h-5 w-5 text-gray-500" />
                    Manage Cards ({dashboard?.savedCardsCount ?? 0})
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <HiSparkles className="h-5 w-5 text-amber-500" />
                  <h3 className="font-semibold text-gray-900">Current Plan</h3>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {dashboard?.currentPlan?.displayName ||
                    plans.find((p) => p.id === subscription?.plan)?.name ||
                    subscription?.plan}
                </p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Amount</dt>
                    <dd className="font-semibold text-gray-900">
                      {subscription?.plan === 'starter'
                        ? 'Free'
                        : formatNgn(Number(dashboard?.currentPlan?.amountNgnMonthly) || 0) + '/mo'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Next billing</dt>
                    <dd className="font-semibold text-gray-900">
                      {formatDueDate(dashboard?.currentPlan?.nextBilling)}
                    </dd>
                  </div>
                </dl>
                <span className="mt-4 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                  Active
                </span>
              </div>
            </div>

            <section
              id="usage-history"
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Usage History</h2>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Track your plan and token consumption
                  </p>
                </div>
                <div className="relative shrink-0">
                  <select
                    value={usagePeriod}
                    onChange={(e) => setUsagePeriod(e.target.value)}
                    className="appearance-none rounded-lg border border-gray-200 bg-gray-50 py-2 pl-3 pr-9 text-sm font-medium text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                  </select>
                  <HiChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                </div>
              </div>

              <div className="mb-4 border-b border-gray-100">
                <div className="flex gap-6">
                  <button
                    type="button"
                    onClick={() => setUsageSubTab('plan')}
                    className={`border-b-2 pb-2.5 text-sm font-medium ${
                      usageSubTab === 'plan'
                        ? 'border-brand-600 text-brand-700'
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Plan Usage
                  </button>
                  <button
                    type="button"
                    onClick={() => setUsageSubTab('token')}
                    className={`border-b-2 pb-2.5 text-sm font-medium ${
                      usageSubTab === 'token'
                        ? 'border-brand-600 text-brand-700'
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Token Usage
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="pb-3 pr-4">Feature</th>
                      <th className="pb-3 pr-4">Limit</th>
                      <th className="pb-3 pr-4">Used</th>
                      <th className="pb-3">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {usageRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500">
                          No usage data for this period.
                        </td>
                      </tr>
                    ) : (
                      usageRows.map((row: any) => (
                        <tr key={row.key} className="text-gray-900">
                          <td className="py-3 pr-4 font-medium">{row.feature}</td>
                          <td className="py-3 pr-4 text-gray-600">{row.limit}</td>
                          <td className="py-3 pr-4 font-semibold">{row.used}</td>
                          <td className="py-3 font-semibold">
                            {row.remaining === null ? '—' : row.remaining}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {mainTab === 'pricing' && subscription && (
          <div className="space-y-10">
            <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50/90 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <span className="text-sm font-medium text-gray-600">Billing cycle</span>
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className="inline-flex rounded-xl bg-gray-200/70 p-1"
                  role="group"
                  aria-label="Billing cycle"
                >
                  <button
                    type="button"
                    onClick={() => setBillingCyclePricing('monthly')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      billingCyclePricing === 'monthly'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCyclePricing('annual')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      billingCyclePricing === 'annual'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Annual
                  </button>
                </div>
                {billingCyclePricing === 'annual' ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    Save 20%
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {PRICING_CARDS.map((card) => {
                const currentId = (subscription?.plan || 'starter') as PlanApiId;
                const isCurrent = currentId === card.apiPlanId;
                const cIdx = PLAN_ORDER.indexOf(currentId);
                const pIdx = PLAN_ORDER.indexOf(card.apiPlanId);
                const isUpgrade = pIdx > cIdx;
                const isDowngrade = pIdx < cIdx;
                const cycle = billingCyclePricing;
                const money =
                  cycle === 'annual'
                    ? card.annual ?? card.monthly
                    : card.monthly ?? card.annual;

                return (
                  <div
                    key={card.apiPlanId}
                    className={`relative flex flex-col rounded-2xl border-2 bg-white p-6 shadow-sm ${
                      isCurrent
                        ? 'border-slate-900 pt-7 ring-1 ring-slate-900/10 sm:pt-8'
                        : 'border-gray-200'
                    }`}
                  >
                    {isCurrent ? (
                      <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                        <span className="whitespace-nowrap rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                          Current Plan
                        </span>
                      </div>
                    ) : card.fallbackBadge ? (
                      <div className="mb-3">
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                          {card.fallbackBadge}
                        </span>
                      </div>
                    ) : (
                      <div className="h-2 shrink-0 sm:h-0" aria-hidden />
                    )}

                    <div className="mb-4 flex items-start gap-3">
                      <PricingTierIcon icon={card.icon} tone={card.iconTone} />
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold tracking-tight text-slate-900">{card.title}</h3>
                      </div>
                    </div>

                    {card.priceMode === 'free' ? (
                      <div className="mb-1 flex flex-wrap items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-700">Free</span>
                        {card.freeSubtitle ? (
                          <span className="text-sm font-medium text-gray-500">{card.freeSubtitle}</span>
                        ) : null}
                      </div>
                    ) : card.priceMode === 'custom' ? (
                      <div className="mb-1 flex flex-wrap items-baseline gap-2">
                        <span className="text-3xl font-bold text-slate-900">Custom</span>
                        <span className="text-sm font-medium text-gray-500">Pay as you Go</span>
                      </div>
                    ) : money ? (
                      <div className="mb-1">
                        <div className="flex flex-wrap items-baseline gap-1.5">
                          <span className="text-3xl font-bold text-slate-900">
                            {formatNgnCompact(money.ngn)}
                          </span>
                          <span className="text-sm font-medium text-gray-500">
                            (${money.usd})/mo
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {cycle === 'annual' ? 'billed annually' : 'billed monthly'}
                        </p>
                        {card.trial ? (
                          <p className="mt-2 text-sm font-medium text-teal-600">{card.trial}</p>
                        ) : null}
                      </div>
                    ) : null}

                    <p className="mt-3 text-sm leading-relaxed text-gray-600">{card.description}</p>

                    <ul className="mt-5 flex-1 space-y-2.5">
                      {card.features.map((line) => (
                        <li key={line} className="flex gap-2 text-sm text-gray-700">
                          <HiCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => toast('Full feature list coming soon.')}
                      className={`mt-4 text-left text-sm font-semibold transition hover:underline ${
                        card.iconTone === 'muted' ? 'text-gray-500' : 'text-teal-600'
                      }`}
                    >
                      +{card.moreFeatures} more features &gt;
                    </button>

                    <div className="mt-6 border-t border-gray-100 pt-5">
                      {isCurrent ? (
                        <button
                          type="button"
                          disabled
                          className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 py-3 text-sm font-semibold text-gray-500"
                        >
                          Current plan
                        </button>
                      ) : card.apiPlanId === 'enterprise' ? (
                        <button
                          type="button"
                          onClick={() => toast('Contact sales for Enterprise — we will follow up shortly.')}
                          className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                        >
                          Contact sales
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpgrade(card.apiPlanId)}
                          className={`w-full rounded-xl py-3 text-sm font-semibold shadow-sm transition ${
                            isUpgrade
                              ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white hover:from-teal-700 hover:to-teal-600'
                              : isDowngrade
                                ? 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
                                : 'border border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
                          }`}
                        >
                          {isUpgrade ? 'Upgrade' : isDowngrade ? 'Downgrade' : 'Select plan'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 sm:text-xl">Available Add-ons</h2>
              <p className="mt-1 text-sm text-gray-600">
                Extend your plan with Taldium Tokens (1 TTK = {formatMoney('USD', 0.05)} / {formatMoney('NGN', 35)})
              </p>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ADD_ONS.map((addon) => (
                  <div
                    key={addon.title}
                    className="relative rounded-xl border border-gray-200 bg-white p-4 pr-14 shadow-sm"
                  >
                    <span className="absolute right-3 top-3 rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-teal-700">
                      TTK
                    </span>
                    <h3 className="font-semibold text-gray-900">{addon.title}</h3>
                    <p className="mt-1.5 text-sm leading-snug text-gray-600">{addon.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-500">
              * Refunds can only be processed on purchased tokens within 12 months of purchase.
            </p>

            <div className="flex flex-col gap-4 border-t border-gray-200 pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              {subscription?.paymentMethod ? (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <HiCreditCard className="h-5 w-5 text-gray-400" />
                  <span>
                    {subscription.paymentMethod.type === 'card'
                      ? 'Card'
                      : subscription.paymentMethod.type}{' '}
                    ending in {subscription.paymentMethod.last4}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-gray-500">No card on file</span>
              )}
              {subscription?.plan && subscription.plan !== 'starter' ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                >
                  Cancel subscription
                </button>
              ) : null}
            </div>
          </div>
        )}

        {mainTab === 'invoices' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <HiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={invoiceQuery}
                  onChange={(e) => setInvoiceQuery(e.target.value)}
                  placeholder="Search invoices..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/80 py-2.5 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  aria-label="Search invoices"
                />
              </div>
              <div className="flex shrink-0 items-stretch gap-2">
                <div className="relative min-w-[10.5rem] flex-1 sm:flex-initial">
                  <select
                    value={invoiceStatusFilter}
                    onChange={(e) =>
                      setInvoiceStatusFilter(e.target.value as 'all' | 'paid' | 'pending')
                    }
                    className="h-full min-h-[42px] w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-3 pr-9 text-sm font-medium text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    aria-label="Filter by status"
                  >
                    <option value="all">All statuses</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                  </select>
                  <HiChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                </div>
                <button
                  type="button"
                  onClick={() => toast('More invoice filters coming soon.')}
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50"
                >
                  <HiFilter className="h-4 w-4 text-gray-600" />
                  Filter
                </button>
              </div>
            </div>

            {invoicesLoading ? (
              <div className="py-16 text-center text-gray-600">Loading invoices…</div>
            ) : invoices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-14 text-center text-gray-500">
                <p className="font-medium text-gray-700">No invoices yet</p>
                <p className="mt-2 text-sm">Invoices will appear here after successful payments.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-100">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/90">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 sm:px-5">
                          Invoice ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 sm:px-5">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 sm:px-5">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 sm:px-5">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 sm:px-5">
                          Description
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-500 sm:px-5">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filteredInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500 sm:px-5">
                            No invoices match your search or filters.
                          </td>
                        </tr>
                      ) : (
                        filteredInvoices.map((inv: any) => (
                          <tr key={inv.id} className="hover:bg-gray-50/80">
                            <td className="whitespace-nowrap px-4 py-3.5 text-sm font-bold text-gray-900 sm:px-5">
                              {inv.id}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-sm font-bold text-gray-900 sm:px-5">
                              {formatNgnCompact(Number(inv.amountNgn) || 0)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-sm text-gray-600 sm:px-5">
                              {formatInvoiceDate(inv.issuedAt)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 sm:px-5">
                              <InvoiceStatusBadge status={inv.status} />
                            </td>
                            <td className="max-w-xs px-4 py-3.5 text-sm text-gray-600 sm:max-w-md sm:px-5">
                              {inv.description || '—'}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-right text-sm sm:px-5">
                              {inv.downloadUrl ? (
                                <a
                                  href={inv.downloadUrl}
                                  className="font-medium text-brand-600 hover:text-brand-700"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Download
                                </a>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {mainTab === 'history' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <HiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                  placeholder="Search transactions..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/80 py-2.5 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  aria-label="Search transactions"
                />
              </div>
              <button
                type="button"
                onClick={() => toast('More transaction filters coming soon.')}
                className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50"
              >
                <HiFilter className="h-4 w-4 text-gray-600" />
                Filter
              </button>
            </div>

            {historyLoading ? (
              <div className="py-16 text-center text-gray-600">Loading…</div>
            ) : transactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-14 text-center text-gray-500">
                <p className="font-medium text-gray-700">No transactions yet</p>
                <p className="mt-2 text-sm">Charges and token activity will show here.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-100">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/90">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 sm:px-5">
                          Transaction ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 sm:px-5">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 sm:px-5">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 sm:px-5">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 sm:px-5">
                          Description
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-500 sm:px-5">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500 sm:px-5">
                            No transactions match your search.
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((tx: any) => {
                          const ttk = tx.ttkDelta;
                          const showTtk = ttk != null && ttk !== 0;
                          const ttkLineClass =
                            tx.ttkColor === 'teal' || (ttk != null && ttk > 0 && !tx.ttkColor)
                              ? 'text-sm font-semibold text-teal-600'
                              : tx.ttkColor === 'inherit'
                                ? 'text-sm font-semibold text-gray-900'
                                : ttk != null && ttk < 0
                                  ? 'text-sm font-semibold text-red-600'
                                  : 'text-sm font-semibold text-teal-600';
                          return (
                            <tr key={tx.id} className="hover:bg-gray-50/80">
                              <td className="whitespace-nowrap px-4 py-3.5 text-sm font-bold text-gray-900 sm:px-5">
                                {tx.id}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3.5 sm:px-5">
                                <TransactionStatusBadge status={tx.status} />
                              </td>
                              <td className="whitespace-nowrap px-4 py-3.5 sm:px-5">
                                <div className="space-y-0.5">
                                  <div className="text-sm font-bold text-gray-900">
                                    {formatNgnCompact(Number(tx.amountNgn) || 0)}
                                  </div>
                                  {showTtk ? (
                                    <div className={ttkLineClass}>
                                      {ttk > 0 ? '+' : ''}
                                      {ttk} TTK
                                    </div>
                                  ) : null}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3.5 sm:px-5">
                                <TransactionTypeCell type={tx.type} />
                              </td>
                              <td className="max-w-xs px-4 py-3.5 text-sm text-gray-600 sm:max-w-md sm:px-5">
                                {tx.description || '—'}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3.5 text-right text-sm text-gray-600 sm:px-5">
                                {formatInvoiceDate(tx.date)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {fundWalletOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-black/40"
            onClick={closeFundWallet}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fund-wallet-title"
            className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="fund-wallet-title" className="text-lg font-bold text-gray-900">
                  Fund Your Wallet
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Purchase Taldium Tokens (TTK). 1 TTK = {formatMoney('USD', 0.05)} / {formatMoney('NGN', 35)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeFundWallet}
                className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close"
              >
                <HiX className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50/80 px-5 py-5 text-center">
              <p className="text-xs font-medium text-gray-500">Current Balance</p>
              <p className="mt-1">
                <span className="text-3xl font-bold tracking-tight text-gray-900">
                  {dashboard?.wallet?.tokenBalance ?? 0}
                </span>{' '}
                <span className="text-base font-medium text-slate-500">
                  {dashboard?.wallet?.tokenSymbol || 'TTK'}
                </span>
              </p>
            </div>

            <label htmlFor="fund-token-amount" className="mt-5 block text-sm font-medium text-gray-900">
              Number of Tokens (TTK)
            </label>
            <input
              id="fund-token-amount"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="e.g. 100"
              value={fundTokenInput}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '');
                setFundTokenInput(v);
              }}
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[50, 100, 200, 500].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setFundTokenInput(String(n))}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50"
                >
                  {n} TTK
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={async () => {
                const n = Number(fundTokenInput);
                if (!fundTokenInput.trim() || !Number.isFinite(n) || n < 1) {
                  toast.error('Enter a valid number of tokens (1 or more).');
                  return;
                }
                try {
                  const res = await api.post('/v1/organisation/billing/wallet/initiate', {
                    ttkAmount: n,
                  });
                  const d = res.data?.data;
                  if (d?.paymentLink) {
                    window.open(d.paymentLink, '_blank');
                    toast.success('Payment initiated. Complete checkout in the new tab.');
                  } else {
                    toast.success('Top-up initiated.');
                  }
                  await fetchSubscription();
                  await fetchBillingHistory();
                  closeFundWallet();
                } catch (e: any) {
                  toast.error(e.response?.data?.message || 'Could not start wallet top-up.');
                }
              }}
              className="mt-6 w-full rounded-xl bg-teal-600 px-4 py-3.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
            >
              Continue to Payment
            </button>
          </div>
        </div>
      ) : null}
    </OrganisationLayout>
  );
}
