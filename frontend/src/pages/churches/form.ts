import type { ChurchInfo, ChurchInput, Session } from '../../lib/sessions';
import type { UserProfile } from '../../lib/users';

export type ChurchFormState = {
  name: string;
  city: string;
  state: string;
  country: string;
  lineage: string;
  observations: string;
  lat: string;
  lng: string;
};

export type ChurchUsageStats = {
  sessionsVenue: number;
  sessionsResponsible: number;
  membersCurrentChurch: number;
  membersInitiationChurch: number;
};

export const emptyChurchUsageStats: ChurchUsageStats = {
  sessionsVenue: 0,
  sessionsResponsible: 0,
  membersCurrentChurch: 0,
  membersInitiationChurch: 0
};

export const initialChurchForm: ChurchFormState = {
  name: '',
  city: '',
  state: '',
  country: '',
  lineage: '',
  observations: '',
  lat: '',
  lng: ''
};

function incrementUsage(map: Map<string, ChurchUsageStats>, id: string, field: keyof ChurchUsageStats) {
  const current = map.get(id) ?? { ...emptyChurchUsageStats };
  current[field] += 1;
  map.set(id, current);
}

export function buildChurchPayload(form: ChurchFormState): ChurchInput {
  const latNum = form.lat.trim() ? Number(form.lat) : undefined;
  const lngNum = form.lng.trim() ? Number(form.lng) : undefined;

  return {
    name: form.name.trim(),
    city: form.city.trim() || undefined,
    state: form.state.trim() || undefined,
    country: form.country.trim() || undefined,
    lineage: form.lineage.trim() || undefined,
    observations: form.observations.trim() || undefined,
    lat: Number.isFinite(latNum) ? latNum : undefined,
    lng: Number.isFinite(lngNum) ? lngNum : undefined
  };
}

export function prefillChurchForm(church: ChurchInfo): ChurchFormState {
  return {
    name: church.name,
    city: church.city ?? '',
    state: church.state ?? '',
    country: church.country ?? '',
    lineage: church.lineage ?? '',
    observations: church.observations ?? '',
    lat: church.lat?.toString() ?? '',
    lng: church.lng?.toString() ?? ''
  };
}

export function sortChurches(churches: ChurchInfo[]) {
  return churches.slice().sort((left, right) => left.name.localeCompare(right.name));
}

export function buildChurchUsageMap(sessions: Session[], users: UserProfile[]) {
  const map = new Map<string, ChurchUsageStats>();

  sessions.forEach(session => {
    if (session.venueId) {
      incrementUsage(map, session.venueId, 'sessionsVenue');
    }

    (session.responsibleChurchIds ?? []).forEach(id => {
      incrementUsage(map, id, 'sessionsResponsible');
    });
  });

  users.forEach(user => {
    if (user.currentChurchId) {
      incrementUsage(map, user.currentChurchId, 'membersCurrentChurch');
    }

    if (user.initiationChurchId) {
      incrementUsage(map, user.initiationChurchId, 'membersInitiationChurch');
    }
  });

  return map;
}
