// Mangrove.reviews integration — pure functions (no DOM rendering).
// Identity is a self-generated P-256 keypair stored in localStorage — there is
// no API key or registration step; the public key itself is the identity.
// Subject URI: geo:{lat},{lon}?q=osm_place_{osmId}&u=50&app={APP_DISCRIMINATOR}
// Rating scale: 0-100, shown as 1-5 stars (20/40/60/80/100).
// Reference implementation: https://github.com/mfuhrmann/spieli (ReviewsPanel.svelte, lib/reviews.js)

const MANGROVE_API = 'https://api.mangrove.reviews';
const LS_KEY = 'milan-remote-work-map-mangrove-keypair';

// Mangrove subjects are global and shared across every app that reviews the
// same place — generic reviews there can be about anything (food, noise,
// service), not specifically about working from the place. Appending this
// discriminator scopes fetch/submit to only the reviews left through this
// site, so what's shown is actually about laptop-friendliness. It's a
// random, hardcoded string (not the app name) so renaming or rebranding the
// site never orphans previously-submitted reviews.
const APP_DISCRIMINATOR = 'ad621a8f53d7';

export interface MangroveReview {
  payload: {
    iat: number;
    sub: string;
    rating?: number;
    opinion?: string;
    action?: string;
  };
}

async function loadOrGenerateKeypair(): Promise<CryptoKeyPair> {
  const stored = localStorage.getItem(LS_KEY);
  if (stored) {
    const { priv, pub } = JSON.parse(stored);
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      priv,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      pub,
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['verify']
    );
    return { privateKey, publicKey };
  }

  // Generate extractable only long enough to export to localStorage, then
  // re-import with extractable:false so the in-memory key cannot be re-exported.
  const tempKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
  const priv = await crypto.subtle.exportKey('jwk', tempKeyPair.privateKey);
  const pub = await crypto.subtle.exportKey('jwk', tempKeyPair.publicKey);
  localStorage.setItem(LS_KEY, JSON.stringify({ priv, pub }));

  const privateKey = await crypto.subtle.importKey(
    'jwk',
    priv,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    pub,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify']
  );
  return { privateKey, publicKey };
}

async function publicKeyToPem(publicKey: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey('spki', publicKey);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(spki)));
  return `-----BEGIN PUBLIC KEY-----\n${b64.match(/.{1,64}/g)!.join('\n')}\n-----END PUBLIC KEY-----`;
}

function b64url(obj: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  return btoa(String.fromCharCode(...bytes))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlBytes(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function mangroveSubject(lat: number, lon: number, osmId?: string): string {
  const q = osmId ? `osm_place_${osmId.replace('/', '_')}` : 'place';
  return `geo:${lat.toFixed(5)},${lon.toFixed(5)}?q=${q}&u=50&app=${APP_DISCRIMINATOR}`;
}

export async function fetchReviews(
  lat: number,
  lon: number,
  osmId: string | undefined,
  signal?: AbortSignal
): Promise<MangroveReview[]> {
  const sub = mangroveSubject(lat, lon, osmId);
  const url = `${MANGROVE_API}/reviews?sub=${encodeURIComponent(sub)}&latest_edits_only=true`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.reviews ?? []).filter((r: MangroveReview) => !r.payload?.action);
}

export async function submitReview(
  lat: number,
  lon: number,
  osmId: string | undefined,
  rating100: number,
  opinion: string | null
): Promise<boolean> {
  const kp = await loadOrGenerateKeypair();
  const pem = await publicKeyToPem(kp.publicKey);
  const sub = mangroveSubject(lat, lon, osmId);

  const header = { alg: 'ES256', typ: 'JWT', kid: pem };
  const payload: Record<string, unknown> = {
    iat: Math.floor(Date.now() / 1000),
    sub,
    rating: rating100,
  };
  if (opinion) payload.opinion = opinion;

  const msg = `${b64url(header)}.${b64url(payload)}`;
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    kp.privateKey,
    new TextEncoder().encode(msg)
  );
  const jwt = `${msg}.${b64urlBytes(sig)}`;

  const res = await fetch(`${MANGROVE_API}/submit/${encodeURIComponent(jwt)}`, { method: 'PUT' });
  return res.ok;
}

export function relativeDate(iat: number): string {
  const diff = Math.floor(Date.now() / 1000 - iat);
  if (diff < 86400) return 'today';
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}
