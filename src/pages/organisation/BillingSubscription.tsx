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
  HiDotsVertical,
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
type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  holderName?: string;
  expiry?: string;
  isDefault?: boolean;
};
type PendingBankPayment = {
  reference?: string;
  kind: 'subscription' | 'wallet_topup';
  planId?: string;
  billingCycle?: BillingCyclePricing;
  ttkAmount?: number;
  title: string;
  description: string;
  amountLabel: string;
  bankDetails: {
    bank: string;
    accountNo: string;
    accountName: string;
  };
};
type PricingCard = {
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
};

function formatNgnCompact(amount: number): string {
  return formatMoney('NGN', Math.round(amount)) || '₦0';
}

const PRICING_CARDS: PricingCard[] = [
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

const PLAN_FEATURE_DETAILS: Record<PlanApiId, string[]> = {
  starter: [
    'View up to 50 verified candidate profiles',
    'Create up to 10 job posts/month',
    'Job posts expire after 14 days',
    '20 applications per job post',
    '2 Scout workflows (2 runs each)',
    '200 emails/month',
    '3 additional team members',
    '2-month data retention',
    'Basic calendar integration',
    '20 interview schedules/month',
  ],
  standard: [
    'View up to 5,000 verified profiles',
    'Create up to 100 job posts',
    'Job posts active for 2 months',
    '100 applications per job post',
    '20 Scout workflows (3 runs each)',
    '500 emails/month',
    '20 additional team members',
    '4-month data retention',
    'Calendar integration',
    '100 interview schedules/month',
  ],
  recruiter: [
    'View up to 10,000 verified profiles',
    'Create up to 300 job posts',
    'Job posts active for 6 months',
    '300 applications per job post',
    '50 Scout workflows (5 runs each)',
    '1,000 emails/month',
    '50 additional team members',
    '8-month data retention',
    'Calendar integration',
    '300 interview schedules/month',
  ],
  enterprise: [
    'View all verified profiles',
    'Up to 1,000 job posts',
    'Job posts active for 12 months',
    '1,000 applications per job post',
    'Unlimited Scout workflows',
    'Custom email volume',
    'Unlimited team members',
    'Custom data retention',
    'Advanced calendar integrations',
    'Unlimited interview schedules',
  ],
};

const TOKEN_ADD_ON_FEATURES = [
  'Profile reverification',
  'AML checks',
  'Extend applicant limit',
  'Additional emails & team members',
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

const DEFAULT_BANK_DETAILS = {
  bank: 'First Bank',
  accountNo: '3041698890',
  accountName: 'Taldium Ltd',
};

const PLAN_USAGE_DISPLAY_ROWS: Array<{
  key: string;
  feature: string;
  limit: string;
  cap: number | null;
}> = [
  { key: 'jobPosts', feature: 'Job Posts', limit: '10 / month', cap: 10 },
  { key: 'applicantsPerPost', feature: 'Applicants per Post', limit: '20', cap: 20 },
  { key: 'emails', feature: 'Emails / month', limit: '200', cap: 200 },
  { key: 'interviews', feature: 'Interview Schedules / month', limit: '20', cap: 20 },
  { key: 'scoutWorkflows', feature: 'Talent Scout Workflows', limit: '2 / month', cap: 2 },
  { key: 'teamMembers', feature: 'Team Members', limit: '3 additional', cap: 3 },
  { key: 'dataRetention', feature: 'Data Retention', limit: '2 months', cap: null },
  { key: 'calendarIntegration', feature: 'Calendar Integration', limit: '1', cap: 1 },
  { key: 'verifiedProfiles', feature: 'Verified Candidate Profiles', limit: '50', cap: null },
];

function PricingTierIcon({ icon, tone }: { icon: TierIcon; tone: 'muted' | 'brand' }) {
  const box =
    tone === 'muted'
      ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600'
      : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700';
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
    <span className="inline-flex rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800">
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
      <span className="inline-flex items-center gap-2 text-sm font-medium text-brand-600">
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
      <span className="inline-flex items-center gap-2 text-sm font-medium text-brand-600">
        <HiArrowCircleDown className="h-5 w-5 shrink-0" />
        Wallet top-up
      </span>
    );
  }
  return <span className="text-sm capitalize text-gray-500">{type || '—'}</span>;
}

function formatCardBrand(value: string | null | undefined): string {
  const normalized = String(value || 'card').replace(/_/g, ' ').trim();
  if (!normalized) return 'Card';
  if (normalized.toLowerCase() === 'visa') return 'Visa';
  if (normalized.toLowerCase() === 'mastercard') return 'Mastercard';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function normaliseSavedCard(card: any, index: number): SavedCard | null {
  if (!card) return null;
  const last4 = String(card.last4 || card.lastFour || '').trim();
  if (!last4) return null;
  const brand = formatCardBrand(card.brand || card.type || 'card');
  const expiry =
    card.expiry ||
    card.expires ||
    (card.expMonth && card.expYear ? `${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}` : undefined);

  return {
    id: String(card.id || `${brand}-${last4}-${index}`),
    brand,
    last4,
    holderName: card.holderName || card.name || card.cardholderName,
    expiry,
    isDefault: Boolean(card.isDefault || card.default),
  };
}

function buildPlanUsageDisplayRows(apiRows: any[] | undefined): any[] {
  const byKey = new Map((apiRows || []).map((row: any) => [row.key, row]));
  return PLAN_USAGE_DISPLAY_ROWS.map((row) => {
    const apiRow = byKey.get(row.key);
    const used = Number(apiRow?.used ?? 0);
    return {
      key: row.key,
      feature: row.feature,
      limit: row.limit,
      used,
      remaining: row.cap === null ? null : Math.max(0, row.cap - used),
    };
  });
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
  const [usageLoading, setUsageLoading] = useState(false);
  const [manageCardsOpen, setManageCardsOpen] = useState(false);
  const [pendingBankPayment, setPendingBankPayment] = useState<PendingBankPayment | null>(null);
  const [selectedFeaturePlan, setSelectedFeaturePlan] = useState<PricingCard | null>(null);
  const [confirmingBankPayment, setConfirmingBankPayment] = useState(false);

  const dashboard = subscription?.dashboard;
  const savedCards = useMemo<SavedCard[]>(() => {
    const source = dashboard?.savedCards || subscription?.savedCards || subscription?.paymentMethods || [];
    const cards = Array.isArray(source)
      ? source.map(normaliseSavedCard).filter((card): card is SavedCard => Boolean(card))
      : [];

    if (cards.length > 0) return cards;

    const count = Number(dashboard?.savedCardsCount || 0);
    const fallback = normaliseSavedCard(subscription?.paymentMethod, 0);
    return count > 0 && fallback ? [{ ...fallback, isDefault: true }] : [];
  }, [dashboard?.savedCards, dashboard?.savedCardsCount, subscription?.paymentMethod, subscription?.paymentMethods, subscription?.savedCards]);
  const savedCardsCount = savedCards.length || Number(dashboard?.savedCardsCount || 0);

  const closeFundWallet = useCallback(() => {
    setFundWalletOpen(false);
  }, []);

  const closeManageCards = useCallback(() => {
    setManageCardsOpen(false);
  }, []);

  const closePendingBankPayment = useCallback(() => {
    setPendingBankPayment(null);
  }, []);

  const closeFeaturePlan = useCallback(() => {
    setSelectedFeaturePlan(null);
  }, []);

  const modalOpen = fundWalletOpen || manageCardsOpen || Boolean(pendingBankPayment) || Boolean(selectedFeaturePlan);

  useEffect(() => {
    if (!modalOpen) {
      document.body.style.overflow = '';
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pendingBankPayment) closePendingBankPayment();
      else if (selectedFeaturePlan) closeFeaturePlan();
      else if (manageCardsOpen) closeManageCards();
      else if (fundWalletOpen) closeFundWallet();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [
    modalOpen,
    fundWalletOpen,
    manageCardsOpen,
    pendingBankPayment,
    selectedFeaturePlan,
    closeFundWallet,
    closeManageCards,
    closePendingBankPayment,
    closeFeaturePlan,
  ]);

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

  const fetchSubscription = useCallback(async (options?: { silent?: boolean }) => {
    if (options?.silent) {
      setUsageLoading(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await api.get('/v1/organisation/billing', {
        params: { period: usagePeriod },
      });
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
      if (options?.silent) {
        setUsageLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, [usagePeriod]);

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
    fetchPlans();
    fetchBillingHistory();
  }, [fetchPlans, fetchBillingHistory]);

  useEffect(() => {
    fetchSubscription({ silent: Boolean(subscription) });
  }, [fetchSubscription]);

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

      const selectedPlan = plans.find((p) => p.id === planId);
      const price =
        selectedPlan?.prices?.[billingCyclePricing] ||
        selectedPlan?.pricing?.[billingCyclePricing] ||
        selectedPlan;
      const amountNgn =
        price?.amountNgn ||
        price?.priceNgn ||
        (billingCyclePricing === 'annual'
          ? selectedPlan?.priceAnnualNgn
          : selectedPlan?.priceMonthlyNgn);

      setPendingBankPayment({
        kind: 'subscription',
        planId,
        billingCycle: billingCyclePricing,
        title: 'Complete Subscription Payment',
        description: `${selectedPlan?.name || planId} plan (${billingCyclePricing})`,
        amountLabel:
          amountNgn != null
            ? formatMoney('NGN', Number(amountNgn)) || `₦${amountNgn}`
            : 'Amount shown at confirmation',
        bankDetails: DEFAULT_BANK_DETAILS,
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upgrade subscription');
    }
  };

  const handleConfirmBankPayment = async () => {
    if (!pendingBankPayment) return;
    setConfirmingBankPayment(true);
    try {
      let reference = pendingBankPayment.reference;
      if (!reference) {
        if (pendingBankPayment.kind === 'subscription') {
          const response = await api.post('/v1/organisation/billing/subscription', {
            plan: pendingBankPayment.planId,
            billingCycle: pendingBankPayment.billingCycle === 'annual' ? 'annual' : 'monthly',
          });
          reference = response.data?.data?.paymentReference;
        } else {
          const response = await api.post('/v1/organisation/billing/wallet/initiate', {
            ttkAmount: pendingBankPayment.ttkAmount,
          });
          reference = response.data?.data?.paymentReference;
        }
      }
      if (!reference) throw new Error('Payment reference could not be created');
      await api.post(
        `/v1/organisation/billing/payment/${encodeURIComponent(reference)}/confirm`,
      );
      toast.success('Payment will be verified within 24 hours.');
      closePendingBankPayment();
      await fetchSubscription();
      await fetchBillingHistory();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not confirm payment.');
    } finally {
      setConfirmingBankPayment(false);
    }
  };

  const usageRows =
    usageSubTab === 'plan'
      ? buildPlanUsageDisplayRows(dashboard?.planUsage)
      : dashboard?.tokenUsage || [];
  const fundTokenAmount = Number(fundTokenInput);
  const showFundSummary = fundTokenInput.trim() !== '' && Number.isFinite(fundTokenAmount) && fundTokenAmount > 0;
  const fundAmountNgn = showFundSummary ? Math.round(fundTokenAmount * 35) : 0;
  const fundAmountUsd = showFundSummary ? Math.round(fundTokenAmount * 0.05 * 100) / 100 : 0;

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
                    ? 'border-brand-600 text-brand-700'
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
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 p-6 text-white shadow-md">
                <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-full bg-brand-300/20" />
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
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-brand-700 hover:to-brand-600"
                  >
                    <HiPlus className="h-5 w-5" />
                    Fund Wallet
                  </button>
                  <button
                    type="button"
                    onClick={() => setManageCardsOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50"
                  >
                    <HiCreditCard className="h-5 w-5 text-gray-500" />
                    Manage Cards ({savedCardsCount})
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
                    disabled={usageLoading}
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

              {usageLoading ? (
                <div className="mb-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700">
                  Updating usage data...
                </div>
              ) : null}

              <div className="overflow-x-auto rounded-2xl border border-brand-100">
                <table className="min-w-full divide-y divide-brand-100">
                  <thead className="bg-brand-50">
                    <tr className="text-left text-xs font-bold uppercase tracking-wide text-brand-800">
                      <th className="px-4 py-4 sm:px-5">Feature</th>
                      <th className="px-4 py-4 sm:px-5">Limit</th>
                      <th className="px-4 py-4 sm:px-5">Used</th>
                      <th className="px-4 py-4 sm:px-5">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-50 bg-white text-sm">
                    {usageRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500 sm:px-5">
                          No usage data for this period.
                        </td>
                      </tr>
                    ) : (
                      usageRows.map((row: any) => (
                        <tr key={row.key} className="text-gray-900">
                          <td className="whitespace-nowrap px-4 py-4 font-medium sm:px-5">{row.feature}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-gray-700 sm:px-5">{row.limit}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-gray-900 sm:px-5">{row.used}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-gray-900 sm:px-5">
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
                          <p className="mt-2 text-sm font-medium text-brand-600">{card.trial}</p>
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
                      onClick={() => setSelectedFeaturePlan(card)}
                      className={`mt-4 text-left text-sm font-semibold transition hover:underline ${
                        card.iconTone === 'muted' ? 'text-gray-500' : 'text-brand-600'
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
                          disabled={isDowngrade}
                          onClick={() => handleUpgrade(card.apiPlanId)}
                          className={`w-full rounded-xl py-3 text-sm font-semibold shadow-sm transition ${
                            isUpgrade
                              ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:from-brand-700 hover:to-brand-600'
                              : isDowngrade
                                ? 'cursor-not-allowed border border-gray-200 bg-gray-50 text-gray-400'
                                : 'border border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
                          }`}
                        >
                          {isUpgrade ? 'Upgrade' : isDowngrade ? 'Not available' : 'Select plan'}
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
                    <span className="absolute right-3 top-3 rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-700">
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
                <span className="text-sm font-medium text-gray-500">
                  Active paid plans can only be upgraded to a higher tier.
                </span>
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
                              ? 'text-sm font-semibold text-brand-600'
                              : tx.ttkColor === 'inherit'
                                ? 'text-sm font-semibold text-gray-900'
                                : ttk != null && ttk < 0
                                  ? 'text-sm font-semibold text-red-600'
                                  : 'text-sm font-semibold text-brand-600';
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

      {selectedFeaturePlan ? (() => {
        const card = selectedFeaturePlan;
        const cycle = billingCyclePricing;
        const money = cycle === 'annual' ? card.annual ?? card.monthly : card.monthly ?? card.annual;
        const isCurrent = (subscription?.plan || 'starter') === card.apiPlanId;
        const includedFeatures = PLAN_FEATURE_DETAILS[card.apiPlanId] || card.features;
        return (
          <div className="fixed inset-0 z-[100] flex justify-end" role="presentation">
            <button
              type="button"
              aria-label="Close plan features drawer"
              className="absolute inset-0 bg-black/40"
              onClick={closeFeaturePlan}
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-labelledby="plan-features-title"
              className="relative z-10 flex h-full w-full max-w-xl flex-col bg-slate-50 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-5 sm:px-8">
                <div>
                  <h2 id="plan-features-title" className="text-2xl font-bold tracking-tight text-slate-950">
                    {card.title} Plan
                  </h2>
                  <p className="mt-4 max-w-md text-base leading-7 text-slate-600">{card.description}</p>
                </div>
                <button
                  type="button"
                  onClick={closeFeaturePlan}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white hover:text-slate-800"
                  aria-label="Close"
                >
                  <HiX className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8">
                <div className="rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 to-emerald-50 px-5 py-7 text-center">
                  {card.priceMode === 'free' ? (
                    <p className="text-4xl font-extrabold tracking-tight text-slate-950">Free</p>
                  ) : card.priceMode === 'custom' ? (
                    <p className="text-4xl font-extrabold tracking-tight text-slate-950">Custom</p>
                  ) : money ? (
                    <p>
                      <span className="text-4xl font-extrabold tracking-tight text-slate-950">
                        {formatNgnCompact(money.ngn)}
                      </span>{' '}
                      <span className="text-base font-semibold text-slate-500">(${money.usd})/mo</span>
                    </p>
                  ) : null}
                  <div className="mt-3 flex justify-center">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        isCurrent
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-white/80 text-brand-700'
                      }`}
                    >
                      {isCurrent ? 'Active' : card.priceMode === 'custom' ? 'Contact Sales' : 'Available'}
                    </span>
                  </div>
                  {cycle === 'annual' && card.priceMode === 'money' ? (
                    <p className="mt-2 text-xs font-medium text-slate-500">Billed annually</p>
                  ) : null}
                </div>

                <div className="mt-8">
                  <h3 className="text-base font-semibold text-slate-950">What's included:</h3>
                  <ul className="mt-5 space-y-4">
                    {includedFeatures.map((feature) => (
                      <li key={feature} className="flex gap-3 text-base leading-6 text-slate-800">
                        <HiCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-9 border-t border-slate-200 pt-7">
                  <h3 className="text-base font-semibold text-slate-950">Token-based Add-ons</h3>
                  <ul className="mt-4 space-y-3">
                    {TOKEN_ADD_ON_FEATURES.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-base text-slate-500">
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold text-slate-500">
                          T
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
                <button
                  type="button"
                  onClick={closeFeaturePlan}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </aside>
          </div>
        );
      })() : null}

      {fundWalletOpen ? (
        <div className="fixed inset-0 z-[100] flex justify-end" role="presentation">
          <button
            type="button"
            aria-label="Close fund wallet drawer"
            className="absolute inset-0 bg-black/40"
            onClick={closeFundWallet}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="fund-wallet-title"
            className="relative z-10 flex h-full w-full max-w-md flex-col bg-slate-50 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">
                    Wallet Top-Up
                  </p>
                  <h2 id="fund-wallet-title" className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                    Fund Your Wallet
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Purchase Taldium Tokens. 1 TTK = {formatMoney('NGN', 35)} / {formatMoney('USD', 0.05)}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeFundWallet}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Close"
                >
                  <HiX className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Balance</p>
                <p className="mt-2">
                  <span className="text-2xl font-bold tracking-tight text-slate-950">
                    {dashboard?.wallet?.tokenBalance ?? 0}
                  </span>{' '}
                  <span className="text-base font-medium text-slate-500">
                    {dashboard?.wallet?.tokenSymbol || 'TTK'}
                  </span>
                </p>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold text-slate-900">Choose a token bundle</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[50, 100, 200, 500].map((n) => {
                    const isSelected = fundTokenInput === String(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setFundTokenInput(String(n))}
                        className={`rounded-2xl border px-2 py-3 text-base font-semibold text-[12px] shadow-sm transition ${
                          isSelected
                            ? 'border-brand-900 bg-brand-900 text-white'
                            : 'border-slate-200 bg-white text-slate-900 hover:border-brand-200 hover:bg-brand-50'
                        }`}
                      >
                        {n} TTK
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <label htmlFor="fund-token-amount" className="block text-sm font-semibold text-slate-900">
                  Custom token amount
                </label>
                <input
                  id="fund-token-amount"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Enter custom amount"
                  value={fundTokenInput}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '');
                    setFundTokenInput(v);
                  }}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              {showFundSummary ? (
                <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4 pb-4">
                    <span className="text-base font-medium text-slate-500">Tokens</span>
                    <span className="text-base font-semibold text-slate-950">{fundTokenAmount} TTK</span>
                  </div>
                  <div className="space-y-4 border-t border-slate-200 pt-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-base font-medium text-slate-500">Amount (NGN)</span>
                      <span className="text-base font-bold text-slate-950">
                        {formatMoney('NGN', fundAmountNgn)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-base font-medium text-slate-500">Amount (USD)</span>
                      <span className="text-base font-bold text-slate-950">
                        {formatMoney('USD', fundAmountUsd)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={async () => {
                  const n = Number(fundTokenInput);
                  if (!fundTokenInput.trim() || !Number.isFinite(n) || n < 1) {
                    toast.error('Enter a valid number of tokens (1 or more).');
                    return;
                  }
                  setPendingBankPayment({
                    kind: 'wallet_topup',
                    ttkAmount: n,
                    title: 'Complete Wallet Top-Up',
                    description: `${n} TTK wallet top-up`,
                    amountLabel: formatMoney('NGN', Math.round(n * 35)) || `₦${Math.round(n * 35)}`,
                    bankDetails: DEFAULT_BANK_DETAILS,
                  });
                  closeFundWallet();
                }}
                disabled={!showFundSummary}
                className="w-full rounded-2xl bg-brand-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue to Payment
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {pendingBankPayment ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="presentation">
          <button
            type="button"
            aria-label="Close payment details"
            className="absolute inset-0 bg-black/40"
            onClick={closePendingBankPayment}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bank-payment-title"
            className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="bank-payment-title" className="text-lg font-bold text-gray-900">
                  {pendingBankPayment.title}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Transfer the exact amount below, then confirm once payment has been made.
                </p>
              </div>
              <button
                type="button"
                onClick={closePendingBankPayment}
                className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close"
              >
                <HiX className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                Amount to Pay
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {pendingBankPayment.amountLabel}
              </p>
              <p className="mt-1 text-sm text-gray-600">{pendingBankPayment.description}</p>
            </div>

            <div className="mt-5 space-y-3 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-500">Bank</span>
                <span className="text-sm font-semibold text-gray-900">
                  {pendingBankPayment.bankDetails.bank}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-500">Account No.</span>
                <span className="font-mono text-sm font-semibold text-gray-900">
                  {pendingBankPayment.bankDetails.accountNo}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-500">Account Name</span>
                <span className="text-sm font-semibold text-gray-900">
                  {pendingBankPayment.bankDetails.accountName}
                </span>
              </div>
              {pendingBankPayment.reference ? (
                <div className="border-t border-gray-100 pt-3">
                  <span className="text-xs text-gray-500">Reference</span>
                  <p className="mt-1 break-all font-mono text-sm font-semibold text-gray-900">
                    {pendingBankPayment.reference}
                  </p>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleConfirmBankPayment}
              disabled={confirmingBankPayment}
              className="mt-6 w-full rounded-xl bg-brand-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {confirmingBankPayment ? 'Submitting...' : "I've made payment"}
            </button>
          </div>
        </div>
      ) : null}

      {manageCardsOpen ? (
        <div className="fixed inset-0 z-[100] flex justify-end" role="presentation">
          <button
            type="button"
            aria-label="Close card drawer"
            className="absolute inset-0 bg-black/40"
            onClick={closeManageCards}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-cards-title"
            className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-6 sm:px-8">
              <div>
                <h2 id="manage-cards-title" className="text-2xl font-bold tracking-tight text-gray-900">
                  Manage Cards
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Add, remove, or set a default payment card
                </p>
              </div>
              <button
                type="button"
                onClick={closeManageCards}
                className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close"
              >
                <HiX className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
              {savedCards.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-6 py-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <HiCreditCard className="h-7 w-7 text-gray-400" />
                  </div>
                  <p className="mt-4 font-semibold text-gray-900">No saved cards yet</p>
                  <p className="mt-2 text-sm text-gray-500">
                    Add a card to make subscription renewals and wallet top-ups faster.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedCards.map((card) => (
                    <div
                      key={card.id}
                      className={`flex items-center gap-4 rounded-2xl border bg-white p-4 ${
                        card.isDefault ? 'border-slate-300 shadow-sm' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
                        <HiCreditCard className="h-7 w-7 text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-semibold text-gray-900">
                            {card.brand} •••• {card.last4}
                          </p>
                          {card.isDefault ? (
                            <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">
                              Default
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {card.holderName || 'Card holder'}
                          {card.expiry ? ` • Expires ${card.expiry}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toast('Card actions will be available soon.')}
                        className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                        aria-label={`Manage ${card.brand} ending in ${card.last4}`}
                      >
                        <HiDotsVertical className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 px-6 py-5 sm:px-8">
              <button
                type="button"
                onClick={() => toast('Adding new cards will be available soon.')}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50"
              >
                <HiPlus className="h-5 w-5" />
                Add New Card
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </OrganisationLayout>
  );
}
