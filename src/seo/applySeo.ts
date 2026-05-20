import { APP_DESCRIPTION, APP_NAME } from '@/constants/app';

export type SeoPayload = {
  /** Short page title (brand suffix added automatically). */
  title: string;
  description?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
};

function titleWithBrand(title: string): string {
  const t = title.trim();
  if (!t) return APP_NAME;
  const lower = t.toLowerCase();
  const brand = APP_NAME.toLowerCase();
  if (lower === brand || lower.endsWith(`| ${brand}`) || lower.endsWith(`— ${brand}`)) {
    return t;
  }
  return `${t} | ${APP_NAME}`;
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** Strip HTML to a plain-text snippet for meta descriptions. */
export function plainTextFromHtml(html: string, maxLen = 165): string {
  if (!html) return '';
  if (typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = (div.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length <= maxLen) return text;
    return `${text.slice(0, maxLen - 1).trim()}…`;
  }
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/** Apply document title and core meta tags (call from route sync or after async data loads). */
export function applySeo(payload: SeoPayload) {
  if (typeof document === 'undefined') return;

  const fullTitle = titleWithBrand(payload.title);
  const description = (payload.description || APP_DESCRIPTION).trim();

  document.title = fullTitle;

  setMeta('name', 'description', description);
  setMeta('property', 'og:title', fullTitle);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:type', 'website');
  setMeta('name', 'twitter:card', 'summary');
  setMeta('name', 'twitter:title', fullTitle);
  setMeta('name', 'twitter:description', description);

  if (payload.canonicalUrl) {
    setCanonical(payload.canonicalUrl);
    setMeta('property', 'og:url', payload.canonicalUrl);
  }

  if (payload.noIndex) {
    setMeta('name', 'robots', 'noindex, nofollow');
  } else {
    setMeta('name', 'robots', 'index, follow');
  }
}
