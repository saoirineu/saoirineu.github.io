import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  computeCurrentQuantity,
  createItem,
  createStock,
  createTransaction,
  deleteItem,
  deleteStock,
  deleteTransaction,
  fetchItems,
  fetchStocks,
  fetchTransactions,
  fetchTransactionsByStock,
  updateItem,
  updateStock,
  updateTransaction,
  type SacramentForm,
  type SacramentItem,
  type SacramentStock,
  type SacramentTransaction,
  type TransactionType,
} from '../lib/sacrament';
import { hasRequiredRole } from '../lib/systemRole';
import { fetchChurches, type ChurchInfo } from '../lib/works';
import { useAuth } from '../providers/useAuth';
import { useSystemRole } from '../providers/useSystemRole';
import { useSiteLocale } from '../providers/useSiteLocale';

// ─── copy ────────────────────────────────────────────────────────────────────

const copyByLocale = {
  pt: {
    title: 'Sacramento',
    intro: 'Estoques de Daime com entradas, saídas e rastreabilidade por lote e localização.',
    newStock: 'Novo Estoque',
    stockName: 'Nome do estoque',
    stockLocation: 'Localização',
    save: 'Salvar',
    cancel: 'Cancelar',
    edit: 'Editar',
    editStock: 'Editar estoque',
    editBatch: 'Editar lote',
    delete: 'Excluir',
    confirmDelete: 'Excluir este item?',
    loading: 'Carregando...',
    noStocks: 'Nenhum estoque cadastrado ainda.',
    noItems: 'Nenhum lote neste estoque.',
    noTransactions: 'Nenhuma movimentação registrada.',
    newItem: 'Novo Lote',
    degree: 'Grau',
    concentration: 'Concentração',
    form: 'Forma',
    liquid: 'Líquida',
    gel: 'Gel',
    originChurch: 'Casa de Feitio',
    selectChurch: 'Selecionar igreja...',
    selectCasa: 'Selecionar casa...',
    responsiblePerson: 'Responsável',
    feitioDate: 'Data do feitio',
    feitioPeriod: 'Período de feitio',
    feitioSingle: 'Data única',
    feitioFrom: 'De',
    feitioTo: 'Até',
    currentBalance: 'Saldo atual',
    liters: 'L',
    kg: 'kg',
    logMovement: 'Registrar Movimento',
    movements: 'Movimentações',
    movementType: 'Tipo',
    entry: 'Entrada',
    exit: 'Saída',
    date: 'Data',
    missionary: 'Missionário',
    destinationChurch: 'Igreja de destino',
    quantity: 'Quantidade',
    notes: 'Observações',
    saving: 'Salvando...',
    deleting: 'Excluindo...',
    showMovements: 'Ver movimentações',
    hideMovements: 'Ocultar movimentações',
    editMovement: 'Editar',
    deleteMovement: 'Excluir',
    confirmDeleteMovement: 'Excluir este movimento?',
  },
  en: {
    title: 'Sacrament',
    intro: 'Daime inventory with entries, exits, and traceability by batch and location.',
    newStock: 'New Stock',
    stockName: 'Stock name',
    stockLocation: 'Location',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    editStock: 'Edit stock',
    editBatch: 'Edit batch',
    delete: 'Delete',
    confirmDelete: 'Delete this item?',
    loading: 'Loading...',
    noStocks: 'No stocks registered yet.',
    noItems: 'No batches in this stock.',
    noTransactions: 'No transactions logged.',
    newItem: 'New Batch',
    degree: 'Degree',
    concentration: 'Concentration',
    form: 'Form',
    liquid: 'Liquid',
    gel: 'Gel',
    originChurch: 'Casa de Feitio',
    selectChurch: 'Select church...',
    selectCasa: 'Select casa...',
    responsiblePerson: 'Responsible',
    feitioDate: 'Feitio date',
    feitioPeriod: 'Feitio period',
    feitioSingle: 'Single date',
    feitioFrom: 'From',
    feitioTo: 'To',
    currentBalance: 'Current balance',
    liters: 'L',
    kg: 'kg',
    logMovement: 'Log Movement',
    movements: 'Movements',
    movementType: 'Type',
    entry: 'Entry',
    exit: 'Exit',
    date: 'Date',
    missionary: 'Missionary',
    destinationChurch: 'Destination church',
    quantity: 'Quantity',
    notes: 'Notes',
    saving: 'Saving...',
    deleting: 'Deleting...',
    showMovements: 'Show movements',
    hideMovements: 'Hide movements',
    editMovement: 'Edit',
    deleteMovement: 'Delete',
    confirmDeleteMovement: 'Delete this movement?',
  },
  es: {
    title: 'Sacramento',
    intro: 'Inventario de Daime con entradas, salidas y trazabilidad por lote y ubicación.',
    newStock: 'Nueva Existencia',
    stockName: 'Nombre de la existencia',
    stockLocation: 'Ubicación',
    save: 'Guardar',
    cancel: 'Cancelar',
    edit: 'Editar',
    editStock: 'Editar existencia',
    editBatch: 'Editar lote',
    delete: 'Eliminar',
    confirmDelete: '¿Eliminar este elemento?',
    loading: 'Cargando...',
    noStocks: 'Todavía no hay existencias registradas.',
    noItems: 'No hay lotes en esta existencia.',
    noTransactions: 'No hay movimientos registrados.',
    newItem: 'Nuevo Lote',
    degree: 'Grado',
    concentration: 'Concentración',
    form: 'Forma',
    liquid: 'Líquida',
    gel: 'Gel',
    originChurch: 'Casa de Feitio',
    selectChurch: 'Seleccionar iglesia...',
    selectCasa: 'Seleccionar casa...',
    responsiblePerson: 'Responsable',
    feitioDate: 'Fecha del feitio',
    feitioPeriod: 'Período del feitio',
    feitioSingle: 'Fecha única',
    feitioFrom: 'Desde',
    feitioTo: 'Hasta',
    currentBalance: 'Saldo actual',
    liters: 'L',
    kg: 'kg',
    logMovement: 'Registrar Movimiento',
    movements: 'Movimientos',
    movementType: 'Tipo',
    entry: 'Entrada',
    exit: 'Salida',
    date: 'Fecha',
    missionary: 'Misionero',
    destinationChurch: 'Iglesia de destino',
    quantity: 'Cantidad',
    notes: 'Observaciones',
    saving: 'Guardando...',
    deleting: 'Eliminando...',
    showMovements: 'Ver movimientos',
    hideMovements: 'Ocultar movimientos',
    editMovement: 'Editar',
    deleteMovement: 'Eliminar',
    confirmDeleteMovement: '¿Eliminar este movimiento?',
  },
  it: {
    title: 'Sacramento',
    intro: 'Inventario del Daime con entrate, uscite e tracciabilità per lotto e posizione.',
    newStock: 'Nuova Scorta',
    stockName: 'Nome della scorta',
    stockLocation: 'Posizione',
    save: 'Salva',
    cancel: 'Annulla',
    edit: 'Modifica',
    editStock: 'Modifica scorta',
    editBatch: 'Modifica lotto',
    delete: 'Elimina',
    confirmDelete: 'Eliminare questo elemento?',
    loading: 'Caricamento...',
    noStocks: 'Nessuna scorta registrata.',
    noItems: 'Nessun lotto in questa scorta.',
    noTransactions: 'Nessun movimento registrato.',
    newItem: 'Nuovo Lotto',
    degree: 'Grado',
    concentration: 'Concentrazione',
    form: 'Forma',
    liquid: 'Liquida',
    gel: 'Gel',
    originChurch: 'Casa de Feitio',
    selectChurch: 'Seleziona chiesa...',
    selectCasa: 'Seleziona casa...',
    responsiblePerson: 'Responsabile',
    feitioDate: 'Data del feitio',
    feitioPeriod: 'Periodo del feitio',
    feitioSingle: 'Data singola',
    feitioFrom: 'Dal',
    feitioTo: 'Al',
    currentBalance: 'Saldo attuale',
    liters: 'L',
    kg: 'kg',
    logMovement: 'Registra Movimento',
    movements: 'Movimenti',
    movementType: 'Tipo',
    entry: 'Entrata',
    exit: 'Uscita',
    date: 'Data',
    missionary: 'Missionario',
    destinationChurch: 'Chiesa di destinazione',
    quantity: 'Quantità',
    notes: 'Osservazioni',
    saving: 'Salvataggio...',
    deleting: 'Eliminazione...',
    showMovements: 'Mostra movimenti',
    hideMovements: 'Nascondi movimenti',
    editMovement: 'Modifica',
    deleteMovement: 'Elimina',
    confirmDeleteMovement: 'Eliminare questo movimento?',
  },
} as const;

type Copy = { [K in keyof typeof copyByLocale.pt]: string };

// ─── shared helpers ───────────────────────────────────────────────────────────

function inputCls(extra = '') {
  return `rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-blue-deep)] ${extra}`;
}

function labelCls() {
  return 'block text-xs font-medium text-slate-500 mb-0.5';
}

function toFeitioMonth(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return '';
  const month = trimmed.match(/^(\d{4}-\d{2})/);
  return month?.[1] ?? trimmed;
}

function formatFeitioMonth(item: SacramentItem) {
  const start = toFeitioMonth(item.feitioDate);
  const end = toFeitioMonth(item.feitioDateEnd);

  if (start && end && start !== end) {
    return `${start} → ${end}`;
  }

  return start || end || '—';
}

function formatQuantity(value: number, unit: string) {
  return `${value.toFixed(2)} ${unit}`;
}

function buildBalanceByItem(transactions: SacramentTransaction[]) {
  return transactions.reduce((balances, tx) => {
    const current = balances.get(tx.itemId) ?? 0;
    balances.set(tx.itemId, current + (tx.type === 'entry' ? tx.quantity : -tx.quantity));
    return balances;
  }, new Map<string, number>());
}

function getStockSummary(items: SacramentItem[], balanceByItem: Map<string, number>) {
  return items.reduce(
    (summary, item) => {
      const balance = balanceByItem.get(item.id) ?? 0;
      if (item.form === 'gel') {
        summary.kg += balance;
      } else {
        summary.liters += balance;
      }
      return summary;
    },
    { liters: 0, kg: 0 },
  );
}

function getItemUnit(item: SacramentItem, copy: Copy) {
  return item.form === 'gel' ? copy.kg : copy.liters;
}

// ─── TransactionList ──────────────────────────────────────────────────────────

type TransactionListProps = {
  item: SacramentItem;
  churches: ChurchInfo[];
  copy: Copy;
  uid: string;
  isAdmin: boolean;
};

function TransactionList({ item, churches, copy, uid, isAdmin }: TransactionListProps) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [txType, setTxType] = useState<TransactionType>('entry');
  const [txDate, setTxDate] = useState('');
  const [txMissionary, setTxMissionary] = useState('');
  const [txDestChurchId, setTxDestChurchId] = useState('');
  const [txQuantity, setTxQuantity] = useState('');
  const [txNotes, setTxNotes] = useState('');

  // editing state
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editMissionary, setEditMissionary] = useState('');
  const [editDestChurchId, setEditDestChurchId] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editType, setEditType] = useState<TransactionType>('entry');

  const txQuery = useQuery({
    queryKey: ['sacramentTransactions', item.id],
    queryFn: () => fetchTransactions(item.id),
  });

  const transactions: SacramentTransaction[] = txQuery.data ?? [];
  const balance = computeCurrentQuantity(transactions);
  const unit = item.form === 'gel' ? copy.kg : copy.liters;

  const txMutation = useMutation({
    mutationFn: () =>
      createTransaction({
        itemId: item.id,
        stockId: item.stockId,
        type: txType,
        date: txDate,
        missionaryName: txMissionary || undefined,
        destinationChurchId:
          txType === 'exit' && txDestChurchId ? txDestChurchId : undefined,
        destinationChurchName:
          txType === 'exit' && txDestChurchId
            ? (churches.find(c => c.id === txDestChurchId)?.name ?? txDestChurchId)
            : undefined,
        quantity: parseFloat(txQuantity) || 0,
        notes: txNotes || undefined,
        createdBy: uid,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sacramentTransactions', item.id] });
      await qc.invalidateQueries({ queryKey: ['sacramentStockTransactions', item.stockId] });
      setShowForm(false);
      setTxDate('');
      setTxMissionary('');
      setTxDestChurchId('');
      setTxQuantity('');
      setTxNotes('');
    },
  });

  const editMutation = useMutation({
    mutationFn: (txId: string) =>
      updateTransaction(txId, {
        type: editType,
        date: editDate,
        missionaryName: editMissionary || undefined,
        destinationChurchId: editType === 'exit' && editDestChurchId ? editDestChurchId : undefined,
        destinationChurchName:
          editType === 'exit' && editDestChurchId
            ? (churches.find(c => c.id === editDestChurchId)?.name ?? editDestChurchId)
            : undefined,
        quantity: parseFloat(editQuantity) || 0,
        notes: editNotes || undefined,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sacramentTransactions', item.id] });
      await qc.invalidateQueries({ queryKey: ['sacramentStockTransactions', item.stockId] });
      setEditingTxId(null);
    },
  });

  const deleteTxMutation = useMutation({
    mutationFn: (txId: string) => deleteTransaction(txId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sacramentTransactions', item.id] });
      await qc.invalidateQueries({ queryKey: ['sacramentStockTransactions', item.stockId] });
    },
  });

  function startEdit(tx: SacramentTransaction) {
    setEditingTxId(tx.id);
    setEditType(tx.type);
    setEditDate(tx.date);
    setEditMissionary(tx.missionaryName ?? '');
    setEditDestChurchId(tx.destinationChurchId ?? '');
    setEditQuantity(String(tx.quantity));
    setEditNotes(tx.notes ?? '');
  }

  function canEditTx(tx: SacramentTransaction) {
    return isAdmin || tx.createdBy === uid;
  }

  return (
    <div className="mt-2 space-y-2">
      {/* balance + action row */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {copy.currentBalance}:{' '}
          <span className="font-semibold text-slate-800">
            {balance.toFixed(2)} {unit}
          </span>
        </span>
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          className="rounded-full bg-[color:var(--brand-blue-deep)] px-3 py-1 text-xs font-medium text-white hover:opacity-80"
        >
          {copy.logMovement}
        </button>
      </div>

      {/* new transaction form */}
      {showForm && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls()}>{copy.movementType}</label>
              <select
                className={inputCls('w-full')}
                value={txType}
                onChange={e => setTxType(e.target.value as TransactionType)}
              >
                <option value="entry">{copy.entry}</option>
                <option value="exit">{copy.exit}</option>
              </select>
            </div>
            <div>
              <label className={labelCls()}>{copy.date}</label>
              <input
                type="date"
                className={inputCls('w-full')}
                value={txDate}
                onChange={e => setTxDate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls()}>{copy.missionary}</label>
              <input
                type="text"
                className={inputCls('w-full')}
                value={txMissionary}
                onChange={e => setTxMissionary(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls()}>
                {copy.quantity} ({unit})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls('w-full')}
                value={txQuantity}
                onChange={e => setTxQuantity(e.target.value)}
              />
            </div>
          </div>
          {txType === 'exit' && (
            <div>
              <label className={labelCls()}>{copy.destinationChurch}</label>
              <select
                className={inputCls('w-full')}
                value={txDestChurchId}
                onChange={e => setTxDestChurchId(e.target.value)}
              >
                <option value="">{copy.selectChurch}</option>
                {churches.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={labelCls()}>{copy.notes}</label>
            <input
              type="text"
              className={inputCls('w-full')}
              value={txNotes}
              onChange={e => setTxNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={txMutation.isPending || !txDate || !txQuantity}
              onClick={() => txMutation.mutate()}
              className="rounded-lg bg-[color:var(--brand-green)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {txMutation.isPending ? copy.saving : copy.save}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
            >
              {copy.cancel}
            </button>
          </div>
        </div>
      )}

      {/* transactions table */}
      {txQuery.isLoading ? (
        <p className="text-xs text-slate-400">{copy.loading}</p>
      ) : transactions.length === 0 ? (
        <p className="text-xs text-slate-400">{copy.noTransactions}</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-left text-slate-400">
              <th className="py-1 pr-2 font-medium">{copy.date}</th>
              <th className="py-1 pr-2 font-medium">{copy.movementType}</th>
              <th className="py-1 pr-2 font-medium">{copy.missionary}</th>
              <th className="py-1 pr-2 font-medium">{copy.destinationChurch}</th>
              <th className="py-1 pr-2 text-right font-medium">
                {copy.quantity} ({unit})
              </th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              editingTxId === tx.id ? (
                <tr key={tx.id} className="border-b border-blue-50 bg-blue-50/40">
                  <td colSpan={6} className="py-2 pr-2">
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={labelCls()}>{copy.movementType}</label>
                          <select className={inputCls('w-full')} value={editType} onChange={e => setEditType(e.target.value as TransactionType)}>
                            <option value="entry">{copy.entry}</option>
                            <option value="exit">{copy.exit}</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelCls()}>{copy.date}</label>
                          <input type="date" className={inputCls('w-full')} value={editDate} onChange={e => setEditDate(e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={labelCls()}>{copy.missionary}</label>
                          <input type="text" className={inputCls('w-full')} value={editMissionary} onChange={e => setEditMissionary(e.target.value)} />
                        </div>
                        <div>
                          <label className={labelCls()}>{copy.quantity} ({unit})</label>
                          <input type="number" min="0" step="0.01" className={inputCls('w-full')} value={editQuantity} onChange={e => setEditQuantity(e.target.value)} />
                        </div>
                      </div>
                      {editType === 'exit' && (
                        <div>
                          <label className={labelCls()}>{copy.destinationChurch}</label>
                          <select className={inputCls('w-full')} value={editDestChurchId} onChange={e => setEditDestChurchId(e.target.value)}>
                            <option value="">{copy.selectChurch}</option>
                            {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className={labelCls()}>{copy.notes}</label>
                        <input type="text" className={inputCls('w-full')} value={editNotes} onChange={e => setEditNotes(e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <button type="button" disabled={editMutation.isPending || !editDate || !editQuantity} onClick={() => editMutation.mutate(tx.id)} className="rounded-lg bg-[color:var(--brand-green)] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">
                          {editMutation.isPending ? copy.saving : copy.save}
                        </button>
                        <button type="button" onClick={() => setEditingTxId(null)} className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600">
                          {copy.cancel}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={tx.id} className="border-b border-slate-50">
                  <td className="py-1 pr-2 text-slate-600">{tx.date}</td>
                  <td className="py-1 pr-2">
                    <span className={`rounded-full px-1.5 py-0.5 font-medium ${tx.type === 'entry' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {tx.type === 'entry' ? copy.entry : copy.exit}
                    </span>
                  </td>
                  <td className="py-1 pr-2 text-slate-600">{tx.missionaryName ?? '—'}</td>
                  <td className="py-1 pr-2 text-slate-600">
                    {tx.type === 'exit' ? (tx.destinationChurchName ?? '—') : '—'}
                  </td>
                  <td className="py-1 pr-2 text-right font-medium text-slate-800">
                    {tx.type === 'exit' ? '−' : '+'}
                    {tx.quantity.toFixed(2)}
                  </td>
                  <td className="py-1 text-right">
                    {canEditTx(tx) && (
                      <span className="inline-flex gap-1">
                        <button type="button" onClick={() => startEdit(tx)} className="rounded px-1.5 py-0.5 text-slate-400 hover:text-[color:var(--brand-blue-deep)]">
                          {copy.editMovement}
                        </button>
                        {isAdmin && (
                          <button type="button" onClick={() => { if (window.confirm(copy.confirmDeleteMovement)) deleteTxMutation.mutate(tx.id); }} className="rounded px-1.5 py-0.5 text-slate-400 hover:text-red-500">
                            {copy.deleteMovement}
                          </button>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── BatchTable ───────────────────────────────────────────────────────────────

type BatchSortKey = 'casa' | 'date' | 'responsible' | 'degree' | 'concentration' | 'balance';
type BatchSort = { key: BatchSortKey; direction: 'asc' | 'desc' };

type SortableHeaderProps = {
  label: string;
  sortKey: BatchSortKey;
  sort: BatchSort;
  onSort: (key: BatchSortKey) => void;
  className?: string;
};

function sortText(value?: string) {
  return (value ?? '').trim().toLocaleLowerCase();
}

function firstDegreeNumber(item: SacramentItem) {
  const match = item.degree.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function compareBatchItems(a: SacramentItem, b: SacramentItem, sort: BatchSort, balanceByItem: Map<string, number>) {
  let result = 0;

  switch (sort.key) {
    case 'casa':
      result = sortText(a.originChurchName).localeCompare(sortText(b.originChurchName));
      break;
    case 'date':
      result = formatFeitioMonth(a).localeCompare(formatFeitioMonth(b));
      break;
    case 'responsible':
      result = sortText(a.responsiblePerson).localeCompare(sortText(b.responsiblePerson));
      break;
    case 'degree':
      result = firstDegreeNumber(a) - firstDegreeNumber(b);
      break;
    case 'concentration':
      result = sortText(a.concentration ?? a.form).localeCompare(sortText(b.concentration ?? b.form));
      break;
    case 'balance':
      result = (balanceByItem.get(a.id) ?? 0) - (balanceByItem.get(b.id) ?? 0);
      break;
  }

  if (result === 0) {
    result = a.id.localeCompare(b.id);
  }

  return sort.direction === 'asc' ? result : -result;
}

function SortableHeader({ label, sortKey, sort, onSort, className = '' }: SortableHeaderProps) {
  const active = sort.key === sortKey;
  const indicator = active ? (sort.direction === 'asc' ? '↑' : '↓') : '↕';

  return (
    <th
      className={`px-3 py-2 text-left font-medium ${className}`}
      aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[color:var(--brand-blue-deep)]"
      >
        <span>{label}</span>
        <span className="text-[10px] text-slate-400">{indicator}</span>
      </button>
    </th>
  );
}

type BatchTableRowProps = {
  item: SacramentItem;
  balance: number;
  churches: ChurchInfo[];
  copy: Copy;
  uid: string;
  isAdmin: boolean;
  expanded: boolean;
  onToggle: () => void;
};

function BatchTableRow({ item, balance, churches, copy, uid, isAdmin, expanded, onToggle }: BatchTableRowProps) {
  const qc = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<ItemFormState>(() => itemToItemForm(item));
  const unit = getItemUnit(item, copy);

  const setEditField: SetItemField = (key, value) =>
    setEditForm(prev => ({ ...prev, [key]: value }));

  const editMutation = useMutation({
    mutationFn: () => updateItem(item.id, buildItemPayload(editForm, item.stockId, churches)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sacramentItems', item.stockId] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteItem(item.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sacramentItems', item.stockId] });
      await qc.invalidateQueries({ queryKey: ['sacramentStockTransactions', item.stockId] });
    },
  });

  return (
    <>
      <tr
        className="cursor-pointer border-b border-slate-100 bg-white text-sm hover:bg-slate-50"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={event => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
      >
        <td className="px-3 py-2 font-semibold text-slate-800">{item.originChurchName ?? '—'}</td>
        <td className="px-3 py-2 font-semibold text-slate-800">{formatFeitioMonth(item)}</td>
        <td className="px-3 py-2 text-slate-600">{item.responsiblePerson ?? '—'}</td>
        <td className="px-3 py-2 text-slate-600">{item.degree ? `${item.degree}°` : '—'}</td>
        <td className="px-3 py-2 text-slate-600">{item.concentration ?? (item.form === 'gel' ? copy.gel : '—')}</td>
        <td className="px-3 py-2 text-right font-medium text-slate-800">
          {formatQuantity(balance, unit)}
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={event => {
                event.stopPropagation();
                onToggle();
              }}
              className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
            >
              {expanded ? copy.hideMovements : copy.showMovements}
            </button>
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    setEditForm(itemToItemForm(item));
                    setEditing(true);
                  }}
                  className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
                >
                  {copy.editBatch}
                </button>
                {deleting ? (
                  <span className="text-xs text-slate-400">{copy.deleting}</span>
                ) : (
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      if (window.confirm(copy.confirmDelete)) {
                        setDeleting(true);
                        deleteMutation.mutate();
                      }
                    }}
                    className="rounded-full border border-red-100 px-2 py-1 text-xs text-red-400 hover:bg-red-50"
                  >
                    {copy.delete}
                  </button>
                )}
              </>
            )}
          </div>
        </td>
      </tr>
      {editing && (
        <tr className="border-b border-slate-100 bg-blue-50/30">
          <td colSpan={7} className="px-3 py-3">
            <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
              <BatchFormFields itemForm={editForm} churches={churches} copy={copy} setField={setEditField} />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={editMutation.isPending || editForm.degrees.length === 0}
                  onClick={() => editMutation.mutate()}
                  className="rounded-lg bg-[color:var(--brand-green)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {editMutation.isPending ? copy.saving : copy.save}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setEditForm(itemToItemForm(item));
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
                >
                  {copy.cancel}
                </button>
                {editMutation.isError && (
                  <span className="text-xs text-red-600">
                    {(editMutation.error as Error)?.message ?? 'Error'}
                  </span>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
      {expanded && (
        <tr className="border-b border-slate-100 bg-slate-50/70">
          <td colSpan={7} className="px-3 py-3">
            <TransactionList item={item} churches={churches} copy={copy} uid={uid} isAdmin={isAdmin} />
          </td>
        </tr>
      )}
    </>
  );
}

type BatchTableProps = {
  items: SacramentItem[];
  balanceByItem: Map<string, number>;
  churches: ChurchInfo[];
  copy: Copy;
  uid: string;
  isAdmin: boolean;
};

function BatchTable({ items, balanceByItem, churches, copy, uid, isAdmin }: BatchTableProps) {
  const [sort, setSort] = useState<BatchSort>({ key: 'date', direction: 'desc' });
  const [expandedItemIds, setExpandedItemIds] = useState<string[]>([]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => compareBatchItems(a, b, sort, balanceByItem)),
    [balanceByItem, items, sort],
  );

  function handleSort(key: BatchSortKey) {
    setSort(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  function toggleItem(itemId: string) {
    setExpandedItemIds(current =>
      current.includes(itemId)
        ? current.filter(id => id !== itemId)
        : [...current, itemId],
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <SortableHeader label={copy.originChurch} sortKey="casa" sort={sort} onSort={handleSort} />
            <SortableHeader label={copy.feitioDate} sortKey="date" sort={sort} onSort={handleSort} />
            <SortableHeader label={copy.responsiblePerson} sortKey="responsible" sort={sort} onSort={handleSort} />
            <SortableHeader label={copy.degree} sortKey="degree" sort={sort} onSort={handleSort} />
            <SortableHeader label={copy.concentration} sortKey="concentration" sort={sort} onSort={handleSort} />
            <SortableHeader label={copy.currentBalance} sortKey="balance" sort={sort} onSort={handleSort} className="text-right" />
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {sortedItems.map(item => (
            <BatchTableRow
              key={item.id}
              item={item}
              balance={balanceByItem.get(item.id) ?? 0}
              churches={churches}
              copy={copy}
              uid={uid}
              isAdmin={isAdmin}
              expanded={expandedItemIds.includes(item.id)}
              onToggle={() => toggleItem(item.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── StockCard ────────────────────────────────────────────────────────────────

type StockCardProps = {
  stock: SacramentStock;
  churches: ChurchInfo[];
  copy: Copy;
  uid: string;
  isAdmin: boolean;
};

type ItemFormState = {
  degrees: number[];
  concentration: string;
  form: SacramentForm;
  originChurchId: string;
  responsiblePerson: string;
  feitioDate: string;
};

const initialItemForm: ItemFormState = {
  degrees: [],
  concentration: '',
  form: 'liquid',
  originChurchId: '',
  responsiblePerson: '',
  feitioDate: '',
};

const DEGREE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const CONCENTRATION_OPTIONS = ['1x1', '2x1', '3x1', '4x1', '5x1', '6x1', '7x1', '8x1', '9x1', '10x1'];

function degreesToString(degrees: number[]): string {
  if (degrees.length === 0) return '';
  const sorted = [...degrees].sort((a, b) => a - b);
  return sorted.join('-');
}

function degreesFromString(value: string): number[] {
  const seen = new Set<number>();
  value.match(/\d+/g)?.forEach(part => {
    const degree = Number(part);
    if (DEGREE_OPTIONS.includes(degree)) {
      seen.add(degree);
    }
  });
  return [...seen].sort((a, b) => a - b);
}

function itemToItemForm(item: SacramentItem): ItemFormState {
  return {
    degrees: degreesFromString(item.degree),
    concentration: item.form === 'gel' ? 'gel' : item.concentration ?? '',
    form: item.form,
    originChurchId: item.originChurchId ?? '',
    responsiblePerson: item.responsiblePerson ?? '',
    feitioDate: toFeitioMonth(item.feitioDate),
  };
}

function buildItemPayload(itemForm: ItemFormState, stockId: string, churches: ChurchInfo[]): Omit<SacramentItem, 'id'> {
  const church = churches.find(c => c.id === itemForm.originChurchId);
  const form = itemForm.concentration === 'gel' ? 'gel' : itemForm.form;
  const concentration = form === 'gel'
    ? undefined
    : itemForm.concentration || undefined;

  return {
    stockId,
    degree: degreesToString(itemForm.degrees),
    concentration,
    form,
    originChurchId: itemForm.originChurchId || undefined,
    originChurchName: church?.name ?? undefined,
    responsiblePerson: itemForm.responsiblePerson || undefined,
    feitioDate: itemForm.feitioDate || undefined,
    feitioDateEnd: undefined,
  };
}

type SetItemField = <K extends keyof ItemFormState>(key: K, value: ItemFormState[K]) => void;

type BatchFormFieldsProps = {
  itemForm: ItemFormState;
  churches: ChurchInfo[];
  copy: Copy;
  setField: SetItemField;
};

function BatchFormFields({ itemForm, churches, copy, setField }: BatchFormFieldsProps) {
  return (
    <>
      <div>
        <label className={labelCls()}>{copy.degree}</label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {DEGREE_OPTIONS.map(d => {
            const checked = itemForm.degrees.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() =>
                  setField(
                    'degrees',
                    checked
                      ? itemForm.degrees.filter(x => x !== d)
                      : [...itemForm.degrees, d],
                  )
                }
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                  checked
                    ? 'border-[color:var(--brand-blue-deep)] bg-[color:var(--brand-blue-deep)] text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {d}°
              </button>
            );
          })}
          {itemForm.degrees.length > 0 && (
            <span className="ml-1 self-center text-xs text-slate-400">
              → {degreesToString(itemForm.degrees)}°
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className={labelCls()}>{copy.concentration}</label>
          <select
            className={inputCls('w-full')}
            value={itemForm.concentration}
            onChange={e => {
              const val = e.target.value;
              setField('concentration', val);
              if (val === 'gel') setField('form', 'gel');
              else if (itemForm.form === 'gel') setField('form', 'liquid');
            }}
          >
            <option value="">—</option>
            {CONCENTRATION_OPTIONS.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="gel">{copy.gel}</option>
          </select>
        </div>
        <div>
          <label className={labelCls()}>{copy.form}</label>
          <select
            className={inputCls('w-full')}
            value={itemForm.form}
            disabled={itemForm.concentration === 'gel'}
            onChange={e => setField('form', e.target.value as SacramentForm)}
          >
            <option value="liquid">{copy.liquid}</option>
            <option value="gel">{copy.gel}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className={labelCls()}>{copy.originChurch}</label>
          <select
            className={inputCls('w-full')}
            value={itemForm.originChurchId}
            onChange={e => setField('originChurchId', e.target.value)}
          >
            <option value="">{copy.selectCasa}</option>
            {churches.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls()}>{copy.responsiblePerson}</label>
          <input
            type="text"
            className={inputCls('w-full')}
            value={itemForm.responsiblePerson}
            onChange={e => setField('responsiblePerson', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={labelCls()}>{copy.feitioDate}</label>
        <input
          type="month"
          className={inputCls('w-48')}
          value={toFeitioMonth(itemForm.feitioDate)}
          onChange={e => setField('feitioDate', e.target.value)}
        />
      </div>
    </>
  );
}

function StockCard({ stock, churches, copy, uid, isAdmin }: StockCardProps) {
  const qc = useQueryClient();
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState<ItemFormState>(initialItemForm);
  const [editingStock, setEditingStock] = useState(false);
  const [stockEditForm, setStockEditForm] = useState<StockFormState>({
    name: stock.name,
    location: stock.location ?? '',
  });
  const [deleting, setDeleting] = useState(false);

  const itemsQuery = useQuery({
    queryKey: ['sacramentItems', stock.id],
    queryFn: () => fetchItems(stock.id),
  });

  const stockTransactionsQuery = useQuery({
    queryKey: ['sacramentStockTransactions', stock.id],
    queryFn: () => fetchTransactionsByStock(stock.id),
  });

  const items: SacramentItem[] = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  const stockTransactions: SacramentTransaction[] = useMemo(
    () => stockTransactionsQuery.data ?? [],
    [stockTransactionsQuery.data],
  );
  const balanceByItem = useMemo(
    () => buildBalanceByItem(stockTransactions),
    [stockTransactions],
  );
  const stockSummary = useMemo(
    () => getStockSummary(items, balanceByItem),
    [balanceByItem, items],
  );

  const setField = <K extends keyof ItemFormState>(key: K, value: ItemFormState[K]) =>
    setItemForm(prev => ({ ...prev, [key]: value }));

  const addItemMutation = useMutation({
    mutationFn: () => createItem(buildItemPayload(itemForm, stock.id, churches)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sacramentItems', stock.id] });
      setShowItemForm(false);
      setItemForm(initialItemForm);
    },
  });

  const editStockMutation = useMutation({
    mutationFn: () =>
      updateStock(stock.id, {
        name: stockEditForm.name.trim(),
        location: stockEditForm.location.trim() || undefined,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sacramentStocks'] });
      setEditingStock(false);
    },
  });

  const deleteStockMutation = useMutation({
    mutationFn: () => deleteStock(stock.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sacramentStocks'] });
    },
  });

  return (
    <div className="rounded-xl border border-[color:var(--brand-sand)] bg-[rgba(247,244,234,0.6)] p-4 shadow-sm space-y-3">
      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {editingStock ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className={labelCls()}>{copy.stockName}</label>
                <input
                  type="text"
                  className={inputCls('w-full')}
                  value={stockEditForm.name}
                  onChange={e => setStockEditForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls()}>{copy.stockLocation}</label>
                <input
                  type="text"
                  className={inputCls('w-full')}
                  value={stockEditForm.location}
                  onChange={e => setStockEditForm(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold text-[color:var(--brand-ink)]">{stock.name}</h2>
              {stock.location && (
                <p className="text-xs text-slate-500">{stock.location}</p>
              )}
            </>
          )}
          <p className="mt-1 text-xs text-slate-500">
            {copy.currentBalance}:{' '}
            <span className="font-semibold text-slate-800">
              {stockTransactionsQuery.isLoading
                ? copy.loading
                : `${formatQuantity(stockSummary.liters, copy.liters)} · ${formatQuantity(stockSummary.kg, copy.kg)}`}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {editingStock ? (
            <>
              <button
                type="button"
                disabled={editStockMutation.isPending || !stockEditForm.name.trim()}
                onClick={() => editStockMutation.mutate()}
                className="rounded-lg bg-[color:var(--brand-green)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {editStockMutation.isPending ? copy.saving : copy.save}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingStock(false);
                  setStockEditForm({ name: stock.name, location: stock.location ?? '' });
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
              >
                {copy.cancel}
              </button>
              {editStockMutation.isError && (
                <span className="text-xs text-red-600">
                  {(editStockMutation.error as Error)?.message ?? 'Error'}
                </span>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowItemForm(v => !v)}
                className="rounded-full bg-[color:var(--brand-blue-deep)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-80"
              >
                + {copy.newItem}
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setStockEditForm({ name: stock.name, location: stock.location ?? '' });
                    setEditingStock(true);
                  }}
                  className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
                >
                  {copy.editStock}
                </button>
              )}
              {isAdmin && (
                deleting ? (
                  <span className="text-xs text-slate-400">{copy.deleting}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(copy.confirmDelete)) {
                        setDeleting(true);
                        deleteStockMutation.mutate();
                      }
                    }}
                    className="rounded-full border border-red-100 px-2 py-1 text-xs text-red-400 hover:bg-red-50"
                  >
                    {copy.delete}
                  </button>
                )
              )}
            </>
          )}
        </div>
      </div>

      {/* new item form */}
      {showItemForm && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
          <BatchFormFields itemForm={itemForm} churches={churches} copy={copy} setField={setField} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={addItemMutation.isPending || itemForm.degrees.length === 0}
              onClick={() => addItemMutation.mutate()}
              className="rounded-lg bg-[color:var(--brand-green)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {addItemMutation.isPending ? copy.saving : copy.save}
            </button>
            <button
              type="button"
              onClick={() => { setShowItemForm(false); setItemForm(initialItemForm); }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
            >
              {copy.cancel}
            </button>
            {addItemMutation.isError && (
              <span className="text-xs text-red-600">
                {(addItemMutation.error as Error)?.message ?? 'Error'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* items table */}
      {itemsQuery.isLoading ? (
        <p className="text-sm text-slate-400">{copy.loading}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">{copy.noItems}</p>
      ) : (
        <BatchTable
          items={items}
          balanceByItem={balanceByItem}
          churches={churches}
          copy={copy}
          uid={uid}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

// ─── SacramentPage ────────────────────────────────────────────────────────────

type StockFormState = { name: string; location: string };
const initialStockForm: StockFormState = { name: '', location: '' };

export default function SacramentPage() {
  const { locale } = useSiteLocale();
  const copy = copyByLocale[locale];
  const qc = useQueryClient();
  const { user } = useAuth();
  const { role } = useSystemRole();
  const uid = user?.uid ?? '';
  const isAdmin = hasRequiredRole(role, 'admin');

  const [showStockForm, setShowStockForm] = useState(false);
  const [stockForm, setStockForm] = useState<StockFormState>(initialStockForm);

  const stocksQuery = useQuery({ queryKey: ['sacramentStocks'], queryFn: fetchStocks });
  const churchesQuery = useQuery({ queryKey: ['churches'], queryFn: fetchChurches });

  const stocks: SacramentStock[] = stocksQuery.data ?? [];
  const churches: ChurchInfo[] = churchesQuery.data ?? [];

  const addStockMutation = useMutation({
    mutationFn: () => {
      if (!isAdmin) {
        throw new Error('Admin role required.');
      }

      return createStock({
        name: stockForm.name.trim(),
        location: stockForm.location.trim() || undefined,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sacramentStocks'] });
      setShowStockForm(false);
      setStockForm(initialStockForm);
    },
  });

  return (
    <div className="space-y-4">
      {/* page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{copy.title}</h1>
          <p className="text-sm text-slate-600">{copy.intro}</p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowStockForm(v => !v)}
            className="rounded-full bg-[color:var(--brand-green)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-80"
          >
            + {copy.newStock}
          </button>
        )}
      </div>

      {/* new stock form */}
      {isAdmin && showStockForm && (
        <div className="rounded-xl border border-[color:var(--brand-sand)] bg-white p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls()}>{copy.stockName}</label>
              <input
                type="text"
                placeholder="Barcelona"
                className={inputCls('w-full')}
                value={stockForm.name}
                onChange={e => setStockForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls()}>{copy.stockLocation}</label>
              <input
                type="text"
                placeholder="España"
                className={inputCls('w-full')}
                value={stockForm.location}
                onChange={e => setStockForm(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={addStockMutation.isPending || !stockForm.name.trim()}
              onClick={() => addStockMutation.mutate()}
              className="rounded-lg bg-[color:var(--brand-green)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {addStockMutation.isPending ? copy.saving : copy.save}
            </button>
            <button
              type="button"
              onClick={() => { setShowStockForm(false); setStockForm(initialStockForm); }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
            >
              {copy.cancel}
            </button>
            {addStockMutation.isError && (
              <span className="text-xs text-red-600">
                {(addStockMutation.error as Error)?.message ?? 'Error'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* stocks list */}
      {stocksQuery.isLoading ? (
        <p className="text-sm text-slate-400">{copy.loading}</p>
      ) : stocks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          {copy.noStocks}
        </div>
      ) : (
        <div className="space-y-4">
          {stocks.map(stock => (
            <StockCard key={stock.id} stock={stock} churches={churches} copy={copy} uid={uid} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}
