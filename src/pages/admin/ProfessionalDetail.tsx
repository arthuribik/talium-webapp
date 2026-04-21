import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  HiArrowLeft,
  HiUser,
  HiCheckCircle,
  HiXCircle,
  HiClock,
  HiAcademicCap,
  HiBriefcase,
  HiShare,
  HiBadgeCheck,
  HiUsers,
  HiDotsVertical,
  HiLocationMarker,
  HiFolder,
} from 'react-icons/hi';
import toast from 'react-hot-toast';

type TabKey =
  | 'personal'
  | 'location'
  | 'education'
  | 'social'
  | 'work'
  | 'projects'
  | 'certification'
  | 'family';
type SectionStatus = 'verified' | 'pending' | 'rejected' | 'empty' | 'view_only';

const SIDE_TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: 'personal', label: 'Personal Information', icon: HiUser },
  { key: 'location', label: 'Location', icon: HiLocationMarker },
  { key: 'education', label: 'Educational Information', icon: HiAcademicCap },
  { key: 'social', label: 'Social Media Profiles', icon: HiShare },
  { key: 'work', label: 'Work Experience', icon: HiBriefcase },
  { key: 'projects', label: 'Projects', icon: HiFolder },
  { key: 'certification', label: 'Certification', icon: HiBadgeCheck },
  { key: 'family', label: 'Family & Relationship', icon: HiUsers },
];

const SOCIAL_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  snapchat: 'Snapchat',
};

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm">{description}</p>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-500 mb-0.5">{label}</label>
      <p className="text-gray-900 break-words">{value ?? '—'}</p>
    </div>
  );
}

function humanizeKey(s?: string | null) {
  if (!s) return null;
  return String(s).replace(/_/g, ' ');
}

function formatDateish(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (typeof v === 'string' && /^\d{4}-\d{2}$/.test(v)) return v;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString();
}

function resolvePublicUrl(url: string | undefined | null): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  // Bare domain or "www." — treat as web URL, not API path
  if (/^[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+/.test(u) && !u.startsWith('/')) {
    return `https://${u.replace(/^\/+/, '')}`;
  }
  const base = String(api.defaults.baseURL || '').replace(/\/$/, '');
  const path = u.startsWith('/') ? u : `/${u}`;
  return `${base}${path}`;
}

function DocLink({ href, children }: { href: string; children: React.ReactNode }) {
  const full = resolvePublicUrl(href);
  if (!full) return <span className="text-gray-400">—</span>;
  return (
    <a href={full} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline font-medium">
      {children}
    </a>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-100 bg-gradient-to-b from-gray-50/80 to-white p-5 space-y-4">
      <div className="border-b border-gray-100 pb-3">
        <h3 className="text-sm font-semibold text-gray-900 tracking-wide">{title}</h3>
        {subtitle ? <p className="text-xs text-gray-500 mt-1">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'yes' | 'no' }) {
  const cls =
    tone === 'yes'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
      : tone === 'no'
        ? 'bg-gray-100 text-gray-600 border-gray-200'
        : 'bg-white text-gray-700 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${cls}`}>
      {children}
    </span>
  );
}

/** Matches VerificationCenter: self-declared rows do not go through org verification. */
function isSelfDeclarationMethod(v: unknown): boolean {
  const s = String(v ?? '')
    .toLowerCase()
    .replace(/-/g, '_');
  return s === 'self_declaration' || s === 'self_declared';
}

function isEducationSelfDeclared(edu: any): boolean {
  return isSelfDeclarationMethod(edu?.verificationMethod);
}

function isWorkSelfDeclared(exp: any): boolean {
  return isSelfDeclarationMethod(exp?.verificationMethod);
}

function isProjectSelfDeclared(proj: any): boolean {
  return (
    isSelfDeclarationMethod(proj?.verificationMethod) ||
    proj?.selfDeclared === true ||
    proj?.projectSelfDeclared === true
  );
}

function isCertSelfDeclared(cert: any): boolean {
  return !!(cert?.certSelfDeclared || cert?.selfDeclared);
}

function isLocationSelfDeclared(loc: any): boolean {
  const dt = String(loc?.documentType ?? '').toLowerCase();
  if (dt === 'self_declaration' || dt === 'self_declared') return true;
  return String(loc?.verificationStatus ?? '').toLowerCase() === 'self_declared';
}

function effectiveVerificationStatus(
  raw: string | undefined,
  selfDeclared: boolean,
): 'verified' | 'rejected' | 'pending' | 'under_review' {
  if (selfDeclared) return 'verified';
  const s = (raw || 'pending').toLowerCase();
  if (s === 'verified') return 'verified';
  if (s === 'rejected') return 'rejected';
  if (s === 'under_review') return 'under_review';
  return 'pending';
}

type VerifyModalKind = 'identity' | 'education' | 'experience' | 'project';

type ReviewModalState =
  | { open: false }
  | {
      open: true;
      variant: 'verify';
      kind: VerifyModalKind;
      entityId: string;
      title: string;
      selfDeclared: boolean;
      subtitle?: string;
      /** When false, modal is read-only (e.g. already verified). */
      allowDecision: boolean;
    }
  | {
      open: true;
      variant: 'cert';
      certIndex: number;
      title: string;
      selfDeclared: boolean;
    }
  | {
      open: true;
      variant: 'location';
      locationIndex: number;
      title: string;
      selfDeclared: boolean;
      /** When true, admin can approve/reject document-backed rows. */
      allowDecision: boolean;
    };

function VerificationReviewModal({
  state,
  onClose,
  onApprove,
  onReject,
  verifying,
  children,
}: {
  state: ReviewModalState;
  onClose: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  verifying: boolean;
  children?: React.ReactNode;
}) {
  if (!state.open) return null;
  const selfDeclared = state.selfDeclared;
  const isVerify = state.variant === 'verify';
  const allowDecision = isVerify && state.allowDecision;
  const showApproveReject =
    isVerify &&
    allowDecision &&
    !selfDeclared &&
    onApprove &&
    onReject &&
    (state.kind === 'identity' ||
      state.kind === 'education' ||
      state.kind === 'experience' ||
      state.kind === 'project');
  const showLocationApproveReject =
    state.variant === 'location' &&
    state.allowDecision &&
    !selfDeclared &&
    onApprove &&
    onReject;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verify-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[min(90vh,640px)] overflow-y-auto border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <h2 id="verify-modal-title" className="text-lg font-semibold text-gray-900 pr-8">
            {state.title}
          </h2>
          {state.variant === 'verify' && state.subtitle ? (
            <p className="text-sm text-gray-600">{state.subtitle}</p>
          ) : null}
          {selfDeclared ? (
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-sm text-emerald-900 leading-relaxed">
              This entry is <strong>self-declared</strong>. It is treated as <strong>verified</strong> for compliance and
              does not require admin approval or rejection.
            </div>
          ) : null}
          {state.variant === 'verify' && !selfDeclared && state.allowDecision ? (
            <p className="text-sm text-gray-600">
              Confirm the submitted evidence matches this record, then approve or reject. This updates the professional&apos;s
              verification status immediately.
            </p>
          ) : null}
          {state.variant === 'verify' && !selfDeclared && !state.allowDecision ? (
            <p className="text-sm text-gray-600">This record is already resolved. You can review details below; no approval action is available.</p>
          ) : null}
          {state.variant !== 'verify' ? (
            <p className="text-sm text-gray-600">
              {state.variant === 'cert'
                ? 'Review the certificate details below. Admin verification actions are not available for certifications in this console.'
                : state.variant === 'location' && state.allowDecision && !selfDeclared
                  ? 'Confirm the submitted evidence matches this address, then approve or reject. This updates the saved location row immediately.'
                  : 'Location entry details for your review.'}
            </p>
          ) : null}
          {children}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          {showApproveReject || showLocationApproveReject ? (
            <>
              <button
                type="button"
                onClick={() => onReject?.()}
                disabled={verifying}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => onApprove?.()}
                disabled={verifying}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 border border-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                {verifying ? 'Saving…' : 'Approve'}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ProfessionalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [professional, setProfessional] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('personal');
  const [verifying, setVerifying] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [verifyingComplete, setVerifyingComplete] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [reviewModal, setReviewModal] = useState<ReviewModalState>({ open: false });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen]);

  const fetchProfessional = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/v1/admin/professionals/${id}`);
      setProfessional(res.data?.data ?? null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load professional');
      setProfessional(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfessional();
  }, [id]);

  const handleVerify = async (
    type: 'identity' | 'education' | 'experience' | 'project',
    verificationId: string,
    status: 'verified' | 'rejected' = 'verified',
  ) => {
    if (!id) return;
    setVerifying(`${type}-${verificationId}`);
    try {
      await api.put(`/v1/admin/professionals/${id}/verify/${type}/${verificationId}`, { status });
      const label =
        type === 'project'
          ? 'Project'
          : type.charAt(0).toUpperCase() + type.slice(1);
      toast.success(status === 'verified' ? `${label} verified` : `${label} rejected`);
      fetchProfessional();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update verification');
    } finally {
      setVerifying(null);
    }
  };

  const handleVerifyLocation = async (locationIndex: number, status: 'verified' | 'rejected' = 'verified') => {
    if (!id) return;
    setVerifying(`location-${locationIndex}`);
    try {
      await api.put(`/v1/admin/professionals/${id}/verify-location/${locationIndex}`, { status });
      toast.success(status === 'verified' ? 'Location verified' : 'Location rejected');
      fetchProfessional();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update location verification');
    } finally {
      setVerifying(null);
    }
  };

  const closeReviewModal = () => setReviewModal({ open: false });

  const confirmVerifyFromModal = async (status: 'verified' | 'rejected') => {
    if (!reviewModal.open || reviewModal.variant !== 'verify') return;
    const { kind, entityId } = reviewModal;
    const type: 'identity' | 'education' | 'experience' | 'project' =
      kind === 'identity'
        ? 'identity'
        : kind === 'education'
          ? 'education'
          : kind === 'experience'
            ? 'experience'
            : 'project';
    await handleVerify(type, entityId, status);
    closeReviewModal();
  };

  const confirmLocationVerifyFromModal = async (status: 'verified' | 'rejected') => {
    if (!reviewModal.open || reviewModal.variant !== 'location') return;
    await handleVerifyLocation(reviewModal.locationIndex, status);
    closeReviewModal();
  };

  const handleApprove = async () => {
    if (!professional?.user?.id) return;
    setUpdating(true);
    try {
      await api.put(`/v1/admin/users/${professional.user.id}/activate`);
      toast.success('Professional approved');
      setProfessional((prev: any) => ({
        ...prev,
        user: { ...prev.user, status: 'ACTIVE' },
      }));
      fetchProfessional();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally {
      setUpdating(false);
    }
  };

  const handleUnapprove = async () => {
    if (!professional?.user?.id) return;
    setUpdating(true);
    try {
      await api.put(`/v1/admin/users/${professional.user.id}/suspend`);
      toast.success('Professional suspended');
      setProfessional((prev: any) => ({
        ...prev,
        user: { ...prev.user, status: 'SUSPENDED' },
      }));
      fetchProfessional();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to suspend');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 text-center text-gray-600">Loading...</div>
      </AdminLayout>
    );
  }

  if (!professional) {
    return (
      <AdminLayout>
        <div className="p-6 text-center text-gray-600">Professional not found</div>
      </AdminLayout>
    );
  }

  const user = professional.user || {};
  const education = professional.education || [];
  const workExperience = professional.workExperience || [];
  const projects = professional.projects || professional.professionalProjects || [];
  const socialMedia = professional.socialMedia || {};
  const identityVerification = professional.identityVerification;
  const addressData = professional.address && typeof professional.address === 'object' ? professional.address : {};
  type LocationRow = {
    country?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    documentType?: string;
    documentUrl?: string;
    isDefault?: boolean;
    residenceType?: string;
    verificationStatus?: string;
  };
  const locationsList: LocationRow[] =
    Array.isArray(professional.locations) && professional.locations.length > 0
      ? professional.locations
      : professional.country || addressData.address || addressData.city || addressData.state
        ? [
            {
              country: professional.country || addressData.country,
              address: addressData.address ?? (typeof professional.address === 'string' ? professional.address : ''),
              city: addressData.city ?? professional.city,
              state: addressData.state ?? professional.state,
              postalCode: addressData.postalCode ?? addressData.zip,
              documentType: (professional as any).locationDocumentType,
              documentUrl: (professional as any).locationDocumentUrl,
            },
          ]
        : [];
  const displayLocations: LocationRow[] =
    locationsList.length > 0
      ? locationsList
      : (professional as any).locationDocumentUrl || (professional as any).locationDocumentType
        ? [
            {
              country: professional.country || undefined,
              address: addressData.address ?? (typeof professional.address === 'string' ? professional.address : undefined),
              city: addressData.city ?? professional.city,
              state: addressData.state ?? professional.state,
              postalCode: addressData.postalCode ?? addressData.zip,
              documentType: (professional as any).locationDocumentType,
              documentUrl: (professional as any).locationDocumentUrl,
            },
          ]
        : [];
  const certificationsRaw = professional.certifications;
  const certifications = Array.isArray(certificationsRaw)
    ? certificationsRaw
    : Array.isArray((certificationsRaw as any)?.items)
      ? (certificationsRaw as any).items
      : certificationsRaw
        ? [certificationsRaw]
        : [];
  const familyInfo =
    professional.familyInfo && typeof professional.familyInfo === 'object'
      ? (professional.familyInfo as {
          maritalStatus?: string;
          spouseName?: string;
          relations?: Array<{ relationType?: string; fullName?: string }>;
        })
      : null;
  const familyRelationsFromInfo = Array.isArray(familyInfo?.relations) ? familyInfo!.relations! : [];
  const familyRelations =
    familyRelationsFromInfo.length > 0
      ? familyRelationsFromInfo
      : professional.familyRelations || professional.family || [];
  const hasFamilySummary =
    !!(familyInfo?.maritalStatus?.trim() || familyInfo?.spouseName?.trim()) || familyRelations.length > 0;

  const hasPersonalData =
    user.firstName ||
    user.lastName ||
    user.email ||
    user.phoneNumber ||
    professional.dateOfBirth ||
    professional.nationality ||
    professional.country ||
    professional.description ||
    professional.profession ||
    professional.timezone ||
    professional.profileImageUrl ||
    professional.livenessSelfieUrl ||
    professional.idDocumentUrl ||
    professional.idNumber ||
    identityVerification;
  const hasSocialData = Object.keys(socialMedia).some((k) => socialMedia[k]);

  const getSectionStatus = (key: TabKey): SectionStatus => {
    switch (key) {
      case 'personal': {
        if (!identityVerification) {
          return hasPersonalData ? 'view_only' : 'empty';
        }
        const s = identityVerification.status || professional.identityStatus;
        if (s === 'verified') return 'verified';
        if (s === 'rejected') return 'rejected';
        if (s === 'pending' || s === 'under_review') return 'pending';
        return hasPersonalData ? 'view_only' : 'empty';
      }
      case 'location':
        return displayLocations.length > 0 ? 'view_only' : 'empty';
      case 'education': {
        if (education.length === 0) return 'empty';
        const eff = (e: any) => effectiveVerificationStatus(e.verificationStatus, isEducationSelfDeclared(e));
        const hasPending = education.some((e: any) => {
          const s = eff(e);
          return s === 'pending' || s === 'under_review';
        });
        const hasRejected = education.some((e: any) => eff(e) === 'rejected');
        const allVerified = education.every((e: any) => eff(e) === 'verified');
        if (hasPending) return 'pending';
        if (allVerified) return 'verified';
        if (hasRejected) return 'rejected';
        return 'empty';
      }
      case 'social':
        return hasSocialData ? 'view_only' : 'empty';
      case 'work': {
        if (workExperience.length === 0) return 'empty';
        const eff = (w: any) => effectiveVerificationStatus(w.verificationStatus, isWorkSelfDeclared(w));
        const hasPending = workExperience.some((w: any) => {
          const s = eff(w);
          return s === 'pending' || s === 'under_review';
        });
        const hasRejected = workExperience.some((w: any) => eff(w) === 'rejected');
        const allVerified = workExperience.every((w: any) => eff(w) === 'verified');
        if (hasPending) return 'pending';
        if (allVerified) return 'verified';
        if (hasRejected) return 'rejected';
        return 'empty';
      }
      case 'projects': {
        if (projects.length === 0) return 'empty';
        const eff = (p: any) => effectiveVerificationStatus(p.verificationStatus, isProjectSelfDeclared(p));
        const hasPending = projects.some((p: any) => {
          const s = eff(p);
          return s === 'pending' || s === 'under_review';
        });
        const hasRejected = projects.some((p: any) => eff(p) === 'rejected');
        const allVerified = projects.every((p: any) => eff(p) === 'verified');
        if (hasPending) return 'pending';
        if (allVerified) return 'verified';
        if (hasRejected) return 'rejected';
        return 'empty';
      }
      case 'certification': {
        if (certifications.length === 0) return 'empty';
        const eff = (c: any) => {
          if (isCertSelfDeclared(c)) return 'verified' as const;
          if (c.verificationStatus === 'verified' || c.certVerificationStatus === 'verified' || c.verified === true) {
            return 'verified' as const;
          }
          if (c.verificationStatus === 'rejected') return 'rejected' as const;
          const s = c.verificationStatus || c.certVerificationStatus || 'pending';
          return s === 'under_review' ? ('under_review' as const) : ('pending' as const);
        };
        const hasPending = certifications.some((c: any) => {
          const s = eff(c);
          return s === 'pending' || s === 'under_review';
        });
        const hasRejected = certifications.some((c: any) => eff(c) === 'rejected');
        const allVerified = certifications.every((c: any) => eff(c) === 'verified');
        if (hasPending) return 'pending';
        if (allVerified && certifications.length > 0) return 'verified';
        if (hasRejected) return 'rejected';
        return 'view_only';
      }
      case 'family':
        return hasFamilySummary ? 'view_only' : 'empty';
      default:
        return 'empty';
    }
  };

  const canVerifyProfessional =
    getSectionStatus('personal') === 'verified' &&
    (education.length === 0 || getSectionStatus('education') === 'verified') &&
    (workExperience.length === 0 || getSectionStatus('work') === 'verified') &&
    (projects.length === 0 || getSectionStatus('projects') === 'verified');
  const verifiedByAdminAt = professional.verifiedByAdminAt
    ? new Date(professional.verifiedByAdminAt)
    : null;

  const handleVerifyProfessional = async () => {
    if (!id || !canVerifyProfessional) return;
    setVerifyingComplete(true);
    try {
      await api.put(`/v1/admin/professionals/${id}/verification-complete`);
      toast.success('Professional marked as fully verified');
      fetchProfessional();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to verify professional');
    } finally {
      setVerifyingComplete(false);
    }
  };

  const statusLabel: Record<SectionStatus, string> = {
    verified: 'Verified',
    pending: 'Pending',
    rejected: 'Rejected',
    empty: 'Not submitted',
    view_only: 'View only',
  };
  const statusBadgeClass: Record<SectionStatus, string> = {
    verified: 'bg-green-100 text-green-800',
    pending: 'bg-amber-100 text-amber-800',
    rejected: 'bg-red-100 text-red-800',
    empty: 'bg-gray-100 text-gray-600',
    view_only: 'bg-gray-100 text-gray-600',
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <button
          onClick={() => navigate('/admin/professionals')}
          className="mb-6 flex items-center text-brand-600 hover:text-brand-700"
        >
          <HiArrowLeft className="w-5 h-5 mr-2" />
          Back to Professionals
        </button>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center">
                <HiUser className="w-7 h-7 text-brand-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-gray-600 text-sm">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  {user.status === 'ACTIVE' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <HiCheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </span>
                  ) : user.status === 'SUSPENDED' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <HiXCircle className="w-3 h-3 mr-1" />
                      Suspended
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <HiClock className="w-3 h-3 mr-1" />
                      {user.status || 'Pending'}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    Profile: {professional.profileCompleteness ?? 0}%
                  </span>
                  {verifiedByAdminAt && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      <HiBadgeCheck className="w-3 h-3 mr-1" />
                      Fully verified {verifiedByAdminAt.toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  aria-label="User actions"
                >
                  <HiDotsVertical className="w-5 h-5" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 py-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-10">
                    {user.status !== 'ACTIVE' ? (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleApprove();
                        }}
                        disabled={updating}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <HiCheckCircle className="w-4 h-4" />
                        {updating ? 'Approving...' : 'Approve user'}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleUnapprove();
                        }}
                        disabled={updating}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <HiXCircle className="w-4 h-4" />
                        {updating ? 'Suspending...' : 'Suspend'}
                      </button>
                    )}
                  </div>
                )}
              </div>
              {canVerifyProfessional && !verifiedByAdminAt && (
                <button
                  onClick={handleVerifyProfessional}
                  disabled={verifyingComplete}
                  className="px-4 py-2 bg-brand-50 text-brand-700 border border-brand-200 rounded-lg hover:bg-brand-100 text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {verifyingComplete ? 'Verifying...' : 'Verify professional'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Side menu */}
          <nav className="lg:w-56 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {SIDE_TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors border-b border-gray-100 last:border-b-0 ${
                    activeTab === key
                      ? 'bg-brand-50 text-brand-700 border-l-4 border-l-brand-500'
                      : 'text-gray-700 hover:bg-gray-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {/* Personal Information — dot-to-dot with /professional/verification */}
              {activeTab === 'personal' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Personal Information
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass[getSectionStatus('personal')]}`}>
                        {statusLabel[getSectionStatus('personal')]}
                      </span>
                      {identityVerification ? (
                        <button
                          type="button"
                          onClick={() =>
                            setReviewModal({
                              open: true,
                              variant: 'verify',
                              kind: 'identity',
                              entityId: identityVerification.id,
                              title: 'Identity verification',
                              subtitle: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined,
                              selfDeclared: false,
                              allowDecision: identityVerification.status !== 'verified',
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100 transition-colors"
                        >
                          <HiCheckCircle className="w-4 h-4" />
                          {identityVerification.status === 'verified'
                            ? 'View identity record'
                            : 'Review identity'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {!hasPersonalData ? (
                    <EmptyState
                      icon={HiUser}
                      title="No personal data"
                      description="This professional has not added personal or identity information yet."
                    />
                  ) : (
                    <div className="space-y-8">
                      <SectionCard title="Account & contact" subtitle="Matches sign-up and verification contact details.">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FieldRow label="Email address" value={user.email} />
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-0.5">Email verified</label>
                            <p className="text-gray-900">
                              <Pill tone={user.emailVerified ? 'yes' : 'no'}>{user.emailVerified ? 'Yes' : 'No'}</Pill>
                            </p>
                          </div>
                          <FieldRow label="Phone number" value={user.phoneNumber} />
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-0.5">Phone verified</label>
                            <p className="text-gray-900">
                              <Pill tone={user.phoneVerified ? 'yes' : 'no'}>{user.phoneVerified ? 'Yes' : 'No'}</Pill>
                            </p>
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard title="Legal name & demographics" subtitle="As collected on the verification profile.">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FieldRow label="First name" value={user.firstName} />
                          <FieldRow label="Last name" value={user.lastName} />
                          <FieldRow label="Middle / other names" value={addressData.middleName ?? professional.middleName} />
                          <FieldRow
                            label="Date of birth"
                            value={
                              professional.dateOfBirth
                                ? new Date(professional.dateOfBirth).toLocaleDateString()
                                : null
                            }
                          />
                          <FieldRow label="Gender" value={humanizeKey(addressData.gender ?? professional.gender)} />
                          <FieldRow label="Nationality" value={professional.nationality} />
                          <FieldRow label="Country of residence" value={professional.country} />
                          <FieldRow label="Profession" value={professional.profession} />
                          <FieldRow label="Timezone" value={professional.timezone} />
                        </div>
                      </SectionCard>

                      <SectionCard title="Address (legacy / profile block)" subtitle="Single address when not using multi-location rows.">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <FieldRow label="Street address" value={addressData.address ?? professional.address} />
                          </div>
                          <FieldRow label="City" value={addressData.city ?? professional.city} />
                          <FieldRow label="State / region" value={addressData.state ?? professional.state} />
                          <FieldRow label="Postal / ZIP" value={addressData.postalCode ?? addressData.zip} />
                        </div>
                      </SectionCard>

                      <SectionCard title="About" subtitle="Professional summary from verification.">
                        <FieldRow label="Bio / description" value={professional.description} />
                      </SectionCard>

                      <SectionCard title="Photos & government ID (profile)" subtitle="Assets stored on the professional record.">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-0.5">Profile photo</label>
                            {professional.profileImageUrl || professional.profileImage ? (
                              <DocLink href={(professional.profileImageUrl || professional.profileImage) as string}>
                                View image
                              </DocLink>
                            ) : (
                              <p className="text-gray-900">—</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-0.5">Liveness selfie</label>
                            {professional.livenessSelfieUrl ? (
                              <DocLink href={professional.livenessSelfieUrl}>View selfie</DocLink>
                            ) : (
                              <p className="text-gray-900">—</p>
                            )}
                          </div>
                          <FieldRow
                            label="ID type (profile)"
                            value={professional.idType ? humanizeKey(String(professional.idType)) : null}
                          />
                          <FieldRow label="ID number (profile)" value={professional.idNumber} />
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-500 mb-0.5">ID document (profile)</label>
                            {professional.idDocumentUrl ? (
                              <DocLink href={professional.idDocumentUrl}>Open document</DocLink>
                            ) : (
                              <p className="text-gray-900">—</p>
                            )}
                          </div>
                          <div className="md:col-span-2 flex flex-wrap gap-2 items-center text-sm">
                            <span className="text-gray-500">Identity flag:</span>
                            <Pill tone={professional.identityVerified ? 'yes' : 'no'}>
                              {professional.identityVerified ? 'Marked verified' : 'Not marked verified'}
                            </Pill>
                            {professional.identityStatus ? (
                              <Pill>{humanizeKey(String(professional.identityStatus))}</Pill>
                            ) : null}
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard title="Identity verification (submitted)" subtitle="Structured identity check used for admin validation.">
                        {identityVerification ? (
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs text-gray-500">Status</span>
                              <span
                                className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                  identityVerification.status || 'pending',
                                )}`}
                              >
                                {humanizeKey(String(identityVerification.status || 'pending'))}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FieldRow
                                label="ID type"
                                value={
                                  identityVerification.idType
                                    ? humanizeKey(String(identityVerification.idType))
                                    : null
                                }
                              />
                              <FieldRow label="ID number" value={identityVerification.idNumber} />
                              <FieldRow label="Nationality (ID)" value={identityVerification.nationality} />
                              <FieldRow
                                label="Date of birth (ID)"
                                value={
                                  identityVerification.dateOfBirth
                                    ? new Date(identityVerification.dateOfBirth).toLocaleDateString()
                                    : null
                                }
                              />
                              <FieldRow label="Reviewed by" value={identityVerification.reviewedBy} />
                              <FieldRow
                                label="Verified at"
                                value={
                                  identityVerification.verifiedAt
                                    ? new Date(identityVerification.verifiedAt).toLocaleString()
                                    : null
                                }
                              />
                            </div>
                            {identityVerification.livenessCheckData != null &&
                            typeof identityVerification.livenessCheckData === 'object' &&
                            Object.keys(identityVerification.livenessCheckData).length > 0 ? (
                              <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Liveness check data</label>
                                <pre className="text-xs bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto max-h-48 text-gray-800">
                                  {JSON.stringify(identityVerification.livenessCheckData, null, 2)}
                                </pre>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">No identity verification record submitted.</p>
                        )}
                      </SectionCard>
                    </div>
                  )}
                </div>
              )}

              {/* Location — matches VerificationCenter */}
              {activeTab === 'location' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                    <h2 className="text-lg font-semibold text-gray-900">Location</h2>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass[getSectionStatus('location')]}`}>
                      {statusLabel[getSectionStatus('location')]}
                    </span>
                  </div>
                  {displayLocations.length === 0 ? (
                    <EmptyState
                      icon={HiLocationMarker}
                      title="No location data"
                      description="This professional has not added location or address information yet."
                    />
                  ) : (
                    <div className="space-y-6">
                      {displayLocations.map((loc, index) => {
                        const locSelf = isLocationSelfDeclared(loc);
                        return (
                        <div key={index} className="rounded-xl border border-gray-200 overflow-hidden">
                          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                            <span className="text-sm font-semibold text-gray-900">Location {index + 1}</span>
                            <div className="flex flex-wrap gap-2">
                              {loc.isDefault ? <Pill tone="yes">Default</Pill> : <Pill>Secondary</Pill>}
                              {loc.residenceType ? <Pill>{humanizeKey(loc.residenceType)}</Pill> : null}
                              {locSelf ? <Pill tone="yes">Self-declared</Pill> : null}
                            </div>
                          </div>
                          <div className="p-4 md:p-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FieldRow label="Country" value={loc.country} />
                              <FieldRow label="Postal / ZIP" value={loc.postalCode} />
                              <div className="md:col-span-2">
                                <FieldRow label="Address" value={loc.address} />
                              </div>
                              <FieldRow label="City" value={loc.city} />
                              <FieldRow label="State / region" value={loc.state} />
                              {(loc.documentType || loc.documentUrl) && (
                                <>
                                  <FieldRow
                                    label="Verification path"
                                    value={humanizeKey(loc.documentType)}
                                  />
                                  <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-500 mb-0.5">Proof document</label>
                                    {loc.documentUrl ? (
                                      <DocLink href={loc.documentUrl}>Open uploaded proof</DocLink>
                                    ) : (
                                      <p className="text-gray-900">—</p>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2 px-4 md:px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                            <button
                              type="button"
                              onClick={() => {
                                const vs = String(loc.verificationStatus ?? '').toLowerCase();
                                const resolved = vs === 'verified' || vs === 'rejected';
                                const dt = String(loc.documentType ?? '')
                                  .toLowerCase()
                                  .replace(/-/g, '_');
                                const isDigitalVerify = dt === 'digital_verify';
                                const hasUpload = !!String(loc.documentUrl ?? '').trim();
                                const allowDecision =
                                  !locSelf &&
                                  !isDigitalVerify &&
                                  !resolved &&
                                  (hasUpload || (!!dt && dt !== 'self_declaration' && dt !== 'self_declared'));
                                setReviewModal({
                                  open: true,
                                  variant: 'location',
                                  locationIndex: index,
                                  title: `Location ${index + 1}`,
                                  selfDeclared: locSelf,
                                  allowDecision,
                                });
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100 transition-colors"
                            >
                              <HiLocationMarker className="w-4 h-4 flex-shrink-0" />
                              View details
                            </button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Educational Information */}
              {activeTab === 'education' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Educational Information
                    </h2>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass[getSectionStatus('education')]}`}>
                      {statusLabel[getSectionStatus('education')]}
                    </span>
                  </div>
                  {education.length === 0 ? (
                    <EmptyState
                      icon={HiAcademicCap}
                      title="No education records"
                      description="This professional has not added any educational information."
                    />
                  ) : (
                    <div className="space-y-6">
                      {education.map((edu: any) => {
                        const eduSelf = isEducationSelfDeclared(edu);
                        const eduEff = effectiveVerificationStatus(edu.verificationStatus, eduSelf);
                        return (
                        <div
                          key={edu.id}
                          className="rounded-xl border border-gray-200 overflow-hidden space-y-0"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                            <span className="text-sm font-semibold text-gray-900 truncate">{edu.institutionName || 'Education record'}</span>
                            <div className="flex flex-wrap gap-2">
                              {edu.isDefault ? <Pill tone="yes">Default education</Pill> : null}
                              {eduSelf ? <Pill tone="yes">Self-declared</Pill> : null}
                              {edu.verificationMethod && !eduSelf ? <Pill>{humanizeKey(edu.verificationMethod)}</Pill> : null}
                              {edu.currentlyAttending ? <Pill>Currently attending</Pill> : null}
                            </div>
                          </div>
                          <div className="p-4 md:p-5 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldRow label="Level of education" value={edu.levelOfEducation?.replace(/_/g, ' ')} />
                            <FieldRow label="Program level" value={humanizeKey(edu.programLevel)} />
                            <FieldRow label="School type" value={humanizeKey(edu.schoolType)} />
                            <FieldRow label="Degree type" value={edu.degreeType} />
                            <FieldRow label="Institution" value={edu.institutionName} />
                            <FieldRow label="Industry / sector" value={edu.institutionIndustry} />
                            <FieldRow
                              label="Duration / period"
                              value={
                                edu.startDate
                                  ? `${edu.startDate} – ${
                                      edu.currentlyAttending ? 'Present' : edu.endDate || '—'
                                    }`
                                  : null
                              }
                            />
                            <FieldRow
                              label="Cost of education"
                              value={
                                edu.costOfEducation != null
                                  ? `${edu.currency || ''} ${Number(edu.costOfEducation).toLocaleString()}`
                                  : null
                              }
                            />
                            <FieldRow
                              label="Pending loan"
                              value={
                                edu.pendingLoanAmount != null
                                  ? `${edu.loanCurrency || ''} ${Number(edu.pendingLoanAmount).toLocaleString()}${
                                      edu.loanRepaymentFrequency
                                        ? ` · Repayment: ${humanizeKey(edu.loanRepaymentFrequency)}`
                                        : ''
                                    }`
                                  : null
                              }
                            />
                            <FieldRow label="Scholarships & aid" value={edu.scholarshipsAndAid} />
                            <FieldRow label="Country" value={edu.country} />
                            <FieldRow label="Field of study" value={edu.fieldOfStudy} />
                            <FieldRow label="Grade" value={edu.grade} />
                            <FieldRow label="Program description" value={edu.programDescription} />
                            <FieldRow label="Coursework & responsibilities" value={edu.academicResponsibilities} />
                            <FieldRow label="Honors & achievements" value={edu.academicAchievements} />
                            <FieldRow label="Activities & societies" value={edu.activitiesSocieties} />
                            <FieldRow label="Associated skills" value={edu.associatedSkills} />
                            {edu.supportingMediaUrl ? (
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-500 mb-0.5">Supporting media</label>
                                <DocLink href={edu.supportingMediaUrl}>Open supporting file</DocLink>
                              </div>
                            ) : null}
                            {Array.isArray(edu.verificationDocuments) && edu.verificationDocuments.length > 0 ? (
                              <div className="md:col-span-2 space-y-2">
                                <label className="block text-sm font-medium text-gray-500">Verification documents</label>
                                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                                  {edu.verificationDocuments.map((doc: any, dIdx: number) => (
                                    <li key={dIdx} className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                                      <span className="text-gray-800">
                                        <span className="font-medium">{doc.fileName || 'Document'}</span>
                                        {doc.type ? (
                                          <span className="text-gray-500"> · {humanizeKey(doc.type)}</span>
                                        ) : null}
                                      </span>
                                      {doc.fileUrl ? <DocLink href={doc.fileUrl}>Open</DocLink> : <span className="text-gray-400">—</span>}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            <FieldRow
                              label="Verified at"
                              value={edu.verifiedAt ? new Date(edu.verifiedAt).toLocaleString() : null}
                            />
                            <FieldRow label="Reviewed by" value={edu.reviewedBy} />
                          </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 px-4 md:px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                eduEff,
                              )}`}
                            >
                              {eduSelf
                                ? 'Verified · self-declared'
                                : (eduEff.charAt(0).toUpperCase() + eduEff.slice(1)).replace(/_/g, ' ')}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setReviewModal({
                                  open: true,
                                  variant: 'verify',
                                  kind: 'education',
                                  entityId: edu.id,
                                  title: 'Education verification',
                                  subtitle: edu.institutionName || undefined,
                                  selfDeclared: eduSelf,
                                  allowDecision: !eduSelf && edu.verificationStatus !== 'verified',
                                })
                              }
                              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100 transition-colors"
                            >
                              <HiCheckCircle className="w-4 h-4 flex-shrink-0" />
                              {eduSelf
                                ? 'View declaration'
                                : edu.verificationStatus === 'verified'
                                  ? 'View record'
                                  : 'Review verification'}
                            </button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Social Media — dot-to-dot */}
              {activeTab === 'social' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Social Media Profiles
                    </h2>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass[getSectionStatus('social')]}`}>
                      {statusLabel[getSectionStatus('social')]}
                    </span>
                  </div>
                  {!hasSocialData ? (
                    <EmptyState
                      icon={HiShare}
                      title="No social profiles connected"
                      description="This professional has not linked any social media accounts."
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {['linkedin', 'twitter', 'facebook', 'instagram', 'tiktok', 'snapchat'].map((key) => {
                        const raw = socialMedia[key];
                        const url = typeof raw === 'string' ? raw.trim() : '';
                        const resolved = url ? resolvePublicUrl(url) : null;
                        return (
                          <div
                            key={key}
                            className="rounded-xl border border-gray-200 p-4 flex flex-col gap-2 bg-gradient-to-b from-gray-50/60 to-white"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-gray-900">{SOCIAL_LABELS[key] || key}</span>
                              {url ? <Pill tone="yes">Linked</Pill> : <Pill>Not linked</Pill>}
                            </div>
                            {resolved ? (
                              <a
                                href={resolved}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-brand-600 hover:underline break-all"
                              >
                                {resolved}
                              </a>
                            ) : (
                              <p className="text-sm text-gray-500">No URL saved for this network.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Work Experience — dot-to-dot */}
              {activeTab === 'work' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Work Experience
                    </h2>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass[getSectionStatus('work')]}`}>
                      {statusLabel[getSectionStatus('work')]}
                    </span>
                  </div>
                  {workExperience.length === 0 ? (
                    <EmptyState
                      icon={HiBriefcase}
                      title="No work experience"
                      description="This professional has not added any work experience."
                    />
                  ) : (
                    <div className="space-y-6">
                      {workExperience.map((exp: any) => {
                        const loc = exp.location && typeof exp.location === 'object' ? exp.location : {};
                        const salaryRange =
                          exp.salaryRange && typeof exp.salaryRange === 'object' ? exp.salaryRange : {};
                        const sal =
                          salaryRange.min != null || salaryRange.max != null
                            ? `${exp.currency || ''} ${[salaryRange.min, salaryRange.max].filter((v) => v != null && v !== '').join(' – ')}`.trim()
                            : null;
                        const workSelf = isWorkSelfDeclared(exp);
                        const workEff = effectiveVerificationStatus(exp.verificationStatus, workSelf);
                        const responsibilities = Array.isArray(exp.responsibilities)
                          ? exp.responsibilities.filter((x: unknown) => typeof x === 'string' && String(x).trim())
                          : [];
                        const achievements = Array.isArray(exp.achievements)
                          ? exp.achievements.filter((x: unknown) => typeof x === 'string' && String(x).trim())
                          : [];
                        const roleLoc =
                          typeof (loc as any).roleLocation === 'string'
                            ? String((loc as any).roleLocation).trim()
                            : '';
                        const legacyLoc = [loc.address, loc.city, loc.state, loc.country, loc.postalCode]
                          .filter((x: unknown) => typeof x === 'string' && x.trim())
                          .join(', ');
                        const locationLine = roleLoc || legacyLoc;
                        return (
                          <div
                            key={exp.id}
                            className="rounded-xl border border-gray-200 overflow-hidden space-y-0"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                              <span className="text-sm font-semibold text-gray-900 truncate">
                                {exp.organisationName || 'Work experience'}
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {exp.currentlyWorking ? <Pill>Currently employed</Pill> : null}
                                {workSelf ? (
                                  <Pill tone="yes">Self-declared</Pill>
                                ) : (
                                  <Pill tone="yes">Standard verification</Pill>
                                )}
                              </div>
                            </div>
                            <div className="p-4 md:p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FieldRow label="Name of organisation" value={exp.organisationName} />
                              <FieldRow label="Industry / sector" value={exp.industry} />
                              <FieldRow label="Role / position" value={exp.role} />
                              <FieldRow
                                label="Employment type"
                                value={humanizeKey(String(exp.employmentType || ''))}
                              />
                              <FieldRow label="Work mode" value={humanizeKey(String(exp.workMode || ''))} />
                              <FieldRow label="Start date" value={exp.startDate} />
                              <FieldRow
                                label="End date"
                                value={exp.currentlyWorking ? 'Present' : exp.endDate || '—'}
                              />
                              <FieldRow label="Salary range" value={sal || null} />
                              <FieldRow
                                label="Pay / bonus frequency"
                                value={humanizeKey(String(exp.paymentMode || ''))}
                              />
                              {locationLine ? (
                                <div className="md:col-span-2">
                                  <FieldRow label="Role location" value={locationLine} />
                                </div>
                              ) : null}
                              {exp.verificationMethod || exp.workVerificationEmail || exp.supportingMediaUrl ? (
                                <div className="md:col-span-2 rounded-lg border border-gray-100 bg-white p-3 space-y-2">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Verification
                                  </p>
                                  {exp.verificationMethod ? (
                                    <FieldRow
                                      label="Method"
                                      value={humanizeKey(String(exp.verificationMethod))}
                                    />
                                  ) : null}
                                  {exp.workVerificationEmail ? (
                                    <FieldRow label="Work verification email" value={exp.workVerificationEmail} />
                                  ) : null}
                                  {exp.supportingMediaUrl ? (
                                    <FieldRow
                                      label="Supporting document"
                                      value={
                                        <DocLink href={String(exp.supportingMediaUrl)}>Open document</DocLink>
                                      }
                                    />
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                            {responsibilities.length > 0 ? (
                              <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Responsibilities</label>
                                <ul className="list-disc list-inside text-sm text-gray-900 space-y-1">
                                  {responsibilities.map((line: string, i: number) => (
                                    <li key={i}>{line}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            {achievements.length > 0 ? (
                              <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Achievements & highlights</label>
                                <ul className="list-disc list-inside text-sm text-gray-900 space-y-1">
                                  {achievements.map((line: string, i: number) => (
                                    <li key={i}>{line}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                              <FieldRow
                                label="Verified at"
                                value={exp.verifiedAt ? new Date(exp.verifiedAt).toLocaleString() : null}
                              />
                              <FieldRow label="Reviewed by" value={exp.reviewedBy} />
                            </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 px-4 md:px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                              <span
                                className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                  workEff,
                                )}`}
                              >
                                {workSelf
                                  ? 'Verified · self-declared'
                                  : (workEff.charAt(0).toUpperCase() + workEff.slice(1)).replace(/_/g, ' ')}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setReviewModal({
                                    open: true,
                                    variant: 'verify',
                                    kind: 'experience',
                                    entityId: exp.id,
                                    title: 'Work experience verification',
                                    subtitle: exp.organisationName || undefined,
                                    selfDeclared: workSelf,
                                    allowDecision: !workSelf && exp.verificationStatus !== 'verified',
                                  })
                                }
                                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100 transition-colors"
                              >
                                <HiCheckCircle className="w-4 h-4 flex-shrink-0" />
                                {workSelf
                                  ? 'View declaration'
                                  : exp.verificationStatus === 'verified'
                                    ? 'View record'
                                    : 'Review verification'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'projects' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                    <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass[getSectionStatus('projects')]}`}>
                        {statusLabel[getSectionStatus('projects')]}
                      </span>
                    </div>
                  </div>
                  {projects.length === 0 ? (
                    <EmptyState
                      icon={HiFolder}
                      title="No projects"
                      description="This professional has not added any projects."
                    />
                  ) : (
                    <div className="space-y-6">
                      {projects.map((proj: any) => {
                        const team = Array.isArray(proj.teamMembers) ? proj.teamMembers : [];
                        const projSelf = isProjectSelfDeclared(proj);
                        const projEff = effectiveVerificationStatus(proj.verificationStatus, projSelf);
                        return (
                          <div
                            key={proj.id}
                            className="rounded-xl border border-gray-200 overflow-hidden"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                              <span className="text-sm font-semibold text-gray-900 truncate">{proj.title || 'Project'}</span>
                              <div className="flex flex-wrap items-center gap-2">
                                {projSelf ? <Pill tone="yes">Self-declared</Pill> : null}
                                {proj.createdAt ? (
                                  <span className="text-xs text-gray-500">
                                    Added {new Date(proj.createdAt).toLocaleDateString()}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="p-4 md:p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FieldRow label="Project title" value={proj.title} />
                              <div className="md:col-span-2">
                                <FieldRow label="Description" value={proj.description} />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-500 mb-0.5">Project link</label>
                                {proj.projectLink ? (
                                  <DocLink href={proj.projectLink}>Open project URL</DocLink>
                                ) : (
                                  <p className="text-gray-900">—</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-500 mb-0.5">Media</label>
                                {proj.mediaUrl ? <DocLink href={proj.mediaUrl}>Open media</DocLink> : <p className="text-gray-900">—</p>}
                              </div>
                              {team.length > 0 && (
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-gray-500 mb-1">Team members</label>
                                  <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                                    {team.map((m: any, idx: number) => (
                                      <li key={idx} className="px-3 py-2 text-sm text-gray-900">
                                        {[m.name, m.role].filter(Boolean).join(' — ') || '—'}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <FieldRow
                                label="Verified at"
                                value={proj.verifiedAt ? new Date(proj.verifiedAt).toLocaleString() : null}
                              />
                              <FieldRow label="Reviewed by" value={proj.reviewedBy} />
                            </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 px-4 md:px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                              <span
                                className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                  projEff,
                                )}`}
                              >
                                {projSelf
                                  ? 'Verified · self-declared'
                                  : (projEff.charAt(0).toUpperCase() + projEff.slice(1)).replace(/_/g, ' ')}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setReviewModal({
                                    open: true,
                                    variant: 'verify',
                                    kind: 'project',
                                    entityId: proj.id,
                                    title: 'Project verification',
                                    subtitle: proj.title || undefined,
                                    selfDeclared: projSelf,
                                    allowDecision: !projSelf && proj.verificationStatus !== 'verified',
                                  })
                                }
                                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100 transition-colors"
                              >
                                <HiCheckCircle className="w-4 h-4 flex-shrink-0" />
                                {projSelf
                                  ? 'View declaration'
                                  : proj.verificationStatus === 'verified'
                                    ? 'View record'
                                    : 'Review verification'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Certification — show when professional has certifications */}
              {activeTab === 'certification' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Certification
                    </h2>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass[getSectionStatus('certification')]}`}>
                      {statusLabel[getSectionStatus('certification')]}
                    </span>
                  </div>
                  {certifications.length === 0 ? (
                    <EmptyState
                      icon={HiBadgeCheck}
                      title="No certification data"
                      description="This professional has not added any certifications yet."
                    />
                  ) : (
                    <div className="space-y-6">
                      {certifications.map((cert: any, idx: number) => {
                        const rawStatus =
                          cert.verificationStatus ||
                          (cert.certVerificationStatus === 'verified' || cert.verified ? 'verified' : null) ||
                          'pending';
                        const selfDeclared = !!(cert.certSelfDeclared || cert.selfDeclared);
                        return (
                          <div key={cert.id || `cert-${idx}`} className="rounded-xl border border-gray-200 overflow-hidden">
                            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                              <span className="text-sm font-semibold text-gray-900 truncate">{cert.name || 'Certificate'}</span>
                              <div className="flex flex-wrap gap-2">
                                {selfDeclared ? <Pill tone="yes">Self-declared</Pill> : <Pill tone="yes">Evidence on file</Pill>}
                                <span
                                  className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                                    selfDeclared ? 'verified' : String(rawStatus),
                                  )}`}
                                >
                                  {selfDeclared
                                    ? 'Verified · self-declared'
                                    : humanizeKey(String(rawStatus))}
                                </span>
                              </div>
                            </div>
                            <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FieldRow label="Certificate name" value={cert.name} />
                              <FieldRow label="Issued by" value={cert.issuedBy} />
                              <FieldRow label="Issued date" value={formatDateish(cert.issuedDate)} />
                              <FieldRow label="Expiration date" value={formatDateish(cert.expirationDate)} />
                              <FieldRow label="Credential ID" value={cert.credentialId} />
                              <div>
                                <label className="block text-sm font-medium text-gray-500 mb-0.5">Reporting / credential URL</label>
                                {cert.reportingUrl ? <DocLink href={cert.reportingUrl}>Open reporting page</DocLink> : <p className="text-gray-900">—</p>}
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-500 mb-0.5">Supporting media</label>
                                {cert.supportingMediaUrl || cert.documentUrl ? (
                                  <DocLink href={cert.supportingMediaUrl || cert.documentUrl}>View evidence</DocLink>
                                ) : (
                                  <p className="text-gray-900">—</p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2 px-4 md:px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                              <button
                                type="button"
                                onClick={() =>
                                  setReviewModal({
                                    open: true,
                                    variant: 'cert',
                                    certIndex: idx,
                                    title: cert.name || 'Certificate',
                                    selfDeclared,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100 transition-colors"
                              >
                                <HiBadgeCheck className="w-4 h-4 flex-shrink-0" />
                                View certificate
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Family & Relationship — show when professional has family relations */}
              {activeTab === 'family' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Family & Relationship
                    </h2>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass[getSectionStatus('family')]}`}>
                      {statusLabel[getSectionStatus('family')]}
                    </span>
                  </div>
                  {!hasFamilySummary ? (
                    <EmptyState
                      icon={HiUsers}
                      title="No family data"
                      description="This professional has not added any family or relationship information yet."
                    />
                  ) : (
                    <div className="space-y-6">
                      <SectionCard title="Relationship status" subtitle="As saved on the professional profile.">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FieldRow label="Marital status" value={humanizeKey(familyInfo?.maritalStatus)} />
                          <FieldRow label="Spouse / partner name" value={familyInfo?.spouseName} />
                        </div>
                      </SectionCard>
                      {familyRelations.length > 0 ? (
                        <SectionCard title="Family & dependents" subtitle="Each relation collected during verification.">
                          <div className="space-y-3">
                            {familyRelations.map((rel: any, idx: number) => (
                              <div
                                key={rel.id || idx}
                                className="rounded-lg border border-gray-200 bg-white px-4 py-3 flex flex-wrap items-baseline justify-between gap-2"
                              >
                                <span className="text-sm font-medium text-gray-900">{rel.fullName || '—'}</span>
                                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                  {humanizeKey(rel.relationType) || 'Relation'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </SectionCard>
                      ) : (
                        <p className="text-sm text-gray-500">No individual relations listed beyond marital status.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <VerificationReviewModal
        state={reviewModal}
        onClose={closeReviewModal}
        onApprove={
          reviewModal.open && reviewModal.variant === 'verify' && reviewModal.allowDecision
            ? () => {
                void confirmVerifyFromModal('verified');
              }
            : reviewModal.open && reviewModal.variant === 'location' && reviewModal.allowDecision && !reviewModal.selfDeclared
              ? () => {
                  void confirmLocationVerifyFromModal('verified');
                }
              : undefined
        }
        onReject={
          reviewModal.open && reviewModal.variant === 'verify' && reviewModal.allowDecision
            ? () => {
                void confirmVerifyFromModal('rejected');
              }
            : reviewModal.open && reviewModal.variant === 'location' && reviewModal.allowDecision && !reviewModal.selfDeclared
              ? () => {
                  void confirmLocationVerifyFromModal('rejected');
                }
              : undefined
        }
        verifying={!!verifying}
      >
        {reviewModal.open && reviewModal.variant === 'verify' && reviewModal.kind === 'identity' && identityVerification ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm border border-gray-100 rounded-lg p-4 bg-white">
            <FieldRow
              label="ID type"
              value={identityVerification.idType ? humanizeKey(String(identityVerification.idType)) : null}
            />
            <FieldRow label="ID number" value={identityVerification.idNumber} />
            <FieldRow label="Nationality" value={identityVerification.nationality} />
            <FieldRow
              label="Date of birth"
              value={
                identityVerification.dateOfBirth
                  ? new Date(identityVerification.dateOfBirth).toLocaleDateString()
                  : null
              }
            />
            <FieldRow label="Status" value={humanizeKey(String(identityVerification.status || ''))} />
          </div>
        ) : null}
        {reviewModal.open && reviewModal.variant === 'verify' && reviewModal.kind === 'education' ? (() => {
          const edu = education.find((e: any) => e.id === reviewModal.entityId);
          if (!edu) return null;
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm border border-gray-100 rounded-lg p-4 bg-white">
              <FieldRow label="Institution" value={edu.institutionName} />
              <FieldRow label="Degree" value={edu.degreeType} />
              <FieldRow label="Field of study" value={edu.fieldOfStudy} />
              <FieldRow label="Country" value={edu.country} />
              <FieldRow label="Level" value={humanizeKey(String(edu.levelOfEducation || ''))} />
              <FieldRow
                label="Period"
                value={
                  edu.startDate
                    ? `${edu.startDate} – ${edu.currentlyAttending ? 'Present' : edu.endDate || '—'}`
                    : null
                }
              />
            </div>
          );
        })() : null}
        {reviewModal.open && reviewModal.variant === 'verify' && reviewModal.kind === 'experience' ? (() => {
          const exp = workExperience.find((w: any) => w.id === reviewModal.entityId);
          if (!exp) return null;
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm border border-gray-100 rounded-lg p-4 bg-white">
              <FieldRow label="Organisation" value={exp.organisationName} />
              <FieldRow label="Role" value={exp.role} />
              <FieldRow label="Industry" value={exp.industry} />
              <FieldRow label="Employment type" value={humanizeKey(String(exp.employmentType || ''))} />
              <FieldRow label="Start" value={exp.startDate} />
              <FieldRow label="End" value={exp.currentlyWorking ? 'Present' : exp.endDate} />
            </div>
          );
        })() : null}
        {reviewModal.open && reviewModal.variant === 'verify' && reviewModal.kind === 'project' ? (() => {
          const proj = projects.find((p: any) => p.id === reviewModal.entityId);
          if (!proj) return null;
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm border border-gray-100 rounded-lg p-4 bg-white">
              <FieldRow label="Title" value={proj.title} />
              <div className="sm:col-span-2">
                <FieldRow label="Description" value={proj.description} />
              </div>
              <FieldRow
                label="Link"
                value={proj.projectLink ? <DocLink href={proj.projectLink}>Open</DocLink> : null}
              />
            </div>
          );
        })() : null}
        {reviewModal.open && reviewModal.variant === 'cert' ? (() => {
          const cert = certifications[reviewModal.certIndex];
          if (!cert) return null;
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm border border-gray-100 rounded-lg p-4 bg-white">
              <FieldRow label="Certificate name" value={cert.name} />
              <FieldRow label="Issued by" value={cert.issuedBy} />
              <FieldRow label="Issued date" value={formatDateish(cert.issuedDate)} />
              <FieldRow label="Expiration" value={formatDateish(cert.expirationDate)} />
              <FieldRow label="Credential ID" value={cert.credentialId} />
              <FieldRow
                label="Reporting URL"
                value={cert.reportingUrl ? <DocLink href={cert.reportingUrl}>Open</DocLink> : null}
              />
            </div>
          );
        })() : null}
        {reviewModal.open && reviewModal.variant === 'location' ? (() => {
          const loc = displayLocations[reviewModal.locationIndex];
          if (!loc) return null;
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm border border-gray-100 rounded-lg p-4 bg-white">
              <FieldRow label="Country" value={loc.country} />
              <FieldRow label="City" value={loc.city} />
              <FieldRow label="State / region" value={loc.state} />
              <FieldRow label="Postal / ZIP" value={loc.postalCode} />
              <div className="sm:col-span-2">
                <FieldRow label="Address" value={loc.address} />
              </div>
              <FieldRow label="Verification path" value={humanizeKey(loc.documentType)} />
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-0.5">Proof</label>
                {loc.documentUrl ? <DocLink href={loc.documentUrl}>Open document</DocLink> : <p className="text-gray-900">—</p>}
              </div>
            </div>
          );
        })() : null}
      </VerificationReviewModal>
    </AdminLayout>
  );
}
