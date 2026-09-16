import { useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchChurchManagers, saveChurchManager, type ChurchManager } from '../lib/churchManagers';
import { fetchItems, fetchStocks, fetchTransactionsByStock } from '../lib/sacrament';
import { fetchUsers } from '../lib/users';
import {
  createWork,
  deleteWork,
  fetchWorks,
  fetchWorksForChurches,
  setWorkReviewStatus,
  updateWork,
  type Work,
  type WorkReviewStatus
} from '../lib/works';
import { fetchWorkTypeCatalog, saveWorkTypes, type WorkType } from '../lib/workTypes';
import { useAuth } from '../providers/useAuth';
import { useChurchRecordAccess } from '../providers/useChurchRecordAccess';
import { useSiteLocale } from '../providers/useSiteLocale';
import { buildBalanceByItem } from './sacrament/form';
import { numberLocaleBySite, worksCopyByLocale } from './works/copy';
import {
  buildWorkInput,
  initialWorkFilter,
  initialWorkForm,
  stocksForChurch,
  todayDateValue,
  validateWorkForm,
  workToForm,
  type SacramentOption,
  type WorkFormError,
  type WorkFormState
} from './works/form';
import {
  ChurchManagersPanel,
  WorkRecordForm,
  WorkRecordList,
  WorkTypesPanel
} from './works/WorksSections';

type Tab = 'records' | 'managers' | 'workTypes';

export default function WorksPage() {
  const { locale } = useSiteLocale();
  const copy = worksCopyByLocale[locale];
  const numberLocale = numberLocaleBySite[locale];
  const qc = useQueryClient();
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const { isAdmin, canRecord, loading: accessLoading, managedChurchIds, churchOptions, defaultChurchId } = useChurchRecordAccess();

  const [tab, setTab] = useState<Tab>('records');
  const [form, setForm] = useState<WorkFormState>(() => initialWorkForm());
  const [editing, setEditing] = useState<Work | null>(null);
  const [errors, setErrors] = useState<WorkFormError[]>([]);
  const [filter, setFilter] = useState(initialWorkFilter);

  const catalogQuery = useQuery({ queryKey: ['workTypeCatalog'], queryFn: fetchWorkTypeCatalog, enabled: canRecord });
  const worksQuery = useQuery({
    queryKey: ['works', isAdmin ? 'all' : managedChurchIds.join(',')],
    queryFn: () => (isAdmin ? fetchWorks() : fetchWorksForChurches(managedChurchIds)),
    enabled: canRecord
  });
  const stocksQuery = useQuery({ queryKey: ['sacramentStocks'], queryFn: fetchStocks, enabled: canRecord });
  const managersQuery = useQuery({ queryKey: ['churchManagers'], queryFn: fetchChurchManagers, enabled: isAdmin && tab === 'managers' });
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: fetchUsers, enabled: isAdmin && tab === 'managers' });

  const formChurchId = form.churchId || defaultChurchId;

  const linkedStocks = useMemo(
    () => stocksForChurch(stocksQuery.data ?? [], formChurchId),
    [stocksQuery.data, formChurchId]
  );
  const itemQueries = useQueries({
    queries: linkedStocks.map(stock => ({ queryKey: ['sacramentItems', stock.id], queryFn: () => fetchItems(stock.id) }))
  });
  const transactionQueries = useQueries({
    queries: linkedStocks.map(stock => ({
      queryKey: ['sacramentStockTransactions', stock.id],
      queryFn: () => fetchTransactionsByStock(stock.id)
    }))
  });
  const sacramentLoading = stocksQuery.isLoading
    || itemQueries.some(result => result.isLoading)
    || transactionQueries.some(result => result.isLoading);
  const sacramentOptions: SacramentOption[] = linkedStocks.flatMap((stock, index) => {
    const balances = buildBalanceByItem(transactionQueries[index]?.data ?? []);
    return (itemQueries[index]?.data ?? []).map(item => ({ item, stock, balance: balances.get(item.id) ?? 0 }));
  });

  const workTypes: WorkType[] = catalogQuery.data?.items ?? [];
  const churchName = (id: string) => churchOptions.find(church => church.id === id)?.name ?? editing?.churchName ?? id;

  function resetForm() {
    setForm(initialWorkForm());
    setEditing(null);
    setErrors([]);
  }

  async function refreshAfterWrite(stockIds: string[]) {
    await qc.invalidateQueries({ queryKey: ['works'] });
    // The ledger movement is written by a Cloud Function shortly after the record.
    for (const stockId of stockIds) {
      await qc.invalidateQueries({ queryKey: ['sacramentStockTransactions', stockId] });
    }
  }

  const saveMutation = useMutation({
    mutationFn: async (values: WorkFormState) => {
      const input = buildWorkInput({
        form: values,
        churchName: churchName(values.churchId),
        workTypes,
        otherLabel: copy.other,
        sacramentOptions,
        existing: editing ?? undefined
      });
      if (editing) {
        await updateWork(editing.id, input, { uid, keepReview: isAdmin });
      } else {
        await createWork(input, uid);
      }
      return [input.sacrament?.stockId, editing?.sacrament?.stockId].filter((id): id is string => !!id);
    },
    onSuccess: async stockIds => {
      resetForm();
      await refreshAfterWrite(stockIds);
    }
  });

  const reviewMutation = useMutation({
    mutationFn: ({ work, status }: { work: Work; status: WorkReviewStatus }) => setWorkReviewStatus(work.id, status, uid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['works'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (work: Work) => deleteWork(work.id),
    onSuccess: async (_, work) => {
      if (editing?.id === work.id) resetForm();
      await refreshAfterWrite(work.sacrament ? [work.sacrament.stockId] : []);
    }
  });

  const managerMutation = useMutation({
    mutationFn: (next: ChurchManager) => saveChurchManager(next, uid),
    onSuccess: async (_, next) => {
      await qc.invalidateQueries({ queryKey: ['churchManagers'] });
      await qc.invalidateQueries({ queryKey: ['churchManager', next.uid] });
    }
  });

  const workTypesMutation = useMutation({
    mutationFn: (items: WorkType[]) => saveWorkTypes(items, uid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workTypeCatalog'] })
  });

  if (accessLoading) {
    return <p className="text-sm text-slate-500">{copy.loading}</p>;
  }

  if (!canRecord) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 shadow-sm">
        {copy.noPermission}
      </div>
    );
  }

  const values = { ...form, churchId: formChurchId };
  const busyWork = reviewMutation.isPending ? reviewMutation.variables?.work : deleteMutation.isPending ? deleteMutation.variables : undefined;
  const tabs: Tab[] = isAdmin ? ['records', 'managers', 'workTypes'] : ['records'];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{copy.title}</h1>
        <p className="text-sm text-slate-600">{isAdmin ? copy.introAdmin : copy.intro}</p>
      </div>

      {tabs.length > 1 ? (
        <div role="tablist" className="flex flex-wrap gap-2">
          {tabs.map(entry => (
            <button
              key={entry}
              type="button"
              role="tab"
              aria-selected={tab === entry}
              onClick={() => setTab(entry)}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                tab === entry
                  ? 'bg-[color:var(--brand-blue-deep)] text-white shadow-sm'
                  : 'border border-[color:var(--brand-sand)] bg-white text-[color:var(--brand-ink)] hover:bg-[rgba(63,132,194,0.12)]'
              }`}
            >
              {copy.tabs[entry]}
            </button>
          ))}
        </div>
      ) : null}

      {tab === 'records' ? (
        <>
          <WorkRecordForm
            copy={copy}
            numberLocale={numberLocale}
            form={values}
            setField={(key, value) => {
              saveMutation.reset();
              setForm(prev => ({
                ...prev,
                churchId: formChurchId,
                // Batches belong to a church's stocks, so a new church clears the pick.
                ...(key === 'churchId' ? { sacramentItemId: '' } : {}),
                [key]: value
              }));
            }}
            errors={errors}
            churchOptions={churchOptions}
            workTypes={workTypes}
            sacramentOptions={sacramentOptions}
            sacramentLoading={sacramentLoading}
            editing={editing}
            today={todayDateValue()}
            saving={saveMutation.isPending}
            saveError={saveMutation.isError}
            saved={saveMutation.isSuccess}
            onSubmit={() => {
              const found = validateWorkForm(values, { today: todayDateValue() });
              setErrors(found);
              if (found.length === 0) saveMutation.mutate(values);
            }}
            onCancel={resetForm}
          />

          {worksQuery.isLoading ? (
            <p className="text-sm text-slate-400">{copy.loading}</p>
          ) : worksQuery.isError ? (
            <p className="text-sm text-red-600">{copy.loadError}</p>
          ) : (
            <WorkRecordList
              copy={copy}
              numberLocale={numberLocale}
              works={worksQuery.data ?? []}
              filter={filter}
              setFilter={setFilter}
              churchOptions={isAdmin ? churchOptions : churchOptions.length > 1 ? churchOptions : []}
              isAdmin={isAdmin}
              busyId={busyWork?.id ?? null}
              actionError={reviewMutation.isError || deleteMutation.isError}
              onEdit={work => {
                if (!isAdmin && work.reviewStatus === 'reviewed' && !window.confirm(copy.confirmEditReviewed)) return;
                saveMutation.reset();
                setEditing(work);
                setForm(workToForm(work));
                setErrors([]);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onDelete={work => {
                if (window.confirm(copy.confirmDelete)) deleteMutation.mutate(work);
              }}
              onReview={(work, status) => reviewMutation.mutate({ work, status })}
            />
          )}
        </>
      ) : null}

      {tab === 'managers' && isAdmin ? (
        <ChurchManagersPanel
          copy={copy}
          managers={managersQuery.data ?? []}
          users={usersQuery.data ?? []}
          churches={churchOptions}
          loading={managersQuery.isLoading || usersQuery.isLoading}
          saving={managerMutation.isPending}
          error={managerMutation.isError}
          onSave={next => managerMutation.mutate(next)}
        />
      ) : null}

      {tab === 'workTypes' && isAdmin ? (
        <WorkTypesPanel
          copy={copy}
          catalog={catalogQuery.data}
          saving={workTypesMutation.isPending}
          saved={workTypesMutation.isSuccess}
          error={workTypesMutation.isError}
          onSave={items => workTypesMutation.mutate(items)}
        />
      ) : null}
    </div>
  );
}
