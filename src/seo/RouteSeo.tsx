import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applySeo } from '@/seo/applySeo';
import { buildCanonicalUrl, resolveRouteSeo } from '@/seo/resolveRouteSeo';

/**
 * Keeps document title and primary meta tags in sync with the current route.
 * Public detail pages should call applySeo again when entity data loads.
 */
export function RouteSeo() {
  const { pathname, search } = useLocation();

  useLayoutEffect(() => {
    const resolved = resolveRouteSeo(pathname, search);
    const canonicalUrl = buildCanonicalUrl(pathname, search, {
      pathOnly: resolved.canonicalPathOnly === true,
    });
    applySeo({
      title: resolved.title,
      description: resolved.description,
      noIndex: resolved.noIndex,
      canonicalUrl,
    });
  }, [pathname, search]);

  return null;
}
