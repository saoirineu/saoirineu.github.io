// Server-side stock accounting for recorded works (trabalhos).
//
// A church manager records a work and the Daime batch it used. The Sacrament
// ledger (sacramentTransactions) stays writable only by custodians, so the exit
// movement is not written by the browser: this module derives it from the work
// document, and onWorkSacramentChange writes it with the admin SDK.
//
// Each work owns at most one movement, at a deterministic id, so a retry or a
// re-edit overwrites the same document instead of booking the Daime twice.
//
// Pure, so it is testable without a Firestore harness.

export type WorkExitTransaction = {
  itemId: string;
  stockId: string;
  type: 'exit';
  date: string;
  destinationChurchId: string;
  destinationChurchName: string;
  quantity: number;
  notes: string;
  workId: string;
  createdBy: string;
};

export function workExitTransactionId(workId: string): string {
  return `work-${workId}`;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * The exit movement a work should have in the ledger, or null when it should
 * have none: the work was deleted, or it names no usable batch and quantity.
 */
export function workExitTransaction(
  workId: string,
  work: Record<string, unknown> | undefined
): WorkExitTransaction | null {
  if (!work) return null;

  const sacrament = (work.sacrament ?? {}) as Record<string, unknown>;
  const itemId = text(sacrament.itemId);
  const stockId = text(sacrament.stockId);
  const quantity = sacrament.quantity;
  if (!itemId || !stockId || typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
    return null;
  }

  const churchName = text(work.churchName);
  const label = text(work.workTypeOther) || text(work.workTypeLabel) || text(work.workTypeId);

  return {
    itemId,
    stockId,
    type: 'exit',
    date: text(work.date),
    destinationChurchId: text(work.churchId),
    destinationChurchName: churchName,
    quantity,
    notes: churchName ? `Trabalho: ${label} (${churchName})` : `Trabalho: ${label}`,
    workId,
    createdBy: text(work.createdBy)
  };
}

/** True when both describe the same movement, so the write can be skipped. */
export function sameWorkExit(a: WorkExitTransaction | null, b: WorkExitTransaction | null): boolean {
  if (a === null || b === null) return a === b;
  return (Object.keys(a) as (keyof WorkExitTransaction)[]).every(key => a[key] === b[key]);
}
