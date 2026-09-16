import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { slugify } from './events';
import { db } from './firebase';
import { asOptionalString, asRecord } from './firestoreData';

// Options for the "lavoro" dropdown of a work record, kept in catalogs/workTypes
// so admins can edit them without a deploy. Until an admin saves the list, the
// draft below is used.

export type WorkTypeCategory = 'official' | 'other';

export type WorkType = {
  id: string;
  label: string;
  category: WorkTypeCategory;
  active: boolean;
};

/** Always offered last, with a free-text description; not part of the editable list. */
export const OTHER_WORK_TYPE_ID = 'other';

// DRAFT, pending review by ICEFLU Italia: the official calendar entries are a
// first pass, to be corrected from the portal's work-type editor.
export const DEFAULT_WORK_TYPES: WorkType[] = [
  { id: 'concentracao', label: 'Concentração (15 e 30)', category: 'official', active: true },
  { id: 'santa-missa', label: 'Santa Missa', category: 'official', active: true },
  { id: 'reis', label: 'Festa de Reis (6/jan)', category: 'official', active: true },
  { id: 'sao-sebastiao', label: 'São Sebastião (20/jan)', category: 'official', active: true },
  { id: 'sao-jose', label: 'São José (19/mar)', category: 'official', active: true },
  { id: 'santo-antonio', label: 'Santo Antônio (13/jun)', category: 'official', active: true },
  { id: 'sao-joao', label: 'São João (24/jun)', category: 'official', active: true },
  { id: 'sao-pedro', label: 'São Pedro (29/jun)', category: 'official', active: true },
  { id: 'passagem-mestre-irineu', label: 'Passagem do Mestre Irineu (6/jul)', category: 'official', active: true },
  { id: 'aniversario-padrinho-sebastiao', label: 'Aniversário do Padrinho Sebastião (7/out)', category: 'official', active: true },
  { id: 'finados', label: 'Finados (2/nov)', category: 'official', active: true },
  { id: 'nossa-senhora-conceicao', label: 'Nossa Senhora da Conceição (8/dez)', category: 'official', active: true },
  { id: 'aniversario-mestre-irineu', label: 'Aniversário do Mestre Irineu (15/dez)', category: 'official', active: true },
  { id: 'natal', label: 'Natal (24–25/dez)', category: 'official', active: true },
  { id: 'ano-novo', label: 'Ano Novo (31/dez)', category: 'official', active: true },
  { id: 'cura', label: 'Trabalho de Cura', category: 'other', active: true },
  { id: 'sao-miguel', label: 'Trabalho de São Miguel', category: 'other', active: true },
  { id: 'mesa-branca', label: 'Mesa Branca', category: 'other', active: true },
  { id: 'umbandaime', label: 'Umbandaime', category: 'other', active: true }
];

const catalogRef = doc(db, 'catalogs', 'workTypes');

export type WorkTypeCatalog = {
  items: WorkType[];
  /** False while the portal still runs on the built-in draft. */
  saved: boolean;
};

export function normalizeWorkTypes(value: unknown): WorkType[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>([OTHER_WORK_TYPE_ID]);
  const items: WorkType[] = [];
  for (const entry of value) {
    const data = asRecord(entry);
    const label = (asOptionalString(data.label) ?? '').trim();
    const id = (asOptionalString(data.id) ?? '').trim() || slugify(label);
    if (!label || !id || seen.has(id)) continue;
    seen.add(id);
    items.push({
      id,
      label,
      category: data.category === 'other' ? 'other' : 'official',
      active: data.active !== false
    });
  }
  return items;
}

/** A stable id for a new entry, unique among the existing ones. */
export function newWorkTypeId(label: string, existing: readonly WorkType[]): string {
  const base = slugify(label) || 'lavoro';
  const taken = new Set([OTHER_WORK_TYPE_ID, ...existing.map(item => item.id)]);
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export async function fetchWorkTypeCatalog(): Promise<WorkTypeCatalog> {
  const snapshot = await getDoc(catalogRef);
  if (!snapshot.exists()) {
    return { items: DEFAULT_WORK_TYPES, saved: false };
  }
  return { items: normalizeWorkTypes(snapshot.data().items), saved: true };
}

export async function saveWorkTypes(items: WorkType[], uid: string) {
  return setDoc(catalogRef, {
    items: normalizeWorkTypes(items),
    updatedBy: uid,
    updatedAt: serverTimestamp()
  });
}
