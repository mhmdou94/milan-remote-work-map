import type { Place } from '../types.js';

export type WorkFitTone = 'good' | 'warn' | 'muted';

export interface WorkFitBadge {
  label: string;
  title: string;
  tone: WorkFitTone;
}

export interface WorkFitSummary {
  score: number;
  label: string;
  reason: string;
  callSuitability: string;
  confidence: string;
  badges: WorkFitBadge[];
}

export function getWorkFit(place: Place): WorkFitSummary {
  let score = 42;
  const badges: WorkFitBadge[] = [];

  if (place.laptopStatus === 'yes') {
    score += 20;
    badges.push({ label: 'Laptop friendly', title: 'Laptop friendly', tone: 'good' });
  } else if (place.laptopStatus === 'restricted') {
    score += 4;
    badges.push({ label: 'Restricted', title: 'Laptop use restricted', tone: 'warn' });
  } else if (place.laptopStatus === 'no') {
    score -= 30;
    badges.push({ label: 'No laptops', title: 'Not laptop-friendly', tone: 'warn' });
  }

  if (hasInternet(place)) {
    score += 14;
    badges.push({ label: 'Internet', title: 'Internet access', tone: 'good' });
  } else if (place.internetAccess === 'no') {
    score -= 8;
    badges.push({
      label: 'No internet',
      title: 'Internet access is marked unavailable',
      tone: 'warn',
    });
  }

  if (place.sockets === 'many') {
    score += 12;
    badges.push({ label: 'Many outlets', title: 'Power sockets', tone: 'good' });
  } else if (place.sockets === 'yes') {
    score += 9;
    badges.push({ label: 'Outlets', title: 'Power sockets', tone: 'good' });
  } else if (place.sockets === 'no') {
    score -= 5;
    badges.push({
      label: 'Few outlets',
      title: 'Power sockets are marked unavailable',
      tone: 'muted',
    });
  }

  if (place.openingHours) {
    score += 6;
    badges.push({ label: 'Hours listed', title: 'Opening hours are available', tone: 'muted' });
  }

  if (place.verified) {
    score += 5;
  }

  if (place.category === 'coworking' || place.category === 'coworking_space') {
    score += 8;
  } else if (place.category === 'cafe') {
    score += 5;
  } else if (place.category === 'library') {
    score += 4;
  } else if (place.category === 'restaurant') {
    score -= 2;
  }

  if (place.deletedAt) {
    score -= 24;
    badges.unshift({
      label: 'Needs recheck',
      title: 'No longer marked laptop-friendly',
      tone: 'warn',
    });
  }

  if (place.unverified) {
    score -= 10;
    badges.unshift({
      label: 'Unverified',
      title: 'Suggested by OSM data, not confirmed',
      tone: 'muted',
    });
  }

  if (place.laptopStatus === 'no') {
    score = Math.min(score, 39);
  }

  score = Math.max(12, Math.min(98, score));

  return {
    score,
    label: scoreLabel(score),
    reason: bestReason(place),
    callSuitability: callSuitability(place),
    confidence: confidenceLabel(place),
    badges: badges.length
      ? badges
      : [{ label: 'Needs details', title: 'Amenities need confirmation', tone: 'muted' }],
  };
}

export function hasInternet(place: Place) {
  return (
    place.internetAccess === 'yes' ||
    place.internetAccess === 'wlan' ||
    place.internetAccess === 'wired'
  );
}

export function hasPower(place: Place) {
  return place.sockets === 'yes' || place.sockets === 'many';
}

function scoreLabel(score: number) {
  if (score >= 85) return 'Excellent work fit';
  if (score >= 72) return 'Strong choice';
  if (score >= 58) return 'Good with caveats';
  if (score >= 42) return 'Quick check needed';
  return 'Not recommended';
}

function bestReason(place: Place) {
  if (place.laptopStatus === 'no') return 'Laptop use is marked as not allowed here.';
  if (place.laptopStatus === 'restricted') return 'Laptop use is allowed only with restrictions.';
  if (hasInternet(place) && hasPower(place)) return 'Internet and power are both listed.';
  if (hasInternet(place)) return 'Internet is listed, but outlet availability needs a check.';
  if (hasPower(place)) return 'Power is listed, but internet availability needs a check.';
  return 'Core work amenities still need confirmation.';
}

function callSuitability(place: Place) {
  if (place.laptopStatus === 'no') return 'No. Laptop use is marked as not allowed.';
  if (place.category === 'library')
    return 'Quiet work only. Take calls outside or in designated rooms.';
  if (place.category === 'coworking' || place.category === 'coworking_space') {
    return 'Likely yes. Check for booths or meeting rooms when you arrive.';
  }
  if (place.category === 'restaurant') return 'Maybe. Avoid meal rush and ask staff first.';
  if (place.category === 'cafe' || place.category === 'bar' || place.category === 'pub') {
    return 'Maybe. Better for short calls when it is quiet.';
  }
  return 'Unknown. Check noise and seating before starting a call.';
}

function confidenceLabel(place: Place) {
  if (place.unverified) return 'Needs community verification';
  if (place.lastChecked) return `Last checked ${formatDate(place.lastChecked)}`;
  if (place.lastSynced) return `Synced ${formatDate(place.lastSynced)}`;
  if (place.verified) return 'Verified listing';
  return 'Needs confirmation';
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
