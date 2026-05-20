import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import OrganisationLayout from '@/components/organisation/OrganisationLayout';
import { api } from '@/services/api';
import {
  HiSearch,
  HiUser,
  HiX,
  HiDotsVertical,
  HiEye,
  HiMail,
  HiBriefcase,
  HiPlus,
  HiLocationMarker,
  HiAcademicCap,
  HiPaperAirplane,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'quill/dist/quill.snow.css';
import { COUNTRIES } from '@/utils/countries';
import { SearchableList } from '@/components/common/SearchableList';

function isRichTextEmpty(html: string): boolean {
  if (!html || !html.trim()) return true;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const text = doc.body.textContent || '';
  return !text.trim();
}

// Map country/nationality name to flag emoji for table display
const COUNTRY_FLAGS: Record<string, string> = {
  Nigeria: '🇳🇬', Nigerian: '🇳🇬',
  'United States': '🇺🇸', USA: '🇺🇸', American: '🇺🇸',
  Germany: '🇩🇪', German: '🇩🇪',
  'United Kingdom': '🇬🇧', UK: '🇬🇧', British: '🇬🇧',
  India: '🇮🇳', Indian: '🇮🇳',
  Japan: '🇯🇵', Japanese: '🇯🇵',
  Mexico: '🇲🇽', Mexican: '🇲🇽',
  'United Arab Emirates': '🇦🇪', UAE: '🇦🇪', Emirati: '🇦🇪',
  France: '🇫🇷', French: '🇫🇷',
  Canada: '🇨🇦', Canadian: '🇨🇦',
  Australia: '🇦🇺', Australian: '🇦🇺',
  China: '🇨🇳', Chinese: '🇨🇳',
  Brazil: '🇧🇷', Brazilian: '🇧🇷',
  Kenya: '🇰🇪', Kenyan: '🇰🇪',
  Ghana: '🇬🇭', Ghanaian: '🇬🇭',
  'South Africa': '🇿🇦', 'South African': '🇿🇦',
  Egypt: '🇪🇬', Egyptian: '🇪🇬',
  Bangladesh: '🇧🇩', Bangladeshi: '🇧🇩',
  Pakistan: '🇵🇰', Pakistani: '🇵🇰',
  Indonesia: '🇮🇩', Indonesian: '🇮🇩',
  Philippines: '🇵🇭', Filipino: '🇵🇭',
  Vietnam: '🇻🇳', Vietnamese: '🇻🇳',
  Thailand: '🇹🇭', Thai: '🇹🇭',
  Spain: '🇪🇸', Spanish: '🇪🇸',
  Italy: '🇮🇹', Italian: '🇮🇹',
  Netherlands: '🇳🇱', Dutch: '🇳🇱',
  Poland: '🇵🇱', Polish: '🇵🇱',
  Russia: '🇷🇺', Russian: '🇷🇺',
  Turkey: '🇹🇷', Turkish: '🇹🇷',
  'South Korea': '🇰🇷', Korean: '🇰🇷',
  Singapore: '🇸🇬', Singaporean: '🇸🇬',
  Malaysia: '🇲🇾', Malaysian: '🇲🇾',
  Argentina: '🇦🇷', Argentine: '🇦🇷',
  Colombia: '🇨🇴', Colombian: '🇨🇴',
  Ireland: '🇮🇪', Irish: '🇮🇪',
  Sweden: '🇸🇪', Swedish: '🇸🇪',
  Switzerland: '🇨🇭', Swiss: '🇨🇭',
  Belgium: '🇧🇪', Belgian: '🇧🇪',
  Austria: '🇦🇹', Austrian: '🇦🇹',
  Portugal: '🇵🇹', Portuguese: '🇵🇹',
  Greece: '🇬🇷', Greek: '🇬🇷',
  Israel: '🇮🇱', Israeli: '🇮🇱',
  'Saudi Arabia': '🇸🇦', Saudi: '🇸🇦',
};

function getFlag(name: string | null | undefined): string {
  if (!name) return '🌐';
  const key = name.trim();
  return COUNTRY_FLAGS[key] || COUNTRY_FLAGS[key.replace(/\s+/g, ' ')] || '🌐';
}

interface Professional {
  id: string;
  name: string;
  email: string;
  nationality: string | null;
  location: { city: string | null; country: string | null };
  profession: string;
  yearsOfExperience: number;
  verificationStatus: { percentage: number; status: string };
  user?: { id: string; email: string; firstName: string; lastName: string; status: string };
}

interface SearchFilters {
  search: string;
  jobTitle: string;
  country: string;
  city: string;
  verified: boolean | null;
  minExperience: string;
}

const SCOUT_PARAM_KEYS = [
  'jobTitle', 'searchType', 'location', 'domicile', 'workMode', 'employmentType',
  'currency', 'salaryMin', 'salaryMax', 'salaryPeriod', 'benefits',
] as const;

export type ScoutCriteria = {
  jobTitle: string;
  searchType: 'strict' | 'fuzzy' | 'partial';
  location: string;
  domicile: string;
  workMode: string;
  employmentType: string;
  currency: string;
  salaryMin: string;
  salaryMax: string;
  salaryPeriod?: 'weekly' | 'monthly' | 'annually';
  benefits: string[];
  description: string;
};

export type ScoutListEntry = {
  id: string;
  name: string;
  createdAt: number;
  peopleFound?: number;
  criteria: ScoutCriteria;
};

export type ScoutResponseEntry = {
  professionalId: string;
  name: string;
  profession: string;
  status: 'interested' | 'not_interested' | 'pending';
  respondedAt?: string;
};

const DIRECT_SCOUT_EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'volunteering', label: 'Volunteering' },
  { value: 'consultancy', label: 'Consultancy' },
];

function normalizeCriteriaFromApi(raw: unknown): ScoutCriteria {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const benefits = Array.isArray(c.benefits) ? (c.benefits as unknown[]).map(String) : [];
  const stRaw = String(c.searchType ?? 'strict');
  const searchType: ScoutCriteria['searchType'] =
    stRaw === 'fuzzy' ? 'fuzzy' : stRaw === 'partial' ? 'partial' : 'strict';
  const sp = c.salaryPeriod;
  const salaryPeriod =
    sp === 'weekly' || sp === 'monthly' || sp === 'annually' ? sp : 'annually';
  return {
    jobTitle: String(c.jobTitle ?? ''),
    searchType,
    location: String(c.location ?? 'Global'),
    domicile: String(c.domicile ?? ''),
    workMode: String(c.workMode ?? ''),
    employmentType: String(c.employmentType ?? ''),
    currency: String(c.currency ?? 'USD'),
    salaryMin: c.salaryMin != null && c.salaryMin !== '' ? String(c.salaryMin) : '',
    salaryMax: c.salaryMax != null && c.salaryMax !== '' ? String(c.salaryMax) : '',
    salaryPeriod,
    benefits,
    description: String(c.description ?? ''),
  };
}

const WORK_MODE_LABELS: Record<string, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  on_site: 'On-site',
  local_remote: 'Local Remote',
  global_remote: 'Global Remote',
  '': '—',
};

const SALARY_PERIOD_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  annually: 'Annually',
};

function tabFromSearchParams(params: URLSearchParams): 'all' | 'scouted' {
  const tab = params.get('tab');
  if (tab === 'all' || tab === 'scouted') return tab;
  return 'scouted';
}

type HireFormState = {
  jobTitle: string;
  employmentType: string;
  workMode: string;
  roleLocationOffice: string;
  description: string;
};

const EMPTY_HIRE_FORM: HireFormState = {
  jobTitle: '',
  employmentType: '',
  workMode: '',
  roleLocationOffice: '',
  description: '',
};

function hireFormFromScoutCriteria(criteria: ScoutCriteria | null): HireFormState {
  if (!criteria) return { ...EMPTY_HIRE_FORM };
  const office =
    criteria.domicile?.trim() ||
    (criteria.location && criteria.location !== 'Global' ? criteria.location : '');
  return {
    jobTitle: criteria.jobTitle?.trim() || '',
    employmentType: criteria.employmentType || '',
    workMode: criteria.workMode || '',
    roleLocationOffice: office,
    description: criteria.description || '',
  };
}

export default function ViewProfessionals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHireModal, setShowHireModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const [hireForm, setHireForm] = useState<HireFormState>({ ...EMPTY_HIRE_FORM });
  const [orgProfile, setOrgProfile] = useState<{ companyName?: string; industry?: string } | null>(null);
  const [messageForm, setMessageForm] = useState({ subject: '', message: '', jobTitle: '' });
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    jobTitle: '',
    country: '',
    city: '',
    verified: null,
    minExperience: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showScoutModal, setShowScoutModal] = useState(false);
  const [scoutSearchActive, setScoutSearchActive] = useState(false);
  /** Initialise from URL so the "write tab to URL" effect does not replace ?tab=all with scouted on first paint. */
  const [professionalsTab, setProfessionalsTab] = useState<'all' | 'scouted'>(() =>
    tabFromSearchParams(searchParams),
  );
  const [scoutLists, setScoutLists] = useState<ScoutListEntry[]>([]);
  const [activeScoutId, setActiveScoutId] = useState<string | null>(null);
  const [scoutViewTab, setScoutViewTab] = useState<'request' | 'response'>('request');
  const [scoutResponses, setScoutResponses] = useState<ScoutResponseEntry[]>([]);
  const [editingScoutId, setEditingScoutId] = useState<string | null>(null);
  const [scoutActionMenuId, setScoutActionMenuId] = useState<string | null>(null);
  const scoutActionMenuRef = useRef<HTMLDivElement>(null);
  const [scoutMenuPosition, setScoutMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [profMenuPosition, setProfMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const scoutMenuPortalRef = useRef<HTMLDivElement>(null);
  const profMenuPortalRef = useRef<HTMLDivElement>(null);
  const skipNextScoutDetailFetchRef = useRef(false);
  const [scoutForm, setScoutForm] = useState({
    jobTitle: '',
    searchType: 'strict' as 'strict' | 'fuzzy',
    location: 'Global',
    domicile: '',
    workMode: '',
    employmentType: '',
    currency: 'USD',
    salaryMin: '',
    salaryMax: '',
    salaryPeriod: 'annually' as 'weekly' | 'monthly' | 'annually',
    benefits: [] as string[],
    benefitInput: '',
    description: '',
  });
  // Write tab + scout + view to URL when they change
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    SCOUT_PARAM_KEYS.forEach((k) => next.delete(k));
    next.set('tab', professionalsTab);
    if (activeScoutId) {
      next.set('scout', activeScoutId);
      next.set('view', scoutViewTab);
    } else {
      next.delete('scout');
      next.delete('view');
    }
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }, [professionalsTab, activeScoutId, scoutViewTab]);
  const [scoutSearchLoading, setScoutSearchLoading] = useState(false);
  const [profileDrawerId, setProfileDrawerId] = useState<string | null>(null);
  const [profileDetail, setProfileDetail] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (professionalsTab === 'all' && !scoutSearchActive) fetchProfessionals();
  }, [filters, page, scoutSearchActive, professionalsTab]);

  const fetchScoutLists = useCallback(async () => {
    try {
      const res = await api.get('/v1/organisation/professionals/scouts');
      const rows = res.data?.data?.scouts ?? [];
      setScoutLists(
        rows.map((r: { id: string; name: string; matchCount?: number; criteria?: unknown; createdAt: number | string }) => ({
          id: r.id,
          name: r.name,
          createdAt: typeof r.createdAt === 'number' ? r.createdAt : new Date(r.createdAt).getTime(),
          peopleFound: r.matchCount ?? 0,
          criteria: normalizeCriteriaFromApi(r.criteria),
        })),
      );
    } catch {
      toast.error('Failed to load scout lists');
      setScoutLists([]);
    }
  }, []);

  useEffect(() => {
    if (professionalsTab === 'scouted') void fetchScoutLists();
  }, [professionalsTab, fetchScoutLists]);

  // Read tab + scout + view from URL; load scout matches from API (single GET per scout id)
  useEffect(() => {
    const tab = tabFromSearchParams(searchParams);
    setProfessionalsTab(tab);
    const scoutId = searchParams.get('scout');
    const view = searchParams.get('view');
    if (view === 'request' || view === 'response') setScoutViewTab(view);
    else if (scoutId) setScoutViewTab('request');

    if (tab !== 'scouted') {
      setActiveScoutId(null);
      return;
    }

    if (!scoutId) {
      setActiveScoutId(null);
      return;
    }

    setActiveScoutId(scoutId);

    if (skipNextScoutDetailFetchRef.current) {
      skipNextScoutDetailFetchRef.current = false;
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    void (async () => {
      try {
        const res = await api.get(`/v1/organisation/professionals/scouts/${scoutId}`, {
          signal: ac.signal,
        });
        const d = res.data?.data;
        if (!d) return;
        setProfessionals(d.professionals || []);
        setTotalPages(d.pagination?.totalPages || 1);
        setPage(1);
        setScoutSearchActive(true);
      } catch (err: unknown) {
        const ax = err as { name?: string; code?: string; message?: string };
        if (ax?.name === 'CanceledError' || ax?.code === 'ERR_CANCELED' || ax?.message === 'canceled') return;
        toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load scout list');
        setProfessionals([]);
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [searchParams]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const hitProfTrigger = actionMenuRef.current?.contains(target);
      const hitProfMenu = profMenuPortalRef.current?.contains(target);
      if (actionMenuId && !hitProfTrigger && !hitProfMenu) setActionMenuId(null);
      const hitScoutTrigger = scoutActionMenuRef.current?.contains(target);
      const hitScoutMenu = scoutMenuPortalRef.current?.contains(target);
      if (scoutActionMenuId && !hitScoutTrigger && !hitScoutMenu) setScoutActionMenuId(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionMenuId, scoutActionMenuId]);

  // Position scout action dropdown above overflow (fixed, measured from trigger)
  useEffect(() => {
    if (!scoutActionMenuId) {
      setScoutMenuPosition(null);
      return;
    }
    const el = scoutActionMenuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuWidth = 192;
    setScoutMenuPosition({
      top: rect.bottom + 4,
      left: Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8),
    });
  }, [scoutActionMenuId]);

  // Position professional action dropdown above overflow (fixed, measured from trigger)
  useEffect(() => {
    if (!actionMenuId) {
      setProfMenuPosition(null);
      return;
    }
    const el = actionMenuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuWidth = 192;
    setProfMenuPosition({
      top: rect.bottom + 4,
      left: Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8),
    });
  }, [actionMenuId]);

  // When viewing a scout, load responses for Response tab (placeholder: empty; replace with API when ready)
  useEffect(() => {
    if (!activeScoutId) {
      setScoutResponses([]);
      return;
    }
    // TODO: api.get(`/v1/organisation/scouts/${activeScoutId}/responses`).then(r => setScoutResponses(r.data?.data ?? [])).catch(() => setScoutResponses([]));
    setScoutResponses([]);
  }, [activeScoutId]);

  const fetchProfessionals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (filters.search) params.append('search', filters.search);
      if (filters.jobTitle) params.append('jobTitle', filters.jobTitle);
      if (filters.country) params.append('country', filters.country);
      if (filters.city) params.append('city', filters.city);
      if (filters.verified !== null) params.append('verified', filters.verified.toString());
      if (filters.minExperience) params.append('minExperience', filters.minExperience);

      const response = await api.get(`/v1/organisation/professionals?${params.toString()}`);
      const data = response.data.data;
      setProfessionals(data.professionals || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch professionals:', err);
      setProfessionals([]);
      toast.error('Failed to load professionals');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string | boolean | null) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === professionals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(professionals.map((p) => p.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleViewProfile = async (professionalId: string) => {
    setActionMenuId(null);
    setProfileDrawerId(professionalId);
    setProfileDetail(null);
    setProfileLoading(true);
    try {
      const res = await api.get(`/v1/organisation/professionals/${professionalId}`);
      setProfileDetail(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load profile:', err);
      toast.error('Failed to load profile');
      setProfileDrawerId(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfileDrawer = () => {
    setProfileDrawerId(null);
    setProfileDetail(null);
  };

  const resolveScoutCriteriaForSend = (): ScoutCriteria | null => {
    if (activeScoutId) {
      const entry = scoutLists.find((e) => e.id === activeScoutId);
      if (entry) return entry.criteria;
    }
    const hasCriteria =
      scoutForm.jobTitle.trim() ||
      scoutForm.workMode ||
      scoutForm.employmentType ||
      scoutForm.domicile.trim() ||
      scoutForm.description.trim();
    if (scoutSearchActive && hasCriteria) {
      return {
        jobTitle: scoutForm.jobTitle,
        searchType: scoutForm.searchType,
        location: scoutForm.location,
        domicile: scoutForm.domicile,
        workMode: scoutForm.workMode,
        employmentType: scoutForm.employmentType,
        currency: scoutForm.currency,
        salaryMin: scoutForm.salaryMin,
        salaryMax: scoutForm.salaryMax,
        salaryPeriod: scoutForm.salaryPeriod,
        benefits: scoutForm.benefits,
        description: scoutForm.description,
      };
    }
    return null;
  };

  const openSendScoutModal = (professional: Professional | null) => {
    setSelectedProfessional(professional);
    setHireForm(hireFormFromScoutCriteria(resolveScoutCriteriaForSend()));
    setShowHireModal(true);
    api.get('/v1/organisation/profile').then((r) => {
      const o = r.data?.data;
      if (o) setOrgProfile({ companyName: o.companyName, industry: o.industry });
    }).catch(() => setOrgProfile(null));
  };

  const handleScout = (professional: Professional) => {
    setActionMenuId(null);
    openSendScoutModal(professional);
  };

  const handleScoutSearchSubmit = async () => {
    const wasEditing = !!editingScoutId;
    const scoutIdBeingEdited = editingScoutId;
    const jobTitle = scoutForm.jobTitle.trim() || undefined;
    const name = [scoutForm.jobTitle || 'Scout', scoutForm.location || 'Global'].filter(Boolean).join(' · ') || 'Scout list';
    const payload = {
      jobTitle,
      searchType: scoutForm.searchType,
      location: scoutForm.location || undefined,
      domicile: scoutForm.domicile.trim() || undefined,
      workMode: scoutForm.workMode || undefined,
      employmentType: scoutForm.employmentType || undefined,
      currency: scoutForm.currency || undefined,
      salaryMin: scoutForm.salaryMin ? Number(scoutForm.salaryMin) : undefined,
      salaryMax: scoutForm.salaryMax ? Number(scoutForm.salaryMax) : undefined,
      benefits: scoutForm.benefits.length ? scoutForm.benefits : undefined,
      description: scoutForm.description.trim() || undefined,
      salaryPeriod: scoutForm.salaryPeriod,
      name,
    };
    setScoutSearchLoading(true);
    try {
      const res = wasEditing && scoutIdBeingEdited
        ? await api.patch(`/v1/organisation/professionals/scouts/${scoutIdBeingEdited}`, payload)
        : await api.post('/v1/organisation/professionals/scout-search', payload);
      const data = res.data?.data;
      const matchedProfessionals = data?.professionals || [];
      const scoutMeta = data?.scout as { id?: string } | undefined;
      const scoutId = scoutMeta?.id ?? (wasEditing ? scoutIdBeingEdited : undefined);
      setProfessionals(matchedProfessionals);
      setTotalPages(data?.pagination?.totalPages || 1);
      setPage(1);
      setScoutSearchActive(true);
      await fetchScoutLists();
      if (scoutId) {
        skipNextScoutDetailFetchRef.current = true;
        setActiveScoutId(scoutId);
        setProfessionalsTab('scouted');
      }
      setEditingScoutId(null);
      setShowScoutModal(false);
      toast.success(
        wasEditing
          ? `Scout list updated: ${matchedProfessionals.length} professional(s) found.`
          : `Created scout list: ${matchedProfessionals.length} professional(s) found.`,
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Scout search failed');
    } finally {
      setScoutSearchLoading(false);
    }
  };

  const addBenefit = () => {
    const v = scoutForm.benefitInput.trim();
    if (!v) return;
    if (scoutForm.benefits.includes(v)) return;
    setScoutForm({ ...scoutForm, benefits: [...scoutForm.benefits, v], benefitInput: '' });
  };

  const handleSendMessage = (professional: Professional) => {
    setActionMenuId(null);
    setSelectedProfessional(professional);
    setMessageForm({ subject: '', message: '', jobTitle: '' });
    setShowMessageModal(true);
  };

  const handleHireSubmit = async () => {
    const isBulk = selectedIds.size > 0 && !selectedProfessional;
    const idsToSend = isBulk ? Array.from(selectedIds) : selectedProfessional ? [selectedProfessional.id] : [];
    if (idsToSend.length === 0) return;
    if (!hireForm.jobTitle.trim()) {
      toast.error('Role title is required');
      return;
    }
    if (!hireForm.employmentType) {
      toast.error('Employment type is required');
      return;
    }
    if (!hireForm.workMode) {
      toast.error('Work mode is required');
      return;
    }
    const payload = {
      jobTitle: hireForm.jobTitle.trim(),
      employmentType: hireForm.employmentType,
      workMode: hireForm.workMode,
      location: hireForm.roleLocationOffice.trim() || undefined,
      description: hireForm.description.trim() || undefined,
    };
    try {
      if (isBulk) {
        let success = 0;
        let failed = 0;
        for (const id of idsToSend) {
          try {
            await api.post(`/v1/organisation/professionals/${id}/hire`, payload);
            success++;
          } catch {
            failed++;
          }
        }
        if (failed === 0) {
          toast.success(`Scout request sent to ${success} professional${success === 1 ? '' : 's'}!`);
        } else {
          toast.success(`Sent to ${success}; ${failed} failed.`);
        }
        setSelectedIds(new Set());
      } else {
        await api.post(`/v1/organisation/professionals/${idsToSend[0]}/hire`, payload);
        toast.success('Scout request sent successfully!');
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(idsToSend[0]);
          return next;
        });
      }
      setShowHireModal(false);
      setSelectedProfessional(null);
      setHireForm({ ...EMPTY_HIRE_FORM });
      fetchProfessionals();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send scout request');
    }
  };

  const handleMessageSubmit = async () => {
    if (!selectedProfessional) return;
    if (isRichTextEmpty(messageForm.message)) {
      toast.error('Please enter a message');
      return;
    }
    try {
      await api.post(`/v1/organisation/professionals/${selectedProfessional.id}/message`, {
        subject: messageForm.subject,
        message: messageForm.message,
        jobTitle: messageForm.jobTitle,
      });
      toast.success('Message sent successfully!');
      setShowMessageModal(false);
      setSelectedProfessional(null);
      setMessageForm({ subject: '', message: '', jobTitle: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    }
  };

  const getLocationDisplay = (loc: { city: string | null; country: string | null }) => {
    const parts = [];
    if (loc.city) parts.push(loc.city);
    if (loc.country) parts.push(loc.country);
    return parts.length > 0 ? parts.join(', ') : '—';
  };

  const getVerificationBadge = (status: { percentage: number; status: string }) => {
    const { percentage, status: statusText } = status;
    const isVerified = statusText === 'Verified with Gov ID';
    const isPending = statusText === 'Pending';
    const bg = isVerified
      ? 'bg-brand-600 text-white'
      : isPending
        ? 'bg-gray-200 text-gray-700'
        : 'bg-brand-100 text-brand-700';
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${bg}`}>
        {percentage}% - {statusText}
      </span>
    );
  };

  return (
    <OrganisationLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header + Tabs + Start Direct Scout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Professionals</h1>
            <p className="text-gray-500 text-sm md:text-base mt-0.5">Browse and scout verified professionals on Trudium.</p>
          </div>
          <button
            type="button"
            onClick={() => { setEditingScoutId(null); setShowScoutModal(true); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium shrink-0"
          >
            <HiBriefcase className="w-5 h-5" />
            Start Direct Scout
          </button>
        </div>

        {/* Tabs: Scouted List | All Professionals */}
        <div className="mb-4 border-b border-gray-200">
          <nav className="flex gap-6" aria-label="Tabs">
            <button
              type="button"
              onClick={() => {
                setProfessionalsTab('scouted');
                setActiveScoutId(null);
              }}
              className={`pb-3 px-0.5 text-sm font-medium border-b-2 transition-colors ${
                professionalsTab === 'scouted'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Scouted List
            </button>
            <button
              type="button"
              onClick={() => {
                setProfessionalsTab('all');
                setScoutSearchActive(false);
                setActiveScoutId(null);
                setPage(1);
                fetchProfessionals();
              }}
              className={`pb-3 px-0.5 text-sm font-medium border-b-2 transition-colors ${
                professionalsTab === 'all'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Professionals
            </button>
          </nav>
        </div>

        {/* All Professionals: search bar */}
        {professionalsTab === 'all' && (
          <div className="mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-xl">
              <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, profession, location..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>
        )}

        {/* Scouted List tab: list of saved scouts or back + table */}
        {professionalsTab === 'scouted' && (
          <>
            {activeScoutId ? (
              <div className="mb-4">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <button
                    type="button"
                    onClick={() => setActiveScoutId(null)}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    ← Back to scout lists
                  </button>
                  {scoutViewTab === 'request' && (
                    <p className="text-sm text-gray-600">
                      {loading ? 'Searching...' : `${professionals.length} professional${professionals.length === 1 ? '' : 's'} in this list`}
                    </p>
                  )}
                  {scoutViewTab === 'response' && (
                    <p className="text-sm text-gray-600">
                      {scoutResponses.length} response{scoutResponses.length === 1 ? '' : 's'} from candidates
                    </p>
                  )}
                </div>
                <nav className="flex gap-6 border-b border-gray-200" aria-label="Scout view">
                  <button
                    type="button"
                    onClick={() => setScoutViewTab('request')}
                    className={`pb-3 px-0.5 text-sm font-medium border-b-2 transition-colors ${
                      scoutViewTab === 'request'
                        ? 'border-brand-500 text-brand-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Request
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoutViewTab('response')}
                    className={`pb-3 px-0.5 text-sm font-medium border-b-2 transition-colors ${
                      scoutViewTab === 'response'
                        ? 'border-brand-500 text-brand-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Response
                  </button>
                </nav>
              </div>
            ) : (
              <div className="mb-4">
                {scoutLists.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-8 text-center">
                    <HiBriefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">No scout lists yet</p>
                    <p className="text-sm text-gray-500 mt-1">Create one with Start Direct Scout to save filtered lists here.</p>
                    <button
                      type="button"
                      onClick={() => setShowScoutModal(true)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium"
                    >
                      <HiBriefcase className="w-5 h-5" />
                      Start Direct Scout
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Job Title</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Work Mode</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">People found</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Pay Range</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created at</th>
                            <th className="w-12 px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {scoutLists.map((entry) => {
                            const c = entry.criteria;
                            const hasMin = c.salaryMin && !Number.isNaN(Number(c.salaryMin));
                            const hasMax = c.salaryMax && !Number.isNaN(Number(c.salaryMax));
                            const curr = c.currency || 'USD';
                            const sym = curr === 'USD' ? '$' : curr === 'EUR' ? '€' : curr === 'GBP' ? '£' : curr + ' ';
                            const fmt = (v: string) => sym + Number(v).toLocaleString();
                            const period = c.salaryPeriod ?? 'annually';
                            const periodLabel = SALARY_PERIOD_LABELS[period] ?? 'Annually';
                            const payRange = hasMin && hasMax
                              ? `${fmt(c.salaryMin)} - ${fmt(c.salaryMax)} / ${periodLabel}`
                              : hasMin
                                ? `${fmt(c.salaryMin)} / ${periodLabel}`
                                : hasMax
                                  ? `${fmt(c.salaryMax)} / ${periodLabel}`
                                  : '—';
                            const workModeLabel = WORK_MODE_LABELS[c.workMode] ?? (c.workMode || '—');
                            return (
                              <tr
                                key={entry.id}
                                onClick={() => {
                                  if (scoutActionMenuId === entry.id) return;
                                  setActiveScoutId(entry.id);
                                }}
                                className="hover:bg-brand-50 cursor-pointer"
                              >
                                <td className="px-4 py-3 font-medium text-gray-900">{c.jobTitle || '—'}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{c.location || '—'}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{workModeLabel}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{entry.peopleFound ?? '—'}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{payRange}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{new Date(entry.createdAt).toLocaleString()}</td>
                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                  <div className="relative" ref={scoutActionMenuId === entry.id ? scoutActionMenuRef : null}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setScoutActionMenuId(scoutActionMenuId === entry.id ? null : entry.id);
                                      }}
                                      className="p-1.5 rounded hover:bg-gray-200 text-gray-500"
                                    >
                                      <HiDotsVertical className="w-5 h-5" />
                                    </button>
                                    {/* Dropdown rendered in portal - see below */}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Scout list action dropdown (portal so not clipped by overflow) */}
        {scoutActionMenuId && scoutMenuPosition && (() => {
          const entry = scoutLists.find((e) => e.id === scoutActionMenuId);
          if (!entry) return null;
          return createPortal(
            <div
              ref={scoutMenuPortalRef}
              className="fixed w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[100]"
              style={{ top: scoutMenuPosition.top, left: scoutMenuPosition.left }}
            >
              <button
                type="button"
                onClick={() => {
                  const c = entry.criteria;
                  setScoutForm({
                    ...c,
                    searchType: c.searchType === 'fuzzy' ? 'fuzzy' : 'strict',
                    salaryPeriod: c.salaryPeriod ?? 'annually',
                    benefitInput: '',
                    description: c.description ?? '',
                  });
                  setEditingScoutId(entry.id);
                  setShowScoutModal(true);
                  setScoutActionMenuId(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                Edit Parameter
              </button>
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    try {
                      await api.delete(`/v1/organisation/professionals/scouts/${entry.id}`);
                      if (activeScoutId === entry.id) setActiveScoutId(null);
                      await fetchScoutLists();
                      toast.success('Scout list removed');
                    } catch (err: any) {
                      toast.error(err.response?.data?.message || 'Failed to remove scout list');
                    } finally {
                      setScoutActionMenuId(null);
                    }
                  })();
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                Remove
              </button>
            </div>,
            document.body
          );
        })()}

        {/* Professional row action dropdown (portal so not clipped by overflow) */}
        {actionMenuId && profMenuPosition && (() => {
          const prof = professionals.find((p) => p.id === actionMenuId);
          if (!prof) return null;
          return createPortal(
            <div
              ref={profMenuPortalRef}
              className="fixed w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[100]"
              style={{ top: profMenuPosition.top, left: profMenuPosition.left }}
            >
              <button
                type="button"
                onClick={() => handleViewProfile(prof.id)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <HiEye className="w-4 h-4" /> View Profile
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage(prof)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <HiMail className="w-4 h-4" /> Message
              </button>
              <button
                type="button"
                onClick={() => handleScout(prof)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <HiBriefcase className="w-4 h-4" /> Hire
              </button>
            </div>,
            document.body
          );
        })()}

        {/* Results count (All Professionals or Scout Request tab) */}
        {(professionalsTab === 'all' || (professionalsTab === 'scouted' && activeScoutId && scoutViewTab === 'request')) && (
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {loading ? (
                <span>Searching...</span>
              ) : (
                <span>
                  {professionals.length === 0
                    ? 'No professionals'
                    : `${professionals.length} professional${professionals.length === 1 ? '' : 's'} found`}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Selection bar: Send Scout Request when any row selected */}
        {(professionalsTab === 'all' || (professionalsTab === 'scouted' && activeScoutId && scoutViewTab === 'request')) && !loading && professionals.length > 0 && selectedIds.size > 0 && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-brand-300 bg-brand-50 px-4 py-3">
            <span className="text-sm font-medium text-brand-700">
              {selectedIds.size} professional{selectedIds.size === 1 ? '' : 's'} selected
            </span>
            <button
              type="button"
              onClick={() => openSendScoutModal(null)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium"
            >
              <HiPaperAirplane className="w-5 h-5" />
              Send Scout Request
            </button>
          </div>
        )}

        {/* Table (All Professionals or Scout Request tab) */}
        {(professionalsTab === 'all' || (professionalsTab === 'scouted' && activeScoutId && scoutViewTab === 'request')) && (
          <>
        {loading ? (
          <div className="text-center text-gray-600 py-16">Loading professionals...</div>
        ) : professionals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-xl border border-gray-200">
            <HiUser className="w-14 h-14 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Professionals Found</h3>
            <p className="text-sm text-gray-500 text-center max-w-md">
              {professionalsTab === 'scouted'
                ? 'No professionals match this scout list.'
                : filters.search || filters.jobTitle || filters.country || filters.city
                  ? 'No professionals match your search. Try different filters.'
                  : 'No professionals available at the moment.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={professionals.length > 0 && selectedIds.size === professionals.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nationality</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Profession</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Experience</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Verification</th>
                    <th className="w-12 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {professionals.map((prof) => (
                    <tr key={prof.id} className="hover:bg-gray-50">
                      <td className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(prof.id)}
                          onChange={() => toggleSelectOne(prof.id)}
                          className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{prof.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <span className="text-lg" title={prof.nationality || prof.location?.country || ''}>
                            {getFlag(prof.nationality || prof.location?.country)}
                          </span>
                          {prof.nationality || prof.location?.country || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {getLocationDisplay(prof.location)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{prof.profession}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {prof.yearsOfExperience} yrs
                      </td>
                      <td className="px-4 py-3">
                        {getVerificationBadge(prof.verificationStatus)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative" ref={actionMenuId === prof.id ? actionMenuRef : null}>
                          <button
                            type="button"
                            onClick={() => setActionMenuId(actionMenuId === prof.id ? null : prof.id)}
                            className="p-1.5 rounded hover:bg-gray-200 text-gray-500"
                          >
                            <HiDotsVertical className="w-5 h-5" />
                          </button>
                          {/* Dropdown rendered in portal - see below */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
          </>
        )}

        {/* Response tab: candidates declare interest for the job or not */}
        {professionalsTab === 'scouted' && activeScoutId && scoutViewTab === 'response' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {scoutResponses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <HiUser className="w-14 h-14 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No responses yet</h3>
                <p className="text-sm text-gray-500 text-center max-w-md">
                  When candidates declare interest (or not) for this scout, their responses will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Profession</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Interest</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Responded at</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {scoutResponses.map((r) => (
                      <tr key={r.professionalId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{r.profession}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            r.status === 'interested'
                              ? 'bg-green-100 text-green-800'
                              : r.status === 'not_interested'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-amber-100 text-amber-800'
                          }`}>
                            {r.status === 'interested' ? 'Interested' : r.status === 'not_interested' ? 'Not interested' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{r.respondedAt ? new Date(r.respondedAt).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* View Profile Drawer */}
        {profileDrawerId && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/50" onClick={closeProfileDrawer} />
            <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
              {profileLoading ? (
                <div className="p-8 flex items-center justify-center min-h-[200px]">
                  <div className="text-gray-500">Loading profile...</div>
                </div>
              ) : profileDetail ? (
                <div className="p-6 pb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">{profileDetail.name}</h2>
                    <button type="button" onClick={closeProfileDrawer} className="p-2 hover:bg-gray-100 rounded-lg">
                      <HiX className="w-6 h-6 text-gray-500" />
                    </button>
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
                          {profileDetail.verificationStatus.percentage}% - {profileDetail.verificationStatus.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {profileDetail.skills?.length > 0 && (
                    <section className="mb-6">
                      <h3 className="text-sm font-bold text-gray-900 mb-2">Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {profileDetail.skills.map((s: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-sm">
                            {s}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  {profileDetail.workExperience?.length > 0 && (
                    <section className="mb-6">
                      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <HiBriefcase className="w-4 h-4" />
                        Work Experience
                      </h3>
                      <ul className="space-y-3">
                        {profileDetail.workExperience.map((exp: any) => (
                          <li key={exp.id}>
                            {(exp.role || exp.jobTitle) && (
                              <p className="font-medium text-gray-900">{exp.role || exp.jobTitle}</p>
                            )}
                            {(exp.organisationName || exp.companyName) && (
                              <p className="text-sm text-gray-600">{exp.organisationName || exp.companyName}</p>
                            )}
                            {(exp.startDate || exp.endDate || exp.currentlyWorking) && (
                              <p className="text-xs text-gray-500">
                                {exp.startDate || ''}
                                {(exp.startDate && (exp.currentlyWorking || exp.endDate)) ? ' — ' : ''}
                                {exp.currentlyWorking ? 'Present' : (exp.endDate || '')}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {profileDetail.education?.length > 0 && (
                    <section className="mb-6">
                      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <HiAcademicCap className="w-4 h-4" />
                        Academic Qualifications
                      </h3>
                      <ul className="space-y-3">
                        {profileDetail.education.map((edu: any) => {
                          const qualification = [edu.degreeType, edu.fieldOfStudy].filter(Boolean).join(' ') || edu.levelOfEducation;
                          return (
                            <li key={edu.id}>
                              {qualification && <p className="font-medium text-gray-900">{qualification}</p>}
                              {edu.institutionName && <p className="text-sm text-gray-600">{edu.institutionName}</p>}
                              {(edu.endDate || edu.startDate) && (
                                <p className="text-xs text-gray-500">{edu.endDate || edu.startDate}</p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  )}

                  {profileDetail.certifications?.length > 0 && (
                    <section className="mb-8">
                      <h3 className="text-sm font-bold text-gray-900 mb-2">Certifications</h3>
                      <div className="flex flex-wrap gap-2">
                        {profileDetail.certifications.map((c: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-sm">
                            {c}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const pro: Professional = {
                          id: profileDetail.id,
                          name: profileDetail.name,
                          email: profileDetail.email,
                          nationality: profileDetail.nationality,
                          location: profileDetail.location,
                          profession: profileDetail.profession,
                          yearsOfExperience: profileDetail.yearsOfExperience ?? 0,
                          verificationStatus: profileDetail.verificationStatus || { percentage: 0, status: '' },
                        };
                        closeProfileDrawer();
                        openSendScoutModal(pro);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium"
                    >
                      Send Scout Request
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const pro: Professional = {
                          id: profileDetail.id,
                          name: profileDetail.name,
                          email: profileDetail.email,
                          nationality: profileDetail.nationality,
                          location: profileDetail.location,
                          profession: profileDetail.profession,
                          yearsOfExperience: profileDetail.yearsOfExperience ?? 0,
                          verificationStatus: profileDetail.verificationStatus || { percentage: 0, status: '' },
                        };
                        setSelectedProfessional(pro);
                        setMessageForm({ subject: '', message: '', jobTitle: '' });
                        closeProfileDrawer();
                        setShowMessageModal(true);
                      }}
                      className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-800 font-medium hover:bg-gray-50"
                    >
                      Send Message
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <p>Could not load profile.</p>
                  <button type="button" onClick={closeProfileDrawer} className="mt-4 text-brand-600 hover:underline">
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Start Direct Scout (criteria) Drawer – slides in from right */}
        {showScoutModal && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowScoutModal(false)}
              aria-hidden
            />
            <div className="relative w-full max-w-2xl h-full bg-white shadow-xl overflow-y-auto flex flex-col">
              <div className="p-6 flex-shrink-0 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Start Direct Scout</h2>
                  <button type="button" onClick={() => setShowScoutModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <HiX className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="p-6 flex-1 overflow-y-auto">

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">What Job Title are you Scouting for?</label>
                      <SearchableList
                        value={scoutForm.jobTitle}
                        onChange={(v) => setScoutForm({ ...scoutForm, jobTitle: v })}
                        options={[
                          { value: '', label: 'Select or type a title' },
                          { value: 'Software Engineer', label: 'Software Engineer' },
                          { value: 'Product Manager', label: 'Product Manager' },
                          { value: 'UX Designer', label: 'UX Designer' },
                          { value: 'Data Scientist', label: 'Data Scientist' },
                          { value: 'AI Engineer', label: 'AI Engineer' },
                          { value: 'Ambassador', label: 'Ambassador' },
                          { value: 'Operations Manager', label: 'Operations Manager' },
                          { value: 'Financial Analyst', label: 'Financial Analyst' },
                          { value: 'Customer Specialist', label: 'Customer Specialist' },
                        ]}
                        placeholder="Select or type a title"
                        className="w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                        allowCustom
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Search Type</label>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">Strict</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={scoutForm.searchType === 'fuzzy'}
                          onClick={() => setScoutForm({ ...scoutForm, searchType: scoutForm.searchType === 'strict' ? 'fuzzy' : 'strict' })}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${scoutForm.searchType === 'fuzzy' ? 'bg-brand-500' : 'bg-gray-200'}`}
                        >
                          <span className="sr-only">Use fuzzy search</span>
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition translate-y-0.5 ${scoutForm.searchType === 'fuzzy' ? 'translate-x-5' : 'translate-x-0.5'}`}
                          />
                        </button>
                        <span className="text-sm text-gray-600">Fuzzy</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5">
                        {scoutForm.searchType === 'strict'
                          ? 'Only returns candidates with the exact job title.'
                          : 'Returns candidates matching related tags and keywords.'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">What Location are you Looking to Scout?</label>
                      <select
                        value={scoutForm.location}
                        onChange={(e) => setScoutForm({ ...scoutForm, location: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="Global">Global</option>
                        <option value="Nigeria">Nigeria</option>
                        <option value="Ghana">Ghana</option>
                        <option value="Kenya">Kenya</option>
                        <option value="Rwanda">Rwanda</option>
                        <option value="Uganda">Uganda</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="United States">United States</option>
                        {COUNTRIES.filter(
                          (c) =>
                            ![
                              'Nigeria',
                              'Ghana',
                              'Kenya',
                              'Rwanda',
                              'Uganda',
                              'United Kingdom',
                              'United States',
                            ].includes(c),
                        ).map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Where would this Role be Domiciled?</label>
                      <input
                        type="text"
                        value={scoutForm.domicile}
                        onChange={(e) => setScoutForm({ ...scoutForm, domicile: e.target.value })}
                        placeholder="e.g. Lagos, Nigeria"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Work Mode</label>
                      <select
                        value={scoutForm.workMode}
                        onChange={(e) => setScoutForm({ ...scoutForm, workMode: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="">Select work mode</option>
                        {/* <option value="remote">Remote</option> */}
                        <option value="hybrid">Hybrid</option>
                        <option value="on_site">On-site</option>
                        <option value="local_remote">Local Remote</option>
                        <option value="global_remote">Global Remote</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Employment Type</label>
                      <select
                        value={scoutForm.employmentType}
                        onChange={(e) => setScoutForm({ ...scoutForm, employmentType: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="">Select employment type</option>
                        {DIRECT_SCOUT_EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Pay Range</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={scoutForm.currency}
                        onChange={(e) => setScoutForm({ ...scoutForm, currency: e.target.value })}
                        className="min-w-[7rem] px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="NGN">NGN</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                      <input
                        type="number"
                        value={scoutForm.salaryMin}
                        onChange={(e) => setScoutForm({ ...scoutForm, salaryMin: e.target.value })}
                        placeholder="Min"
                        className="w-28 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <input
                        type="number"
                        value={scoutForm.salaryMax}
                        onChange={(e) => setScoutForm({ ...scoutForm, salaryMax: e.target.value })}
                        placeholder="Max"
                        className="w-28 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <select
                        value={scoutForm.salaryPeriod}
                        onChange={(e) => setScoutForm({ ...scoutForm, salaryPeriod: e.target.value as 'weekly' | 'monthly' | 'annually' })}
                        className="min-w-[7rem] px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="annually">Annually</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Other Benefits</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={scoutForm.benefitInput}
                        onChange={(e) => setScoutForm({ ...scoutForm, benefitInput: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                        placeholder="e.g. Health insurance, Stock options"
                        className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <button
                        type="button"
                        onClick={addBenefit}
                        className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100"
                      >
                        <HiPlus className="w-5 h-5" />
                      </button>
                    </div>
                    {scoutForm.benefits.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {scoutForm.benefits.map((b, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 text-sm">
                            {b}
                            <button type="button" onClick={() => setScoutForm({ ...scoutForm, benefits: scoutForm.benefits.filter((_, j) => j !== i) })}>
                              <HiX className="w-4 h-4 text-gray-500" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Job Description</label>
                    <div className="rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:bg-gray-50 [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[120px] [&_.ql-editor.ql-blank::before]:text-gray-400">
                      <ReactQuill
                        theme="snow"
                        value={scoutForm.description}
                        onChange={(html) => setScoutForm({ ...scoutForm, description: html })}
                        placeholder="Describe the role..."
                        modules={{
                          toolbar: [
                            ['bold', 'italic', 'underline'],
                            [{ list: 'ordered' }, { list: 'bullet' }],
                            ['clean'],
                          ],
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleScoutSearchSubmit}
                    disabled={scoutSearchLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium"
                  >
                    <HiSearch className="w-5 h-5" />
                    {scoutSearchLoading ? 'Searching...' : 'Start Search'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Send Scout Request Drawer (right to left) */}
        {showHireModal && (selectedProfessional || selectedIds.size > 0) && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => { setShowHireModal(false); setSelectedProfessional(null); }}
              aria-hidden
            />
            <div className="relative w-full max-w-2xl h-full bg-white shadow-xl overflow-y-auto flex flex-col">
              <div className="p-6 flex-shrink-0 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Send Scout Request</h2>
                  <button type="button" onClick={() => { setShowHireModal(false); setSelectedProfessional(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                    <HiX className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  You have been headhunted by <strong>{orgProfile?.companyName || 'your organisation'}</strong>, {orgProfile?.industry ? `a ${orgProfile.industry} company` : 'a company'} operating globally for the position:
                </p>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Sending to</label>
                  {selectedProfessional ? (
                    <p className="text-gray-900 font-medium">{selectedProfessional.name} – {selectedProfessional.profession}</p>
                  ) : (
                    <p className="text-gray-900 font-medium">{selectedIds.size} professional{selectedIds.size === 1 ? '' : 's'}</p>
                  )}
                </div>
              </div>
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role Title *</label>
                    <input
                      type="text"
                      value={hireForm.jobTitle}
                      onChange={(e) => setHireForm({ ...hireForm, jobTitle: e.target.value })}
                      placeholder="e.g. Senior Software Engineer"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type *</label>
                      <SearchableList
                        value={hireForm.employmentType}
                        onChange={(v) => setHireForm({ ...hireForm, employmentType: v })}
                        options={[
                          { value: '', label: 'Select employment type' },
                          ...DIRECT_SCOUT_EMPLOYMENT_TYPE_OPTIONS,
                        ]}
                        placeholder="Select employment type"
                        className="w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Work Mode *</label>
                      <SearchableList
                        value={hireForm.workMode}
                        onChange={(v) => setHireForm({ ...hireForm, workMode: v })}
                        options={[
                          { value: '', label: 'Select work mode' },
                          { value: 'remote', label: 'Remote' },
                          { value: 'hybrid', label: 'Hybrid' },
                          { value: 'on_site', label: 'On-site' },
                          { value: 'global_remote', label: 'Global Remote' },
                        ]}
                        placeholder="Select work mode"
                        className="w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role Location Office</label>
                    <input
                      type="text"
                      value={hireForm.roleLocationOffice}
                      onChange={(e) => setHireForm({ ...hireForm, roleLocationOffice: e.target.value })}
                      placeholder="e.g. Lagos, Nigeria"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
                    <div className="rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:bg-gray-50 [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[160px] [&_.ql-editor.ql-blank::before]:text-gray-400">
                      <ReactQuill
                        theme="snow"
                        value={hireForm.description}
                        onChange={(html) => setHireForm({ ...hireForm, description: html })}
                        placeholder="Describe the role, responsibilities, and requirements..."
                        modules={{
                          toolbar: [
                            [{ header: [1, 2, 3, false] }],
                            ['bold', 'italic', 'underline', 'strike'],
                            [{ list: 'ordered' }, { list: 'bullet' }],
                            [{ indent: '-1' }, { indent: '+1' }],
                            ['blockquote'],
                            ['link'],
                            ['clean'],
                          ],
                        }}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2 mb-4">Please review the offer and Job description and respond as soon as possible.</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowHireModal(false); setSelectedProfessional(null); }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleHireSubmit}
                    disabled={!hireForm.jobTitle.trim() || !hireForm.employmentType || !hireForm.workMode}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium disabled:opacity-50"
                  >
                    <HiPaperAirplane className="w-5 h-5" />
                    Send Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message Modal */}
        {showMessageModal && selectedProfessional && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Send Message</h2>
                  <button onClick={() => { setShowMessageModal(false); setSelectedProfessional(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                    <HiX className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">To:</p>
                  <p className="font-medium text-gray-900">{selectedProfessional.name}</p>
                  <p className="text-sm text-gray-500">{selectedProfessional.email}</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title (optional)</label>
                    <input
                      type="text"
                      value={messageForm.jobTitle}
                      onChange={(e) => setMessageForm({ ...messageForm, jobTitle: e.target.value })}
                      placeholder="e.g. Ambassador, AI Engineer"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject (optional)</label>
                    <input
                      type="text"
                      value={messageForm.subject}
                      onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                      placeholder="Subject"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                    <div className="rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:bg-gray-50 [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[140px] [&_.ql-editor.ql-blank::before]:text-gray-400">
                      <ReactQuill
                        theme="snow"
                        value={messageForm.message}
                        onChange={(html) => setMessageForm({ ...messageForm, message: html })}
                        placeholder="Your message..."
                        modules={{
                          toolbar: [
                            [{ header: [1, 2, 3, false] }],
                            ['bold', 'italic', 'underline', 'strike'],
                            [{ list: 'ordered' }, { list: 'bullet' }],
                            [{ indent: '-1' }, { indent: '+1' }],
                            ['blockquote'],
                            ['link'],
                            ['clean'],
                          ],
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => { setShowMessageModal(false); setSelectedProfessional(null); }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMessageSubmit}
                    disabled={isRichTextEmpty(messageForm.message)}
                    className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
                  >
                    Send Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </OrganisationLayout>
  );
}
