import { useEffect, type DependencyList } from 'react';
import { applySeo, type SeoPayload } from '@/seo/applySeo';

/** Refine SEO after async data (e.g. job title, person name). */
export function usePageSeo(payload: SeoPayload | null, deps: DependencyList) {
  useEffect(() => {
    if (!payload) return;
    applySeo(payload);
  }, deps);
}
