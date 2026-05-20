import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import OrganisationLayout from '@/components/organisation/OrganisationLayout';
import { api } from '@/services/api';
import { formatMoney } from '@/utils/formatMoney';
import toast from 'react-hot-toast';
import { HiArrowLeft, HiUser, HiLocationMarker, HiCheckCircle, HiXCircle, HiX, HiClock, HiStar, HiPause, HiPlay, HiDotsVertical, HiAcademicCap, HiBriefcase, HiPencil, HiPlus, HiTrash, HiOfficeBuilding } from 'react-icons/hi';

// Simple flag helper for profile drawer
const getFlag = (name: string | null | undefined): string => {
  if (!name) return '🌐';
  const n = (name || '').trim();
  if (n.toLowerCase().includes('nigeria') || n.toLowerCase().includes('nigerian')) return '🇳🇬';
  if (n.toLowerCase().includes('united states') || n.toLowerCase().includes('usa') || n.toLowerCase().includes('american')) return '🇺🇸';
  if (n.toLowerCase().includes('united kingdom') || n.toLowerCase().includes('uk') || n.toLowerCase().includes('british')) return '🇬🇧';
  if (n.toLowerCase().includes('germany') || n.toLowerCase().includes('german')) return '🇩🇪';
  if (n.toLowerCase().includes('india') || n.toLowerCase().includes('indian')) return '🇮🇳';
  if (n.toLowerCase().includes('canada') || n.toLowerCase().includes('canadian')) return '🇨🇦';
  if (n.toLowerCase().includes('australia') || n.toLowerCase().includes('australian')) return '🇦🇺';
  if (n.toLowerCase().includes('france') || n.toLowerCase().includes('french')) return '🇫🇷';
  return '🌐';
};

const REQUIRED_APPLICANT_DATA_LABELS: Record<string, string> = {
  full_name: 'Full Name',
  email: 'Email',
  nationality: 'Nationality',
  location: 'Location',
  phone: 'Phone Number',
  government_id: 'Government ID',
  academic_data: 'Academic Data',
  work_data: 'Work Data',
  skill_set: 'Skill Set Data',
  social_media: 'Social Media',
  financial_data: 'Financial Data',
  reference_data: 'Reference Data',
};

const DISTRIBUTION_CHANNEL_LABELS: Record<string, string> = {
  taldium_network: 'Taldium Network',
  google_search: 'Google Search',
  monday_com: 'Monday.com',
  lensa: 'Lensa',
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  glassdoor: 'Glassdoor',
};

const QUESTION_TYPE_LABELS: Record<string, string> = {
  yes_no: 'Yes / No',
  text: 'Text',
  multiple_choice: 'Multiple choice',
};

const REQUIRED_APPLICANT_DATA_OPTIONS = Object.entries(REQUIRED_APPLICANT_DATA_LABELS).map(([id, label]) => ({ id, label }));

const DISTRIBUTION_CHANNELS_EDIT: { id: string; label: string; subtitle: string; isDefault?: boolean }[] = [
  { id: 'taldium_network', label: 'Taldium Network', subtitle: 'Organisation page & Taldium Professional Network', isDefault: true },
  { id: 'google_search', label: 'Google Search', subtitle: 'Index on Google Jobs' },
  // { id: 'monday_com', label: 'Monday.com', subtitle: 'Post to Monday.com job board' },
  // { id: 'lensa', label: 'Lensa', subtitle: 'Distribute via Lensa' },
  // { id: 'linkedin', label: 'LinkedIn', subtitle: 'Share on LinkedIn Jobs' },
  // { id: 'indeed', label: 'Indeed', subtitle: 'Post to Indeed' },
  // { id: 'glassdoor', label: 'Glassdoor', subtitle: 'List on Glassdoor' },
];

const defaultEditForm = () => ({
  jobTitle: '',
  department: '',
  jobLevel: 'Mid Level',
  employmentType: 'full_time',
  workMode: 'on_site',
  locations: [] as string[],
  locationInput: '',
  pay: { currency: 'USD', min: '', max: '', period: 'Per annum' },
  startDate: '',
  endDate: '',
  description: '',
  qualifyingQuestions: [] as Array<{ question: string; type?: string; optional?: boolean; options?: string[] }>,
  requiredApplicantData: ['full_name', 'email'] as string[],
  distributionChannels: ['taldium_network'] as string[],
});

function toDateInputValue(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function formatTimelineDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  const day = date.getDate();
  const ord = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  const datePart = `${day}${ord} ${date.toLocaleDateString('en-GB', { month: 'long' })}, ${date.getFullYear()}`;
  const timePart = date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  return `${datePart} ${timePart}`;
}

function getApplicantDefaultLocation(application: any): string {
  const pro = application?.professional;
  const list = Array.isArray(pro?.locations) ? pro.locations : [];
  const defaultLoc = list.find((loc: any) => loc?.isDefault === true) ?? list[0];
  if (defaultLoc != null) {
    if (typeof defaultLoc === 'object') {
      const parts = [defaultLoc.city, defaultLoc.country].filter(Boolean);
      if (parts.length) return parts.join(', ');
    }
    if (typeof defaultLoc === 'string') return defaultLoc;
  }
  if (pro?.country) return pro.country;
  return '—';
}

export default function OrganisationJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingJobStatus, setUpdatingJobStatus] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [profileDetail, setProfileDetail] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [drawerMenuOpen, setDrawerMenuOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'details' | 'applicants'>('details');
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editFormData, setEditFormData] = useState(defaultEditForm);
  const [editFormLoading, setEditFormLoading] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const drawerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchJobDetail();
      fetchApplications();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchApplications();
    }
  }, [statusFilter]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (statusMenuRef.current && !statusMenuRef.current.contains(target)) {
        setStatusMenuOpen(false);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(target)) {
        setActionMenuOpenId(null);
      }
      if (drawerMenuRef.current && !drawerMenuRef.current.contains(target)) {
        setDrawerMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchJobDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await api.get(`/v1/organisation/jobs/${id}`);
      setJob(response.data.data ?? null);
    } catch (err) {
      console.error('Failed to fetch job:', err);
      setJob(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    setApplicationsLoading(true);
    try {
      const params: any = { jobId: id };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const response = await api.get('/v1/organisation/applications', { params });
      setApplications(response.data.data?.applications || []);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
      setApplications([]);
    } finally {
      setApplicationsLoading(false);
    }
  };

  const handleUpdateStatus = async (applicationId: string, newStatus: string) => {
    try {
      await api.put(`/v1/organisation/applications/${applicationId}/status`, { status: newStatus });
      toast.success(`Application ${newStatus === 'shortlisted' ? 'shortlisted' : newStatus === 'rejected' ? 'declined' : 'status updated'} successfully`);
      fetchApplications();
      if (selectedApplication?.id === applicationId) {
        setSelectedApplication((prev: any) => (prev ? { ...prev, status: newStatus, hiringStatus: newStatus } : null));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update application status');
    }
  };

  const handleApplicantClick = async (application: any) => {
    const professionalId = application.professionalId;
    if (!professionalId) return;
    setActionMenuOpenId(null);
    setSelectedApplication(application);
    setProfileDetail(null);
    setProfileLoading(true);
    try {
      const res = await api.get(`/v1/organisation/professionals/${professionalId}`);
      setProfileDetail(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load profile:', err);
      toast.error('Failed to load profile');
      setSelectedApplication(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const closeApplicantDrawer = () => {
    setSelectedApplication(null);
    setProfileDetail(null);
    setDrawerMenuOpen(false);
  };

  const handleDrawerAction = async (newStatus: string) => {
    if (!selectedApplication?.id) return;
    setUpdatingStatus(true);
    try {
      await api.put(`/v1/organisation/applications/${selectedApplication.id}/status`, { status: newStatus });
      toast.success(newStatus === 'shortlisted' ? 'Shortlisted' : newStatus === 'rejected' ? 'Declined' : 'Status updated');
      fetchApplications();
      closeApplicantDrawer();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUpdateJobStatus = async (newStatus: string) => {
    if (!id) return;
    setUpdatingJobStatus(true);
    try {
      await api.put(`/v1/organisation/jobs/${id}/status`, { status: newStatus });
      toast.success(`Job ${newStatus === 'published' ? 'published' : newStatus === 'draft' ? 'unpublished' : 'status updated'} successfully`);
      fetchJobDetail();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update job status');
    } finally {
      setUpdatingJobStatus(false);
    }
  };

  const openEditDrawer = () => {
    if (!job) return;
    setStatusMenuOpen(false);
    const pay = job.pay || {};
    const locStr = job.location || '';
    const locations = locStr ? locStr.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    setEditFormData({
      jobTitle: job.jobTitle || '',
      department: job.department || job.category || '',
      jobLevel: job.jobLevel || 'Mid Level',
      employmentType: job.employmentType || 'full_time',
      workMode: job.workMode || 'on_site',
      locations,
      locationInput: '',
      pay: {
        currency: pay.currency || 'USD',
        min: pay.min != null ? String(pay.min) : '',
        max: pay.max != null ? String(pay.max) : '',
        period: pay.period || 'Per annum',
      },
      startDate: toDateInputValue(job.startDate),
      endDate: toDateInputValue(job.endDate),
      description: job.description || '',
      qualifyingQuestions: Array.isArray(job.qualifyingQuestions) ? job.qualifyingQuestions.map((q: any) => ({
        question: q.question || '',
        type: q.type || 'yes_no',
        optional: !!q.optional,
        options: Array.isArray(q.options) ? q.options : undefined,
      })) : [],
      requiredApplicantData: Array.isArray(job.requiredApplicantData) && job.requiredApplicantData.length > 0 ? job.requiredApplicantData : ['full_name', 'email'],
      distributionChannels: Array.isArray(job.distributionChannels) && job.distributionChannels.length > 0 ? job.distributionChannels : ['taldium_network'],
    });
    setEditDrawerOpen(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('pay.')) {
      const payField = name.split('.')[1];
      setEditFormData((f) => ({ ...f, pay: { ...f.pay, [payField]: value } }));
    } else {
      setEditFormData((f) => ({ ...f, [name]: value }));
    }
  };

  const addEditLocation = () => {
    const loc = editFormData.locationInput.trim();
    if (!loc || editFormData.locations.includes(loc)) return;
    setEditFormData((f) => ({ ...f, locations: [...f.locations, loc], locationInput: '' }));
  };

  const removeEditLocation = (index: number) => {
    setEditFormData((f) => ({ ...f, locations: f.locations.filter((_, i) => i !== index) }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const locationStr = editFormData.locations.length > 0 ? editFormData.locations.join(', ') : editFormData.locationInput.trim();
    if (!locationStr) {
      toast.error('Add at least one location.');
      return;
    }
    setEditFormLoading(true);
    try {
      const payload: any = {
        jobTitle: editFormData.jobTitle,
        department: editFormData.department || undefined,
        jobLevel: editFormData.jobLevel || undefined,
        workMode: editFormData.workMode,
        employmentType: editFormData.employmentType,
        description: editFormData.description || '',
        startDate: editFormData.startDate || undefined,
        endDate: editFormData.endDate || undefined,
        requirements: [],
        qualifyingQuestions: editFormData.qualifyingQuestions.filter((q) => (q.question || '').trim()).length
          ? editFormData.qualifyingQuestions.filter((q) => (q.question || '').trim()).map((q) => ({
              question: (q.question || '').trim(),
              type: q.type || 'yes_no',
              optional: !!q.optional,
              ...(q.type === 'multiple_choice' && Array.isArray(q.options) ? { options: q.options.filter((o) => (o || '').trim()) } : {}),
            }))
          : undefined,
        requiredApplicantData: editFormData.requiredApplicantData,
        distributionChannels: editFormData.distributionChannels.length ? editFormData.distributionChannels : ['taldium_network'],
      };
      payload.locations = editFormData.locations.length ? editFormData.locations : [locationStr];
      payload.location = locationStr;
      const min = editFormData.pay.min ? Number(editFormData.pay.min) : undefined;
      const max = editFormData.pay.max ? Number(editFormData.pay.max) : undefined;
      if (min != null && max != null) {
        payload.pay = { currency: editFormData.pay.currency, min, max, type: 'Gross', period: editFormData.pay.period };
      } else {
        payload.pay = { amount: 0, currency: editFormData.pay.currency, type: 'Gross', period: editFormData.pay.period };
      }
      await api.put(`/v1/organisation/jobs/${id}`, payload);
      toast.success('Job updated successfully');
      fetchJobDetail();
      setEditDrawerOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update job');
    } finally {
      setEditFormLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'shortlisted':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <HiStar className="w-4 h-4 mr-1" />
            Shortlisted
          </span>
        );
      case 'accepted':
      case 'hired':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <HiCheckCircle className="w-4 h-4 mr-1" />
            {status === 'hired' ? 'Hired' : 'Accepted'}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <HiXCircle className="w-4 h-4 mr-1" />
            Rejected
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <HiClock className="w-4 h-4 mr-1" />
            Under Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <HiClock className="w-4 h-4 mr-1" />
            Pending
          </span>
        );
    }
  };

  if (loading) {
    return (
      <OrganisationLayout>
        <div className="p-6">
          <div className="text-center text-gray-600 py-16">Loading job details...</div>
        </div>
      </OrganisationLayout>
    );
  }

  if (!job) {
    return (
      <OrganisationLayout>
        <div className="p-6">
          <button
            onClick={() => navigate('/organization/jobs')}
            className="mb-6 text-brand-600 hover:text-brand-700 flex items-center"
          >
            <HiArrowLeft className="w-5 h-5 mr-2" />
            Back to Jobs
          </button>
          <div className="text-center text-gray-600 py-16">Job not found</div>
        </div>
      </OrganisationLayout>
    );
  }

  const filteredApplications = statusFilter === 'all' 
    ? applications 
    : applications.filter(app => app.status === statusFilter);

  return (
    <OrganisationLayout>
      <div className="min-w-0 p-6">
        <button
          onClick={() => navigate('/organization/jobs')}
          className="mb-4 text-brand-600 hover:text-brand-700 flex items-center"
        >
          <HiArrowLeft className="w-5 h-5 mr-2" />
          Back to Jobs
        </button>

        {/* Job overview card */}
        {job && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="px-6 py-5">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">{job.jobTitle}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                {(job.location || (Array.isArray(job.locations) && job.locations.length > 0)) && (
                  <span className="flex items-center gap-1.5">
                    <HiLocationMarker className="w-4 h-4 text-gray-400 shrink-0" />
                    {typeof job.location === 'string' ? job.location : job.locations?.join(', ') || '—'}
                  </span>
                )}
                {(job.department || job.category) && (
                  <span className="flex items-center gap-1.5">
                    <HiBriefcase className="w-4 h-4 text-gray-400 shrink-0" />
                    {job.department || job.category}
                  </span>
                )}
                {job.jobLevel && (
                  <span className="flex items-center gap-1.5">
                    <HiStar className="w-4 h-4 text-gray-400 shrink-0" />
                    {job.jobLevel}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <HiClock className="w-4 h-4 text-gray-400 shrink-0" />
                  {job.employmentTypeLabel || (job.employmentType && job.employmentType.replace('_', ' ')) || '—'}
                </span>
                <span className="flex items-center gap-1.5">
                  <HiOfficeBuilding className="w-4 h-4 text-gray-400 shrink-0" />
                  {job.workModeLabel || (job.workMode && job.workMode.replace('_', ' ')) || '—'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setDetailTab('details')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              detailTab === 'details' ? 'bg-white border border-b-0 border-gray-200 text-brand-600 -mb-px' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Job details
          </button>
          <button
            type="button"
            onClick={() => setDetailTab('applicants')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              detailTab === 'applicants' ? 'bg-white border border-b-0 border-gray-200 text-brand-600 -mb-px' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Applicants
          </button>
        </div>

        {detailTab === 'details' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{job.jobTitle}</h1>
                  {job.location && (
                    <p className="mt-1 flex items-center gap-1.5 text-gray-500 text-sm">
                      <HiLocationMarker className="w-4 h-4 shrink-0" />
                      {job.location}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                    job.status === 'published' ? 'bg-emerald-50 text-emerald-700' : job.status === 'paused' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {job.status === 'published' ? <HiCheckCircle className="w-4 h-4" /> : job.status === 'paused' ? <HiPause className="w-4 h-4" /> : null}
                    {job.status === 'published' ? 'Published' : job.status === 'paused' ? 'Paused' : 'Draft'}
                  </span>
                  <div className="relative" ref={statusMenuRef}>
                    <button type="button" onClick={() => setStatusMenuOpen((v) => !v)} disabled={updatingJobStatus} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:border-gray-300 hover:text-gray-700 disabled:opacity-50 transition-colors">
                      <HiDotsVertical className="w-5 h-5" />
                    </button>
                    {statusMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                        <button type="button" onClick={openEditDrawer} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <HiPencil className="w-4 h-4" /> Edit Job
                        </button>
                        {job.status !== 'published' && (
                          <button type="button" onClick={() => { handleUpdateJobStatus('published'); setStatusMenuOpen(false); }} disabled={updatingJobStatus} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50">
                            <HiPlay className="w-4 h-4" /> {updatingJobStatus ? 'Publishing...' : 'Publish'}
                          </button>
                        )}
                        {job.status === 'published' && (
                          <>
                            <button type="button" onClick={() => { handleUpdateJobStatus('paused'); setStatusMenuOpen(false); }} disabled={updatingJobStatus} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50">
                              <HiPause className="w-4 h-4" /> {updatingJobStatus ? 'Pausing...' : 'Pause'}
                            </button>
                            <button type="button" onClick={() => { handleUpdateJobStatus('draft'); setStatusMenuOpen(false); }} disabled={updatingJobStatus} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50">
                              <HiXCircle className="w-4 h-4" /> {updatingJobStatus ? 'Unpublishing...' : 'Unpublish'}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Overview pills */}
              <div className="flex flex-wrap gap-2">
                {(job.department || job.category) && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">{job.department || job.category}</span>
                )}
                {job.jobLevel && <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">{job.jobLevel}</span>}
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">{job.employmentTypeLabel || job.employmentType?.replace('_', ' ') || '—'}</span>
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">{job.workModeLabel || job.workMode?.replace('_', ' ') || '—'}</span>
                {job.experienceYears != null && <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">{job.experienceYears} years exp.</span>}
              </div>

              {/* Salary */}
              {job.pay && (job.pay.currency || job.pay.amount != null || job.pay.min != null) && (
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Salary</span>
                  <span className="text-xl font-semibold text-gray-900">
                    {job.pay.min != null || job.pay.max != null
                      ? [job.pay.min != null ? formatMoney(job.pay.currency || 'USD', job.pay.min) : '', job.pay.max != null ? formatMoney(job.pay.currency || 'USD', job.pay.max) : ''].filter(Boolean).join(' – ')
                      : job.pay.amount != null
                        ? formatMoney(job.pay.currency || 'USD', job.pay.amount)
                        : '—'}{' '}
                    <span className="text-base font-normal text-gray-500">{job.pay.period || 'Per annum'}</span>
                  </span>
                </div>
              )}

              {/* Job Description */}
              <section>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Job Description</h2>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{job.description || '—'}</p>
              </section>

              {/* Requirements */}
              {job.requirements && job.requirements.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Requirements</h2>
                  <ul className="space-y-2">
                    {job.requirements.map((req: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-gray-700">
                        <span className="text-brand-500 mt-1.5 shrink-0">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Qualifying Questions */}
              {Array.isArray(job.qualifyingQuestions) && job.qualifyingQuestions.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Qualifying Questions</h2>
                  <ul className="space-y-4">
                    {job.qualifyingQuestions.map((q: any, idx: number) => (
                      <li key={idx} className="pl-0">
                        <div className="flex flex-wrap items-baseline gap-2 text-gray-800">
                          <span className="font-semibold text-gray-500">Q{idx + 1}.</span>
                          <span>{q.question}</span>
                          {(q.type || q.optional) && (
                            <span className="text-gray-400 text-sm">
                              ({[QUESTION_TYPE_LABELS[q.type] || q.type, q.optional ? 'Optional' : null].filter(Boolean).join(', ')})
                            </span>
                          )}
                        </div>
                        {q.type === 'multiple_choice' && Array.isArray(q.options) && q.options.length > 0 && (
                          <ul className="mt-2 ml-5 space-y-1.5 text-sm text-gray-600">
                            {q.options.filter((o: string) => (o || '').trim()).map((opt: string, oi: number) => (
                              <li key={oi} className="flex items-center gap-2">
                                <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 shrink-0" aria-hidden />
                                {opt}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Required Applicant Data */}
              {Array.isArray(job.requiredApplicantData) && job.requiredApplicantData.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Required Applicant Data</h2>
                  <div className="flex flex-wrap gap-2">
                    {job.requiredApplicantData.map((key: string) => (
                      <span key={key} className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-sm">
                        {REQUIRED_APPLICANT_DATA_LABELS[key] || key}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Distribution Channels */}
              {Array.isArray(job.distributionChannels) && job.distributionChannels.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Distribution Channels</h2>
                  <div className="flex flex-wrap gap-2">
                    {job.distributionChannels.map((ch: string) => (
                      <span key={ch} className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-sm">
                        {DISTRIBUTION_CHANNEL_LABELS[ch] || ch}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Start / End date */}
              {(job.startDate || job.endDate) && (
                <section>
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Role period</h2>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                    {job.startDate && <span><strong>Start date:</strong> {new Date(job.startDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>}
                    {job.endDate && <span><strong>End date:</strong> {new Date(job.endDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>}
                  </div>
                </section>
              )}

              {/* Closing date */}
              {job.closingDate && (
                <section className="pt-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-100">
                    <HiClock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-sm text-amber-800">
                      <strong>Application deadline</strong> {new Date(job.closingDate).toLocaleDateString(undefined, { dateStyle: 'long' })}
                    </span>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        {detailTab === 'applicants' && (
        <div className="min-w-0 bg-white rounded-xl shadow-sm p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Applications ({applications.length})</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  statusFilter === 'all'
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  statusFilter === 'pending'
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('shortlisted')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  statusFilter === 'shortlisted'
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Shortlisted
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  statusFilter === 'rejected'
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Rejected
              </button>
            </div>
          </div>

          {applicationsLoading ? (
            <div className="text-center text-gray-600 py-12">Loading applications...</div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center text-gray-600 py-12">
              {statusFilter === 'all' ? 'No applications yet' : `No ${statusFilter} applications`}
            </div>
          ) : (
            <div className="min-w-0 w-full overflow-x-auto overflow-y-hidden rounded-lg border border-gray-200">
              <table className="w-full min-w-max divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applicant Name
                    </th>
                    {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profession
                    </th> */}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Applied
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role Match Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hiring Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredApplications.map((application) => (
                    <tr
                      key={application.id}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        const target = (e.target as HTMLElement).closest('a[href*="/applicants/"]');
                        if (target) return;
                        application.professionalId && handleApplicantClick(application);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && application.professionalId && handleApplicantClick(application)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center mr-3">
                            <HiUser className="w-5 h-5 text-brand-600" />
                          </div>
                          <Link
                            to={`/organization/jobs/${id}/applicants/${application.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-medium text-gray-900 hover:text-brand-600 hover:underline cursor-pointer"
                          >
                            {application.applicantName || (application.professional?.user?.firstName + ' ' + application.professional?.user?.lastName) || 'Applicant'}
                          </Link>
                        </div>
                      </td>
                      {/* <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{(application.professional?.profession || application.profession) || '—'}</div>
                      </td> */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <HiLocationMarker className="w-4 h-4 mr-1 text-gray-400 shrink-0" />
                          {getApplicantDefaultLocation(application)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatTimelineDate(application.dateApplied || application.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${
                                (application.roleMatchScore || 0) >= 80
                                  ? 'bg-green-500'
                                  : (application.roleMatchScore || 0) >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${application.roleMatchScore || 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {application.roleMatchScore || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(application.hiringStatus || application.status)}
                          {(application.applicationData as any)?.revokedAt != null && (
                            <span className="text-xs text-amber-700 font-medium">Access revoked by applicant</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                        <div className="relative flex justify-end" ref={actionMenuOpenId === application.id ? actionMenuRef : undefined}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuOpenId((prev) => (prev === application.id ? null : application.id));
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          >
                            <HiDotsVertical className="w-5 h-5" />
                          </button>
                          {actionMenuOpenId === application.id && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                              {application.status !== 'shortlisted' && application.status !== 'accepted' && application.status !== 'hired' && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleUpdateStatus(application.id, 'shortlisted'); setActionMenuOpenId(null); }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  Shortlist
                                </button>
                              )}
                              {application.status !== 'hired' && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleUpdateStatus(application.id, 'hired'); setActionMenuOpenId(null); }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  Hire
                                </button>
                              )}
                              {application.status !== 'rejected' && application.status !== 'hired' && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleUpdateStatus(application.id, 'rejected'); setActionMenuOpenId(null); }}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                >
                                  Decline
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

        {/* Edit Job drawer */}
        {editDrawerOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setEditDrawerOpen(false)} aria-hidden />
            <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Edit Job Role</h2>
                <button type="button" onClick={() => setEditDrawerOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                  <HiX className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">What role are you hiring for? *</label>
                    <input type="text" name="jobTitle" required value={editFormData.jobTitle} onChange={handleEditFormChange} placeholder="e.g. Senior Software Engineer" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Department *</label>
                      <select name="department" required value={editFormData.department} onChange={handleEditFormChange} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                        <option value="">Select department</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Product">Product</option>
                        <option value="Design">Design</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Sales">Sales</option>
                        <option value="Operations">Operations</option>
                        <option value="Finance">Finance</option>
                        <option value="HR">HR</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Level *</label>
                      <select name="jobLevel" value={editFormData.jobLevel} onChange={handleEditFormChange} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                        <option value="Junior">Junior</option>
                        <option value="Mid Level">Mid Level</option>
                        <option value="Senior">Senior</option>
                        <option value="Lead">Lead</option>
                        <option value="Principal">Principal</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Employment Type *</label>
                      <select name="employmentType" value={editFormData.employmentType} onChange={handleEditFormChange} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                        <option value="full_time">Full Time</option>
                        <option value="part_time">Part Time</option>
                        <option value="contract">Contract</option>
                        <option value="internship">Internship</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Work Mode *</label>
                      <select name="workMode" value={editFormData.workMode} onChange={handleEditFormChange} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                        <option value="on_site">Onsite</option>
                        <option value="remote">Remote</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="global_remote">Global Remote</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Location(s) *</label>
                    <div className="flex gap-2">
                      <input type="text" name="locationInput" value={editFormData.locationInput} onChange={handleEditFormChange} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEditLocation())} placeholder="Add a location" className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      <button type="button" onClick={addEditLocation} className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100">
                        <HiPlus className="w-5 h-5" />
                      </button>
                    </div>
                    {editFormData.locations.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {editFormData.locations.map((loc, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 text-sm text-gray-700">
                            {loc}
                            <button type="button" onClick={() => removeEditLocation(i)} className="text-gray-500 hover:text-gray-700">
                              <HiX className="w-4 h-4" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Pay Range</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <select name="pay.currency" value={editFormData.pay.currency} onChange={handleEditFormChange} className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                      <input type="number" name="pay.min" value={editFormData.pay.min} onChange={handleEditFormChange} placeholder="Min" className="w-28 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      <input type="number" name="pay.max" value={editFormData.pay.max} onChange={handleEditFormChange} placeholder="Max" className="w-28 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      <select name="pay.period" value={editFormData.pay.period} onChange={handleEditFormChange} className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                        <option value="Per annum">Yearly</option>
                        <option value="Per month">Monthly</option>
                      <option value="Per hour">Hourly</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
                    <input type="date" name="startDate" value={editFormData.startDate} onChange={handleEditFormChange} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
                    <input type="date" name="endDate" value={editFormData.endDate} onChange={handleEditFormChange} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Job Description</label>
                    <textarea name="description" value={editFormData.description} onChange={handleEditFormChange} rows={6} placeholder="Describe the role, responsibilities, and requirements..." className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                  </div>
                  <div className="border-t border-gray-200 pt-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">Qualifying Questions</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Add screening questions for applicants</p>
                      </div>
                      <button type="button" onClick={() => setEditFormData((f) => ({ ...f, qualifyingQuestions: [...f.qualifyingQuestions, { question: '', type: 'yes_no', optional: false }] }))} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                        <HiPlus className="w-4 h-4" /> Add Question
                      </button>
                    </div>
                    {editFormData.qualifyingQuestions.length > 0 && (
                      <div className="space-y-4 mt-4">
                        {editFormData.qualifyingQuestions.map((q, i) => (
                          <div key={i} className="p-4 rounded-lg border border-gray-200 bg-gray-50/50">
                            <div className="flex gap-3 items-start">
                              <span className="text-sm font-medium text-gray-600 shrink-0 pt-2.5">Q{i + 1}</span>
                              <input type="text" value={q.question} onChange={(e) => { const next = [...editFormData.qualifyingQuestions]; next[i] = { ...next[i], question: e.target.value }; setEditFormData((f) => ({ ...f, qualifyingQuestions: next })); }} placeholder="Enter your question..." className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                              <button type="button" onClick={() => setEditFormData((f) => ({ ...f, qualifyingQuestions: f.qualifyingQuestions.filter((_, j) => j !== i) }))} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0">
                                <HiTrash className="w-5 h-5" />
                              </button>
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600">Type:</label>
                                <select value={q.type || 'yes_no'} onChange={(e) => { const next = [...editFormData.qualifyingQuestions]; const newType = e.target.value; next[i] = { ...next[i], type: newType, ...(newType === 'multiple_choice' && !Array.isArray(next[i].options) ? { options: [''] } : {}) }; setEditFormData((f) => ({ ...f, qualifyingQuestions: next })); }} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                                  <option value="yes_no">Yes / No</option>
                                  <option value="text">Text</option>
                                  <option value="multiple_choice">Multiple choice</option>
                                </select>
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <span className="text-sm text-gray-600">Optional</span>
                                <button type="button" role="switch" aria-checked={!!q.optional} onClick={() => { const next = [...editFormData.qualifyingQuestions]; next[i] = { ...next[i], optional: !next[i].optional }; setEditFormData((f) => ({ ...f, qualifyingQuestions: next })); }} className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors ${q.optional ? 'bg-brand-500 border-brand-500' : 'bg-gray-200 border-gray-300'}`}>
                                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${q.optional ? 'translate-x-5' : 'translate-x-0.5'}`} style={{ marginTop: 2 }} />
                                </button>
                              </label>
                            </div>
                            {(q.type || '') === 'multiple_choice' && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-sm text-gray-600 mb-2">Options</p>
                                <div className="space-y-2">
                                  {(q.options || ['']).map((opt, oi) => (
                                    <div key={oi} className="flex items-center gap-2">
                                      <span className="w-4 h-4 rounded-full border-2 border-gray-400 shrink-0" aria-hidden />
                                      <input type="text" value={opt} onChange={(e) => { const next = [...editFormData.qualifyingQuestions]; const opts = [...(next[i].options || [''])]; opts[oi] = e.target.value; next[i] = { ...next[i], options: opts }; setEditFormData((f) => ({ ...f, qualifyingQuestions: next })); }} placeholder={`Option ${oi + 1}`} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                                      <button type="button" onClick={() => { const next = [...editFormData.qualifyingQuestions]; const opts = (next[i].options || ['']).filter((_, ooi) => ooi !== oi); next[i] = { ...next[i], options: opts.length ? opts : [''] }; setEditFormData((f) => ({ ...f, qualifyingQuestions: next })); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0">
                                        <HiX className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                  <button type="button" onClick={() => { const next = [...editFormData.qualifyingQuestions]; const opts = [...(next[i].options || ['']), '']; next[i] = { ...next[i], options: opts }; setEditFormData((f) => ({ ...f, qualifyingQuestions: next })); }} className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
                                    <HiPlus className="w-4 h-4" /> Add Option
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="border-t border-gray-200 pt-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Required Applicant Data</h3>
                    <p className="text-xs text-gray-500 mb-3">Select the information applicants must share when applying.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {REQUIRED_APPLICANT_DATA_OPTIONS.map((opt) => {
                        const checked = editFormData.requiredApplicantData.includes(opt.id);
                        return (
                          <label key={opt.id} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${checked ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
                            <input type="checkbox" checked={checked} onChange={(e) => { if (e.target.checked) setEditFormData((f) => ({ ...f, requiredApplicantData: [...f.requiredApplicantData, opt.id] })); else setEditFormData((f) => ({ ...f, requiredApplicantData: f.requiredApplicantData.filter((id) => id !== opt.id) })); }} className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                            <span className="text-sm font-medium text-gray-800">{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Job Distribution Channels</h3>
                    <p className="text-xs text-gray-500 mb-3">Choose where this job will be published</p>
                    <div className="space-y-2">
                      {DISTRIBUTION_CHANNELS_EDIT.map((ch) => {
                        const selected = editFormData.distributionChannels.includes(ch.id);
                        return (
                          <label key={ch.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selected ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
                            <input type="checkbox" checked={selected} onChange={(e) => { if (e.target.checked) setEditFormData((f) => ({ ...f, distributionChannels: [...f.distributionChannels, ch.id] })); else setEditFormData((f) => ({ ...f, distributionChannels: f.distributionChannels.filter((id) => id !== ch.id) })); }} className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-gray-900">{ch.label}</span>
                              <p className="text-xs text-gray-500 truncate">{ch.subtitle}</p>
                            </div>
                            {ch.isDefault && <span className="text-xs font-medium text-gray-500 shrink-0">Default</span>}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="sticky bottom-0 px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                  <button type="button" onClick={() => setEditDrawerOpen(false)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 font-medium">
                    Cancel
                  </button>
                  <button type="submit" disabled={editFormLoading} className="px-5 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium">
                    {editFormLoading ? 'Saving...' : 'Update Job Role'}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* Applicant profile drawer */}
        {selectedApplication && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/50" onClick={closeApplicantDrawer} aria-hidden />
            <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
              {profileLoading ? (
                <div className="p-8 flex items-center justify-center min-h-[200px]">
                  <div className="text-gray-500">Loading profile...</div>
                </div>
              ) : profileDetail ? (
                <div className="p-6 pb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">{profileDetail.name}</h2>
                    <div className="flex items-center gap-1">
                      <div className="relative" ref={drawerMenuRef}>
                        <button
                          type="button"
                          onClick={() => setDrawerMenuOpen((v) => !v)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                        >
                          <HiDotsVertical className="w-6 h-6" />
                        </button>
                        {drawerMenuOpen && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                            {selectedApplication?.status !== 'shortlisted' && selectedApplication?.status !== 'accepted' && selectedApplication?.status !== 'hired' && (
                              <button
                                type="button"
                                onClick={() => { handleDrawerAction('shortlisted'); setDrawerMenuOpen(false); }}
                                disabled={updatingStatus}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Shortlist
                              </button>
                            )}
                            {selectedApplication?.status !== 'hired' && (
                              <button
                                type="button"
                                onClick={() => { handleDrawerAction('hired'); setDrawerMenuOpen(false); }}
                                disabled={updatingStatus}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Hire
                              </button>
                            )}
                            {selectedApplication?.status !== 'rejected' && (
                              <button
                                type="button"
                                onClick={() => { handleDrawerAction('rejected'); setDrawerMenuOpen(false); }}
                                disabled={updatingStatus}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                Decline
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={closeApplicantDrawer} className="p-2 hover:bg-gray-100 rounded-lg">
                        <HiX className="w-6 h-6 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 text-brand-700 text-xl font-bold">
                      {profileDetail.name
                        ?.split(' ')
                        .map((s: string) => s[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <ul className="space-y-1.5 text-sm text-gray-600">
                        {profileDetail.nationality && (
                          <li className="flex items-center gap-2">
                            <span className="text-lg">{getFlag(profileDetail.nationality)}</span>
                            {profileDetail.nationality}
                          </li>
                        )}
                        {(profileDetail.location?.city || profileDetail.location?.country) && (
                          <li className="flex items-center gap-2">
                            <HiLocationMarker className="w-4 h-4 text-gray-400 shrink-0" />
                            {[profileDetail.location.city, profileDetail.location.country].filter(Boolean).join(', ')}
                          </li>
                        )}
                        {profileDetail.profession && (
                          <li className="flex items-center gap-2">
                            <HiBriefcase className="w-4 h-4 text-gray-400 shrink-0" />
                            {profileDetail.profession}
                          </li>
                        )}
                        <li className="flex items-center gap-2">
                          <span className="text-gray-400">🕐</span>
                          {profileDetail.yearsOfExperience ?? 0} years of experience
                        </li>
                      </ul>
                      {profileDetail.verificationStatus && (
                        <span className="inline-flex mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-600 text-white">
                          {profileDetail.verificationStatus.percentage}% — {profileDetail.verificationStatus.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <section className="mb-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {profileDetail.skills?.length > 0 ? (
                        profileDetail.skills.map((s: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-sm">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">—</span>
                      )}
                    </div>
                  </section>

                  <section className="mb-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <HiBriefcase className="w-4 h-4" />
                      Work Experience
                    </h3>
                    {profileDetail.workExperience?.length > 0 ? (
                      <ul className="space-y-3">
                        {profileDetail.workExperience.map((exp: any) => (
                          <li key={exp.id}>
                            <p className="font-medium text-gray-900">{exp.role || exp.jobTitle}</p>
                            <p className="text-sm text-gray-600">{exp.organisationName || exp.companyName}</p>
                            <p className="text-xs text-gray-500">
                              {exp.startDate} — {exp.currentlyWorking ? 'Present' : exp.endDate || '—'}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">—</p>
                    )}
                  </section>

                  <section className="mb-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <HiAcademicCap className="w-4 h-4" />
                      Academic Qualifications
                    </h3>
                    {profileDetail.education?.length > 0 ? (
                      <ul className="space-y-3">
                        {profileDetail.education.map((edu: any) => (
                          <li key={edu.id}>
                            <p className="font-medium text-gray-900">
                              {[edu.degreeType, edu.fieldOfStudy].filter(Boolean).join(' ') || edu.levelOfEducation || '—'}
                            </p>
                            <p className="text-sm text-gray-600">{edu.institutionName}</p>
                            <p className="text-xs text-gray-500">{edu.endDate || edu.startDate || '—'}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">—</p>
                    )}
                  </section>

                  {/* Application status */}
                  <div className="border-t border-gray-200 pt-4 mt-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Hiring status:</span>
                      {getStatusBadge(selectedApplication?.hiringStatus || selectedApplication?.status)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <p>Could not load profile.</p>
                  <button type="button" onClick={closeApplicantDrawer} className="mt-4 text-brand-600 hover:underline">
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </OrganisationLayout>
  );
}
