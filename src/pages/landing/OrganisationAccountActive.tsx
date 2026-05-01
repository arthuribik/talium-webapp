import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { HiCheckCircle, HiOfficeBuilding } from 'react-icons/hi';
import { api } from '@/services/api';
import logo from '@/assets/logo.svg';

type AccountActiveState = {
  name?: string;
  email?: string;
  category?: string;
  industry?: string;
  location?: string;
  isRegistered?: boolean | null;
  incorporationNumber?: string;
};

const categoryLabels: Record<string, string> = {
  company: 'Company',
  school: 'School',
  religious_organisation: 'Religious Organisation',
  government_agency: 'Government Agency',
  international_organisation: 'International Organisation',
  political_party: 'Political Party',
  student_union: 'Student Union',
  student_association: 'Student Association',
  association: 'Association',
};

function displayValue(value?: string | null) {
  return value && value.trim() ? value : '--';
}

function formatCategory(value?: string) {
  if (!value) return '--';
  return categoryLabels[value] || value.replace(/_/g, ' ');
}

export default function OrganisationAccountActive() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as AccountActiveState;
  const [details, setDetails] = useState<AccountActiveState>(state);
  const registrationId = searchParams.get('id');

  useEffect(() => {
    if (!registrationId || state.name || state.email) return;

    const loadDetails = async () => {
      try {
        const response = await api.get(`/v1/auth/registration/${registrationId}`);
        const data = response.data;
        const isRegistered = data.step1?.isRegistered ?? null;
        const address = isRegistered ? data.step4?.address : data.step7?.address;
        const country = isRegistered
          ? data.step4?.headquartersCountry || address?.country
          : data.step7?.organisationCountry || address?.country;
        const city = isRegistered ? data.step4?.headquartersCity || address?.city : address?.city;

        setDetails({
          name: isRegistered ? data.step2?.legalName : data.step7?.organisationName,
          email: data.step5?.organisationEmail,
          category: isRegistered ? data.step3?.category : data.step8?.category,
          industry: isRegistered ? data.step4?.industry : data.step7?.industry,
          location: [city, country].filter(Boolean).join(', '),
          isRegistered,
          incorporationNumber: data.step2?.incorporationNumber,
        });
      } catch (error) {
        console.error('Failed to load organisation account details:', error);
      }
    };

    void loadDetails();
  }, [registrationId, state.email, state.name]);

  const nextSteps = useMemo(
    () => [
      { label: 'Create your organisation account', done: true },
      { label: 'Verify your organisation email', done: true },
      {
        label: 'Verify your registered business (RC/CAC)',
        done: Boolean(details.isRegistered && details.incorporationNumber),
      },
      { label: 'Add your organisation email domain', done: false },
      { label: 'Complete your organisation profile', done: false },
    ],
    [details.incorporationNumber, details.isRegistered],
  );

  const handleGoToDashboard = () => {
    const params = new URLSearchParams({ redirect: '/organization' });
    if (details.email) params.set('email', details.email);
    navigate(`/login?${params.toString()}`);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.35),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.22),transparent_30%)]" />
      <div className="absolute left-1/2 top-1/2 h-72 w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/20 blur-3xl" />

      <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-6 text-white shadow-2xl backdrop-blur-xl">
        <img src={logo} alt="Taldium" className="mb-7 h-9 brightness-0 invert" />

        <h1 className="text-3xl font-semibold leading-tight tracking-tight">
          Your organisation account is <span className="italic text-brand-200">active.</span>
        </h1>

        <div className="mt-7 rounded-2xl border border-white/10 bg-white/10 p-4">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-200">
            Profile Information
          </p>
          <dl className="divide-y divide-white/10 text-sm">
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-white/55">Name</dt>
              <dd className="text-right font-semibold text-white">{displayValue(details.name)}</dd>
            </div>
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-white/55">Email</dt>
              <dd className="text-right font-semibold text-white">{displayValue(details.email)}</dd>
            </div>
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-white/55">Category</dt>
              <dd className="text-right font-semibold capitalize text-white">{formatCategory(details.category)}</dd>
            </div>
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-white/55">Industry</dt>
              <dd className="text-right font-semibold text-white">{displayValue(details.industry)}</dd>
            </div>
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-white/55">Location</dt>
              <dd className="text-right font-semibold text-white">{displayValue(details.location)}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-200">
            Next Steps
          </p>
          <div className="space-y-2.5">
            {nextSteps.map((step) => (
              <div
                key={step.label}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-3.5 py-3 text-sm"
              >
                {step.done ? (
                  <HiCheckCircle className="h-5 w-5 shrink-0 text-emerald-300" />
                ) : (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-400/20">
                    <HiOfficeBuilding className="h-3.5 w-3.5 text-brand-200" />
                  </span>
                )}
                <span className={step.done ? 'text-white/75' : 'text-white'}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoToDashboard}
          className="mt-7 w-full rounded-xl bg-brand-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-950/30 transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          Go to Dashboard
        </button>
      </section>
    </main>
  );
}
