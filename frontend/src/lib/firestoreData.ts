import { Timestamp } from 'firebase/firestore';

type UnknownRecord = Record<string, unknown>;

function isPlainRecord(value: unknown): value is UnknownRecord {
  if (!isRecord(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isFirestoreSentinel(value: unknown): boolean {
  return isRecord(value) && typeof value._methodName === 'string';
}

export function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

export function asOptionalTimestamp(value: unknown): Timestamp | null {
  return value instanceof Timestamp ? value : null;
}

export function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

export function asOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

export function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value.filter((entry): entry is string => typeof entry === 'string');
  return strings.length ? strings : undefined;
}

export function removeUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => removeUndefinedDeep(item)) as unknown as T;
  }

  if (isFirestoreSentinel(value)) {
    return value;
  }

  if (isPlainRecord(value)) {
    const entries = Object.entries(value)
      .map(([key, entryValue]) => [key, removeUndefinedDeep(entryValue)])
      .filter(([, entryValue]) => entryValue !== undefined);

    return Object.fromEntries(entries) as T;
  }

  return value;
}