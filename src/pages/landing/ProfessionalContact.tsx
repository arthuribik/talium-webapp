import { useState, useEffect } from 'react';
import { APP_NAME } from '@/constants/app';
import { buildCanonicalUrl } from '@/seo/resolveRouteSeo';
import { usePageSeo } from '@/seo/usePageSeo';
import { Link, useParams } from 'react-router-dom';
import { api } from '@/services/api';
import LandingLayout from '@/components/landing/LandingLayout';
import { HiArrowLeft, HiCheckCircle, HiUser, HiExternalLink } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function ProfessionalContact() {
  const { professionalId } = useParams<{ professionalId: string }>();
  const [loading, setLoading] = useState(true);
  const [prof, setProf] = useState<{
    id: string;
    identityStatus?: string;
    identityVerified?: boolean;
    user?: { firstName?: string; lastName?: string; email?: string };
    profileImage?: string | null;
    profileImageUrl?: string | null;
  } | null>(null);

  useEffect(() => {
    if (!professionalId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const response = await api.get(`/v1/admin/professionals/${professionalId}`);
        if (cancelled) return;
        if (response.data?.success && response.data?.data) {
          const p = response.data.data;
          setProf({
            id: p.id,
            identityStatus: p.identityStatus,
            identityVerified: p.identityVerified,
            user: p.user,
            profileImage: p.profileImageUrl || p.profileImage || null,
          });
        } else {
          setProf(null);
        }
      } catch {
        if (!cancelled) {
          setProf(null);
          toast.error('Could not load this profile');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [professionalId]);

  const fullName =
    prof?.user?.firstName || prof?.user?.lastName
      ? `${prof.user?.firstName || ''} ${prof.user?.lastName || ''}`.trim()
      : 'Professional';
  const verified = prof?.identityStatus === 'verified' || !!prof?.identityVerified;
  const photo = prof?.profileImage;

  usePageSeo(
    !loading && prof && professionalId
      ? {
          title: `Contact ${fullName}`,
          description: verified
            ? `Verified contact card for ${fullName} on ${APP_NAME}.`
            : `Contact card for ${fullName} on ${APP_NAME}.`,
          canonicalUrl: buildCanonicalUrl(`/contact/${professionalId}`, ''),
          noIndex: false,
        }
      : null,
    [loading, prof, professionalId, fullName, verified],
  );

  return (
    <LandingLayout>
      <div className="min-h-[60vh] bg-gray-50 py-12 px-4">
        <div className="mx-auto max-w-lg">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            <HiArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">Loading…</div>
          ) : !prof ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-600">
              This contact link is invalid or the profile is no longer available.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 bg-gradient-to-br from-brand-50 to-white px-8 py-10 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow-md">
                  {photo ? (
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <HiUser className="h-10 w-10 text-gray-400" />
                  )}
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
                {verified ? (
                  <p className="mt-2 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-emerald-700">
                    <HiCheckCircle className="h-5 w-5 shrink-0" />
                    This information is verified by Taldium
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">Taldium profile</p>
                )}
              </div>
              <div className="space-y-4 px-8 py-8">
                <p className="text-center text-sm text-gray-600">
                  You&apos;re viewing a verified contact card. Visit their full profile to learn more about their
                  experience and credentials.
                </p>
                <Link
                  to={`/professionals/${prof.id}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-600"
                >
                  View full profile
                  <HiExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </LandingLayout>
  );
}
