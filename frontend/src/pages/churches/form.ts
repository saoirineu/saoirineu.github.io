import type { ChurchInfo, ChurchInput, Work } from '../../lib/works';
import type { UserProfile } from '../../lib/users';

export type ChurchFormState = {
  name: string;
  city: string;
  state: string;
  country: string;
  /** ICEFLU is the default; otherwise `lineage` names the other line. */
  isIceflu: boolean;
  lineage: string;
  leaderName: string;
  leaderEmail: string;
  churchEmail: string;
  observations: string;
  lat: string;
  lng: string;
};

export type ChurchUsageStats = {
  worksResponsible: number;
  membersCurrentChurch: number;
  membersInitiationChurch: number;
};

export const emptyChurchUsageStats: ChurchUsageStats = {
  worksResponsible: 0,
  membersCurrentChurch: 0,
  membersInitiationChurch: 0
};

export const ICEFLU_LINEAGE = 'ICEFLU';

export function isIcefluLineage(lineage: string | undefined) {
  return lineage?.trim().toUpperCase() === ICEFLU_LINEAGE;
}

export const initialChurchForm: ChurchFormState = {
  name: '',
  city: '',
  state: '',
  country: '',
  isIceflu: true,
  lineage: '',
  leaderName: '',
  leaderEmail: '',
  churchEmail: '',
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
    lineage: form.isIceflu ? ICEFLU_LINEAGE : form.lineage.trim() || undefined,
    leaderName: form.leaderName.trim() || undefined,
    leaderEmail: form.leaderEmail.trim() || undefined,
    churchEmail: form.churchEmail.trim() || undefined,
    observations: form.observations.trim() || undefined,
    lat: Number.isFinite(latNum) ? latNum : undefined,
    lng: Number.isFinite(lngNum) ? lngNum : undefined
  };
}

export function prefillChurchForm(church: ChurchInfo): ChurchFormState {
  // A church with no line recorded opens as ICEFLU, the portal's usual case.
  const isIceflu = !church.lineage?.trim() || isIcefluLineage(church.lineage);
  return {
    name: church.name,
    city: church.city ?? '',
    state: church.state ?? '',
    country: church.country ?? '',
    isIceflu,
    lineage: isIceflu ? '' : church.lineage ?? '',
    leaderName: church.leaderName ?? '',
    leaderEmail: church.leaderEmail ?? '',
    churchEmail: church.churchEmail ?? '',
    observations: church.observations ?? '',
    lat: church.lat?.toString() ?? '',
    lng: church.lng?.toString() ?? ''
  };
}

export function sortChurches(churches: ChurchInfo[]) {
  return churches.slice().sort((left, right) => left.name.localeCompare(right.name));
}

export function buildChurchUsageMap(works: Pick<Work, 'churchId'>[], users: UserProfile[]) {
  const map = new Map<string, ChurchUsageStats>();

  works.forEach(work => {
    if (work.churchId) {
      incrementUsage(map, work.churchId, 'worksResponsible');
    }
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
