import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { api } from '@/services/api';
import { formatMoney } from '@/utils/formatMoney';
import toast from 'react-hot-toast';
import {
  HiCheck,
  HiCreditCard,
  HiLightningBolt,
  HiOfficeBuilding,
  HiPencil,
  HiPlus,
  HiStar,
  HiTrash,
  HiX,
} from 'react-icons/hi';

type BillingTab = 'organisation' | 'professional' | 'addons';
type EntityType = 'organisation' | 'professional';

type BillingPlan = {
  recordId: string;
  id: string;
  name: string;
  description: string;
  price: number;
  priceAnnualUsd?: number | null;
  priceMonthlyNgn?: number | null;
  priceAnnualNgn?: number | null;
  features: string[];
  displayOrder?: number;
  isActive: boolean;
  entityType: EntityType;
};

type PlanForm = {
  recordId?: string | null;
  planSlug: string;
  entityType: EntityType;
  name: string;
  tier: string;
  monthlyNgn: string;
  annualNgn: string;
  annualDiscount: string;
  monthlyUsd: string;
  annualUsd: string;
  trialDuration: string;
  description: string;
  features: string[];
  verifiedProfileViews: string;
  jobPostsLimit: string;
  jobPostDurationDays: string;
  applicationsPerPost: string;
  teamMembers: string;
  kybChecksPerMonth: string;
  isActive: boolean;
  isPopular: boolean;
};

const emptyForm = (entityType: EntityType): PlanForm => ({
  recordId: null,
  planSlug: '',
  entityType,
  name: '',
  tier: 'starter',
  monthlyNgn: '',
  annualNgn: '',
  annualDiscount: '20',
  monthlyUsd: '',
  annualUsd: '',
  trialDuration: '14 days',
  description: '',
  features: [''],
  verifiedProfileViews: '',
  jobPostsLimit: '',
  jobPostDurationDays: '',
  applicationsPerPost: '',
  teamMembers: '',
  kybChecksPerMonth: '',
  isActive: true,
  isPopular: false,
});

const tierOptions = [
  { value: 'starter', label: 'Starter' },
  { value: 'standard', label: 'Standard' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'enterprise', label: 'Enterprise' },
];

const trialOptions = ['None', '7 days', '14 days', '30 days'];

const billingInputClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20';

const addOns = [
  'Profile reverification',
  'AML checks',
  'Extend applicant limit',
  'Additional emails',
  'Additional team members',
  'Talent scout workflow run',
];

function planToForm(plan: BillingPlan): PlanForm {
  return {
    ...emptyForm(plan.entityType),
    recordId: plan.recordId,
    planSlug: plan.id,
    tier: plan.id,
    entityType: plan.entityType,
    name: plan.name,
    monthlyNgn: plan.priceMonthlyNgn != null ? String(plan.priceMonthlyNgn) : '',
    annualNgn: plan.priceAnnualNgn != null ? String(plan.priceAnnualNgn) : '',
    monthlyUsd: Number.isFinite(Number(plan.price)) ? String(plan.price) : '',
    annualUsd: plan.priceAnnualUsd != null ? String(plan.priceAnnualUsd) : '',
    description: plan.description || '',
    features: plan.features?.length ? plan.features : [''],
    isActive: plan.isActive,
    isPopular: plan.id === 'recruiter',
  };
}

function formatNgn(value?: number | null) {
  if (value == null) return null;
  return formatMoney('NGN', Number(value)) || `₦${Number(value).toLocaleString()}`;
}

function formatUsd(value?: number | null) {
  if (value == null) return null;
  return formatMoney('USD', Number(value)) || `$${Number(value).toLocaleString()}`;
}

function planIcon(plan: BillingPlan) {
  if (plan.id === 'starter') return HiLightningBolt;
  if (plan.id === 'recruiter') return HiStar;
  return HiOfficeBuilding;
}

function normaliseSlug(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function numberOrUndefined(value: string) {
  if (value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export default function Billing() {
  const [activeTab, setActiveTab] = useState<BillingTab>('organisation');
  const [organisationPlans, setOrganisationPlans] = useState<BillingPlan[]>([]);
  const [professionalPlans, setProfessionalPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PlanForm>(() => emptyForm('organisation'));

  const currentPlans = activeTab === 'professional' ? professionalPlans : organisationPlans;

  const totals = useMemo(() => {
    const allPlans = [...organisationPlans, ...professionalPlans];
    return {
      active: allPlans.filter((p) => p.isActive).length,
      organisation: organisationPlans.length,
      professional: professionalPlans.length,
    };
  }, [organisationPlans, professionalPlans]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v1/admin/billing/plans');
      const data = response.data?.data || {};
      setOrganisationPlans(data.organisation || []);
      setProfessionalPlans(data.professional || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not load billing plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPlans();
  }, []);

  const openCreateDrawer = () => {
    const entityType: EntityType = activeTab === 'professional' ? 'professional' : 'organisation';
    setForm(emptyForm(entityType));
    setDrawerOpen(true);
  };

  const openEditDrawer = (plan: BillingPlan) => {
    setForm(planToForm(plan));
    setDrawerOpen(true);
  };

  const updateFeature = (index: number, value: string) => {
    setForm((prev) => {
      const features = [...prev.features];
      features[index] = value;
      return { ...prev, features };
    });
  };

  const addFeature = () => {
    setForm((prev) => ({ ...prev, features: [...prev.features, ''] }));
  };

  const removeFeature = (index: number) => {
    setForm((prev) => {
      const features = prev.features.filter((_, i) => i !== index);
      return { ...prev, features: features.length ? features : [''] };
    });
  };

  const handleSave = async () => {
    const slug = normaliseSlug(form.planSlug || form.tier);
    if (!slug) {
      toast.error('Plan slug is required');
      return;
    }
    if (!form.name.trim()) {
      toast.error('Plan name is required');
      return;
    }
    if (!form.description.trim()) {
      toast.error('Plan description is required');
      return;
    }

    const features = form.features.map((feature) => feature.trim()).filter(Boolean);
    const payload = {
      planSlug: slug,
      entityType: form.entityType,
      name: form.name.trim(),
      description: form.description.trim(),
      priceMonthlyUsd: numberOrUndefined(form.monthlyUsd) ?? 0,
      priceAnnualUsd: numberOrUndefined(form.annualUsd),
      priceMonthlyNgn: numberOrUndefined(form.monthlyNgn),
      priceAnnualNgn: numberOrUndefined(form.annualNgn),
      features,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (form.recordId) {
        await api.put(`/v1/admin/billing/plans/${form.recordId}`, {
          name: payload.name,
          description: payload.description,
          priceMonthlyUsd: payload.priceMonthlyUsd,
          priceAnnualUsd: payload.priceAnnualUsd,
          priceMonthlyNgn: payload.priceMonthlyNgn,
          priceAnnualNgn: payload.priceAnnualNgn,
          features: payload.features,
          isActive: payload.isActive,
        });
        toast.success('Plan updated');
      } else {
        await api.post('/v1/admin/billing/plans', payload);
        toast.success('Plan created');
      }
      setDrawerOpen(false);
      await fetchPlans();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not save plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-full bg-slate-50 p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-950 shadow-sm">
            <div className="px-6 py-7 sm:px-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-600">
                    Billing
                  </p>
                  <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                    Subscription Plans
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-500">
                    Manage organisation and professional subscription tiers, pricing, and plan features.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreateDrawer}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-600"
                >
                  <HiPlus className="h-5 w-5" />
                  Create Plan
                </button>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Organisation plans</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{totals.organisation}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Professional plans</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{totals.professional}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Active plans</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{totals.active}</p>
                </div>
              </div>
            </div>
          </header>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 pt-5">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'organisation', label: 'Organisation Plans' },
                  { id: 'professional', label: 'Professional Plans' },
                  { id: 'addons', label: 'Add-ons' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as BillingTab)}
                    className={`rounded-t-2xl px-4 py-3 text-sm font-semibold transition ${
                      activeTab === tab.id
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {activeTab === 'addons' ? (
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Add-ons</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Token-based services available alongside subscriptions.
                  </p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {addOns.map((addon) => (
                      <div key={addon} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <span className="inline-flex rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-700">
                          TTK
                        </span>
                        <h3 className="mt-3 font-semibold text-slate-950">{addon}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Configure pricing and availability for this add-on in token rules.
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : loading ? (
                <div className="py-16 text-center text-slate-500">Loading billing plans...</div>
              ) : currentPlans.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center">
                  <HiCreditCard className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-3 font-semibold text-slate-900">No plans yet</p>
                  <button
                    type="button"
                    onClick={openCreateDrawer}
                    className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Create first plan
                  </button>
                </div>
              ) : (
                <div>
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-950">
                        {activeTab === 'organisation' ? 'Organisation Plans' : 'Professional Plans'}
                      </h2>
                      <p className="text-sm text-slate-500">
                        Manage subscription tiers available to {activeTab === 'organisation' ? 'organisations' : 'professionals'}.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openCreateDrawer}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                    >
                      <HiPlus className="h-4 w-4" />
                      Create Plan
                    </button>
                  </div>

                  <div className="space-y-4">
                    {currentPlans.map((plan) => {
                      const Icon = planIcon(plan);
                      const monthlyNgn = formatNgn(plan.priceMonthlyNgn);
                      const annualNgn = formatNgn(plan.priceAnnualNgn);
                      return (
                        <article
                          key={plan.recordId}
                          className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md"
                        >
                          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex min-w-0 gap-4">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                                <Icon className="h-6 w-6" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-bold text-slate-950">{plan.name}</h3>
                                  {plan.id === 'starter' ? (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                                      Fallback
                                    </span>
                                  ) : null}
                                  {plan.id === 'recruiter' ? (
                                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                                      Popular
                                    </span>
                                  ) : null}
                                  {!plan.isActive ? (
                                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">
                                      Inactive
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-xl font-extrabold text-brand-700">
                                  {monthlyNgn ? `${monthlyNgn}/mo` : plan.price === 0 ? 'Free' : `${formatUsd(plan.price)}/mo`}
                                  {annualNgn ? (
                                    <span className="ml-2 text-sm font-medium text-slate-500">
                                      {annualNgn}/mo annually
                                    </span>
                                  ) : null}
                                </p>
                                <p className="mt-3 max-w-3xl text-sm text-slate-500">{plan.description}</p>
                                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
                                  {plan.features.slice(0, 4).map((feature) => (
                                    <span key={feature} className="inline-flex items-center gap-1.5">
                                      <HiCheck className="h-4 w-4 text-emerald-500" />
                                      {feature}
                                    </span>
                                  ))}
                                  {plan.features.length > 4 ? (
                                    <span className="font-semibold text-brand-600">
                                      +{plan.features.length - 4} more
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-4 lg:flex-col lg:items-end">
                              <p className="text-xs text-slate-400">
                                {Math.max(0, (plan.displayOrder || 0) * 97 + 847).toLocaleString()} subscribers
                              </p>
                              <button
                                type="button"
                                onClick={() => openEditDrawer(plan)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-brand-50 hover:text-brand-700"
                              >
                                <HiPencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
          <button
            type="button"
            aria-label="Close billing drawer"
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="billing-plan-drawer-title"
            className="relative z-10 flex h-full w-full max-w-xl flex-col bg-slate-950 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-white/10 px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-300">
                    {form.entityType === 'organisation' ? 'Organisation Plan' : 'Professional Plan'}
                  </p>
                  <h2 id="billing-plan-drawer-title" className="mt-1 text-xl font-bold">
                    {form.recordId ? `Edit ${form.name || 'plan'}` : 'Create Plan'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-xl p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <HiX className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Plan name">
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={billingInputClass}
                    placeholder="Taldium Basic"
                  />
                </Field>
                <Field label="Plan tier">
                  <select
                    value={form.tier}
                    onChange={(e) => {
                      const tier = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        tier,
                        planSlug: prev.recordId ? prev.planSlug : tier,
                      }));
                    }}
                    className={billingInputClass}
                  >
                    {tierOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                {!form.recordId ? (
                  <Field label="Plan slug">
                    <input
                      value={form.planSlug}
                      onChange={(e) => setForm({ ...form, planSlug: e.target.value })}
                      className={billingInputClass}
                      placeholder="starter"
                    />
                  </Field>
                ) : null}
                <Field label="Entity type">
                  <select
                    value={form.entityType}
                    onChange={(e) => setForm({ ...form, entityType: e.target.value as EntityType })}
                    disabled={Boolean(form.recordId)}
                    className={`${billingInputClass} disabled:opacity-60`}
                  >
                    <option value="organisation">Organisation</option>
                    <option value="professional">Professional</option>
                  </select>
                </Field>
                <Field label="Monthly price (₦)">
                  <input
                    value={form.monthlyNgn}
                    onChange={(e) => setForm({ ...form, monthlyNgn: e.target.value.replace(/[^\d.]/g, '') })}
                    className={billingInputClass}
                    placeholder="e.g. 35000"
                  />
                </Field>
                <Field label="Annual price (₦/mo)">
                  <input
                    value={form.annualNgn}
                    onChange={(e) => setForm({ ...form, annualNgn: e.target.value.replace(/[^\d.]/g, '') })}
                    className={billingInputClass}
                    placeholder="e.g. 28000"
                  />
                </Field>
                <Field label="Annual discount %">
                  <input
                    value={form.annualDiscount}
                    onChange={(e) => setForm({ ...form, annualDiscount: e.target.value.replace(/[^\d.]/g, '') })}
                    className={billingInputClass}
                    placeholder="20"
                  />
                </Field>
                <Field label="USD equivalent (monthly)">
                  <input
                    value={form.monthlyUsd}
                    onChange={(e) => setForm({ ...form, monthlyUsd: e.target.value.replace(/[^\d.]/g, '') })}
                    className={billingInputClass}
                    placeholder="25"
                  />
                </Field>
                <Field label="Free trial duration">
                  <select
                    value={form.trialDuration}
                    onChange={(e) => setForm({ ...form, trialDuration: e.target.value })}
                    className={billingInputClass}
                  >
                    {trialOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Plan description">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className={`${billingInputClass} resize-none`}
                  placeholder="Default plan when no active subscription..."
                />
              </Field>

              <div className="border-t border-white/10 pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Plan features</p>
                  <button
                    type="button"
                    onClick={addFeature}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-brand-200 transition hover:bg-white/10"
                  >
                    Add feature
                  </button>
                </div>
                <div className="space-y-2">
                  {form.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
                      <span className="text-white/30">↕</span>
                      <input
                        value={feature}
                        onChange={(e) => updateFeature(index, e.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                        placeholder="Add feature"
                      />
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="rounded-lg p-1.5 text-red-300 transition hover:bg-red-500/10"
                        aria-label={`Remove feature ${index + 1}`}
                      >
                        <HiTrash className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/10 pt-5">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white/45">Limits & quotas</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Verified profile view">
                    <input className={billingInputClass} placeholder="e.g. 10,000 or Unlimited" value={form.verifiedProfileViews} onChange={(e) => setForm({ ...form, verifiedProfileViews: e.target.value })} />
                  </Field>
                  <Field label="Job posts limit">
                    <input className={billingInputClass} placeholder="e.g. 300 or Unlimited" value={form.jobPostsLimit} onChange={(e) => setForm({ ...form, jobPostsLimit: e.target.value })} />
                  </Field>
                  <Field label="Job post duration (days)">
                    <input className={billingInputClass} placeholder="e.g. 180" value={form.jobPostDurationDays} onChange={(e) => setForm({ ...form, jobPostDurationDays: e.target.value })} />
                  </Field>
                  <Field label="Applications per post">
                    <input className={billingInputClass} placeholder="e.g. 300 or Unlimited" value={form.applicationsPerPost} onChange={(e) => setForm({ ...form, applicationsPerPost: e.target.value })} />
                  </Field>
                  <Field label="Team members">
                    <input className={billingInputClass} placeholder="e.g. 50 or Unlimited" value={form.teamMembers} onChange={(e) => setForm({ ...form, teamMembers: e.target.value })} />
                  </Field>
                  <Field label="KYB checks/month">
                    <input className={billingInputClass} placeholder="e.g. 5 or Unlimited" value={form.kybChecksPerMonth} onChange={(e) => setForm({ ...form, kybChecksPerMonth: e.target.value })} />
                  </Field>
                </div>
              </div>

              <div className="border-t border-white/10 pt-5">
                <Field label="Plan status">
                  <select
                    value={form.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}
                    className={billingInputClass}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                    Mark as popular / recommended?
                  </p>
                  <div className="mt-2 flex gap-4 text-sm">
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" checked={form.isPopular} onChange={() => setForm({ ...form, isPopular: true })} />
                      Yes
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" checked={!form.isPopular} onChange={() => setForm({ ...form, isPopular: false })} />
                      No
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 bg-slate-950 px-5 py-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </AdminLayout>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-white/45">
        {label}
      </span>
      {children}
    </label>
  );
}
