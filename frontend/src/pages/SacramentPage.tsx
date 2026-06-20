import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createStock, fetchStocks, type SacramentStock } from '../lib/sacrament';
import { hasRequiredRole } from '../lib/systemRole';
import { fetchChurches, type ChurchInfo } from '../lib/works';
import { useAuth } from '../providers/useAuth';
import { useSystemRole } from '../providers/useSystemRole';
import { useSiteLocale } from '../providers/useSiteLocale';
import { churchFormCopyByLocale, copyByLocale, requiredChurchNameByLocale } from './sacrament/copy';
import { initialStockForm, inputCls, labelCls, type StockFormState } from './sacrament/form';
import { AddChurchModal, StockCard, type AddChurchModalState } from './sacrament/SacramentSections';

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
  const [addChurchModal, setAddChurchModal] = useState<AddChurchModalState | null>(null);

  const stocksQuery = useQuery({ queryKey: ['sacramentStocks'], queryFn: fetchStocks });
  const churchesQuery = useQuery({ queryKey: ['churches'], queryFn: fetchChurches });

  const stocks: SacramentStock[] = stocksQuery.data ?? [];
  const churches: ChurchInfo[] = churchesQuery.data ?? [];
  const churchFormCopy = churchFormCopyByLocale[locale];
  const requiredChurchName = requiredChurchNameByLocale[locale];

  const addStockMutation = useMutation({
    mutationFn: () => {
      if (!isAdmin) {
        throw new Error('Admin role required.');
      }

      return createStock({
        name: stockForm.name.trim(),
        location: stockForm.location.trim() || undefined,
        notes: stockForm.notes.trim(),
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
            <div className="col-span-2">
              <label className={labelCls()}>{copy.notes}</label>
              <textarea
                className={inputCls('w-full')}
                rows={2}
                value={stockForm.notes}
                onChange={e => setStockForm(prev => ({ ...prev, notes: e.target.value }))}
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
            <StockCard
              key={stock.id}
              stock={stock}
              churches={churches}
              copy={copy}
              uid={uid}
              isAdmin={isAdmin}
              onRequestCreateChurch={onCreated => setAddChurchModal({ onCreated })}
            />
          ))}
        </div>
      )}

      {addChurchModal ? (
        <AddChurchModal
          copy={churchFormCopy}
          loginToCreate={churchFormCopy.loginToSave}
          onClose={() => setAddChurchModal(null)}
          onCreated={addChurchModal.onCreated}
          requiredName={requiredChurchName}
          userPresent={!!user}
        />
      ) : null}
    </div>
  );
}
