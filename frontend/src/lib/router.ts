const PLACE_PATH_RE = /^\/p\/([^/]+)\/?$/;

export function parsePlaceIdFromPath(pathname: string): string | null {
  const match = pathname.match(PLACE_PATH_RE);
  return match ? decodeURIComponent(match[1]) : null;
}

export function placeUrl(id: string): string {
  return `/p/${encodeURIComponent(id)}`;
}

export type Page = 'map' | 'list' | 'contribute' | 'about';

const PAGE_PATHS: Record<Page, string> = {
  map: '/',
  list: '/list',
  contribute: '/contribute',
  about: '/about',
};

export function pageUrl(page: Page): string {
  return PAGE_PATHS[page];
}

export function parsePageFromPath(pathname: string): Page | null {
  const entry = (Object.entries(PAGE_PATHS) as [Page, string][]).find(
    ([, path]) => path === pathname
  );
  return entry ? entry[0] : null;
}
