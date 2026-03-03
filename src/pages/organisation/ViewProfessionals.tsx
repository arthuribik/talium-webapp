import { useState, useEffect, useRef } from 'react';
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

export default function ViewProfessionals() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHireModal, setShowHireModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const [hireForm, setHireForm] = useState({
    jobTitle: '',
    employmentType: '',
    workMode: '',
    roleLocationOffice: '',
    description: '',
  });
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
    benefits: [] as string[],
    benefitInput: '',
    description: '',
  });
  const [scoutSearchLoading, setScoutSearchLoading] = useState(false);
  const [profileDrawerId, setProfileDrawerId] = useState<string | null>(null);
  const [profileDetail, setProfileDetail] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (!scoutSearchActive) fetchProfessionals();
  }, [filters, page, scoutSearchActive]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleScout = (professional: Professional) => {
    setActionMenuId(null);
    setSelectedProfessional(professional);
    setHireForm({ jobTitle: '', employmentType: '', workMode: '', roleLocationOffice: '', description: '' });
    setShowHireModal(true);
    api.get('/v1/organisation/profile').then((r) => {
      const o = r.data?.data;
      if (o) setOrgProfile({ companyName: o.companyName, industry: o.industry });
    }).catch(() => setOrgProfile(null));
  };

  const handleStartDirectScout = () => {
    setShowScoutModal(true);
  };

  const handleScoutSearchSubmit = async () => {
    const jobTitle = scoutForm.jobTitle.trim() || undefined;
    setScoutSearchLoading(true);
    try {
      const res = await api.post('/v1/organisation/professionals/scout-search', {
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
      });
      const data = res.data?.data;
      setProfessionals(data?.professionals || []);
      setTotalPages(data?.pagination?.totalPages || 1);
      setPage(1);
      setScoutSearchActive(true);
      setShowScoutModal(false);
      toast.success(`Found ${(data?.professionals || []).length} professional(s).`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Scout search failed');
    } finally {
      setScoutSearchLoading(false);
    }
  };

  const clearScoutSearch = () => {
    setScoutSearchActive(false);
    setPage(1);
    fetchProfessionals();
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
    if (!selectedProfessional) return;
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
    try {
      await api.post(`/v1/organisation/professionals/${selectedProfessional.id}/hire`, {
        jobTitle: hireForm.jobTitle.trim(),
        employmentType: hireForm.employmentType,
        workMode: hireForm.workMode,
        location: hireForm.roleLocationOffice.trim() || undefined,
        description: hireForm.description.trim() || undefined,
      });
      toast.success('Scout request sent successfully!');
      setShowHireModal(false);
      setSelectedProfessional(null);
      setHireForm({ jobTitle: '', employmentType: '', workMode: '', roleLocationOffice: '', description: '' });
      setSelectedIds((prev) => {
        if (!selectedProfessional) return prev;
        const next = new Set(prev);
        next.delete(selectedProfessional.id);
        return next;
      });
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
      ? 'bg-blue-800 text-white'
      : isPending
        ? 'bg-gray-200 text-gray-700'
        : 'bg-blue-100 text-blue-800';
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${bg}`}>
        {percentage}% - {statusText}
      </span>
    );
  };

  return (
    <OrganisationLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header + Start Direct Scout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Professionals</h1>
            <p className="text-gray-500 text-sm md:text-base mt-0.5">Browse and scout verified professionals on Trudium.</p>
          </div>
          <button
            onClick={handleStartDirectScout}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium shrink-0"
          >
            <HiBriefcase className="w-5 h-5" />
            Start Direct Scout
          </button>
        </div>

        {scoutSearchActive && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-teal-50 border border-teal-200 px-4 py-2">
            <span className="text-sm text-teal-800">Showing scout search results.</span>
            <button onClick={clearScoutSearch} className="text-sm font-medium text-teal-700 hover:text-teal-900 underline">
              Clear and show all
            </button>
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <div className="relative max-w-xl">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, profession, location..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center text-gray-600 py-16">Loading professionals...</div>
        ) : professionals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-xl border border-gray-200">
            <HiUser className="w-14 h-14 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Professionals Found</h3>
            <p className="text-sm text-gray-500 text-center max-w-md">
              {filters.search || filters.jobTitle || filters.country || filters.city
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
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
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
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
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
                          {actionMenuId === prof.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
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
                            </div>
                          )}
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
                    <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 text-teal-700 text-xl font-bold">
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
                        <span className="inline-flex mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-800 text-white">
                          {profileDetail.verificationStatus.percentage}% - {profileDetail.verificationStatus.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <section className="mb-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {(profileDetail.skills && profileDetail.skills.length > 0) ? (
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

                  <section className="mb-8">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">Certifications</h3>
                    <div className="flex flex-wrap gap-2">
                      {(profileDetail.certifications && profileDetail.certifications.length > 0) ? (
                        profileDetail.certifications.map((c: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-sm">
                            {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">—</span>
                      )}
                    </div>
                  </section>

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
                        setSelectedProfessional(pro);
                        setHireForm({ jobTitle: '', employmentType: '', workMode: '', roleLocationOffice: '', description: '' });
                        closeProfileDrawer();
                        setShowHireModal(true);
                        api.get('/v1/organisation/profile').then((r) => {
                          const o = r.data?.data;
                          if (o) setOrgProfile({ companyName: o.companyName, industry: o.industry });
                        }).catch(() => setOrgProfile(null));
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
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
                  <button type="button" onClick={closeProfileDrawer} className="mt-4 text-teal-600 hover:underline">
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
                      className="w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      allowCustom
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Search Type</label>
                    <select
                      value={scoutForm.searchType}
                      onChange={(e) => setScoutForm({ ...scoutForm, searchType: e.target.value as 'strict' | 'fuzzy' })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="strict">Strict Search</option>
                      <option value="fuzzy">Fuzzy Search</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {scoutForm.searchType === 'strict'
                        ? 'Only returns candidates with the exact job title.'
                        : 'Returns candidates whose job title contains all search words (in any order).'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">What Location are you Looking to Scout?</label>
                    <SearchableList
                      value={scoutForm.location}
                      onChange={(v) => setScoutForm({ ...scoutForm, location: v })}
                      options={[
                        { value: 'Global', label: 'Global' },
                        { value: 'Nigeria', label: 'Nigeria' },
                        { value: 'Ghana', label: 'Ghana' },
                        { value: 'Kenya', label: 'Kenya' },
                        { value: 'Rwanda', label: 'Rwanda' },
                        { value: 'United Kingdom', label: 'United Kingdom' },
                        { value: 'United States', label: 'United States' },
                        ...COUNTRIES.filter(
                          (c) => !['Nigeria', 'Ghana', 'Kenya', 'Rwanda', 'United Kingdom', 'United States'].includes(c),
                        ).map((c) => ({ value: c, label: c })),
                      ]}
                      placeholder="Select location"
                      className="w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Where would this Role be Domiciled?</label>
                    <input
                      type="text"
                      value={scoutForm.domicile}
                      onChange={(e) => setScoutForm({ ...scoutForm, domicile: e.target.value })}
                      placeholder="e.g. Lagos, Nigeria"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Work Mode</label>
                      <select
                        value={scoutForm.workMode}
                        onChange={(e) => setScoutForm({ ...scoutForm, workMode: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Select work mode</option>
                        <option value="remote">Remote</option>
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
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Select employment type</option>
                        <option value="full_time">Full Time</option>
                        <option value="part_time">Part Time</option>
                        <option value="contract">Contract</option>
                        <option value="internship">Internship</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Salary</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <SearchableList
                        value={scoutForm.currency}
                        onChange={(v) => setScoutForm({ ...scoutForm, currency: v })}
                        options={[
                          { value: 'USD', label: 'USD' },
                          { value: 'EUR', label: 'EUR' },
                          { value: 'GBP', label: 'GBP' },
                        ]}
                        placeholder="Currency"
                        className="min-w-[7rem] border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      />
                      <input
                        type="number"
                        value={scoutForm.salaryMin}
                        onChange={(e) => setScoutForm({ ...scoutForm, salaryMin: e.target.value })}
                        placeholder="Min"
                        className="w-28 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <input
                        type="number"
                        value={scoutForm.salaryMax}
                        onChange={(e) => setScoutForm({ ...scoutForm, salaryMax: e.target.value })}
                        placeholder="Max"
                        className="w-28 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
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
                        className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
                        <button type="button" className="p-1.5 rounded hover:bg-gray-200 text-gray-600 text-sm font-bold">B</button>
                        <button type="button" className="p-1.5 rounded hover:bg-gray-200 text-gray-600 italic text-sm">I</button>
                        <button type="button" className="p-1.5 rounded hover:bg-gray-200 text-gray-600 text-sm underline">U</button>
                      </div>
                      <textarea
                        value={scoutForm.description}
                        onChange={(e) => setScoutForm({ ...scoutForm, description: e.target.value })}
                        rows={4}
                        placeholder="Describe the role..."
                        className="w-full px-3 py-2.5 border-0 focus:outline-none focus:ring-0 resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleScoutSearchSubmit}
                    disabled={scoutSearchLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    <HiSearch className="w-5 h-5" />
                    {scoutSearchLoading ? 'Searching...' : 'Start Search'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Send Scout Request Modal */}
        {showHireModal && selectedProfessional && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Send Scout Request</h2>
                  <button onClick={() => { setShowHireModal(false); setSelectedProfessional(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                    <HiX className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  You have been headhunted by <strong>{orgProfile?.companyName || 'your organisation'}</strong>, {orgProfile?.industry ? `a ${orgProfile.industry} company` : 'a company'} operating globally for the position:
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Sending to</label>
                  <p className="text-gray-900 font-medium">{selectedProfessional.name} – {selectedProfessional.profession}</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role Title *</label>
                    <input
                      type="text"
                      value={hireForm.jobTitle}
                      onChange={(e) => setHireForm({ ...hireForm, jobTitle: e.target.value })}
                      placeholder="e.g. Senior Software Engineer"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                          { value: 'full_time', label: 'Full Time' },
                          { value: 'part_time', label: 'Part Time' },
                          { value: 'contract', label: 'Contract' },
                          { value: 'internship', label: 'Internship' },
                        ]}
                        placeholder="Select employment type"
                        className="w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
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
                        className="w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
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
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
                    <textarea
                      rows={6}
                      value={hireForm.description}
                      onChange={(e) => setHireForm({ ...hireForm, description: e.target.value })}
                      placeholder="Describe the role, responsibilities, and requirements..."
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2 mb-4">Please review the offer and Job description and respond as soon as possible.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowHireModal(false); setSelectedProfessional(null); }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleHireSubmit}
                    disabled={!hireForm.jobTitle.trim() || !hireForm.employmentType || !hireForm.workMode}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject (optional)</label>
                    <input
                      type="text"
                      value={messageForm.subject}
                      onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                      placeholder="Subject"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                    <div className="rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:bg-gray-50 [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[140px] [&_.ql-editor.ql-blank::before]:text-gray-400">
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
                    className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
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
