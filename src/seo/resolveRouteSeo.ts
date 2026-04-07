import { APP_DESCRIPTION, APP_NAME } from '@/constants/app';

export interface ResolvedSeo {
  title: string;
  description?: string;
  noIndex: boolean;
  /** Canonical URL should omit query string (tabbed settings, etc.). */
  canonicalPathOnly?: boolean;
}

const PRO_SETTINGS_TAB_LABELS: Record<string, string> = {
  profile: 'Profile',
  security: 'Security',
  'your-links': 'Your Links',
  'feed-preferences': 'Feed Preferences',
};

const ORG_SETTINGS_TAB_LABELS: Record<string, string> = {
  overview: 'Overview',
  employees: 'Employees',
  public: 'Public page',
  security: 'Security',
};

const ADMIN_SETTINGS_TAB_LABELS: Record<string, string> = {
  general: 'General',
  users: 'Users',
  verification: 'Verification',
  billing: 'Billing',
};

const PRO_VERIFICATION_TAB_LABELS: Record<string, string> = {
  personal: 'Personal Identity',
  location: 'Location Data',
  education: 'Education',
  social: 'Social',
  work: 'Work Experience',
  projects: 'Projects',
  certification: 'Certifications',
  family: 'Family',
};

function tabTitle(
  search: string,
  base: string,
  map: Record<string, string>,
  defaultTabKey?: string,
): string {
  const tab = new URLSearchParams(search).get('tab') || defaultTabKey;
  if (!tab) return base;
  const label = map[tab] || tab.replace(/-/g, ' ');
  return `${base} — ${label}`;
}

function isPrivatePath(pathname: string): boolean {
  if (pathname.startsWith('/professional')) return true;
  if (pathname.startsWith('/organization')) return true;
  if (pathname.startsWith('/organisation/setup')) return true;
  if (pathname.startsWith('/app/')) return true;
  if (pathname.startsWith('/admin')) {
    return pathname !== '/admin/login';
  }
  return false;
}

/**
 * Baseline SEO for the current URL. Dynamic public pages (job, professional, org detail)
 * should call applySeo again when data loads.
 */
export function resolveRouteSeo(pathname: string, search: string): ResolvedSeo {
  const noIndex = isPrivatePath(pathname);
  const d = APP_DESCRIPTION;

  if (pathname === '/admin/login') {
    return {
      title: 'Admin sign in',
      description: `Sign in to the ${APP_NAME} administration portal.`,
      noIndex: true,
    };
  }

  if (pathname === '/') {
    return {
      title: 'Verified hiring and professional profiles',
      description: d,
      noIndex: false,
    };
  }

  if (pathname === '/about') {
    return {
      title: 'About',
      description: `Learn what ${APP_NAME} is and how verified profiles work for professionals and organisations.`,
      noIndex: false,
    };
  }

  if (pathname === '/jobs') {
    return {
      title: 'Jobs',
      description: `Browse open roles from verified organisations on ${APP_NAME}.`,
      noIndex: false,
    };
  }

  if (pathname === '/professionals') {
    return {
      title: 'Professionals',
      description: `Discover verified professionals on ${APP_NAME}.`,
      noIndex: false,
    };
  }

  if (pathname === '/organisations') {
    return {
      title: 'Organisations',
      description: `Explore verified organisations hiring on ${APP_NAME}.`,
      noIndex: false,
    };
  }

  if (pathname === '/login') {
    return {
      title: 'Sign in',
      description: `Sign in to your ${APP_NAME} account.`,
      noIndex: true,
    };
  }

  if (pathname === '/join') {
    return {
      title: 'Join as a professional',
      description: `Create your verified professional profile on ${APP_NAME}.`,
      noIndex: true,
    };
  }

  if (pathname === '/register-business') {
    return {
      title: 'Register your organisation',
      description: `Register your organisation on ${APP_NAME} to post jobs and hire verified talent.`,
      noIndex: true,
    };
  }

  if (pathname === '/professional/setup') {
    return { title: 'Complete your profile', description: `Finish setting up your ${APP_NAME} professional profile.`, noIndex: true };
  }

  if (pathname === '/organisation/setup' || pathname.startsWith('/organisation/setup')) {
    return { title: 'Organisation setup', description: `Complete your organisation profile on ${APP_NAME}.`, noIndex: true };
  }

  if (pathname === '/jobs/create') {
    return { title: 'Create job', description: `Post a new job on ${APP_NAME}.`, noIndex: true };
  }

  if (pathname === '/app/jobs') {
    return { title: 'Jobs', noIndex: true };
  }

  // Dynamic public fallbacks (overwritten when page data loads)
  if (/^\/jobs\/[^/]+$/.test(pathname)) {
    return {
      title: 'Job',
      description: `View this job listing on ${APP_NAME}.`,
      noIndex: false,
    };
  }

  if (/^\/professionals\/[^/]+$/.test(pathname)) {
    return {
      title: 'Professional profile',
      description: `View this verified professional profile on ${APP_NAME}.`,
      noIndex: false,
    };
  }

  if (/^\/organisations\/[^/]+$/.test(pathname)) {
    return {
      title: 'Organisation',
      description: `View this organisation on ${APP_NAME}.`,
      noIndex: false,
    };
  }

  if (/^\/contact\/[^/]+$/.test(pathname)) {
    return {
      title: 'Contact',
      description: `Verified contact card on ${APP_NAME}.`,
      noIndex: false,
    };
  }

  // Professional app
  if (pathname === '/professional') {
    return { title: 'Dashboard', noIndex: true };
  }
  if (pathname === '/professional/jobs') {
    return { title: 'Jobs', noIndex: true };
  }
  if (/^\/professional\/jobs\/[^/]+$/.test(pathname)) {
    return { title: 'Job', noIndex: true };
  }
  if (pathname === '/professional/profile') {
    return { title: 'Profile', noIndex: true };
  }
  if (pathname === '/professional/shared-data') {
    return { title: 'Shared data', noIndex: true };
  }
  if (/^\/professional\/shared-data\/[^/]+$/.test(pathname)) {
    return { title: 'Shared data detail', noIndex: true };
  }
  if (pathname === '/professional/verification') {
    return {
      title: tabTitle(search, 'Verification', PRO_VERIFICATION_TAB_LABELS, 'personal'),
      noIndex: true,
      canonicalPathOnly: true,
    };
  }
  if (pathname === '/professional/subscription') {
    return { title: 'Subscription', noIndex: true };
  }
  if (pathname === '/professional/settings') {
    return {
      title: tabTitle(search, 'Settings', PRO_SETTINGS_TAB_LABELS, 'profile'),
      noIndex: true,
      canonicalPathOnly: true,
    };
  }

  // Organisation app
  if (pathname === '/organization' || pathname === '/organization/') {
    return { title: 'Dashboard', noIndex: true };
  }
  if (pathname === '/organization/professionals') {
    return { title: 'Professionals', noIndex: true };
  }
  if (/^\/organization\/professionals\/[^/]+$/.test(pathname)) {
    return { title: 'Professional', noIndex: true };
  }
  if (pathname === '/organization/jobs') {
    return { title: 'Jobs', noIndex: true };
  }
  if (/^\/organization\/jobs\/[^/]+\/applicants\/[^/]+$/.test(pathname)) {
    return { title: 'Applicant', noIndex: true };
  }
  if (/^\/organization\/jobs\/[^/]+$/.test(pathname)) {
    return { title: 'Job', noIndex: true };
  }
  if (pathname === '/organization/team') {
    return { title: 'Team', noIndex: true };
  }
  if (pathname === '/organization/billing') {
    return { title: 'Billing', noIndex: true };
  }
  if (pathname === '/organization/settings') {
    return {
      title: tabTitle(search, 'Organisation settings', ORG_SETTINGS_TAB_LABELS, 'overview'),
      noIndex: true,
      canonicalPathOnly: true,
    };
  }

  // Admin app
  if (pathname === '/admin' || pathname === '/admin/') {
    return { title: 'Dashboard', noIndex: true };
  }
  if (pathname === '/admin/invite') {
    return { title: 'Invite admin', noIndex: true };
  }
  if (pathname === '/admin/professionals') {
    return { title: 'Professionals', noIndex: true };
  }
  if (/^\/admin\/professionals\/[^/]+$/.test(pathname)) {
    return { title: 'Professional', noIndex: true };
  }
  if (pathname === '/admin/organizations') {
    return { title: 'Organisations', noIndex: true };
  }
  if (/^\/admin\/organizations\/[^/]+$/.test(pathname)) {
    return { title: 'Organisation', noIndex: true };
  }
  if (pathname === '/admin/registrations') {
    return { title: 'Registrations', noIndex: true };
  }
  if (/^\/admin\/registrations\/[^/]+$/.test(pathname)) {
    return { title: 'Registration', noIndex: true };
  }
  if (pathname === '/admin/jobs') {
    return { title: 'Jobs', noIndex: true };
  }
  if (/^\/admin\/jobs\/[^/]+$/.test(pathname)) {
    return { title: 'Job', noIndex: true };
  }
  if (pathname === '/admin/transactions') {
    return { title: 'Transactions', noIndex: true };
  }
  if (/^\/admin\/transactions\/[^/]+$/.test(pathname)) {
    return { title: 'Transaction', noIndex: true };
  }
  if (pathname === '/admin/settings') {
    return {
      title: tabTitle(search, 'Admin settings', ADMIN_SETTINGS_TAB_LABELS, 'general'),
      noIndex: true,
      canonicalPathOnly: true,
    };
  }

  if (pathname === '/admin/create-super-admin') {
    return { title: 'Create super admin', noIndex: true };
  }

  // Fallback: humanize last segment or 404
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return { title: APP_NAME, description: d, noIndex: false };
  }

  const last = segments[segments.length - 1];
  const pretty = last.replace(/-/g, ' ');
  return {
    title: pretty.charAt(0).toUpperCase() + pretty.slice(1),
    description: d,
    noIndex,
  };
}

export function buildCanonicalUrl(
  pathname: string,
  search: string,
  options?: { pathOnly?: boolean },
): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  if (options?.pathOnly) {
    return `${origin}${pathname}`;
  }
  return `${origin}${pathname}${search}`;
}
